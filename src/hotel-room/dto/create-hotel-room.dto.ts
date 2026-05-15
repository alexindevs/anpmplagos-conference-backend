import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateHotelRoomDto {
  @ApiProperty({ example: 'Eko Hotel & Suites' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  hotelName: string;

  @ApiProperty({ example: 'Standard King' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  roomType: string;

  @ApiProperty({
    example: 25_000_000,
    description: 'Price in kobo (25_000_000 = ₦250,000)',
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({ example: 'Breakfast included' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isReserved?: boolean;
}
