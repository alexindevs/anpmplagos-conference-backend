import { SetMetadata } from '@nestjs/common';
import { CACHE_TTL_METADATA } from '../cache.constants';

export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL_METADATA, ttl);
