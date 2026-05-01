import { IsString, IsNotEmpty, IsDateString, IsBoolean, IsOptional } from 'class-validator';

export class CreateEventDayDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsDateString()
  date: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
