import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BoothService } from './booth.service';
import { HttpCacheInterceptor, CacheKey, CacheTTL } from '../cache';

@ApiTags('Booths (public)')
@Controller('api/booths')
@UseInterceptors(HttpCacheInterceptor)
@CacheTTL(120)
export class BoothPublicController {
  constructor(private readonly boothService: BoothService) {}

  @Get('available')
  @ApiOperation({
    summary: 'List booths available for purchase (public)',
    description:
      'Same data as `GET /api/companies/booths/available`. Use for booking UIs; does not include occupied booths.',
  })
  @CacheKey('booths:available')
  listAvailable() {
    return this.boothService.findAvailable();
  }

  @Get('directory')
  @ApiOperation({
    summary: 'Public directory of occupied booths (public)',
    description:
      'Returns only booths with **isTaken: true** (assigned to a company). Empty and admin-reserved (untaken) slots are omitted. For **available** slots to purchase, use **GET /api/booths/available**. **slotTier** is the booth row/zone tier. **occupiedBy.effectiveDisplayTier** is the company\'s effective tier (booth vs sponsorship).',
  })
  @CacheKey('booths:directory')
  directory() {
    return this.boothService.findPublicDirectory();
  }
}
