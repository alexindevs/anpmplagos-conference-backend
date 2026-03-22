import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MasterclassService } from './masterclass.service';
import { CreateMasterclassDto, UpdateMasterclassDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Admin - Masterclasses')
@Controller('api/admin/masterclasses')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class MasterclassController {
  constructor(private readonly masterclassService: MasterclassService) {}

  @Get()
  @ApiOperation({ summary: 'List all masterclasses' })
  async findAll() {
    return this.masterclassService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single masterclass' })
  async findOne(@Param('id') id: string) {
    return this.masterclassService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new masterclass' })
  async create(@Body() dto: CreateMasterclassDto) {
    return this.masterclassService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a masterclass' })
  async update(@Param('id') id: string, @Body() dto: UpdateMasterclassDto) {
    return this.masterclassService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a masterclass' })
  async delete(@Param('id') id: string) {
    return this.masterclassService.delete(id);
  }
}
