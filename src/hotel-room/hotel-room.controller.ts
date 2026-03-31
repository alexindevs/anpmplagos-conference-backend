import { HotelRoomService } from './hotel-room.service';
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

type AuthedReq = { user: AuthUser };

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

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my booked hotel rooms' })
  listMyBookedRooms(@Req() req: AuthedReq) {
    return this.hotelRoomService.listMyBookedRooms(req.user.id);
  }
}
