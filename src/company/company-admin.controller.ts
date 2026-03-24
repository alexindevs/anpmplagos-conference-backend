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
import { UpdateAdminCompanyDto } from './dto/update-admin-company.dto';
import { AssignAdvertSlotDto } from './dto/assign-advert-slot.dto';
import { AssignBrandingSlotDto } from './dto/assign-branding-slot.dto';
import { CompanyAssignBoothDto } from './dto/company-assign-booth.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Admin - Companies')
@Controller('api/admin/companies')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class CompanyAdminController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  @ApiOperation({ summary: 'List all companies with pagination' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 20 })
  @ApiQuery({ name: 'tier', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('tier') tier?: string,
    @Query('search') search?: string,
  ) {
    return this.companyService.findAllAdmin({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      tier,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single company with full details' })
  async findOne(@Param('id') id: string) {
    return this.companyService.findOneAdmin(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update company details' })
  async update(@Param('id') id: string, @Body() dto: UpdateAdminCompanyDto) {
    return this.companyService.updateAdmin(id, dto);
  }

  @Post(':id/booth')
  @ApiOperation({ summary: 'Assign or unassign booth to company' })
  async assignBooth(
    @Param('id') id: string,
    @Body() dto: CompanyAssignBoothDto,
  ) {
    return this.companyService.assignBoothAdmin(id, dto.boothId ?? null);
  }

  @Post(':id/advert-slots')
  @ApiOperation({
    summary: 'Assign advert slot to company (admin, no Paystack)',
  })
  assignAdvertSlot(
    @Param('id') id: string,
    @Body() dto: AssignAdvertSlotDto,
  ) {
    return this.companyService.assignAdvertSlotAdmin(id, dto.advertSlotId);
  }

  @Delete(':id/advert-slots/:advertSlotId')
  @ApiOperation({ summary: 'Remove company from advert slot (admin)' })
  unassignAdvertSlot(
    @Param('id') id: string,
    @Param('advertSlotId') advertSlotId: string,
  ) {
    return this.companyService.unassignAdvertSlotAdmin(id, advertSlotId);
  }

  @Post(':id/branding-slots')
  @ApiOperation({
    summary: 'Assign branding slot to company (admin, no Paystack)',
  })
  assignBrandingSlot(
    @Param('id') id: string,
    @Body() dto: AssignBrandingSlotDto,
  ) {
    return this.companyService.assignBrandingSlotAdmin(id, dto.brandingSlotId);
  }

  @Delete(':id/branding-slots/:brandingSlotId')
  @ApiOperation({ summary: 'Remove company from branding slot (admin)' })
  unassignBrandingSlot(
    @Param('id') id: string,
    @Param('brandingSlotId') brandingSlotId: string,
  ) {
    return this.companyService.unassignBrandingSlotAdmin(id, brandingSlotId);
  }
}
