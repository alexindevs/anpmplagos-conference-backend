import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { CreateRegistrationBaseDto } from './create-registration.dto';

export class CreateAttendeeRegistrationDto extends CreateRegistrationBaseDto {
  @ApiProperty({
    example: 'attendee',
    description: 'Registration type',
    enum: ['attendee'],
  })
  regType: 'attendee' = 'attendee';

  @ApiProperty({
    example: 'Dr. Sarah Adebayo',
    description: 'Registrant full name',
  })
  @IsString()
  @MaxLength(255)
  fullName: string;

  @ApiProperty({
    example: '+234 800 111 2222',
    description: 'Registrant phone number',
  })
  @IsString()
  @MaxLength(30)
  phone: string;

  @ApiProperty({
    example: 'Short bio or interests',
    description: 'Short bio / interests',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiProperty({
    example: true,
    description: 'Whether registrant is in medical field',
  })
  @IsBoolean()
  inMedicalField: boolean;

  @ApiProperty({
    example: 'pediatrics',
    description: 'Primary specialty (if in medical field)',
    required: false,
  })
  @ValidateIf((o) => o.inMedicalField === true)
  @IsString()
  @MaxLength(100)
  primarySpecialty?: string;

  @ApiProperty({
    example: 'Private Clinic Lagos',
    description: 'Hospital or organization name (if in medical field)',
    required: false,
  })
  @ValidateIf((o) => o.inMedicalField === true)
  @IsString()
  @MaxLength(255)
  hospitalOrg?: string;

  @ApiProperty({
    example: 'Healthcare Administrator',
    description: 'Free-text occupation (if not in medical field)',
    required: false,
  })
  @ValidateIf((o) => o.inMedicalField === false)
  @IsString()
  @MaxLength(255)
  occupation?: string;
}
