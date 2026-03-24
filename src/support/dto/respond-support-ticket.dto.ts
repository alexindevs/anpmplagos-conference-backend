import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class RespondSupportTicketDto {
  @ApiProperty({ example: 'Thanks for reaching out. Please try logging out and back in...' })
  @IsString()
  @MinLength(3)
  @MaxLength(5000)
  responseText: string;
}

