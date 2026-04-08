import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateGalleryItemMultipartDto } from './dto/create-gallery-item-multipart.dto';
import { GalleryService } from './gallery.service';
import {
  HttpCacheInterceptor,
  CacheInvalidationInterceptor,
  CacheKey,
  CacheTTL,
  InvalidateCache,
} from '../cache';

@ApiTags('Admin - Gallery')
@Controller('api/admin/gallery')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
@UseInterceptors(HttpCacheInterceptor, CacheInvalidationInterceptor)
export class AdminGalleryController {
  constructor(private readonly gallery: GalleryService) {}

  @Get()
  @ApiOperation({
    summary:
      'List all gallery images (admin; same payload as public GET /api/gallery)',
  })
  @ApiResponse({ status: 200, description: 'Newest first' })
  @CacheKey('admin:gallery:list')
  @CacheTTL(120)
  list() {
    return this.gallery.findAllPublic();
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get one gallery item (admin; same as public GET /api/gallery/:id)',
  })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id') id: string) {
    return this.gallery.findOne(id);
  }

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a gallery image with optional caption (admin)',
  })
  @ApiBody({
    description:
      'Form fields plus **`image`** binary (JPEG/PNG, max 5MB, required).',
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        caption: {
          type: 'string',
          example: 'Conference dinner — Friday evening',
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'JPEG or PNG; max 5MB',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Gallery item created' })
  @ApiResponse({
    status: 400,
    description: 'Missing file, wrong type, or too large',
  })
  @InvalidateCache({
    patterns: ['gallery:*', 'admin:gallery:*'],
  })
  create(
    @Body() dto: CreateGalleryItemMultipartDto,
    @UploadedFile() image: Express.Multer.File | undefined,
  ) {
    return this.gallery.createFromMultipart(dto, image);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a gallery item (admin)' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @InvalidateCache({
    patterns: ['gallery:*', 'admin:gallery:*'],
  })
  remove(@Param('id') id: string) {
    return this.gallery.remove(id);
  }
}
