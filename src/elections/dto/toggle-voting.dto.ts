import { IsBoolean } from 'class-validator';

export class ToggleVotingDto {
  @IsBoolean()
  isActive: boolean;
}
