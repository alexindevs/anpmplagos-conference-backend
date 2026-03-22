import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RegistrationService } from './registration.service';

@ApiTags('attendees')
@Controller('api/attendees')
export class AttendeeController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get attendee profile by slug' })
  @ApiResponse({ status: 200, description: 'Attendee found' })
  @ApiResponse({ status: 404, description: 'Attendee not found' })
  async findBySlug(@Param('slug') slug: string) {
    const attendee = await this.registrationService.findAttendeeBySlug(slug);
    if (!attendee) {
      throw new NotFoundException(`Attendee ${slug} not found`);
    }
    return attendee;
  }
}
