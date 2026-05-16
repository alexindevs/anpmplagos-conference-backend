import {
  Controller,
  ForbiddenException,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdvertSlotService } from './advert-slot.service';

type AuthedReq = { user: AuthUser };

@ApiTags('advert-slots')
@Controller('api/advert-slots')
export class AdvertSlotController {
  constructor(private readonly advertSlotService: AdvertSlotService) {}

  @Get('available')
  @ApiOperation({
    summary: 'List advert slots available for purchase',
    description: 'Slots where **`availableSlots > 0`** and **`isReserved`** is false.',
  })
  listAvailable() {
    return this.advertSlotService.findAvailable();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List my purchased advert slots (company only)',
    description:
      'Sanitized rows for slots assigned to your company after successful payment or admin assign.',
  })
  listMine(@Req() req: AuthedReq) {
    if (req.user.regType !== 'company' || !req.user.company?.id) {
      throw new ForbiddenException('Company account required');
    }
    return this.advertSlotService.findMineSanitized(req.user.company.id);
  }
}
