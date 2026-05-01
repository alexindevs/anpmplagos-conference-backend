import { IsString, IsNotEmpty } from 'class-validator';

export class MarkAttendanceDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  eventDayId: string;
}
