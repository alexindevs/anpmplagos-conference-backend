import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateBrandingSlotMultipartDto {
  @ApiProperty({ example: 'Stage backdrop — left' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    example: 12_000_000,
    description: 'Price in kobo',
  })
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return value;
    const n = Number(value);
    return Number.isNaN(n) ? value : n;
  })
  @IsNumber()
  price: number;

  @ApiPropertyOptional({ example: 'Physical branding at main hall' })
  @Transform(({ value }) =>
    value === '' || value === undefined || value === null ? undefined : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: false })
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
      'Optional image URL if you are not uploading **`brandingSlotImage`**',
  })
  @Transform(({ value }) =>
    value === '' || value === undefined || value === null ? undefined : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(2083)
  brandingSlotImageUrl?: string;
}
