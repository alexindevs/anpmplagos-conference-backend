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
import { PanelService } from './panel.service';
import { CreatePanelDto, UpdatePanelDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Admin - Panel Sessions')
@Controller('api/admin/panels')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class PanelController {
  constructor(private readonly panelService: PanelService) {}

  @Get()
  @ApiOperation({ summary: 'List all panel sessions' })
  async findAll() {
    return this.panelService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single panel session' })
  async findOne(@Param('id') id: string) {
    return this.panelService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new panel session' })
  async create(@Body() dto: CreatePanelDto) {
    return this.panelService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a panel session' })
  async update(@Param('id') id: string, @Body() dto: UpdatePanelDto) {
    return this.panelService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a panel session' })
  async delete(@Param('id') id: string) {
    return this.panelService.delete(id);
  }
}
