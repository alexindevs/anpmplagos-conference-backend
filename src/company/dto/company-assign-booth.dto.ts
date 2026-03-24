import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CompanyAssignBoothDto {
  @ApiPropertyOptional({
    description: 'Booth ID to assign, or omit / null to unassign',
  })
  @IsString()
  @IsOptional()
  boothId?: string | null;
}
