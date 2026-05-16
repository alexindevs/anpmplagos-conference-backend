import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateTotalSlotsDto {
  @ApiProperty({ example: 5, description: 'New total slot count (must be >= sold count)' })
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return value;
    const n = Number(value);
    return Number.isNaN(n) ? value : n;
  })
  @IsInt()
  @Min(1)
  totalSlots: number;
}
