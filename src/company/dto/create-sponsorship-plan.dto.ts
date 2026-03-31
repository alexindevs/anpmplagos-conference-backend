import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsPositive,
  IsEnum,
  IsBoolean,
  IsArray,
  IsOptional,
} from 'class-validator';
import { SponsorTier } from '@prisma/client';

export class CreateSponsorshipPlanDto {
  @ApiProperty({
    description: 'Name of the sponsorship plan',
    example: 'Gold Sponsor Package',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Price in kobo (1 Naira = 100 kobo)',
    example: 500000,
  })
  @IsInt()
  @IsPositive()
  priceInKobo: number;

  @ApiProperty({
    description: 'Sponsorship tier level',
    enum: SponsorTier,
    example: 'gold',
  })
  @IsEnum(SponsorTier)
  tier: SponsorTier;

  @ApiProperty({
    description: 'List of perks/benefits included in this plan',
    example: ['Logo on website', 'Booth space', '10 tickets'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  perks?: string[];

  @ApiProperty({
    description: 'Whether this plan is active and available for purchase',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
