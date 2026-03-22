import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
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
  constructor(private readonly authService: AuthService) {}

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
}
