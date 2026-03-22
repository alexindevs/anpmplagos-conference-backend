import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePanelDto {
  @ApiPropertyOptional({ example: 'Healthcare Policy Discussion - Updated' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'Panel discussion on emerging healthcare policies' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '2026-06-15T14:00:00Z' })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ example: '2026-06-15T16:00:00Z' })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({ example: 'Conference Room B' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({
    example: 250000000,
    description: 'Price in kobo (250,000,000 = ₦2,500,000)',
  })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  priceInKobo?: number;

  @ApiPropertyOptional({ example: 'cuid_sponsor_id' })
  @IsString()
  @IsOptional()
  sponsorId?: string;

  @ApiPropertyOptional({
    enum: ['draft', 'published', 'cancelled'],
    example: 'published',
  })
  @IsEnum(['draft', 'published', 'cancelled'])
  @IsOptional()
  status?: 'draft' | 'published' | 'cancelled';
}
