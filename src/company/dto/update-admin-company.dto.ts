import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { SponsorTier } from '@prisma/client';

export class UpdateAdminCompanyDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  tagline?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  boothPreference?: string;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  primaryContactName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
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
  logo?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  headerImage?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  profileImage?: string;
}
