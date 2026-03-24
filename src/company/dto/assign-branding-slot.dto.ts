import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AssignBrandingSlotDto {
  @ApiProperty({ example: 'cuid_branding_slot' })
  @IsString()
  @IsNotEmpty()
  brandingSlotId: string;
}
