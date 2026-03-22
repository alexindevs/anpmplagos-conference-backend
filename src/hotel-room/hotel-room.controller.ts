import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HotelRoomService } from './hotel-room.service';

@ApiTags('hotel-rooms')
@Controller('api/hotel-rooms')
export class HotelRoomController {
  constructor(private readonly hotelRoomService: HotelRoomService) {}

  @Get('available')
  @ApiOperation({
    summary: 'List hotel room slots available for purchase',
    description:
      'Returns only slots where **`isBooked`** and **`isReserved`** are false. Taken or admin-reserved rooms are not included.',
  })
  listAvailable() {
    return this.hotelRoomService.findAvailable();
  }
}
