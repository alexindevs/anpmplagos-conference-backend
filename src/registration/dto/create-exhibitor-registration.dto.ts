import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRegistrationBaseDto } from './create-registration.dto';
import { CreateRepresentativeDto } from './create-representative.dto';

export class CreateExhibitorRegistrationDto extends CreateRegistrationBaseDto {
  @ApiProperty({
    example: 'exhibitor',
    description: 'Registration type',
    enum: ['exhibitor'],
  })
  regType: 'exhibitor' = 'exhibitor';

  @ApiProperty({
    example: 'MediCorp Solutions',
    description: 'Company/organization name',
  })
  @IsString()
  companyName: string;

  @ApiProperty({
    example: 'Leading the way in patient diagnostics',
    description: 'Short tagline',
    required: false,
  })
  @IsOptional()
  @IsString()
  tagline?: string;

  @ApiProperty({
    example: 'Hall A, near entrance',
    description: 'Booth preference notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  boothPreference?: string;

  @ApiProperty({
    example: 'https://www.medicorpsolutions.com',
    description: 'Company website URL',
    required: false,
  })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({
    example: 'contact@medicorp.com',
    description: 'Company contact email',
  })
  @IsString()
  contactEmail: string;

  @ApiProperty({
    example: 'Sarah Jenkins',
    description: 'Primary contact full name',
  })
  @IsString()
  primaryContactName: string;

  @ApiProperty({
    example: '+234 800 555 6666',
    description: 'Primary contact phone',
  })
  @IsString()
  primaryContactPhone: string;

  @ApiProperty({
    type: [CreateRepresentativeDto],
    example: [
      {
        name: 'Sarah Jenkins',
        title: 'VP of Sales',
        phone: '+234 800 555 6666',
      },
      {
        name: 'Michael Chen',
        title: 'Product Manager',
        phone: '+234 800 777 8888',
      },
    ],
    description: 'Booth representatives; at least one required',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one representative is required' })
  @ValidateNested({ each: true })
  @Type(() => CreateRepresentativeDto)
  representatives: CreateRepresentativeDto[];
}
