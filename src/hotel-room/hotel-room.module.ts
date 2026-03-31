import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminHotelRoomController } from './admin-hotel-room.controller';
import { HotelRoomController } from './hotel-room.controller';
import { HotelRoomService } from './hotel-room.service';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [HotelRoomController, AdminHotelRoomController],
  providers: [HotelRoomService],
  exports: [HotelRoomService],
})
export class HotelRoomModule {}
