import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SponsorTier } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Form fields for `POST /api/admin/booths` (`multipart/form-data`).
 * Binary field name: **`boothImage`** (optional JPEG/PNG if **`boothImageUrl`** is not sent).
 */
export class CreateBoothMultipartDto {
  @ApiProperty({ example: 'Booth A1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '10x10' })
  @IsString()
  @IsNotEmpty()
  size: string;

  @ApiProperty({
    example: 15000000,
    description: 'Price in kobo (15000000 = ₦150,000)',
  })
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return value;
    const n = Number(value);
    return Number.isNaN(n) ? value : n;
  })
  @IsNumber()
  price: number;

  @ApiPropertyOptional({ example: 'Near main entrance' })
  @Transform(({ value }) =>
    value === '' || value === undefined || value === null ? undefined : value,
  )
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: SponsorTier,
    description: 'Booth slot / zone tier (e.g. platinum row)',
  })
  @Transform(({ value }) =>
    value === '' || value === undefined || value === null ? undefined : value,
  )
  @IsOptional()
  @IsEnum(SponsorTier)
  tier?: SponsorTier;

  @ApiPropertyOptional({
    example: false,
    description: 'Parsed from form strings true/false or 1/0',
  })
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === true || value === 'true' || value === '1') return true;
    if (value === false || value === 'false' || value === '0') return false;
    return value;
  })
  @IsOptional()
  @IsBoolean()
  isReserved?: boolean;

  @ApiPropertyOptional({
    description:
      'Optional image URL if you are not uploading **`boothImage`** (e.g. existing Cloudinary URL)',
  })
  @Transform(({ value }) =>
    value === '' || value === undefined || value === null ? undefined : value,
  )
  @IsOptional()
  @IsString()
  boothImageUrl?: string;
}
