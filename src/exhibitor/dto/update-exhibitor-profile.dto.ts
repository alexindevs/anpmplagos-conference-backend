import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateExhibitorProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tagline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  boothPreference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryContactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryContactPhone?: string;

  @ApiPropertyOptional({ description: 'URL for hotel / travel booking for staff' })
  @IsOptional()
  @IsString()
  hotelBookingUrl?: string;

  @ApiPropertyOptional({ description: 'Header banner image URL (e.g. Cloudinary)' })
  @IsOptional()
  @IsString()
  headerImage?: string;

  @ApiPropertyOptional({ description: 'Company logo / profile image URL' })
  @IsOptional()
  @IsString()
  profileImage?: string;
}
