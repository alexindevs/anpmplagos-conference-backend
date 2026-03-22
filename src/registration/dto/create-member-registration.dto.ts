import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, ValidateIf } from 'class-validator';
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
  fullName: string;

  @ApiProperty({
    example: '+234 800 123 4567',
    description: 'Registrant phone number',
  })
  @IsString()
  phone: string;

  @ApiProperty({
    example: 'General practitioner with 15 years experience.',
    description: 'Short bio / interests',
    required: false,
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({
    example: 'ID-123456',
    description: 'ANPMP membership ID',
  })
  @IsString()
  anpmpId: string;

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
  spouseName?: string;

  @ApiProperty({
    example: 'spouse@example.com',
    description: 'Spouse email',
    required: false,
  })
  @ValidateIf((o) => o.hasSpouse === true)
  @IsString()
  spouseEmail?: string;

  @ApiProperty({
    example: '+234 800 765 4321',
    description: 'Spouse phone',
    required: false,
  })
  @ValidateIf((o) => o.hasSpouse === true)
  @IsString()
  spousePhone?: string;

  @ApiProperty({
    example: 'general',
    description: 'Primary specialty',
    enum: ['general', 'pediatrics', 'surgery', 'traditional', 'other'],
  })
  @IsString()
  primarySpecialty: string;

  @ApiProperty({
    example: 'Lagos State Teaching Hospital',
    description: 'Hospital or organization name',
  })
  @IsString()
  hospitalOrg: string;
}
