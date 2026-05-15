import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

type RegContext = {
  regType?: 'member' | 'attendee' | 'company';
  hasSpouse?: boolean;
  inMedicalField?: boolean;
};

/**
 * Unified DTO for registration - validates based on regType.
 * Use this for the single POST /api/registrations endpoint.
 */
export class CreateRegistrationDto {
  @ApiProperty({
    enum: ['member', 'attendee', 'company'],
    example: 'member',
    description: 'Registration type',
  })
  @IsEnum(['member', 'attendee', 'company'])
  regType: 'member' | 'attendee' | 'company';

  @ApiProperty({
    example: 'dr.olatunji@example.com',
    description: 'Login email; must be unique',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'securePassword123',
    description: 'Login password; min 8 characters',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  // Member & Attendee
  @ApiProperty({ example: 'Dr. Kayode Olatunji', required: false })
  @ValidateIf(
    (o: RegContext) => o.regType === 'member' || o.regType === 'attendee',
  )
  @IsString()
  @MaxLength(255)
  fullName?: string;

  @ApiProperty({ example: '+234 800 123 4567', required: false })
  @ValidateIf(
    (o: RegContext) => o.regType === 'member' || o.regType === 'attendee',
  )
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  // Member only
  @ApiProperty({ example: 'ID-123456', required: false })
  @ValidateIf((o: RegContext) => o.regType === 'member')
  @IsString()
  @IsOptional()
  @MaxLength(100)
  anpmpId?: string;

  @ApiProperty({ example: true, required: false })
  @ValidateIf((o: RegContext) => o.regType === 'member')
  @IsBoolean()
  hasSpouse?: boolean;

  @ApiProperty({ example: 'Jane Olatunji', required: false })
  @ValidateIf((o: RegContext) => o.regType === 'member' && o.hasSpouse === true)
  @IsString()
  @MaxLength(255)
  spouseName?: string;

  @ApiProperty({ example: 'spouse@example.com', required: false })
  @ValidateIf((o: RegContext) => o.regType === 'member' && o.hasSpouse === true)
  @IsEmail()
  @MaxLength(255)
  spouseEmail?: string;

  @ApiProperty({ example: '+234 800 765 4321', required: false })
  @ValidateIf((o: RegContext) => o.regType === 'member' && o.hasSpouse === true)
  @IsString()
  @MaxLength(30)
  spousePhone?: string;

  // Member & Attendee (when in medical field)
  @ApiProperty({ example: 'general', required: false })
  @ValidateIf(
    (o: RegContext) =>
      o.regType === 'member' ||
      (o.regType === 'attendee' && o.inMedicalField === true),
  )
  @IsString()
  @MaxLength(100)
  primarySpecialty?: string;

  @ApiProperty({ example: 'Lagos State Teaching Hospital', required: false })
  @ValidateIf(
    (o: RegContext) =>
      o.regType === 'member' ||
      (o.regType === 'attendee' && o.inMedicalField === true),
  )
  @IsString()
  @MaxLength(255)
  hospitalOrg?: string;

  @ApiProperty({ example: 'Dr', required: false })
  @ValidateIf((o: RegContext) => o.regType === 'member')
  @IsOptional()
  @IsString()
  @MaxLength(50)
  title?: string;

  @ApiProperty({ example: '1 Hospital Road, Lagos', required: false })
  @ValidateIf((o: RegContext) => o.regType === 'member')
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  organizationAddress?: string;

  @ApiProperty({ example: 'Lagos Zone A', required: false })
  @ValidateIf((o: RegContext) => o.regType === 'member')
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  zone?: string;

  // Attendee only
  @ApiProperty({ example: true, required: false })
  @ValidateIf((o: RegContext) => o.regType === 'attendee')
  @IsBoolean()
  inMedicalField?: boolean;

  @ApiProperty({ example: 'Healthcare Administrator', required: false })
  @ValidateIf(
    (o: RegContext) => o.regType === 'attendee' && o.inMedicalField === false,
  )
  @IsString()
  @MaxLength(255)
  occupation?: string;

  // Company
  @ApiProperty({ example: 'MediCorp Solutions', required: false })
  @ValidateIf((o: RegContext) => o.regType === 'company')
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @ApiProperty({
    example: 'Leading the way in patient diagnostics',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  tagline?: string;

  @ApiProperty({
    example: 'A full description of your company for the conference directory',
    required: false,
  })
  @ValidateIf((o: RegContext) => o.regType === 'company')
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({
    example: 'https://www.medicorpsolutions.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2083)
  website?: string;

  @ApiProperty({ example: 'contact@medicorp.com', required: false })
  @ValidateIf((o: RegContext) => o.regType === 'company')
  @IsEmail()
  @MaxLength(255)
  contactEmail?: string;

  @ApiProperty({ example: 'Sarah Jenkins', required: false })
  @ValidateIf((o: RegContext) => o.regType === 'company')
  @IsString()
  @MaxLength(255)
  primaryContactName?: string;

  @ApiProperty({ example: '+234 800 555 6666', required: false })
  @ValidateIf((o: RegContext) => o.regType === 'company')
  @IsString()
  @MaxLength(30)
  primaryContactPhone?: string;

  @ApiProperty({ example: 'Hall A, near entrance', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  boothPreference?: string;
}
