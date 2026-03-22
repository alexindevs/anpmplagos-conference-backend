import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RegistrationService } from './registration.service';

@ApiTags('members')
@Controller('api/members')
export class MemberController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get member profile by slug' })
  @ApiResponse({ status: 200, description: 'Member found' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async findBySlug(@Param('slug') slug: string) {
    const member = await this.registrationService.findMemberBySlug(slug);
    if (!member) {
      throw new NotFoundException(`Member ${slug} not found`);
    }
    return member;
  }
}
