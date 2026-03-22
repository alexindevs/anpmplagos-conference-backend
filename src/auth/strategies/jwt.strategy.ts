import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService, type JwtPayload } from '../auth.service';
import { ACCESS_TOKEN_COOKIE } from '../auth-cookies';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.[ACCESS_TOKEN_COOKIE] ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>(
        'JWT_SECRET',
        'fallback-secret-change-me',
      ),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.purpose === 'admin_claim') {
      throw new UnauthorizedException(
        'Use access token, not admin claim token',
      );
    }
    const user = await this.authService.validateUser(payload);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}
