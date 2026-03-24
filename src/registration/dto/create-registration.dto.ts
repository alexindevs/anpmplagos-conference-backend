import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
export class CreateRegistrationBaseDto {
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
  password: string;
}
