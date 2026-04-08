import { SetMetadata } from '@nestjs/common';
import { CACHE_INVALIDATE_METADATA } from '../cache.constants';

export interface CacheInvalidateOptions {
  patterns?: string[];
  keys?: string[];
}

export const InvalidateCache = (options: CacheInvalidateOptions) =>
  SetMetadata(CACHE_INVALIDATE_METADATA, options);
