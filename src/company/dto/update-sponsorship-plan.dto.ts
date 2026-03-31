import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsPositive,
  IsEnum,
  IsBoolean,
  IsArray,
  IsOptional,
} from 'class-validator';
import { SponsorTier } from '@prisma/client';

export class UpdateSponsorshipPlanDto {
  @ApiProperty({
    description: 'Name of the sponsorship plan',
    example: 'Gold Sponsor Package',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Price in kobo (1 Naira = 100 kobo)',
    example: 500000,
    required: false,
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  priceInKobo?: number;

  @ApiProperty({
    description: 'Sponsorship tier level',
    enum: SponsorTier,
    example: 'gold',
    required: false,
  })
  @IsEnum(SponsorTier)
  @IsOptional()
  tier?: SponsorTier;

  @ApiProperty({
    description: 'List of perks/benefits included in this plan',
    example: ['Logo on website', 'Booth space', '10 tickets'],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  perks?: string[];

  @ApiProperty({
    description: 'Whether this plan is active and available for purchase',
    example: true,
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
