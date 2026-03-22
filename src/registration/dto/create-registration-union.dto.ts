import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRepresentativeDto } from './create-representative.dto';

type RegContext = {
  regType?: 'member' | 'attendee' | 'exhibitor' | 'sponsor';
  hasSpouse?: boolean;
  inMedicalField?: boolean;
};

/**
 * Unified DTO for registration - validates based on regType.
 * Use this for the single POST /api/registrations endpoint.
 */
export class CreateRegistrationDto {
  @ApiProperty({
    enum: ['member', 'attendee', 'exhibitor', 'sponsor'],
    example: 'member',
    description: 'Registration type',
  })
  @IsEnum(['member', 'attendee', 'exhibitor', 'sponsor'])
  regType: 'member' | 'attendee' | 'exhibitor' | 'sponsor';

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
  password: string;

  // Member & Attendee
  @ApiProperty({ example: 'Dr. Kayode Olatunji', required: false })
  @ValidateIf(
    (o: RegContext) => o.regType === 'member' || o.regType === 'attendee',
  )
  @IsString()
  fullName?: string;

  @ApiProperty({ example: '+234 800 123 4567', required: false })
  @ValidateIf(
    (o: RegContext) => o.regType === 'member' || o.regType === 'attendee',
  )
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bio?: string;

  // Member only
  @ApiProperty({ example: 'ID-123456', required: false })
  @ValidateIf((o: RegContext) => o.regType === 'member')
  @IsString()
  anpmpId?: string;

  @ApiProperty({ example: true, required: false })
  @ValidateIf((o: RegContext) => o.regType === 'member')
  @IsBoolean()
  hasSpouse?: boolean;

  @ApiProperty({ example: 'Jane Olatunji', required: false })
  @ValidateIf((o: RegContext) => o.regType === 'member' && o.hasSpouse === true)
  @IsString()
  spouseName?: string;

  @ApiProperty({ example: 'spouse@example.com', required: false })
  @ValidateIf((o: RegContext) => o.regType === 'member' && o.hasSpouse === true)
  @IsString()
  spouseEmail?: string;

  @ApiProperty({ example: '+234 800 765 4321', required: false })
  @ValidateIf((o: RegContext) => o.regType === 'member' && o.hasSpouse === true)
  @IsString()
  spousePhone?: string;

  // Member & Attendee (when in medical field)
  @ApiProperty({ example: 'general', required: false })
  @ValidateIf(
    (o: RegContext) =>
      o.regType === 'member' ||
      (o.regType === 'attendee' && o.inMedicalField === true),
  )
  @IsString()
  primarySpecialty?: string;

  @ApiProperty({ example: 'Lagos State Teaching Hospital', required: false })
  @ValidateIf(
    (o: RegContext) =>
      o.regType === 'member' ||
      (o.regType === 'attendee' && o.inMedicalField === true),
  )
  @IsString()
  hospitalOrg?: string;

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
  occupation?: string;

  // Exhibitor & Sponsor shared
  @ApiProperty({ example: 'MediCorp Solutions', required: false })
  @ValidateIf((o: RegContext) => o.regType === 'exhibitor' || o.regType === 'sponsor')
  @IsString()
  companyName?: string;

  @ApiProperty({
    example: 'Leading the way in patient diagnostics',
    required: false,
  })
  @IsOptional()
  @IsString()
  tagline?: string;

  @ApiProperty({
    example: 'A full description of your company for the conference directory',
    required: false,
  })
  @ValidateIf((o: RegContext) => o.regType === 'exhibitor' || o.regType === 'sponsor')
  @IsString()
  @IsNotEmpty()
  description?: string;

  @ApiProperty({
    example: 'https://www.medicorpsolutions.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ example: 'contact@medicorp.com', required: false })
  @ValidateIf((o: RegContext) => o.regType === 'exhibitor' || o.regType === 'sponsor')
  @IsString()
  contactEmail?: string;

  @ApiProperty({ example: 'Sarah Jenkins', required: false })
  @ValidateIf((o: RegContext) => o.regType === 'exhibitor' || o.regType === 'sponsor')
  @IsString()
  primaryContactName?: string;

  @ApiProperty({ example: '+234 800 555 6666', required: false })
  @ValidateIf((o: RegContext) => o.regType === 'exhibitor' || o.regType === 'sponsor')
  @IsString()
  primaryContactPhone?: string;

  // Exhibitor only
  @ApiProperty({ example: 'Hall A, near entrance', required: false })
  @IsOptional()
  @IsString()
  boothPreference?: string;

  @ApiProperty({
    type: [CreateRepresentativeDto],
    required: false,
    description:
      'Booth representatives (min 1). With multipart/form-data, send one field `representatives` as a JSON string (array of objects). Example: [{"name":"A","title":"Rep","phone":"+234..."}]',
  })
  @ValidateIf((o: RegContext) => o.regType === 'exhibitor')
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one representative is required' })
  @ValidateNested({ each: true })
  @Type(() => CreateRepresentativeDto)
  representatives?: CreateRepresentativeDto[];

  // Sponsor only (reuses companyName, tagline, website, contactEmail, primaryContactName, primaryContactPhone from exhibitor)
  @ApiProperty({
    example: 150000000,
    description: 'Sponsor amount in kobo (minimum 150,000,000 = ₦1,500,000)',
    required: false,
  })
  @ValidateIf((o: RegContext) => o.regType === 'sponsor')
  @IsOptional()
  sponsorAmount?: number;
}
