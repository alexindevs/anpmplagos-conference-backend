import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePositionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : 0))
  @IsInt()
  @Min(0)
  order?: number;
}
