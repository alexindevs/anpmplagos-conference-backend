import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GalleryService } from './gallery.service';

@ApiTags('gallery')
@Controller('api/gallery')
export class GalleryPublicController {
  constructor(private readonly gallery: GalleryService) {}

  @Get()
  @ApiOperation({
    summary: 'List all gallery images (public, newest first)',
  })
  @ApiResponse({ status: 200, description: 'Gallery items' })
  findAll() {
    return this.gallery.findAllPublic();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one gallery item by id (public)' })
  @ApiResponse({ status: 200, description: 'Gallery item' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id') id: string) {
    return this.gallery.findOne(id);
  }
}
