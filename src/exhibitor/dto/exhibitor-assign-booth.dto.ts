import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/** @see SponsorAssignBoothDto — unique class name for Swagger */
export class ExhibitorAssignBoothDto {
  @ApiProperty({ description: 'Booth ID to assign' })
  @IsString()
  @IsNotEmpty()
  boothId: string;
}
