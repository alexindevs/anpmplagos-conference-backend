import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AssignAdvertSlotDto {
  @ApiProperty({ example: 'cuid_advert_slot' })
  @IsString()
  @IsNotEmpty()
  advertSlotId: string;
}
