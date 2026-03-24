import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMasterclassDto {
  @ApiProperty({ example: 'Advanced Surgical Techniques' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Learn cutting-edge surgical procedures from experts',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    example: 250000000,
    description: 'Price in kobo (250,000,000 = ₦2,500,000)',
  })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  priceInKobo: number;
}
