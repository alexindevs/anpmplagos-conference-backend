import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsPositive,
  IsEnum,
  IsBoolean,
  IsArray,
  IsOptional,
  IsNotIn,
  Min,
} from 'class-validator';
import {
  ConferenceDay,
  SessionSlotDuration,
  SponsorTier,
} from '@prisma/client';

const BUNDLE_BOOTH_TIERS = [
  SponsorTier.gold,
  SponsorTier.platinum,
  SponsorTier.headliner,
] as const;

export class UpdateSponsorshipPlanDto {
  @ApiPropertyOptional({
    description: 'Name of the sponsorship plan',
    example: 'Gold Sponsor Package',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Price in kobo (1 Naira = 100 kobo)',
    example: 500000,
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  priceInKobo?: number;

  @ApiPropertyOptional({
    description:
      'Recognition tier for this plan (bronze–headliner). Company baseline tier is separate.',
    enum: SponsorTier,
    example: 'gold',
  })
  @IsEnum(SponsorTier)
  @IsNotIn([SponsorTier.default], {
    message: 'Sponsorship plan tier cannot be default',
  })
  @IsOptional()
  tier?: SponsorTier;

  @ApiPropertyOptional({
    description: 'List of perks/benefits included in this plan',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  perks?: string[];

  @ApiPropertyOptional({
    description: 'Whether this plan is active and available for purchase',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Number of conference ticket admits included',
    example: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  ticketAdmits?: number;

  @ApiPropertyOptional({
    description:
      'If set, bundle assigns one available booth of this tier at checkout (gold, platinum, or headliner only)',
    enum: BUNDLE_BOOTH_TIERS,
  })
  @IsEnum(SponsorTier)
  @IsOptional()
  bundleBoothTier?: SponsorTier;

  @ApiPropertyOptional({ enum: SessionSlotDuration })
  @IsEnum(SessionSlotDuration)
  @IsOptional()
  bundleMasterclassDuration?: SessionSlotDuration;

  @ApiPropertyOptional({ enum: ConferenceDay })
  @IsEnum(ConferenceDay)
  @IsOptional()
  bundleMasterclassDay?: ConferenceDay;

  @ApiPropertyOptional({ enum: SessionSlotDuration })
  @IsEnum(SessionSlotDuration)
  @IsOptional()
  bundlePresentationDuration?: SessionSlotDuration;

  @ApiPropertyOptional({ enum: ConferenceDay })
  @IsEnum(ConferenceDay)
  @IsOptional()
  bundlePresentationDay?: ConferenceDay;

  @ApiPropertyOptional({
    description:
      'Replace linked advert slots when provided (empty array clears links)',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  advertSlotIds?: string[];

  @ApiPropertyOptional({
    description:
      'Replace linked branding slots when provided (empty array clears links)',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  brandingSlotIds?: string[];
}
