import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminModeratorsService } from './admin-moderators.service';

class InviteModeratorDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

@Controller('api/admin/moderators')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminModeratorsController {
  constructor(private readonly service: AdminModeratorsService) {}

  @Post('invite')
  invite(@Body() dto: InviteModeratorDto) {
    return this.service.invite(dto.email);
  }

  @Get()
  listModerators() {
    return this.service.listModerators();
  }

  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.service.deactivateModerator(id);
  }

  @Delete('invites/:id')
  revokeInvite(@Param('id') id: string) {
    return this.service.revokeInvite(id);
  }
}
