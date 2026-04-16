import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { CreateSponsorshipPlanDto } from './dto/create-sponsorship-plan.dto';
import { UpdateSponsorshipPlanDto } from './dto/update-sponsorship-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import type { SponsorTier } from '@prisma/client';

@ApiTags('Admin - Sponsorship Plans')
@Controller('api/admin/sponsorship-plans')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminSponsorshipPlanController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new sponsorship plan' })
  async create(@Body() dto: CreateSponsorshipPlanDto) {
    return this.companyService.createSponsorshipPlan(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all sponsorship plans (admin view)' })
  @ApiQuery({
    name: 'tier',
    required: false,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'headliner'],
  })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async findAll(
    @Query('tier') tier?: SponsorTier,
    @Query('isActive') isActive?: string,
  ) {
    const filters: { tier?: SponsorTier; isActive?: boolean } = {};
    if (tier) {
      filters.tier = tier;
    }
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }
    return this.companyService.listAllSponsorshipPlans(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single sponsorship plan' })
  async findOne(@Param('id') id: string) {
    const plan = await this.companyService.findSponsorshipPlanById(id);
    if (!plan) {
      return { error: 'Sponsorship plan not found' };
    }
    return plan;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a sponsorship plan' })
  async update(@Param('id') id: string, @Body() dto: UpdateSponsorshipPlanDto) {
    return this.companyService.updateSponsorshipPlan(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a sponsorship plan (only if no payments exist)',
  })
  async remove(@Param('id') id: string) {
    return this.companyService.deleteSponsorshipPlan(id);
  }
}
