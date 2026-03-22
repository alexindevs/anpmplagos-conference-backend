import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  NotFoundException,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { CreatePublicExhibitorLeadDto } from './dto/create-public-exhibitor-lead.dto';
import { BoothService } from '../booth/booth.service';
import { ExhibitorService } from './exhibitor.service';
import { ExhibitorAssignBoothDto } from './dto/exhibitor-assign-booth.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('exhibitors')
@Controller('api/exhibitors')
export class ExhibitorController {
  constructor(
    private readonly exhibitorService: ExhibitorService,
    private readonly boothService: BoothService,
  ) {}

  @Get('booths/available')
  @ApiOperation({ summary: 'List available (non-taken) booths for exhibitors' })
  @ApiResponse({ status: 200, description: 'List of available booths' })
  async getAvailableBooths() {
    return this.boothService.findAvailable();
  }

  @Post(':id/booth')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Assign a booth to an exhibitor (admin only)',
    description:
      'Direct booth assignment without Paystack. Exhibitors obtain booths via **`POST /api/payments/booth`** in normal checkout; this endpoint is for admin override only.',
  })
  @ApiBody({ type: ExhibitorAssignBoothDto })
  @ApiResponse({ status: 200, description: 'Booth assigned' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Exhibitor or booth not found' })
  async assignBooth(
    @Param('id') exhibitorId: string,
    @Body() dto: ExhibitorAssignBoothDto,
  ) {
    const exhibitor = await this.exhibitorService.findById(exhibitorId);
    if (!exhibitor) {
      throw new NotFoundException(`Exhibitor ${exhibitorId} not found`);
    }
    return this.exhibitorService.selectBooth(exhibitorId, dto.boothId);
  }

  @Get('public/list')
  @ApiOperation({ summary: 'List confirmed exhibitors for public display' })
  @ApiResponse({ status: 200, description: 'List of exhibitors' })
  async getPublicExhibitors() {
    return this.exhibitorService.findPublic();
  }

  @Post('public/:slug/lead')
  @HttpCode(201)
  @ApiOperation({ summary: 'Submit a lead / inquiry (public)' })
  @ApiResponse({ status: 201, description: 'Lead recorded' })
  async createPublicLead(
    @Param('slug') slug: string,
    @Body() dto: CreatePublicExhibitorLeadDto,
  ) {
    return this.exhibitorService.createPublicLead(slug, dto);
  }

  @Post('public/:slug/track-view')
  @ApiOperation({
    summary:
      'Increment profile view counter (call once when showing public profile)',
  })
  @ApiResponse({ status: 200, description: 'View counted' })
  async trackPublicView(@Param('slug') slug: string) {
    return this.exhibitorService.trackPublicProfileView(slug);
  }

  @Get('public/:slug/products/:productId/whatsapp')
  @ApiOperation({
    summary:
      'Record WhatsApp product inquiry click and redirect to wa.me (uses exhibitor primary contact phone)',
  })
  @ApiResponse({ status: 302, description: 'Redirect to WhatsApp' })
  @ApiResponse({ status: 400, description: 'Primary phone missing or invalid' })
  @ApiResponse({ status: 404, description: 'Exhibitor or product not found' })
  async redirectWhatsappProductInquiry(
    @Param('slug') slug: string,
    @Param('productId') productId: string,
    @Res() res: Response,
  ) {
    const url =
      await this.exhibitorService.getWhatsappProductInquiryRedirectUrl(
        slug,
        productId,
      );
    return res.redirect(302, url);
  }

  @Get('public/:slug')
  @ApiOperation({ summary: 'Get public exhibitor by slug' })
  @ApiResponse({ status: 200, description: 'Exhibitor found' })
  @ApiResponse({ status: 404, description: 'Exhibitor not found' })
  async getPublicExhibitorBySlug(@Param('slug') slug: string) {
    const exhibitor = await this.exhibitorService.findPublicBySlug(slug);
    if (!exhibitor) {
      throw new NotFoundException(`Exhibitor ${slug} not found`);
    }
    return exhibitor;
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get exhibitor profile by slug' })
  @ApiResponse({ status: 200, description: 'Exhibitor found' })
  @ApiResponse({ status: 404, description: 'Exhibitor not found' })
  async getExhibitorBySlug(@Param('slug') slug: string) {
    const exhibitor = await this.exhibitorService.findPublicBySlug(slug);
    if (!exhibitor) {
      throw new NotFoundException(`Exhibitor ${slug} not found`);
    }
    return exhibitor;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get exhibitor by ID' })
  @ApiResponse({ status: 200, description: 'Exhibitor found' })
  @ApiResponse({ status: 404, description: 'Exhibitor not found' })
  async findOne(@Param('id') id: string) {
    const exhibitor = await this.exhibitorService.findById(id);
    if (!exhibitor) {
      throw new NotFoundException(`Exhibitor ${id} not found`);
    }
    return exhibitor;
  }
}
