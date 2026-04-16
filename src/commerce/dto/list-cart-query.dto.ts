import { ApiProperty } from '@nestjs/swagger';
import { CartKind } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class ListCartQueryDto {
  @ApiProperty({ enum: CartKind })
  @IsEnum(CartKind)
  cartKind!: CartKind;
}
