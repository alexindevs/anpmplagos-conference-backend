import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class UpdateCandidateDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  bio?: string;
}
