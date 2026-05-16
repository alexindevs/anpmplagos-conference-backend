import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL', '')?.trim();
        const redisPassword = configService.get<string>('REDIS_PASSWORD');
        const storeOptions = redisUrl
          ? { url: redisUrl }
          : {
              host: configService.get<string>('REDIS_HOST', '127.0.0.1'),
              port: configService.get<number>('REDIS_PORT', 6379),
              ...(redisPassword?.trim()
                ? { password: redisPassword.trim() }
                : {}),
              db: configService.get<number>('REDIS_DB', 0),
            };
        const store = await redisStore({
          ...storeOptions,
          ttl: 60 * 1000,
        });
        return {
          store: () => store,
          ttl: 60 * 1000,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService],
  exports: [CacheService, NestCacheModule],
})
export class CacheModule {}
