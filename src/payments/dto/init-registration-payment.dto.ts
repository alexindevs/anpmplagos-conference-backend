import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class InitRegistrationPaymentDto {
  @ApiProperty({
    description: 'User ID to initialize registration payment for',
    example: 'cuid_user_id',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
