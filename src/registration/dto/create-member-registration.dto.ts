import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { CreateRegistrationBaseDto } from './create-registration.dto';

export class CreateMemberRegistrationDto extends CreateRegistrationBaseDto {
  @ApiProperty({
    example: 'member',
    description: 'Registration type',
    enum: ['member'],
  })
  regType: 'member' = 'member';

  @ApiProperty({
    example: 'Dr. Kayode Olatunji',
    description: 'Registrant full name',
  })
  @IsString()
  @MaxLength(255)
  fullName: string;

  @ApiProperty({
    example: '+234 800 123 4567',
    description: 'Registrant phone number',
  })
  @IsString()
  @MaxLength(30)
  phone: string;

  @ApiProperty({
    example: 'Dr',
    description: 'Title or honorific (optional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  title?: string;

  @ApiProperty({
    example: 'General practitioner with 15 years experience.',
    description: 'Short bio / interests',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiProperty({
    example: 'ID-123456',
    description: 'ANPMP membership ID',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  anpmpId?: string;

  @ApiProperty({
    example: true,
    description: 'Whether spouse is attending',
  })
  @IsBoolean()
  hasSpouse: boolean;

  @ApiProperty({
    example: 'Jane Olatunji',
    description: 'Spouse full name',
    required: false,
  })
  @ValidateIf((o) => o.hasSpouse === true)
  @IsString()
  @MaxLength(255)
  spouseName?: string;

  @ApiProperty({
    example: 'spouse@example.com',
    description: 'Spouse email',
    required: false,
  })
  @ValidateIf((o) => o.hasSpouse === true)
  @IsEmail()
  @MaxLength(255)
  spouseEmail?: string;

  @ApiProperty({
    example: '+234 800 765 4321',
    description: 'Spouse phone',
    required: false,
  })
  @ValidateIf((o) => o.hasSpouse === true)
  @IsString()
  @MaxLength(30)
  spousePhone?: string;

  @ApiProperty({
    example: 'general',
    description: 'Primary specialty',
    enum: ['general', 'pediatrics', 'surgery', 'traditional', 'other'],
  })
  @IsString()
  @MaxLength(100)
  primarySpecialty: string;

  @ApiProperty({
    example: 'Lagos State Teaching Hospital',
    description: 'Hospital or organization name',
  })
  @IsString()
  @MaxLength(255)
  hospitalOrg: string;

  @ApiProperty({
    example: '1 Hospital Road, Lagos',
    description: 'Organization street address',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  organizationAddress: string;

  @ApiProperty({
    example: 'Lagos Zone A',
    description: 'ANPMP zone or chapter grouping',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  zone: string;
}
