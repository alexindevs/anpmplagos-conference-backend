import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SupportEmailService } from '../support/support-email.service';
import {
  DEFAULT_ACCESS_COOKIE_MAX_AGE_SECONDS,
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  getDefaultRefreshCookieMaxAgeSeconds,
  setAuthCookies,
} from './auth-cookies';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailService: SupportEmailService,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Sets auth cookies, returns user' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.login(dto);
    setAuthCookies(
      res,
      tokens.access_token,
      tokens.refresh_token,
      DEFAULT_ACCESS_COOKIE_MAX_AGE_SECONDS,
      getDefaultRefreshCookieMaxAgeSeconds(),
    );
    return { user: tokens.user };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh tokens using refresh token cookie' })
  @ApiResponse({
    status: 200,
    description: 'Sets new auth cookies, returns user',
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Req() req: { cookies?: { [key: string]: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }
    const tokens = await this.authService.refresh(refreshToken);
    setAuthCookies(
      res,
      tokens.access_token,
      tokens.refresh_token,
      DEFAULT_ACCESS_COOKIE_MAX_AGE_SECONDS,
      getDefaultRefreshCookieMaxAgeSeconds(),
    );
    return { user: tokens.user };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Clears cookies, logged out successfully',
  })
  async logout(
    @Req() req: { cookies?: { [key: string]: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    clearAuthCookies(res);
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  me(@Req() req: { user: unknown }) {
    return req.user;
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from all devices (requires access token)' })
  @ApiResponse({ status: 200, description: 'Logged out from all devices' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logoutAll(
    @Req() req: { user: { id: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logoutAll(req.user.id);
    clearAuthCookies(res);
    return { message: 'Logged out from all devices' };
  }

  // ─── Password Reset Endpoints ────────────────────────────────────────────

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password-reset email' })
  @ApiResponse({ status: 200, description: 'Email sent (or silently skipped if account not found)' })
  forgotPassword(@Body() body: { email: string }) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || '';
    return this.authService.forgotPassword(
      body.email?.trim().toLowerCase() ?? '',
      (opts) => this.emailService.sendPasswordResetEmail(opts),
      frontendUrl,
    );
  }

  @Get('reset-password/validate')
  @ApiOperation({ summary: 'Validate a password-reset token' })
  @ApiResponse({ status: 200, description: 'Token is valid, returns email' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  validateResetToken(@Query('token') token: string) {
    return this.authService.validateResetToken(token);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Set a new password using a reset token' })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  resetPassword(@Body() body: { token: string; password: string }) {
    return this.authService.resetPassword(body.token, body.password);
  }

  // ─── Moderator Invite Endpoints ───────────────────────────────────────────

  @Get('moderator/validate-invite')
  @ApiOperation({ summary: 'Validate a moderator invite token' })
  @ApiResponse({ status: 200, description: 'Token is valid, returns email' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  validateModeratorInvite(@Query('token') token: string) {
    return this.authService.validateModeratorInvite(token);
  }

  @Post('moderator/register')
  @ApiOperation({ summary: 'Complete moderator account setup from invite token' })
  @ApiResponse({ status: 201, description: 'Account created, sets auth cookies' })
  @ApiResponse({ status: 400, description: 'Invalid token or account exists' })
  async registerModerator(
    @Body() body: { token: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.registerModerator(body.token, body.password);
    setAuthCookies(
      res,
      tokens.access_token,
      tokens.refresh_token,
      DEFAULT_ACCESS_COOKIE_MAX_AGE_SECONDS,
      getDefaultRefreshCookieMaxAgeSeconds(),
    );
    return { user: tokens.user };
  }
}
