import { IsString, IsDateString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateEventDayDto {
  @IsString()
  @IsOptional()
  label?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
