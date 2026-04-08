import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GalleryService } from './gallery.service';
import { HttpCacheInterceptor, CacheKey, CacheTTL } from '../cache';

@ApiTags('gallery')
@Controller('api/gallery')
@UseInterceptors(HttpCacheInterceptor)
@CacheTTL(180)
export class GalleryPublicController {
  constructor(private readonly gallery: GalleryService) {}

  @Get()
  @ApiOperation({
    summary: 'List all gallery images (public, newest first)',
  })
  @ApiResponse({ status: 200, description: 'Gallery items' })
  @CacheKey('gallery:list')
  findAll() {
    return this.gallery.findAllPublic();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one gallery item by id (public)' })
  @ApiResponse({ status: 200, description: 'Gallery item' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @CacheKey('gallery:id:{param.id}')
  findOne(@Param('id') id: string) {
    return this.gallery.findOne(id);
  }
}
