import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRepresentativeDto {
  @ApiProperty({
    example: 'Sarah Jenkins',
    description: 'Representative full name',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'VP of Sales',
    description: 'Representative title/role',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: '+234 800 555 6666',
    description: 'Representative phone number',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;
}
