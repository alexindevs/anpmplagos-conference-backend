import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRegistrationsService } from './admin-registrations.service';
import { AdminRegistrationsListQueryDto } from './dto/admin-registrations-list-query.dto';

@ApiTags('Admin - Registrations')
@Controller('api/admin/registrations')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminRegistrationsController {
  constructor(
    private readonly adminRegistrations: AdminRegistrationsService,
  ) {}

  @Get('summary')
  @ApiOperation({
    summary:
      'Registration counts: members, attendees, companies, speaker profiles, special guest profiles, and total non-admin user accounts',
  })
  getSummary() {
    return this.adminRegistrations.getSummary();
  }

  @Get()
  @ApiOperation({
    summary:
      'Paginated list of all non-admin user accounts (member, attendee, company); profile URLs use FRONTEND_URL',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  listRegistrations(@Query() query: AdminRegistrationsListQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    return this.adminRegistrations.listNonAdminRegistrationsPaginated(
      page,
      limit,
    );
  }
}
