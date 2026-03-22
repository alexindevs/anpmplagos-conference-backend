import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

/** @see ExhibitorAssignBoothDto — unique class name for Swagger */
export class SponsorAssignBoothDto {
  @ApiPropertyOptional({
    example: 'cuid123',
    description: 'Booth ID to assign, or null to unassign',
  })
  @IsString()
  @IsOptional()
  boothId?: string | null;
}
