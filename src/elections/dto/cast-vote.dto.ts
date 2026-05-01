import { IsString, IsNotEmpty } from 'class-validator';

export class CastVoteDto {
  @IsString()
  @IsNotEmpty()
  positionId: string;

  @IsString()
  @IsNotEmpty()
  candidateId: string;
}
