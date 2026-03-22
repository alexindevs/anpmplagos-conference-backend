import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Payment,
  PaymentKind,
  PaymentStatus,
  Prisma,
  SessionStatus,
} from '@prisma/client';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { AuthUser } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  InitBoothPaymentDto,
  InitHotelRoomPaymentDto,
  InitSessionPaymentDto,
} from './dto';

type PaystackInitializeResponse = {
  status: boolean;
  message?: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

type PaystackVerifyResponse = {
  status: boolean;
  message?: string;
  data?: {
    status: string;
    reference: string;
    amount: number;
    paid_at?: string;
    gateway_response?: string;
  } & Record<string, unknown>;
};

type PaystackRefundResponse = {
  status: boolean;
  message?: string;
  data?: Record<string, unknown>;
};

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly paystackSecretKey: string;
  private readonly paystackBaseUrl: string;
  /** Fallback when a flow-specific callback env is unset */
  private readonly defaultCallbackUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.paystackSecretKey = this.config.get<string>('PAYSTACK_SECRET_KEY', '');
    this.paystackBaseUrl = this.config.get<string>(
      'PAYSTACK_BASE_URL',
      'https://api.paystack.co',
    );
    this.defaultCallbackUrl = this.config.get<string>(
      'PAYSTACK_CALLBACK_URL',
      'http://localhost:3000/payment/callback',
    );
  }

  /**
   * Frontend URL Paystack redirects to after checkout — one per payment flow.
   * Uses `PAYSTACK_CALLBACK_URL_*` when set, else `PAYSTACK_CALLBACK_URL`.
   */
  private callbackUrlFor(
    flow: 'booth' | 'session' | 'hotel_room',
  ): string {
    const envKeys = {
      booth: 'PAYSTACK_CALLBACK_URL_BOOTH',
      session: 'PAYSTACK_CALLBACK_URL_SESSION',
      hotel_room: 'PAYSTACK_CALLBACK_URL_HOTEL_ROOM',
    } as const;
    const specific = this.config.get<string>(envKeys[flow], '')?.trim();
    if (specific) {
      return specific;
    }
    return this.defaultCallbackUrl;
  }

  private calculatePaystackFee(grossAmountKobo: number): number {
    const percentageFee = Math.ceil(grossAmountKobo * 0.015);
    if (grossAmountKobo < 250000) {
      return Math.min(percentageFee, 200000);
    }
    return Math.min(percentageFee + 10000, 200000);
  }

  // Small helper to ensure net amount (after Paystack local fee) covers base amount.
  private calculateGrossAmountForNet(baseAmountKobo: number): number {
    let low = baseAmountKobo;
    let high = Math.ceil((baseAmountKobo + 210000) / 0.985);

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      const net = mid - this.calculatePaystackFee(mid);
      if (net >= baseAmountKobo) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }

    return low;
  }

  private generateReference(kind: PaymentKind): string {
    return `ANPMP-${kind.toUpperCase()}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  }

  verifyWebhookSignature(payload: string, signature: string | undefined): boolean {
    const webhookSigEnabled =
      this.config.get<string>('PAYSTACK_WEBHOOK_SECRET_ENABLED', 'true') !==
      'false';

    if (!this.paystackSecretKey || !webhookSigEnabled) {
      this.logger.warn(
        'PAYSTACK_SECRET_KEY/signature verification disabled, allowing webhook payload',
      );
      return true;
    }

    if (!signature) {
      return false;
    }

    const hash = createHmac('sha512', this.paystackSecretKey)
      .update(payload)
      .digest('hex');

    const a = Buffer.from(hash, 'utf8');
    const b = Buffer.from(signature, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private async callPaystackInitialize(input: {
    email: string;
    amount: number;
    reference: string;
    callbackUrl: string;
    metadata: Record<string, unknown>;
  }): Promise<PaystackInitializeResponse> {
    if (!this.paystackSecretKey) {
      throw new BadRequestException('PAYSTACK_SECRET_KEY is not configured');
    }

    const response = await fetch(`${this.paystackBaseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: input.email,
        amount: input.amount,
        reference: input.reference,
        callback_url: input.callbackUrl,
        metadata: input.metadata,
      }),
    });

    const data = (await response.json()) as PaystackInitializeResponse;
    if (!response.ok || !data.status || !data.data) {
      throw new BadRequestException(
        data.message ?? 'Failed to initialize Paystack transaction',
      );
    }
    return data;
  }

  async initializeBoothPayment(
    dto: InitBoothPaymentDto,
    authUser: AuthUser,
  ): Promise<{
    reference: string;
    authorizationUrl: string;
    accessCode: string;
    amount: number;
    baseAmount: number;
  }> {
    const exhibitor = await this.prisma.exhibitor.findUnique({
      where: { id: dto.exhibitorId },
      include: { user: true, booth: true },
    });
    if (!exhibitor) {
      throw new NotFoundException(`Exhibitor ${dto.exhibitorId} not found`);
    }

    const isAdmin = authUser.regType === 'admin';
    if (!isAdmin && exhibitor.userId !== authUser.id) {
      throw new ForbiddenException('You can only purchase booth for your profile');
    }
    if (exhibitor.booth) {
      throw new BadRequestException('Exhibitor already has a booth');
    }

    const booth = await this.prisma.booth.findUnique({
      where: { id: dto.boothId },
    });
    if (!booth) {
      throw new NotFoundException(`Booth ${dto.boothId} not found`);
    }
    if (booth.isTaken || booth.isReserved) {
      throw new BadRequestException('Booth is not available for purchase');
    }

    const existingPending = await this.prisma.payment.findFirst({
      where: {
        kind: 'booth',
        boothId: booth.id,
        status: 'pending',
      },
      select: { id: true },
    });
    if (existingPending) {
      throw new BadRequestException(
        'There is already a pending payment for this booth',
      );
    }

    const baseAmount = booth.price;
    const amount = this.calculateGrossAmountForNet(baseAmount);
    const reference = this.generateReference('booth');

    const paystack = await this.callPaystackInitialize({
      email: exhibitor.user.email,
      amount,
      reference,
      callbackUrl: this.callbackUrlFor('booth'),
      metadata: {
        kind: 'booth',
        boothId: booth.id,
        exhibitorId: exhibitor.id,
        userId: exhibitor.userId,
        baseAmount,
      },
    });

    await this.prisma.payment.create({
      data: {
        reference,
        kind: 'booth',
        baseAmount,
        amount,
        status: 'pending',
        provider: 'paystack',
        providerResponse: paystack as unknown as Prisma.InputJsonValue,
        userId: exhibitor.userId,
        exhibitorId: exhibitor.id,
        boothId: booth.id,
      },
    });

    const paystackData = paystack.data;
    if (!paystackData) {
      throw new BadRequestException('Invalid Paystack response');
    }

    return {
      reference,
      authorizationUrl: paystackData.authorization_url,
      accessCode: paystackData.access_code,
      amount,
      baseAmount,
    };
  }

  async initializeSessionPayment(
    dto: InitSessionPaymentDto,
    authUser: AuthUser,
  ): Promise<{
    reference: string;
    authorizationUrl: string;
    accessCode: string;
    amount: number;
    baseAmount: number;
  }> {
    const sponsor = await this.prisma.sponsor.findUnique({
      where: { id: dto.sponsorId },
      include: { user: true },
    });
    if (!sponsor) {
      throw new NotFoundException(`Sponsor ${dto.sponsorId} not found`);
    }

    const isAdmin = authUser.regType === 'admin';
    if (!isAdmin && sponsor.userId !== authUser.id) {
      throw new ForbiddenException(
        'You can only purchase sessions for your sponsor profile',
      );
    }

    let kind: PaymentKind;
    let baseAmount: number;
    let masterclassId: string | undefined;
    let panelSessionId: string | undefined;

    if (dto.type === 'masterclass') {
      const session = await this.prisma.masterclass.findUnique({
        where: { id: dto.sessionId },
      });
      if (!session) {
        throw new NotFoundException(`Masterclass ${dto.sessionId} not found`);
      }
      if (session.status !== SessionStatus.published) {
        throw new BadRequestException('Masterclass is not available for purchase');
      }
      if (session.sponsorId && session.sponsorId !== sponsor.id) {
        throw new BadRequestException(
          'Masterclass has already been purchased by another sponsor',
        );
      }
      if (session.sponsorId === sponsor.id) {
        throw new BadRequestException(
          'This sponsor has already purchased this masterclass',
        );
      }
      kind = 'masterclass';
      baseAmount = session.priceInKobo;
      masterclassId = session.id;
    } else {
      const session = await this.prisma.panelSession.findUnique({
        where: { id: dto.sessionId },
      });
      if (!session) {
        throw new NotFoundException(`Panel session ${dto.sessionId} not found`);
      }
      if (session.status !== SessionStatus.published) {
        throw new BadRequestException('Panel session is not available for purchase');
      }
      if (session.sponsorId && session.sponsorId !== sponsor.id) {
        throw new BadRequestException(
          'Panel session has already been purchased by another sponsor',
        );
      }
      if (session.sponsorId === sponsor.id) {
        throw new BadRequestException(
          'This sponsor has already purchased this panel session',
        );
      }
      kind = 'panel';
      baseAmount = session.priceInKobo;
      panelSessionId = session.id;
    }

    const amount = this.calculateGrossAmountForNet(baseAmount);
    const reference = this.generateReference(kind);

    const paystack = await this.callPaystackInitialize({
      email: sponsor.user.email,
      amount,
      reference,
      callbackUrl: this.callbackUrlFor('session'),
      metadata: {
        kind,
        sponsorId: sponsor.id,
        userId: sponsor.userId,
        masterclassId,
        panelSessionId,
        baseAmount,
      },
    });

    await this.prisma.payment.create({
      data: {
        reference,
        kind,
        baseAmount,
        amount,
        status: 'pending',
        provider: 'paystack',
        providerResponse: paystack as unknown as Prisma.InputJsonValue,
        userId: sponsor.userId,
        sponsorId: sponsor.id,
        masterclassId,
        panelSessionId,
      },
    });

    const paystackData = paystack.data;
    if (!paystackData) {
      throw new BadRequestException('Invalid Paystack response');
    }

    return {
      reference,
      authorizationUrl: paystackData.authorization_url,
      accessCode: paystackData.access_code,
      amount,
      baseAmount,
    };
  }

  async initializeHotelRoomPayment(
    dto: InitHotelRoomPaymentDto,
    authUser: AuthUser,
  ): Promise<{
    reference: string;
    authorizationUrl: string;
    accessCode: string;
    amount: number;
    baseAmount: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: authUser.id },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.registrationStatus !== 'registered') {
      throw new BadRequestException(
        'Complete registration before booking a hotel room',
      );
    }

    /** Exhibitors and sponsors may hold multiple room slots; others max one (booked + pending). */
    const canBookMultipleHotelRooms =
      authUser.regType === 'exhibitor' || authUser.regType === 'sponsor';
    if (!canBookMultipleHotelRooms) {
      const [bookedCount, pendingCount] = await Promise.all([
        this.prisma.hotelRoom.count({
          where: { bookedById: user.id, isBooked: true },
        }),
        this.prisma.payment.count({
          where: {
            userId: user.id,
            kind: 'hotel_room',
            status: 'pending',
          },
        }),
      ]);
      if (bookedCount + pendingCount >= 1) {
        throw new BadRequestException(
          'You already have a hotel room booking or checkout in progress. Only one room per account (exhibitors and sponsors may book multiple).',
        );
      }
    }

    const room = await this.prisma.hotelRoom.findUnique({
      where: { id: dto.hotelRoomId },
    });
    if (!room) {
      throw new NotFoundException(`Hotel room ${dto.hotelRoomId} not found`);
    }
    if (room.isBooked || room.isReserved) {
      throw new BadRequestException('This room slot is not available for purchase');
    }

    const existingPending = await this.prisma.payment.findFirst({
      where: {
        kind: 'hotel_room',
        hotelRoomId: room.id,
        status: 'pending',
      },
      select: { id: true },
    });
    if (existingPending) {
      throw new BadRequestException(
        'There is already a pending payment for this room slot',
      );
    }

    const baseAmount = room.price;
    const amount = this.calculateGrossAmountForNet(baseAmount);
    const reference = this.generateReference('hotel_room');

    const paystack = await this.callPaystackInitialize({
      email: user.email,
      amount,
      reference,
      callbackUrl: this.callbackUrlFor('hotel_room'),
      metadata: {
        kind: 'hotel_room',
        hotelRoomId: room.id,
        userId: user.id,
        baseAmount,
      },
    });

    await this.prisma.payment.create({
      data: {
        reference,
        kind: 'hotel_room',
        baseAmount,
        amount,
        status: 'pending',
        provider: 'paystack',
        providerResponse: paystack as unknown as Prisma.InputJsonValue,
        userId: user.id,
        hotelRoomId: room.id,
      },
    });

    const paystackData = paystack.data;
    if (!paystackData) {
      throw new BadRequestException('Invalid Paystack response');
    }

    return {
      reference,
      authorizationUrl: paystackData.authorization_url,
      accessCode: paystackData.access_code,
      amount,
      baseAmount,
    };
  }

  async handleWebhook(event: string, data: Record<string, unknown>): Promise<void> {
    this.logger.log(`Received Paystack webhook: ${event}`);
    switch (event) {
      case 'charge.success':
        await this.handleChargeSuccess(data);
        return;
      case 'charge.failed':
        await this.handleChargeFailed(data);
        return;
      default:
        this.logger.warn(`Unhandled webhook event: ${event}`);
    }
  }

  private async handleChargeSuccess(
    data: Record<string, unknown>,
  ): Promise<void> {
    const reference = String(data.reference ?? '');
    if (!reference) {
      return;
    }

    const payment = await this.prisma.payment.findUnique({
      where: { reference },
    });
    if (!payment) {
      this.logger.warn(`Payment not found for reference ${reference}`);
      return;
    }

    if (payment.status === PaymentStatus.success || payment.status === PaymentStatus.refunded) {
      return;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'success',
        paidAt:
          typeof data.paid_at === 'string' && data.paid_at
            ? new Date(data.paid_at)
            : new Date(),
        providerResponse: data as unknown as Prisma.InputJsonValue,
      },
    });

    await this.applySuccessfulPayment(payment.id, data);
  }

  private async handleChargeFailed(data: Record<string, unknown>): Promise<void> {
    const reference = String(data.reference ?? '');
    if (!reference) {
      return;
    }

    await this.prisma.payment.updateMany({
      where: { reference, status: { notIn: ['refunded'] } },
      data: {
        status: 'failed',
        providerResponse: data as unknown as Prisma.InputJsonValue,
      },
    });
  }

  private async applySuccessfulPayment(
    paymentId: string,
    paystackData: Record<string, unknown>,
  ): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booth: true,
        exhibitor: { include: { booth: true } },
        masterclass: true,
        panelSession: true,
        hotelRoom: true,
      },
    });
    if (!payment) {
      return;
    }

    if (payment.kind === 'booth') {
      const booth = payment.booth;
      const exhibitor = payment.exhibitor;
      if (!booth || !exhibitor) {
        await this.markPaymentFailed(payment, paystackData, 'Missing booth/exhibitor');
        return;
      }

      if (exhibitor.booth && exhibitor.booth.id !== booth.id) {
        await this.refundBecauseUnavailable(
          payment,
          paystackData,
          'Exhibitor already has another booth',
        );
        return;
      }

      if (
        (booth.isTaken && booth.takenById !== exhibitor.id) ||
        booth.isReserved
      ) {
        await this.refundBecauseUnavailable(
          payment,
          paystackData,
          'Booth became unavailable before assignment',
        );
        return;
      }

      if (!booth.isTaken || booth.takenById !== exhibitor.id) {
        await this.prisma.booth.update({
          where: { id: booth.id },
          data: {
            isTaken: true,
            takenById: exhibitor.id,
          },
        });
      }
      return;
    }

    if (payment.kind === 'masterclass') {
      const session = payment.masterclass;
      if (!session || !payment.sponsorId) {
        await this.markPaymentFailed(payment, paystackData, 'Missing masterclass/sponsor');
        return;
      }
      if (session.status !== SessionStatus.published) {
        await this.refundBecauseUnavailable(
          payment,
          paystackData,
          'Masterclass no longer published',
        );
        return;
      }
      if (session.sponsorId && session.sponsorId !== payment.sponsorId) {
        await this.refundBecauseUnavailable(
          payment,
          paystackData,
          'Masterclass already taken by another sponsor',
        );
        return;
      }
      if (!session.sponsorId) {
        await this.prisma.masterclass.update({
          where: { id: session.id },
          data: { sponsorId: payment.sponsorId },
        });
      }
      return;
    }

    if (payment.kind === 'panel') {
      const session = payment.panelSession;
      if (!session || !payment.sponsorId) {
        await this.markPaymentFailed(payment, paystackData, 'Missing panel/sponsor');
        return;
      }
      if (session.status !== SessionStatus.published) {
        await this.refundBecauseUnavailable(
          payment,
          paystackData,
          'Panel no longer published',
        );
        return;
      }
      if (session.sponsorId && session.sponsorId !== payment.sponsorId) {
        await this.refundBecauseUnavailable(
          payment,
          paystackData,
          'Panel already taken by another sponsor',
        );
        return;
      }
      if (!session.sponsorId) {
        await this.prisma.panelSession.update({
          where: { id: session.id },
          data: { sponsorId: payment.sponsorId },
        });
      }
      return;
    }

    if (payment.kind === 'hotel_room') {
      const room = payment.hotelRoom;
      if (!room) {
        await this.markPaymentFailed(payment, paystackData, 'Missing hotel room');
        return;
      }

      if (room.isReserved) {
        await this.refundBecauseUnavailable(
          payment,
          paystackData,
          'Room slot was reserved before payment completed',
        );
        return;
      }

      if (room.isBooked && room.bookedById !== payment.userId) {
        await this.refundBecauseUnavailable(
          payment,
          paystackData,
          'Room slot was booked by someone else',
        );
        return;
      }

      if (!room.isBooked) {
        await this.prisma.hotelRoom.update({
          where: { id: room.id },
          data: {
            isBooked: true,
            bookedById: payment.userId,
          },
        });
      }
    }
  }

  private async markPaymentFailed(
    payment: Payment,
    payload: Record<string, unknown>,
    reason: string,
  ): Promise<void> {
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'failed',
        providerResponse: {
          reason,
          payload,
        } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  private async refundBecauseUnavailable(
    payment: Payment,
    payload: Record<string, unknown>,
    reason: string,
  ): Promise<void> {
    const refunded = await this.requestRefund(payment.reference);

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: refunded ? 'refunded' : 'failed',
        providerResponse: {
          reason,
          refundRequested: refunded,
          payload,
        } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  private async requestRefund(reference: string): Promise<boolean> {
    if (!this.paystackSecretKey) {
      return false;
    }

    try {
      const response = await fetch(`${this.paystackBaseUrl}/refund`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction: reference,
        }),
      });

      const data = (await response.json()) as PaystackRefundResponse;
      return response.ok && data.status;
    } catch (error) {
      this.logger.error(
        `Refund request failed for ${reference}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }

  async verifyPayment(reference: string, authUser: AuthUser): Promise<{
    success: boolean;
    payment: Payment;
    paystackData?: Record<string, unknown>;
  }> {
    const payment = await this.prisma.payment.findUnique({
      where: { reference },
    });
    if (!payment) {
      throw new NotFoundException(`Payment ${reference} not found`);
    }

    const isAdmin = authUser.regType === 'admin';
    if (!isAdmin && payment.userId !== authUser.id) {
      throw new ForbiddenException('You can only verify your own payments');
    }

    if (!this.paystackSecretKey) {
      throw new BadRequestException('PAYSTACK_SECRET_KEY is not configured');
    }

    const response = await fetch(
      `${this.paystackBaseUrl}/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.paystackSecretKey}`,
        },
      },
    );
    const data = (await response.json()) as PaystackVerifyResponse;
    if (!response.ok || !data.status || !data.data) {
      throw new BadRequestException(data.message ?? 'Failed to verify payment');
    }

    const paystackData = data.data as Record<string, unknown>;
    if (data.data.status === 'success') {
      await this.handleChargeSuccess(paystackData);
    } else {
      await this.handleChargeFailed(paystackData);
    }

    const updated = await this.prisma.payment.findUnique({
      where: { reference },
    });
    if (!updated) {
      throw new NotFoundException(`Payment ${reference} not found after verify`);
    }

    return {
      success: updated.status === PaymentStatus.success,
      payment: updated,
      paystackData,
    };
  }

  async listPayments(params: {
    page?: number;
    pageSize?: number;
    kind?: PaymentKind;
    status?: PaymentStatus;
    reference?: string;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.PaymentWhereInput = {
      kind: params.kind,
      status: params.status,
      reference: params.reference
        ? { contains: params.reference, mode: 'insensitive' }
        : undefined,
    };

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, regType: true } },
          booth: { select: { id: true, name: true } },
          masterclass: { select: { id: true, title: true } },
          panelSession: { select: { id: true, title: true } },
          hotelRoom: {
            select: {
              id: true,
              hotelName: true,
              roomType: true,
            },
          },
          exhibitor: { select: { id: true, companyName: true } },
          sponsor: { select: { id: true, companyName: true } },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      items,
      page,
      pageSize,
      total,
    };
  }
}
