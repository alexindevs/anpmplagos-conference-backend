import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminDashboardService } from './admin-dashboard.service';
import { HttpCacheInterceptor, CacheKey, CacheTTL } from '../cache';

@ApiTags('Admin - Dashboard')
@Controller('api/admin/dashboard')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
@UseInterceptors(HttpCacheInterceptor)
export class AdminDashboardController {
  constructor(private readonly adminDashboard: AdminDashboardService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Get dashboard summary statistics',
    description:
      'Includes aggregate counts, **`recentRegistrations`**, and **`booths.all`** (every booth slot with **`takenBy`** when assigned to a company).',
  })
  @ApiOkResponse({
    description: 'Summary payload',
    schema: {
      example: {
        recentRegistrations: [
          {
            userId: 'clx…',
            name: 'Jane Doe',
            profilePicture: 'https://res.cloudinary.com/…/avatar.jpg',
            regType: 'member',
            regTypeLabel: 'Member',
            createdAt: '2026-03-10T12:00:00.000Z',
          },
        ],
        registrations: {
          total: 150,
          members: 50,
          attendees: 60,
          companies: 40,
        },
        booths: {
          total: 100,
          available: 40,
          reserved: 15,
          occupied: 45,
          all: [
            {
              id: 'clx…',
              name: 'A1',
              size: '10x10',
              price: 15000000,
              boothImage: 'https://…',
              description: null,
              tier: 'gold',
              isTaken: true,
              isReserved: false,
              takenBy: {
                id: 'clx…',
                name: 'Acme Ltd',
                slug: 'acme-ltd',
              },
            },
          ],
        },
        sessions: { masterclasses: 8, panels: 12 },
        sponsorships: {
          companyAccounts: 40,
          paidPlanRevenueKobo: 500000000,
          recordedSponsorshipPaidTotalKobo: 480000000,
        },
      },
    },
  })
  @CacheKey('admin:dashboard:summary')
  @CacheTTL(60)
  getSummary() {
    return this.adminDashboard.getSummary();
  }
}
