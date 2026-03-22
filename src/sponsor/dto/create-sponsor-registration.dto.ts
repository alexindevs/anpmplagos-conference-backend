import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsNumber,
  Min,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSponsorRegistrationDto {
  @ApiProperty({ example: 'Acme Pharmaceuticals' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiPropertyOptional({ example: 'Leading provider of innovative healthcare solutions' })
  @IsString()
  @IsOptional()
  tagline?: string;

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

  @ApiProperty({ example: 'contact@acmepharma.com' })
  @IsEmail()
  @IsNotEmpty()
  contactEmail: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  primaryContactName: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @IsNotEmpty()
  primaryContactPhone: string;
}
