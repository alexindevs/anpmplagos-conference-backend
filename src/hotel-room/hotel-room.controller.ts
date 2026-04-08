import { HotelRoomService } from './hotel-room.service';
import { Controller, Get, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HttpCacheInterceptor, CacheKey, CacheTTL } from '../cache';

type AuthedReq = { user: AuthUser };

@ApiTags('hotel-rooms')
@Controller('api/hotel-rooms')
@UseInterceptors(HttpCacheInterceptor)
export class HotelRoomController {
  constructor(private readonly hotelRoomService: HotelRoomService) {}

  @Get('available')
  @ApiOperation({
    summary: 'List hotel room slots available for purchase',
    description:
      'Returns only slots where **`isBooked`** and **`isReserved`** are false. Taken or admin-reserved rooms are not included.',
  })
  @CacheKey('hotel-rooms:available')
  @CacheTTL(120)
  listAvailable() {
    return this.hotelRoomService.findAvailable();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my booked hotel rooms' })
  @CacheKey('hotel-rooms:me:{userId}')
  @CacheTTL(180)
  listMyBookedRooms(@Req() req: AuthedReq) {
    return this.hotelRoomService.listMyBookedRooms(req.user.id);
  }
}
