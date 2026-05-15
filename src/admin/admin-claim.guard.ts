import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import { Request } from 'express';
import { CacheService } from '../cache/cache.service';

const USED_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 min — matches ADMIN_CLAIM_EXPIRY

@Injectable()
export class AdminClaimGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly cache: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    let payload: { purpose: string; adminType: string };
    try {
      payload = this.jwt.verify<{ purpose: string; adminType: string }>(token);
      if (payload.purpose !== 'admin_claim') {
        throw new UnauthorizedException('Invalid token');
      }
    } catch {
      throw new UnauthorizedException('Invalid or expired admin claim token');
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const cacheKey = `admin_claim_used:${tokenHash}`;

    const alreadyUsed = await this.cache.get<boolean>(cacheKey);
    if (alreadyUsed) {
      throw new UnauthorizedException(
        'Admin claim token has already been used',
      );
    }

    await this.cache.set(cacheKey, true, USED_TOKEN_TTL_MS);

    (
      request as Request & { adminClaimPayload: typeof payload }
    ).adminClaimPayload = payload;
    return true;
  }
}
