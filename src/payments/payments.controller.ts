import {
  Body,
  Controller,
  Delete,
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
import { NonModeratorAdminGuard } from '../auth/guards/non-moderator-admin.guard';
import {
  InitAdvertSlotPaymentDto,
  InitBoothPaymentDto,
  InitBrandingSlotPaymentDto,
  InitHotelRoomPaymentDto,
  InitRegistrationPaymentDto,
  InitSessionPaymentDto,
  InitSponsorshipPlanPaymentDto,
} from './dto';
import { ManualPaymentService } from './manual-payment.service';
import { PaystackService } from './paystack.service';

@ApiTags('Payments')
@Controller('api/payments')
export class PaymentsController {
  constructor(
    private readonly paystackService: PaystackService,
    private readonly manualPaymentService: ManualPaymentService,
  ) {}

  @Post('registration')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize registration payment via Paystack' })
  async initRegistrationPayment(
    @Body() dto: InitRegistrationPaymentDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.paystackService.initializeRegistrationPayment(dto, req.user);
  }

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

  @Post('sponsorship-plan')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize sponsorship plan payment via Paystack' })
  async initSponsorshipPlanPayment(
    @Body() dto: InitSponsorshipPlanPaymentDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.paystackService.initializeSponsorshipPlanPayment(dto, req.user);
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

  @Post('advert-slot')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Initialize advert slot payment via Paystack (company only; admin may pass companyId)',
  })
  async initAdvertSlotPayment(
    @Body() dto: InitAdvertSlotPaymentDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.paystackService.initializeAdvertSlotPayment(dto, req.user);
  }

  @Post('branding-slot')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Initialize branding slot payment via Paystack (company only; admin may pass companyId)',
  })
  async initBrandingSlotPayment(
    @Body() dto: InitBrandingSlotPaymentDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.paystackService.initializeBrandingSlotPayment(dto, req.user);
  }

  @Post('paystack/webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Paystack webhook endpoint' })
  async handlePaystackWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-paystack-signature') signature?: string,
  ) {
    const rawPayload =
      req.rawBody?.toString('utf8') ?? JSON.stringify(req.body);
    const valid = this.paystackService.verifyWebhookSignature(
      rawPayload,
      signature,
    );
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
    enum: [
      'registration',
      'order',
      'booth',
      'masterclass',
      'panel',
      'presentation',
      'hotel_room',
      'sponsorship_plan',
      'advert_slot',
      'branding_slot',
    ],
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'success', 'failed', 'refunded'],
  })
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

  @Delete(':reference')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Cancel a pending payment (owner or admin). Required before re-initiating a new payment.',
  })
  async cancelPendingPayment(
    @Param('reference') reference: string,
    @Req() req: Request & { user: AuthUser },
  ) {
    await this.manualPaymentService.cancelPendingPayment(reference, req.user);
    return { message: 'Payment cancelled successfully' };
  }

  @Post(':reference/claim-paid')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'User confirms they have made the bank transfer for a pending manual payment. Notifies admins.',
  })
  async claimPaymentMade(
    @Param('reference') reference: string,
    @Req() req: Request & { user: AuthUser },
  ) {
    await this.manualPaymentService.claimPaymentMade(reference, req.user);
    return {
      message:
        'Payment claim received. An admin will verify and confirm your payment shortly.',
    };
  }

  @Post('admin/:reference/verify')
  @UseGuards(JwtAuthGuard, AdminGuard, NonModeratorAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Admin verifies a manual payment and triggers fulfillment (superadmin and support only).',
  })
  async adminVerifyManualPayment(
    @Param('reference') reference: string,
    @Req() req: Request & { user: AuthUser },
  ) {
    await this.manualPaymentService.adminVerifyPayment(reference, req.user);
    return { message: 'Payment verified and fulfillment applied successfully' };
  }

  @Post('admin/:reference/refund')
  @UseGuards(JwtAuthGuard, AdminGuard, NonModeratorAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Admin triggers a Paystack refund and reverses all inventory for a successful payment (superadmin and support only).',
  })
  async adminRefundPayment(@Param('reference') reference: string) {
    return this.paystackService.adminInitiateRefund(reference);
  }
}
