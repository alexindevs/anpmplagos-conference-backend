import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentKind, PaymentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ReceiptQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional({
    enum: [
      'registration',
      'order',
      'booth',
      'masterclass',
      'panel',
      'presentation',
      'hotel_room',
      'sponsorship_plan',
      'advert_slot',
      'branding_slot',
    ],
  })
  @IsOptional()
  @IsEnum([
    'registration',
    'order',
    'booth',
    'masterclass',
    'panel',
    'presentation',
    'hotel_room',
    'sponsorship_plan',
    'advert_slot',
    'branding_slot',
  ])
  kind?: PaymentKind;

  @ApiPropertyOptional({
    enum: ['pending', 'success', 'failed', 'refunded'],
  })
  @IsOptional()
  @IsEnum(['pending', 'success', 'failed', 'refunded'])
  status?: PaymentStatus;

  @ApiPropertyOptional({ example: 'PAY-123456' })
  @IsOptional()
  @IsString()
  reference?: string;
}
