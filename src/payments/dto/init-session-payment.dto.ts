import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class InitSessionPaymentDto {
  @ApiProperty({ example: 'cuid_sponsor_id' })
  @IsString()
  @IsNotEmpty()
  sponsorId: string;

  @ApiProperty({ enum: ['masterclass', 'panel'], example: 'masterclass' })
  @IsEnum(['masterclass', 'panel'])
  type: 'masterclass' | 'panel';

  @ApiProperty({ example: 'cuid_session_id' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}
