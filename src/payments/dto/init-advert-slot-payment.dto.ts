import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class InitAdvertSlotPaymentDto {
  @ApiPropertyOptional({
    description:
      '**Admin only.** Company users must omit this. Required for admin to specify which company pays.',
  })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({ example: 'cuid_advert_slot' })
  @IsString()
  @IsNotEmpty()
  advertSlotId: string;
}
