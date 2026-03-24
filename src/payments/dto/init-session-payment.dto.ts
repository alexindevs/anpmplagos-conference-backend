import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class InitSessionPaymentDto {
  @ApiPropertyOptional({
    description:
      '**Admin only.** Company users must omit this; the server uses `user.company.id` from the JWT.',
  })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({
    enum: ['masterclass', 'panel', 'presentation'],
    example: 'masterclass',
  })
  @IsEnum(['masterclass', 'panel', 'presentation'])
  type: 'masterclass' | 'panel' | 'presentation';

  @ApiProperty({ example: 'cuid_session_id' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}
