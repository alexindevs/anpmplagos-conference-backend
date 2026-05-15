import { IsString, IsNotEmpty, IsOptional, IsInt, MaxLength, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePositionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : 0))
  @IsInt()
  @Min(0)
  order?: number;
}
