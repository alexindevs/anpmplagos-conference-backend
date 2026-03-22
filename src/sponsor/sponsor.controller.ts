import {
  Controller,
  Get,
  NotFoundException,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SponsorService } from './sponsor.service';
import { UpdateSponsorDto } from './dto/update-sponsor.dto';
import { SponsorAssignBoothDto } from './dto/sponsor-assign-booth.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('api')
export class SponsorController {
  constructor(private readonly sponsorService: SponsorService) {}

  // Admin endpoints
  @ApiTags('Admin - Sponsors')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @Get('admin/sponsors')
  @ApiOperation({ summary: 'List all sponsors with pagination' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 20 })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'tier', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('tier') tier?: string,
    @Query('search') search?: string,
  ) {
    return this.sponsorService.findAll({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status,
      tier,
      search,
    });
  }

  @ApiTags('Admin - Sponsors')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @Get('admin/sponsors/:id')
  @ApiOperation({ summary: 'Get a single sponsor with full details' })
  async findOne(@Param('id') id: string) {
    return this.sponsorService.findOne(id);
  }

  @ApiTags('Admin - Sponsors')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @Patch('admin/sponsors/:id')
  @ApiOperation({ summary: 'Update sponsor details' })
  async update(@Param('id') id: string, @Body() dto: UpdateSponsorDto) {
    return this.sponsorService.update(id, dto);
  }

  @ApiTags('Admin - Sponsors')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @Post('admin/sponsors/:id/booth')
  @ApiOperation({ summary: 'Assign or unassign booth to sponsor' })
  async assignBooth(@Param('id') id: string, @Body() dto: SponsorAssignBoothDto) {
    return this.sponsorService.assignBooth(id, dto.boothId ?? null);
  }

  // Public endpoints
  @ApiTags('Sponsors')
  @Get('sponsors/public')
  @ApiOperation({ summary: 'List active sponsors for public display' })
  async getPublicSponsors() {
    return this.sponsorService.findPublic();
  }

  @ApiTags('Sponsors')
  @Get('sponsors/slug/:slug')
  @ApiOperation({ summary: 'Get sponsor profile by slug' })
  async getSponsorBySlug(@Param('slug') slug: string) {
    const sponsor = await this.sponsorService.findPublicBySlug(slug);
    if (!sponsor) {
      throw new NotFoundException(`Sponsor ${slug} not found`);
    }
    return sponsor;
  }
}
