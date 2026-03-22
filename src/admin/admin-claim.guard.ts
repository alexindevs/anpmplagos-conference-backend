import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AdminClaimGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;

    if (!token) {
      throw new UnauthorizedException(
        'Admin claim token required. Send as Authorization: Bearer <token>',
      );
    }

    try {
      const payload = this.jwt.verify<{ purpose: string; adminType: string }>(
        token,
      );
      if (payload.purpose !== 'admin_claim') {
        throw new UnauthorizedException('Invalid token');
      }
      (
        request as Request & { adminClaimPayload: typeof payload }
      ).adminClaimPayload = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired admin claim token');
    }
  }
}
