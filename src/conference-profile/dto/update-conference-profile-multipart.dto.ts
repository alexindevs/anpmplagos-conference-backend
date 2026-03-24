import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

function emptyToNull(v: unknown): unknown {
  if (v === '' || v === undefined || v === null) return null;
  return v;
}

export class UpdateConferenceProfileMultipartDto {
  @ApiPropertyOptional({ example: 'Dr. Ada Okonkwo' })
  @Transform(({ value }) =>
    value === '' || value === undefined || value === null
      ? undefined
      : String(value),
  )
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ example: 'Consultant Cardiologist' })
  @Transform(({ value }) =>
    value === '' || value === undefined || value === null
      ? undefined
      : String(value),
  )
  @IsOptional()
  @IsString()
  @MinLength(1)
  role?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) =>
    value === '' || value === undefined || value === null
      ? undefined
      : String(value),
  )
  @IsOptional()
  @IsString()
  @MinLength(1)
  qualifications?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) =>
    value === '' || value === undefined || value === null
      ? undefined
      : String(value),
  )
  @IsOptional()
  @IsString()
  @MinLength(1)
  byline?: string;

  @ApiPropertyOptional({ enum: ['keynote', 'featured'] })
  @Transform(({ value }) =>
    value === '' || value === undefined || value === null
      ? undefined
      : String(value),
  )
  @IsOptional()
  @IsIn(['keynote', 'featured'])
  highlightType?: 'keynote' | 'featured';

  @ApiPropertyOptional()
  @Transform(({ value }) =>
    value === '' || value === undefined || value === null
      ? undefined
      : String(value),
  )
  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => emptyToNull(value))
  @IsOptional()
  @IsString()
  websiteLink?: string | null;

  @ApiPropertyOptional()
  @Transform(({ value }) => emptyToNull(value))
  @IsOptional()
  @IsString()
  facebookLink?: string | null;

  @ApiPropertyOptional()
  @Transform(({ value }) => emptyToNull(value))
  @IsOptional()
  @IsString()
  xLink?: string | null;

  @ApiPropertyOptional()
  @Transform(({ value }) => emptyToNull(value))
  @IsOptional()
  @IsString()
  instagramLink?: string | null;
}
