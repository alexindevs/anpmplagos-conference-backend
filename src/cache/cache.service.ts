import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    return await this.cacheManager.get<T>(key);
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    // Access the underlying store to use Redis-specific commands
    const store: any = (this.cacheManager as any).store;
    if (store && store.client && typeof store.client.keys === 'function') {
      const keys = await store.client.keys(pattern);
      if (keys.length > 0) {
        await Promise.all(keys.map((key: string) => this.cacheManager.del(key)));
      }
    }
  }

  async reset(): Promise<void> {
    // Access the underlying store to reset
    const store: any = (this.cacheManager as any).store;
    if (store && store.client && typeof store.client.flushdb === 'function') {
      await store.client.flushdb();
    }
  }

  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    return await this.cacheManager.wrap(key, fn, ttl);
  }
}
