import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CacheService } from './cache.service';
import {
  CACHE_KEY_METADATA,
  CACHE_TTL_METADATA,
  CACHE_SKIP_METADATA,
} from './cache.constants';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const skipCache = this.reflector.get<boolean>(
      CACHE_SKIP_METADATA,
      context.getHandler(),
    );

    if (skipCache) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    
    if (request.method !== 'GET') {
      return next.handle();
    }

    const cacheKeyTemplate = this.reflector.get<string>(
      CACHE_KEY_METADATA,
      context.getHandler(),
    ) || this.reflector.get<string>(
      CACHE_KEY_METADATA,
      context.getClass(),
    );

    const ttl = this.reflector.get<number>(
      CACHE_TTL_METADATA,
      context.getHandler(),
    ) || this.reflector.get<number>(
      CACHE_TTL_METADATA,
      context.getClass(),
    ) || 60;

    const cacheKey = this.buildCacheKey(cacheKeyTemplate, request);

    const cachedResponse = await this.cacheService.get(cacheKey);
    if (cachedResponse !== undefined && cachedResponse !== null) {
      return of(cachedResponse);
    }

    return next.handle().pipe(
      tap(async (response) => {
        if (response !== undefined && response !== null) {
          await this.cacheService.set(cacheKey, response, ttl * 1000);
        }
      }),
    );
  }

  private buildCacheKey(template: string | undefined, request: any): string {
    if (!template) {
      const url = request.url.split('?')[0];
      const query = JSON.stringify(request.query || {});
      return `${url}:${query}`;
    }

    let key = template;
    
    const matches = template.match(/\{([^}]+)\}/g);
    if (matches) {
      matches.forEach((match) => {
        const paramName = match.slice(1, -1);
        let value = '';
        
        if (paramName.startsWith('query.')) {
          const queryParam = paramName.substring(6);
          value = request.query?.[queryParam] || '';
        } else if (paramName.startsWith('param.')) {
          const routeParam = paramName.substring(6);
          value = request.params?.[routeParam] || '';
        } else if (paramName === 'userId') {
          value = request.user?.id || 'anonymous';
        }
        
        key = key.replace(match, value);
      });
    }

    return key;
  }
}
