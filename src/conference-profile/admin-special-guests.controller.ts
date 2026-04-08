import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { ConferenceProfileService } from './conference-profile.service';
import { CreateConferenceProfileMultipartDto } from './dto/create-conference-profile-multipart.dto';
import { UpdateConferenceProfileMultipartDto } from './dto/update-conference-profile-multipart.dto';
import {
  HttpCacheInterceptor,
  CacheInvalidationInterceptor,
  CacheKey,
  CacheTTL,
  InvalidateCache,
} from '../cache';

const multipartCreateSchema = {
  type: 'object',
  required: [
    'name',
    'role',
    'qualifications',
    'byline',
    'highlightType',
    'description',
    'image',
  ],
  properties: {
    name: { type: 'string', example: 'Hon. Guest Name' },
    role: { type: 'string', example: 'Special guest' },
    qualifications: { type: 'string', example: 'Honors, affiliations' },
    byline: { type: 'string' },
    highlightType: { type: 'string', enum: ['keynote', 'featured'] },
    description: { type: 'string' },
    websiteLink: { type: 'string' },
    facebookLink: { type: 'string' },
    xLink: { type: 'string' },
    instagramLink: { type: 'string' },
    image: {
      type: 'string',
      format: 'binary',
      description: 'JPEG or PNG; max 5MB',
    },
  },
};

const multipartPatchSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    role: { type: 'string' },
    qualifications: { type: 'string' },
    byline: { type: 'string' },
    highlightType: { type: 'string', enum: ['keynote', 'featured'] },
    description: { type: 'string' },
    websiteLink: { type: 'string' },
    facebookLink: { type: 'string' },
    xLink: { type: 'string' },
    instagramLink: { type: 'string' },
    image: {
      type: 'string',
      format: 'binary',
      description: 'Optional new photo; JPEG or PNG; max 5MB',
    },
  },
};

@ApiTags('Admin - Special guests')
@Controller('api/admin/special-guests')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
@UseInterceptors(HttpCacheInterceptor, CacheInvalidationInterceptor)
export class AdminSpecialGuestsController {
  constructor(private readonly profiles: ConferenceProfileService) {}

  @Get()
  @ApiOperation({
    summary: 'List special guest profiles (admin; same payload as public)',
  })
  @CacheKey('admin:special-guests:list')
  @CacheTTL(120)
  list() {
    return this.profiles.findAllPublicByKind('special_guest');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one special guest profile by id (admin)' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id') id: string) {
    return this.profiles.findOneAdmin(id, 'special_guest');
  }

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create a special guest profile with photo upload (admin)',
  })
  @ApiBody({
    description:
      'Form fields plus **`image`** binary (JPEG/PNG, max 5MB, required).',
    schema: multipartCreateSchema,
  })
  @ApiResponse({ status: 201, description: 'Profile created' })
  @ApiResponse({
    status: 400,
    description: 'Missing file, wrong type, or validation error',
  })
  @InvalidateCache({
    patterns: ['special-guests:*', 'admin:special-guests:*'],
  })
  create(
    @Body() dto: CreateConferenceProfileMultipartDto,
    @UploadedFile() image: Express.Multer.File | undefined,
  ) {
    return this.profiles.createFromMultipart('special_guest', dto, image);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update a special guest profile (admin); optional new image',
  })
  @ApiBody({
    description: 'Send only fields to change; optional **`image`** file.',
    schema: multipartPatchSchema,
  })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @InvalidateCache({
    patterns: ['special-guests:*', 'admin:special-guests:*'],
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateConferenceProfileMultipartDto,
    @UploadedFile() image: Express.Multer.File | undefined,
  ) {
    return this.profiles.updateFromMultipart(id, 'special_guest', dto, image);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a special guest profile (admin)' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @InvalidateCache({
    patterns: ['special-guests:*', 'admin:special-guests:*'],
  })
  remove(@Param('id') id: string) {
    return this.profiles.remove(id, 'special_guest');
  }
}
