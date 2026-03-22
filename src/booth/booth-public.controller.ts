import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BoothService } from './booth.service';

@ApiTags('booths')
@Controller('api/booths')
export class BoothPublicController {
  constructor(private readonly boothService: BoothService) {}

  @Get('available')
  @ApiOperation({
    summary: 'List booth slots open for purchase (excludes taken and reserved)',
    description:
      'Same data as `GET /api/exhibitors/booths/available`. Use for booking UIs; does not include occupied booths.',
  })
  @ApiResponse({ status: 200, description: 'Available booths only' })
  listAvailable() {
    return this.boothService.findAvailable();
  }

  @Get('public')
  @ApiOperation({
    summary: 'Public list of taken booths only (who holds each slot)',
    description:
      'Returns only booths with **`isTaken: true`** (assigned to an exhibitor or sponsor). Empty and admin-reserved (untaken) slots are omitted. For **available** slots to purchase, use **`GET /api/booths/available`**. **slotTier** is the booth row/zone tier. **occupiedBy.tier** is the organisation’s tier. Exhibitor occupants are only listed when registration is **registered**.',
  })
  @ApiResponse({ status: 200, description: 'Taken booths with occupancy info' })
  listPublic() {
    return this.boothService.findPublicDirectory();
  }
}
