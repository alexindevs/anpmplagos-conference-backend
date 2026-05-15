import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { SponsorTier } from '@prisma/client';

export class UpdateAdminCompanyDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  companyName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  tagline?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  boothPreference?: string;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  @MaxLength(2083)
  website?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  contactEmail?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  primaryContactName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(30)
  primaryContactPhone?: string;

  @ApiPropertyOptional({ enum: SponsorTier })
  @IsEnum(SponsorTier)
  @IsOptional()
  highestSponsorshipTier?: SponsorTier;

  @ApiPropertyOptional({
    description: 'Total sponsorship paid in kobo (admin adjustment)',
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  sponsorshipPaidTotalKobo?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(2083)
  logo?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(2083)
  headerImage?: string;
}
