import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthUser } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CheckoutOrderDto } from './dto';
import { OrderService } from './order.service';

@ApiTags('Orders')
@Controller('api/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Create an order from the current cart, reserve items (30 min), and return Paystack checkout',
  })
  async checkout(
    @Body() dto: CheckoutOrderDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.orderService.checkout(req.user, dto);
  }
}
