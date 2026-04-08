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
    name: { type: 'string', example: 'Dr. Ada Okonkwo' },
    role: { type: 'string', example: 'Consultant Cardiologist' },
    qualifications: { type: 'string', example: 'MBBS, FWACS' },
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

@ApiTags('Admin - Speakers')
@Controller('api/admin/speakers')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
@UseInterceptors(HttpCacheInterceptor, CacheInvalidationInterceptor)
export class AdminSpeakersController {
  constructor(private readonly profiles: ConferenceProfileService) {}

  @Get()
  @ApiOperation({
    summary: 'List speaker profiles (admin; same payload as public)',
  })
  @CacheKey('admin:speakers:list')
  @CacheTTL(120)
  list() {
    return this.profiles.findAllPublicByKind('speaker');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one speaker profile by id (admin)' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id') id: string) {
    return this.profiles.findOneAdmin(id, 'speaker');
  }

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create a speaker profile with photo upload (admin)',
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
    patterns: ['speakers:*', 'admin:speakers:*'],
  })
  create(
    @Body() dto: CreateConferenceProfileMultipartDto,
    @UploadedFile() image: Express.Multer.File | undefined,
  ) {
    return this.profiles.createFromMultipart('speaker', dto, image);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update a speaker profile (admin); optional new image',
  })
  @ApiBody({
    description: 'Send only fields to change; optional **`image`** file.',
    schema: multipartPatchSchema,
  })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @InvalidateCache({
    patterns: ['speakers:*', 'admin:speakers:*'],
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateConferenceProfileMultipartDto,
    @UploadedFile() image: Express.Multer.File | undefined,
  ) {
    return this.profiles.updateFromMultipart(id, 'speaker', dto, image);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a speaker profile (admin)' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @InvalidateCache({
    patterns: ['speakers:*', 'admin:speakers:*'],
  })
  remove(@Param('id') id: string) {
    return this.profiles.remove(id, 'speaker');
  }
}
