import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ConferenceDay, SessionSlotDuration } from '@prisma/client';

export class CreatePresentationDto {
  @ApiProperty({ example: 'Product showcase presentation' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'A dedicated slot for your company presentation' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    example: 250000000,
    description: 'Price in kobo (250,000,000 = ₦2,500,000)',
  })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  priceInKobo: number;

  @ApiProperty({ enum: SessionSlotDuration, example: SessionSlotDuration.m30 })
  @IsEnum(SessionSlotDuration)
  slotDuration: SessionSlotDuration;

  @ApiProperty({ enum: ConferenceDay, example: ConferenceDay.day_1 })
  @IsEnum(ConferenceDay)
  conferenceDay: ConferenceDay;
}
