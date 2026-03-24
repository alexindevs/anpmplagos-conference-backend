import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class InitBoothPaymentDto {
  @ApiPropertyOptional({
    description:
      '**Admin only.** Company users must omit this; the server uses `user.company.id` from the JWT. Required for admin to specify which company pays.',
  })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({ example: 'cuid_booth_id' })
  @IsString()
  @IsNotEmpty()
  boothId: string;
}
