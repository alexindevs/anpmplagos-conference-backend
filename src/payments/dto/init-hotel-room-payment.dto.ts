import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class InitHotelRoomPaymentDto {
  @ApiProperty({ example: 'cuid_hotel_room_slot' })
  @IsString()
  @IsNotEmpty()
  hotelRoomId: string;
}
