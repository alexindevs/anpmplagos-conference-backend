import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ElectionsService } from './elections.service';
import { CastVoteDto } from './dto/cast-vote.dto';

@Controller('api/elections')
export class ElectionsController {
  constructor(private readonly service: ElectionsService) {}

  /** Public — no auth required. Returns { isActive, activatedAt }. */
  @Get('status')
  getStatus() {
    return this.service.getPublicStatus();
  }

  /** Returns positions with candidates. Requires voting to be active. */
  @Get('positions')
  @UseGuards(JwtAuthGuard)
  getPositions() {
    return this.service.getPublicPositions();
  }

  /** Cast a vote. Only members may vote; duplicates are rejected. */
  @Post('vote')
  @UseGuards(JwtAuthGuard)
  castVote(@Body() dto: CastVoteDto, @Request() req: any) {
    const ipAddress =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ??
      req.ip ??
      null;
    const userAgent = req.headers['user-agent'] ?? null;
    return this.service.castVote(
      req.user.id,
      req.user.regType,
      dto,
      ipAddress,
      userAgent,
    );
  }

  /** Returns the current user's vote history. */
  @Get('my-votes')
  @UseGuards(JwtAuthGuard)
  getMyVotes(@Request() req: any) {
    return this.service.getMyVotes(req.user.id);
  }
}
