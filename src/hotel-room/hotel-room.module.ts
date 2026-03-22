import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminHotelRoomController } from './admin-hotel-room.controller';
import { HotelRoomController } from './hotel-room.controller';
import { HotelRoomService } from './hotel-room.service';

@Module({
  imports: [AuthModule],
  controllers: [HotelRoomController, AdminHotelRoomController],
  providers: [HotelRoomService],
  exports: [HotelRoomService],
})
export class HotelRoomModule {}
