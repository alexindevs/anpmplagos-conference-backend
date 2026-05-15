import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateGalleryItemMultipartDto {
  @ApiPropertyOptional({
    example: 'Opening keynote — Dr. Smith',
    description: 'Visible caption under the image (optional)',
  })
  @Transform(({ value }) =>
    value === '' || value === undefined || value === null ? '' : String(value),
  )
  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;
}
