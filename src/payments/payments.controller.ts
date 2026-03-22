import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { PaymentKind, PaymentStatus } from '@prisma/client';
import type { Request } from 'express';
import { AuthUser } from '../auth/auth.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  InitBoothPaymentDto,
  InitHotelRoomPaymentDto,
  InitSessionPaymentDto,
} from './dto';
import { PaystackService } from './paystack.service';

@ApiTags('Payments')
@Controller('api/payments')
export class PaymentsController {
  constructor(private readonly paystackService: PaystackService) {}

  @Post('booth')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize booth payment via Paystack' })
  async initBoothPayment(
    @Body() dto: InitBoothPaymentDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.paystackService.initializeBoothPayment(dto, req.user);
  }

  @Post('session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize session payment via Paystack' })
  async initSessionPayment(
    @Body() dto: InitSessionPaymentDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.paystackService.initializeSessionPayment(dto, req.user);
  }

  @Post('hotel-room')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Initialize hotel room payment via Paystack (logged-in user books for themselves)',
  })
  async initHotelRoomPayment(
    @Body() dto: InitHotelRoomPaymentDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.paystackService.initializeHotelRoomPayment(dto, req.user);
  }

  @Post('paystack/webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Paystack webhook endpoint' })
  async handlePaystackWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-paystack-signature') signature?: string,
  ) {
    const rawPayload = req.rawBody?.toString('utf8') ?? JSON.stringify(req.body);
    const valid = this.paystackService.verifyWebhookSignature(rawPayload, signature);
    if (!valid) {
      throw new UnauthorizedException('Invalid Paystack signature');
    }

    const body = req.body as { event?: string; data?: Record<string, unknown> };
    if (body.event && body.data) {
      await this.paystackService.handleWebhook(body.event, body.data);
    }

    return { received: true };
  }

  @Get('paystack/verify/:reference')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify a payment reference via Paystack' })
  async verifyPayment(
    @Param('reference') reference: string,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.paystackService.verifyPayment(reference, req.user);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List payments (admin only)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 20 })
  @ApiQuery({
    name: 'kind',
    required: false,
    enum: ['booth', 'masterclass', 'panel', 'hotel_room'],
  })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'success', 'failed', 'refunded'] })
  @ApiQuery({ name: 'reference', required: false })
  async listPayments(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('kind') kind?: PaymentKind,
    @Query('status') status?: PaymentStatus,
    @Query('reference') reference?: string,
  ) {
    return this.paystackService.listPayments({
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      kind,
      status,
      reference,
    });
  }
}
