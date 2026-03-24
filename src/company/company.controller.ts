import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreatePublicCompanyLeadDto } from './dto/create-public-company-lead.dto';
import { BoothService } from '../booth/booth.service';
import { CompanyService } from './company.service';
import { effectiveDisplayTier } from './company-tier.util';

@ApiTags('companies')
@Controller('api/companies')
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly boothService: BoothService,
  ) {}

  @Get('booths/available')
  @ApiOperation({ summary: 'List available (non-taken) booths for companies' })
  @ApiResponse({ status: 200, description: 'List of available booths' })
  async getAvailableBooths() {
    return this.boothService.findAvailable();
  }

  @Get('sponsorship-plans')
  @ApiOperation({
    summary: 'List active sponsorship plans (public checkout catalog)',
  })
  async listSponsorshipPlans() {
    return this.companyService.listActiveSponsorshipPlans();
  }

  @Get('session-slots/available')
  @ApiOperation({
    summary:
      'List purchasable session slots (masterclass, panel, presentation): published, not taken, not reserved',
  })
  @ApiResponse({ status: 200, description: 'Three arrays keyed by slot type' })
  async listAvailableSessionSlots() {
    return this.companyService.listAvailableSessionSlots();
  }

  @Get('public')
  @ApiOperation({ summary: 'List registered companies for public display' })
  @ApiResponse({ status: 200, description: 'List of companies' })
  async getPublicCompanies() {
    return this.companyService.findPublic();
  }

  @Post('public/:slug/lead')
  @HttpCode(201)
  @ApiOperation({ summary: 'Submit a lead / inquiry (public)' })
  @ApiResponse({ status: 201, description: 'Lead recorded' })
  async createPublicLead(
    @Param('slug') slug: string,
    @Body() dto: CreatePublicCompanyLeadDto,
  ) {
    return this.companyService.createPublicLead(slug, dto);
  }

  @Post('public/:slug/track-view')
  @ApiOperation({
    summary:
      'Increment profile view counter (call once when showing public profile)',
  })
  @ApiResponse({ status: 200, description: 'View counted' })
  async trackPublicView(@Param('slug') slug: string) {
    return this.companyService.trackPublicProfileView(slug);
  }

  @Get('public/:slug/products/:productId/whatsapp')
  @ApiOperation({
    summary:
      'Record WhatsApp product inquiry click and redirect to wa.me (uses company primary contact phone)',
  })
  @ApiResponse({ status: 302, description: 'Redirect to WhatsApp' })
  @ApiResponse({ status: 400, description: 'Primary phone missing or invalid' })
  @ApiResponse({ status: 404, description: 'Company or product not found' })
  async redirectWhatsappProductInquiry(
    @Param('slug') slug: string,
    @Param('productId') productId: string,
    @Res() res: Response,
  ) {
    const url = await this.companyService.getWhatsappProductInquiryRedirectUrl(
      slug,
      productId,
    );
    return res.redirect(302, url);
  }

  @Get('public/:slug')
  @ApiOperation({ summary: 'Get public company profile by slug' })
  @ApiResponse({ status: 200, description: 'Company found' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async getPublicCompanyBySlug(@Param('slug') slug: string) {
    const company = await this.companyService.findPublicBySlug(slug);
    if (!company) {
      throw new NotFoundException(`Company ${slug} not found`);
    }
    return company;
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get company profile by slug (alias)' })
  async getCompanyBySlug(@Param('slug') slug: string) {
    const company = await this.companyService.findPublicBySlug(slug);
    if (!company) {
      throw new NotFoundException(`Company ${slug} not found`);
    }
    return company;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  async findOne(@Param('id') id: string) {
    const company = await this.companyService.findById(id);
    if (!company) {
      throw new NotFoundException(`Company ${id} not found`);
    }
    return {
      ...company,
      effectiveDisplayTier: effectiveDisplayTier(company),
    };
  }
}
