import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  Request,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ModeratorGuard } from '../auth/guards/moderator.guard';
import { AttendanceService } from './attendance.service';
import { ConferenceDayService } from '../conference-day/conference-day.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

@Controller('api/attendance')
@UseGuards(JwtAuthGuard, ModeratorGuard)
export class AttendanceController {
  constructor(
    private readonly service: AttendanceService,
    private readonly conferenceDayService: ConferenceDayService,
  ) {}

  @Get('days/active')
  getActiveDays() {
    return this.service.getActiveDays();
  }

  @Get('days/all')
  getAllDays() {
    return this.conferenceDayService.findAll();
  }

  @Get('scan/:userId')
  getScanDetails(
    @Param('userId') userId: string,
    @Query('eventDayId') eventDayId?: string,
  ) {
    return this.service.getScanDetails(userId, eventDayId);
  }

  @Post('mark')
  markAttendance(@Body() dto: MarkAttendanceDto, @Request() req: any) {
    return this.service.markAttendance(dto, req.user.id);
  }

  @Get('days/:dayId/checkins')
  getDayCheckins(
    @Param('dayId') dayId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.conferenceDayService.getDayAttendance(
      dayId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 100,
    );
  }

  @Get('report/pdf')
  async downloadPdf(
    @Query('eventDayId') eventDayId: string | undefined,
    @Res() res: Response,
  ) {
    const { buffer, filename } =
      await this.conferenceDayService.generateAttendancePdf(
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
