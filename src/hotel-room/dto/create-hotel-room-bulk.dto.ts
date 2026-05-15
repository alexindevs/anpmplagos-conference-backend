import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateHotelRoomBulkDto {
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

  @ApiProperty({ example: 25_000_000 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isReserved?: boolean;

  @ApiProperty({ example: 10, description: '1–500 identical slots' })
  @IsInt()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  quantity: number;
}
