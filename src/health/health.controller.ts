import { Controller, Get, HttpCode } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  @Get()
  @HttpCode(200)
  async check() {
    const result = {
      status: 'ok',
      postgres: 'ok',
      redis: 'ok',
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      result.status = 'degraded';
      result.postgres = 'unreachable';
    }

    try {
      await this.cache.set('__health__', '1', 5000);
      await this.cache.get('__health__');
    } catch {
      result.status = 'degraded';
      result.redis = 'unreachable';
    }

    return result;
  }
}
