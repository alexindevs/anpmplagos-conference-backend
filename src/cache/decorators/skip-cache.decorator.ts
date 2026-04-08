import { SetMetadata } from '@nestjs/common';
import { CACHE_SKIP_METADATA } from '../cache.constants';

export const SkipCache = () => SetMetadata(CACHE_SKIP_METADATA, true);
