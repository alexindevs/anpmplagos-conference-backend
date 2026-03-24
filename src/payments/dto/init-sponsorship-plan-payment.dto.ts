import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class InitSponsorshipPlanPaymentDto {
  @ApiPropertyOptional({
    description:
      '**Admin only.** Company users must omit this; the server uses `user.company.id` from the JWT.',
  })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({ example: 'spl_gold' })
  @IsString()
  @IsNotEmpty()
  sponsorshipPlanId: string;
}
