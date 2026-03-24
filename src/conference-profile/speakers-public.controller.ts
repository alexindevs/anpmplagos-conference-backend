import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConferenceProfileService } from './conference-profile.service';

@ApiTags('speakers')
@Controller('api/speakers')
export class SpeakersPublicController {
  constructor(private readonly profiles: ConferenceProfileService) {}

  @Get()
  @ApiOperation({
    summary: 'List all speaker profiles (public)',
    description:
      'Ordered by highlight type (keynote, then featured), then name.',
  })
  @ApiResponse({ status: 200, description: 'Speaker profiles' })
  findAll() {
    return this.profiles.findAllPublicByKind('speaker');
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get one speaker profile by slug (public)' })
  @ApiResponse({ status: 200, description: 'Speaker profile' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('slug') slug: string) {
    return this.profiles.findBySlugPublic('speaker', slug);
  }
}
