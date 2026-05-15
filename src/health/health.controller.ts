import { Controller, Get, Inject, HttpCode } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
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
      const store: any = (this.cache as any).store;
      await store.client.ping();
    } catch {
      result.status = 'degraded';
      result.redis = 'unreachable';
    }

    return result;
  }
}
