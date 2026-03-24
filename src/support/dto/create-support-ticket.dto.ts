import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { SupportTicketCategory } from '@prisma/client';

export class CreateSupportTicketDto {
  @ApiProperty({ example: 'Booth payment callback is failing' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title: string;

  @ApiProperty({
    enum: SupportTicketCategory,
    example: SupportTicketCategory.payments,
  })
  @IsEnum(SupportTicketCategory)
  category: SupportTicketCategory;

  @ApiProperty({
    example:
      'After completing Paystack checkout, the page returns to dashboard but the booth remains unconfirmed.',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description: string;
}

