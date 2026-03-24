import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
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
  name: string;

  @ApiProperty({ example: 'Consultant Cardiologist' })
  @Transform(({ value }) => (value == null ? '' : String(value)))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  role: string;

  @ApiProperty({
    example: 'MBBS, FWACS',
    description: 'Qualifications / credentials',
  })
  @Transform(({ value }) => (value == null ? '' : String(value)))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  qualifications: string;

  @ApiProperty({ example: 'Leading innovation in rural healthcare' })
  @Transform(({ value }) => (value == null ? '' : String(value)))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
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
  description: string;

  @ApiPropertyOptional({ example: 'https://example.com' })
  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  websiteLink?: string;

  @ApiPropertyOptional({ example: 'https://facebook.com/...' })
  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  facebookLink?: string;

  @ApiPropertyOptional({ example: 'https://x.com/...' })
  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  xLink?: string;

  @ApiPropertyOptional({ example: 'https://instagram.com/...' })
  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  instagramLink?: string;
}
