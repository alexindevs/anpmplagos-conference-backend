import { IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateCandidateDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;
}
