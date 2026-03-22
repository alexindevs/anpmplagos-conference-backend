import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ExhibitorService } from '../exhibitor/exhibitor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Admin - Exhibitors')
@Controller('api/admin/exhibitors')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminExhibitorController {
  constructor(private readonly exhibitorService: ExhibitorService) {}

  @Get()
  @ApiOperation({ summary: 'List all exhibitors with pagination' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 20 })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? Number(page) : 1;
    const pageSizeNum = pageSize ? Number(pageSize) : 20;
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.exhibitorService['prisma'].exhibitor.findMany({
        where,
        skip,
        take: pageSizeNum,
        include: {
          user: {
            select: {
              email: true,
              registrationStatus: true,
            },
          },
          booth: {
            select: {
              id: true,
              name: true,
              size: true,
            },
          },
          representatives: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.exhibitorService['prisma'].exhibitor.count({ where }),
    ]);

    return {
      items,
      page: pageNum,
      pageSize: pageSizeNum,
      total,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single exhibitor with full details' })
  async findOne(@Param('id') id: string) {
    return this.exhibitorService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update exhibitor details' })
  async update(@Param('id') id: string, @Body() dto: any) {
    const exhibitor = await this.exhibitorService['prisma'].exhibitor.findUnique({
      where: { id },
    });
    if (!exhibitor) {
      throw new Error(`Exhibitor with ID ${id} not found`);
    }

    return this.exhibitorService['prisma'].exhibitor.update({
      where: { id },
      data: dto,
      include: {
        booth: {
          select: {
            id: true,
            name: true,
            size: true,
          },
        },
      },
    });
  }
}
