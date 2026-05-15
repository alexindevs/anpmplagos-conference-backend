import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

function emptyToUndefined(v: unknown): unknown {
  if (v === '' || v === undefined || v === null) return undefined;
  return v;
}

export class CreateConferenceProfileMultipartDto {
  @ApiProperty({ example: 'Dr. Ada Okonkwo' })
  @Transform(({ value }) => (value == null ? '' : String(value)))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'Consultant Cardiologist' })
  @Transform(({ value }) => (value == null ? '' : String(value)))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  role: string;

  @ApiProperty({
    example: 'MBBS, FWACS',
    description: 'Qualifications / credentials',
  })
  @Transform(({ value }) => (value == null ? '' : String(value)))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(500)
  qualifications: string;

  @ApiProperty({ example: 'Leading innovation in rural healthcare' })
  @Transform(({ value }) => (value == null ? '' : String(value)))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(500)
  byline: string;

  @ApiProperty({ enum: ['keynote', 'featured'] })
  @Transform(({ value }) => (value == null ? '' : String(value)))
  @IsIn(['keynote', 'featured'])
  highlightType: 'keynote' | 'featured';

  @ApiProperty({
    example: 'Full session bio and topics for the conference website.',
  })
  @Transform(({ value }) => (value == null ? '' : String(value)))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(5000)
  description: string;

  @ApiPropertyOptional({ example: 'https://example.com' })
  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(2083)
  websiteLink?: string;

  @ApiPropertyOptional({ example: 'https://facebook.com/...' })
  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(2083)
  facebookLink?: string;

  @ApiPropertyOptional({ example: 'https://x.com/...' })
  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(2083)
  xLink?: string;

  @ApiPropertyOptional({ example: 'https://instagram.com/...' })
  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(2083)
  instagramLink?: string;
}
