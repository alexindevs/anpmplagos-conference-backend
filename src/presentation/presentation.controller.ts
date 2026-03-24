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
import { PresentationService } from './presentation.service';
import { CreatePresentationDto, UpdatePresentationDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Admin - Presentations')
@Controller('api/admin/presentations')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class PresentationController {
  constructor(private readonly presentationService: PresentationService) {}

  @Get()
  @ApiOperation({ summary: 'List all presentation slots' })
  async findAll() {
    return this.presentationService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single presentation slot' })
  async findOne(@Param('id') id: string) {
    return this.presentationService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a presentation slot' })
  async create(@Body() dto: CreatePresentationDto) {
    return this.presentationService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a presentation slot' })
  async update(@Param('id') id: string, @Body() dto: UpdatePresentationDto) {
    return this.presentationService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a presentation slot' })
  async delete(@Param('id') id: string) {
    return this.presentationService.delete(id);
  }
}
