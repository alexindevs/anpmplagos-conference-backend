import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

/**
 * Form fields for `POST /api/exhibitors/me/products` (`multipart/form-data`).
 * Binary field name: **`productImage`** (optional JPEG/PNG).
 */
export class CreateExhibitorProductMultipartDto {
  @ApiProperty({ example: 'Surgical kit model X' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Optional image URL if you are not uploading `productImage`',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkUrl?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined;
    const n = Number(value);
    return Number.isNaN(n) ? undefined : n;
  })
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
