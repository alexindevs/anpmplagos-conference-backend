import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePanelDto {
  @ApiPropertyOptional({ example: 'Healthcare Policy Discussion - Updated' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    example: 'Panel discussion on emerging healthcare policies',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 250000000,
    description: 'Price in kobo (250,000,000 = ₦2,500,000)',
  })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  priceInKobo?: number;

  @ApiPropertyOptional({
    enum: ['draft', 'published', 'cancelled'],
    example: 'published',
  })
  @IsEnum(['draft', 'published', 'cancelled'])
  @IsOptional()
  status?: 'draft' | 'published' | 'cancelled';

  @ApiPropertyOptional({
    description: 'Admin hold: slot cannot be purchased while reserved',
  })
  @IsBoolean()
  @IsOptional()
  isReserved?: boolean;
}
