import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthUser } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddCartItemDto, ListCartQueryDto } from './dto';
import { CartService } from './cart.service';

@ApiTags('Cart')
@Controller('api/carts')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get('current')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user cart by kind (conference or hotel)' })
  async getCurrent(
    @Query() query: ListCartQueryDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.cartService.getCurrent(req.user, query.cartKind);
  }

  @Post('items')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add an item to the conference or hotel cart' })
  async addItem(
    @Body() dto: AddCartItemDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.cartService.addItem(req.user, dto);
  }

  @Delete('items/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a cart line' })
  async removeItem(
    @Param('itemId') itemId: string,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.cartService.removeItem(req.user, itemId);
  }
}
