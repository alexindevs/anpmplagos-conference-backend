import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SponsorTier } from '@prisma/client';

export class UpdateSponsorDto {
  @ApiPropertyOptional({ example: 'Acme Pharmaceuticals Updated' })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional({ example: 'Leading provider of innovative healthcare solutions' })
  @IsString()
  @IsOptional()
  tagline?: string;

  @ApiPropertyOptional({
    example: 'A detailed description of what the sponsor does and why they are sponsoring.',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 150000000,
    description: 'Sponsor amount in kobo (minimum 150,000,000 = ₦1,500,000)',
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(150000000, { message: 'Sponsor amount must be at least ₦1,500,000' })
  sponsorAmount?: number;

  @ApiPropertyOptional({ example: 'https://acmepharma.com' })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ example: 'contact@acmepharma.com' })
  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  primaryContactName?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsString()
  @IsOptional()
  primaryContactPhone?: string;

  @ApiPropertyOptional({
    enum: ['pending_pledge', 'pending_payment', 'active', 'cancelled'],
    example: 'active',
  })
  @IsEnum(['pending_pledge', 'pending_payment', 'active', 'cancelled'])
  @IsOptional()
  status?: 'pending_pledge' | 'pending_payment' | 'active' | 'cancelled';

  @ApiPropertyOptional({
    enum: SponsorTier,
    example: SponsorTier.gold,
  })
  @IsEnum(SponsorTier)
  @IsOptional()
  tier?: SponsorTier;

  @ApiPropertyOptional({ example: 'https://cloudinary.com/logo.png' })
  @IsString()
  @IsOptional()
  logo?: string;

  @ApiPropertyOptional({ example: 'https://cloudinary.com/header.jpg' })
  @IsString()
  @IsOptional()
  headerImage?: string;
}
