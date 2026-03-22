import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class InitBoothPaymentDto {
  @ApiProperty({ example: 'cuid_exhibitor_id' })
  @IsString()
  @IsNotEmpty()
  exhibitorId: string;

  @ApiProperty({ example: 'cuid_booth_id' })
  @IsString()
  @IsNotEmpty()
  boothId: string;
}
