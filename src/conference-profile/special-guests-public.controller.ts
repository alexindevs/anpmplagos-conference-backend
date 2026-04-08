import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConferenceProfileService } from './conference-profile.service';
import { HttpCacheInterceptor, CacheKey, CacheTTL } from '../cache';

@ApiTags('special-guests')
@Controller('api/special-guests')
@UseInterceptors(HttpCacheInterceptor)
@CacheTTL(600)
export class SpecialGuestsPublicController {
  constructor(private readonly profiles: ConferenceProfileService) {}

  @Get()
  @ApiOperation({
    summary: 'List all special guest profiles (public)',
    description:
      'Ordered by highlight type (keynote, then featured), then name.',
  })
  @ApiResponse({ status: 200, description: 'Special guest profiles' })
  @CacheKey('special-guests:list')
  findAll() {
    return this.profiles.findAllPublicByKind('special_guest');
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get one special guest profile by slug (public)' })
  @ApiResponse({ status: 200, description: 'Special guest profile' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @CacheKey('special-guests:slug:{param.slug}')
  findOne(@Param('slug') slug: string) {
    return this.profiles.findBySlugPublic('special_guest', slug);
  }
}
