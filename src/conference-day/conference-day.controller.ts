import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ConferenceDayService } from './conference-day.service';
import { CreateEventDayDto } from './dto/create-event-day.dto';
import { UpdateEventDayDto } from './dto/update-event-day.dto';

@Controller('api/admin/conference-days')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ConferenceDayController {
  constructor(private readonly service: ConferenceDayService) {}

  @Post()
  create(@Body() dto: CreateEventDayDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEventDayDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get(':id/attendance')
  getDayAttendance(
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.service.getDayAttendance(id, page, limit);
  }

  @Get(':id/attendance/summary')
  getAttendanceSummary(@Param('id') id: string) {
    return this.service.getAttendanceSummary(id);
  }

  @Get('report/pdf')
  async downloadPdf(
    @Query('eventDayId') eventDayId: string | undefined,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.service.generateAttendancePdf(
      eventDayId || undefined,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
  }
}
