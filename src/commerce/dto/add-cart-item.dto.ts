import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CartItemType, CartKind } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({ enum: CartKind })
  @IsEnum(CartKind)
  cartKind!: CartKind;

  @ApiProperty({ enum: CartItemType })
  @IsEnum(CartItemType)
  type!: CartItemType;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.type === 'booth')
  @IsString()
  boothId?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.type === 'masterclass')
  @IsString()
  masterclassId?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.type === 'panel')
  @IsString()
  panelSessionId?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.type === 'presentation')
  @IsString()
  presentationId?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.type === 'sponsorship_plan')
  @IsString()
  sponsorshipPlanId?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.type === 'hotel_room')
  @IsString()
  hotelRoomId?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.type === 'advert_slot')
  @IsString()
  advertSlotId?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.type === 'branding_slot')
  @IsString()
  brandingSlotId?: string;
}
