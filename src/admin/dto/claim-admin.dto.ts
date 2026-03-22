import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ClaimAdminDto {
  @ApiProperty({
    example: 'your-admin-code-from-env',
    description: 'Admin code (defined in ADMIN_CODE env)',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}
