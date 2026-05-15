import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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
  @MaxLength(255)
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
  @MaxLength(255)
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
  @MaxLength(500)
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
  @MaxLength(500)
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
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => emptyToNull(value))
  @IsOptional()
  @IsString()
  @MaxLength(2083)
  websiteLink?: string | null;

  @ApiPropertyOptional()
  @Transform(({ value }) => emptyToNull(value))
  @IsOptional()
  @IsString()
  @MaxLength(2083)
  facebookLink?: string | null;

  @ApiPropertyOptional()
  @Transform(({ value }) => emptyToNull(value))
  @IsOptional()
  @IsString()
  @MaxLength(2083)
  xLink?: string | null;

  @ApiPropertyOptional()
  @Transform(({ value }) => emptyToNull(value))
  @IsOptional()
  @IsString()
  @MaxLength(2083)
  instagramLink?: string | null;
}
