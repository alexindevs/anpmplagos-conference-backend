import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ElectionsService } from './elections.service';
import { ToggleVotingDto } from './dto/toggle-voting.dto';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';

@Controller('api/admin/elections')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminElectionsController {
  constructor(private readonly service: ElectionsService) {}

  // ── Settings ──────────────────────────────────────────────────────────────

  @Get('settings')
  getSettings() {
    return this.service.getSettings();
  }

  @Patch('settings')
  toggleVoting(@Body() dto: ToggleVotingDto, @Request() req: any) {
    return this.service.toggleVoting(dto.isActive, req.user.admin?.id ?? req.user.id);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  @Get('stats')
  getStats() {
    return this.service.getStats();
  }

  // ── Results ───────────────────────────────────────────────────────────────

  @Get('results')
  getResults() {
    return this.service.getResults();
  }

  // ── Audit ─────────────────────────────────────────────────────────────────

  @Get('audit')
  getAudit(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.service.getAuditLog(page, limit);
  }

  @Get('audit/export')
  async exportAuditCsv(@Res() res: Response) {
    const csv = await this.service.generateAuditCsv();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `election-audit-${timestamp}.csv`;
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(Buffer.byteLength(csv, 'utf-8')),
    });
    res.end(csv);
  }

  // ── Positions ─────────────────────────────────────────────────────────────

  @Get('positions')
  listPositions() {
    return this.service.listPositions();
  }

  @Post('positions')
  createPosition(@Body() dto: CreatePositionDto) {
    return this.service.createPosition(dto);
  }

  @Patch('positions/:id')
  updatePosition(@Param('id') id: string, @Body() dto: UpdatePositionDto) {
    return this.service.updatePosition(id, dto);
  }

  @Delete('positions/:id')
  deletePosition(@Param('id') id: string) {
    return this.service.deletePosition(id);
  }

  // ── Candidates ────────────────────────────────────────────────────────────

  @Get('positions/:positionId/candidates')
  listCandidates(@Param('positionId') positionId: string) {
    return this.service.listCandidates(positionId);
  }

  @Post('positions/:positionId/candidates')
  @UseInterceptors(FileInterceptor('avatar'))
  createCandidate(
    @Param('positionId') positionId: string,
    @Body() dto: CreateCandidateDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.service.createCandidate(positionId, dto, avatar);
  }

  @Patch('candidates/:id')
  @UseInterceptors(FileInterceptor('avatar'))
  updateCandidate(
    @Param('id') id: string,
    @Body() dto: UpdateCandidateDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.service.updateCandidate(id, dto, avatar);
  }

  @Delete('candidates/:id')
  deleteCandidate(@Param('id') id: string) {
    return this.service.deleteCandidate(id);
  }
}
