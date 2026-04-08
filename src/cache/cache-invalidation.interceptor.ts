import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CacheService } from './cache.service';
import { CACHE_INVALIDATE_METADATA } from './cache.constants';
import { CacheInvalidateOptions } from './decorators/invalidate-cache.decorator';

@Injectable()
export class CacheInvalidationInterceptor implements NestInterceptor {
  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const invalidateOptions = this.reflector.get<CacheInvalidateOptions>(
      CACHE_INVALIDATE_METADATA,
      context.getHandler(),
    );

    if (!invalidateOptions) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async () => {
        const request = context.switchToHttp().getRequest();
        const { patterns = [], keys = [] } = invalidateOptions;

        const processedPatterns = patterns.map((pattern) =>
          this.interpolatePattern(pattern, request),
        );
        const processedKeys = keys.map((key) =>
          this.interpolatePattern(key, request),
        );

        await Promise.all([
          ...processedPatterns.map((pattern) =>
            this.cacheService.delPattern(pattern),
          ),
          ...processedKeys.map((key) => this.cacheService.del(key)),
        ]);
      }),
    );
  }

  private interpolatePattern(pattern: string, request: any): string {
    let result = pattern;
    
    const matches = pattern.match(/\{([^}]+)\}/g);
    if (matches) {
      matches.forEach((match) => {
        const paramName = match.slice(1, -1);
        let value = '';
        
        if (paramName.startsWith('body.')) {
          const bodyParam = paramName.substring(5);
          value = request.body?.[bodyParam] || '';
        } else if (paramName.startsWith('param.')) {
          const routeParam = paramName.substring(6);
          value = request.params?.[routeParam] || '';
        } else if (paramName === 'userId') {
          value = request.user?.id || '';
        }
        
        result = result.replace(match, value);
      });
    }

    return result;
  }
}
