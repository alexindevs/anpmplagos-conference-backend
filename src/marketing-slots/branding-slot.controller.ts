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
import { BrandingSlotService } from './branding-slot.service';

type AuthedReq = { user: AuthUser };

@ApiTags('branding-slots')
@Controller('api/branding-slots')
export class BrandingSlotController {
  constructor(private readonly brandingSlotService: BrandingSlotService) {}

  @Get('available')
  @ApiOperation({
    summary: 'List branding slots available for purchase',
    description: 'Slots where **`isTaken`** and **`isReserved`** are false.',
  })
  listAvailable() {
    return this.brandingSlotService.findAvailable();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List my purchased branding slots (company only)',
    description:
      'Sanitized rows for slots assigned to your company after successful payment or admin assign.',
  })
  listMine(@Req() req: AuthedReq) {
    if (req.user.regType !== 'company' || !req.user.company?.id) {
      throw new ForbiddenException('Company account required');
    }
    return this.brandingSlotService.findMineSanitized(req.user.company.id);
  }
}
