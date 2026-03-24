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
  RegistrationStatus,
  SessionStatus,
} from '@prisma/client';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { AuthUser } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  InitAdvertSlotPaymentDto,
  InitBoothPaymentDto,
  InitBrandingSlotPaymentDto,
  InitHotelRoomPaymentDto,
  InitSessionPaymentDto,
  InitSponsorshipPlanPaymentDto,
} from './dto';
import { maxTier } from '../company/company-tier.util';

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
   * Non-admin callers must not send `companyId`; the paying company is always `AuthUser.company.id` (JWT).
   * Admins must send `companyId` to choose which company pays.
   */
  private resolveCompanyIdForPayment(
    bodyCompanyId: string | undefined,
    authUser: AuthUser,
  ): string {
    const trimmed = bodyCompanyId?.trim();
    if (authUser.regType === 'admin') {
      if (!trimmed) {
        throw new BadRequestException(
          'companyId is required in the request body when using an admin account',
        );
      }
      return trimmed;
    }
    if (trimmed) {
      throw new BadRequestException(
        'Do not send companyId unless you are an admin; the paying company is taken from your signed-in account.',
      );
    }
    if (authUser.regType === 'company' && authUser.company?.id) {
      return authUser.company.id;
    }
    throw new BadRequestException(
      'Only company accounts can use this payment flow; sign in as the company user.',
    );
  }

  /**
   * Frontend URL Paystack redirects to after checkout — one per payment flow.
   * Uses `PAYSTACK_CALLBACK_URL_*` when set, else `PAYSTACK_CALLBACK_URL`.
   */
  private callbackUrlFor(
    flow:
      | 'booth'
      | 'session'
      | 'hotel_room'
      | 'sponsorship_plan'
      | 'advert_slot'
      | 'branding_slot',
  ): string {
    const envKeys = {
      booth: 'PAYSTACK_CALLBACK_URL_BOOTH',
      session: 'PAYSTACK_CALLBACK_URL_SESSION',
      hotel_room: 'PAYSTACK_CALLBACK_URL_HOTEL_ROOM',
      sponsorship_plan: 'PAYSTACK_CALLBACK_URL_SPONSORSHIP_PLAN',
      advert_slot: 'PAYSTACK_CALLBACK_URL_ADVERT_SLOT',
      branding_slot: 'PAYSTACK_CALLBACK_URL_BRANDING_SLOT',
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

  private assertPublishedSessionSlotPurchasable(
    slot: {
      status: SessionStatus;
      isReserved: boolean;
      isTaken: boolean;
      takenById: string | null;
    },
    company: { id: string },
    notPublishedMessage: string,
  ): void {
    if (slot.status !== SessionStatus.published) {
      throw new BadRequestException(notPublishedMessage);
    }
    if (slot.isReserved) {
      throw new BadRequestException(
        'This slot is reserved and cannot be purchased',
      );
    }
    if (slot.isTaken && slot.takenById !== company.id) {
      throw new BadRequestException('This slot is already taken');
    }
    if (slot.isTaken && slot.takenById === company.id) {
      throw new BadRequestException('Your company already owns this slot');
    }
  }

  private async assertNoPendingSessionSlotPayment(
    kind: 'masterclass' | 'panel' | 'presentation',
    sessionId: string,
  ): Promise<void> {
    const where =
      kind === 'masterclass'
        ? {
            kind: 'masterclass' as const,
            masterclassId: sessionId,
            status: 'pending' as const,
          }
        : kind === 'panel'
          ? {
              kind: 'panel' as const,
              panelSessionId: sessionId,
              status: 'pending' as const,
            }
          : {
              kind: 'presentation' as const,
              presentationId: sessionId,
              status: 'pending' as const,
            };
    const existing = await this.prisma.payment.findFirst({
      where,
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException(
        'There is already a pending payment for this slot',
      );
    }
  }

  verifyWebhookSignature(
    payload: string,
    signature: string | undefined,
  ): boolean {
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

    const response = await fetch(
      `${this.paystackBaseUrl}/transaction/initialize`,
      {
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
      },
    );

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
    const companyId = this.resolveCompanyIdForPayment(dto.companyId, authUser);
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { user: true, booth: true },
    });
    if (!company) {
      throw new NotFoundException(`Company ${companyId} not found`);
    }

    const isAdmin = authUser.regType === 'admin';
    if (!isAdmin && company.userId !== authUser.id) {
      throw new ForbiddenException(
        'You can only purchase booth for your profile',
      );
    }
    if (company.booth) {
      throw new BadRequestException('Company already has a booth');
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
      email: company.user.email,
      amount,
      reference,
      callbackUrl: this.callbackUrlFor('booth'),
      metadata: {
        kind: 'booth',
        boothId: booth.id,
        companyId: company.id,
        userId: company.userId,
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
        userId: company.userId,
        companyId: company.id,
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
    const companyId = this.resolveCompanyIdForPayment(dto.companyId, authUser);
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { user: true },
    });
    if (!company) {
      throw new NotFoundException(`Company ${companyId} not found`);
    }

    const isAdmin = authUser.regType === 'admin';
    if (!isAdmin && company.userId !== authUser.id) {
      throw new ForbiddenException(
        'You can only purchase sessions for your company profile',
      );
    }

    let kind: PaymentKind;
    let baseAmount: number;
    let masterclassId: string | undefined;
    let panelSessionId: string | undefined;
    let presentationId: string | undefined;

    if (dto.type === 'masterclass') {
      const session = await this.prisma.masterclass.findUnique({
        where: { id: dto.sessionId },
      });
      if (!session) {
        throw new NotFoundException(`Masterclass ${dto.sessionId} not found`);
      }
      this.assertPublishedSessionSlotPurchasable(
        session,
        company,
        'Masterclass is not available for purchase',
      );
      await this.assertNoPendingSessionSlotPayment('masterclass', session.id);
      kind = 'masterclass';
      baseAmount = session.priceInKobo;
      masterclassId = session.id;
    } else if (dto.type === 'panel') {
      const session = await this.prisma.panelSession.findUnique({
        where: { id: dto.sessionId },
      });
      if (!session) {
        throw new NotFoundException(`Panel session ${dto.sessionId} not found`);
      }
      this.assertPublishedSessionSlotPurchasable(
        session,
        company,
        'Panel session is not available for purchase',
      );
      await this.assertNoPendingSessionSlotPayment('panel', session.id);
      kind = 'panel';
      baseAmount = session.priceInKobo;
      panelSessionId = session.id;
    } else {
      const session = await this.prisma.presentation.findUnique({
        where: { id: dto.sessionId },
      });
      if (!session) {
        throw new NotFoundException(`Presentation ${dto.sessionId} not found`);
      }
      this.assertPublishedSessionSlotPurchasable(
        session,
        company,
        'Presentation slot is not available for purchase',
      );
      await this.assertNoPendingSessionSlotPayment('presentation', session.id);
      kind = 'presentation';
      baseAmount = session.priceInKobo;
      presentationId = session.id;
    }

    const amount = this.calculateGrossAmountForNet(baseAmount);
    const reference = this.generateReference(kind);

    const paystack = await this.callPaystackInitialize({
      email: company.user.email,
      amount,
      reference,
      callbackUrl: this.callbackUrlFor('session'),
      metadata: {
        kind,
        companyId: company.id,
        userId: company.userId,
        masterclassId,
        panelSessionId,
        presentationId,
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
        userId: company.userId,
        companyId: company.id,
        masterclassId,
        panelSessionId,
        presentationId,
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

    /** Company accounts may hold multiple room slots; others max one (booked + pending). */
    const canBookMultipleHotelRooms = authUser.regType === 'company';
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
          'You already have a hotel room booking or checkout in progress. Only one room per account (company accounts may book multiple).',
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
      throw new BadRequestException(
        'This room slot is not available for purchase',
      );
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

  async initializeAdvertSlotPayment(
    dto: InitAdvertSlotPaymentDto,
    authUser: AuthUser,
  ): Promise<{
    reference: string;
    authorizationUrl: string;
    accessCode: string;
    amount: number;
    baseAmount: number;
  }> {
    const companyId = this.resolveCompanyIdForPayment(dto.companyId, authUser);
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { user: true },
    });
    if (!company) {
      throw new NotFoundException(`Company ${companyId} not found`);
    }
    if (company.user.registrationStatus !== RegistrationStatus.registered) {
      throw new BadRequestException(
        'Complete registration before purchasing an advert slot',
      );
    }

    const isAdmin = authUser.regType === 'admin';
    if (!isAdmin && company.userId !== authUser.id) {
      throw new ForbiddenException(
        'You can only purchase advert slots for your company profile',
      );
    }

    const slot = await this.prisma.advertSlot.findUnique({
      where: { id: dto.advertSlotId },
    });
    if (!slot) {
      throw new NotFoundException(`Advert slot ${dto.advertSlotId} not found`);
    }
    if (slot.isReserved) {
      throw new BadRequestException(
        'This advert slot is reserved and cannot be purchased',
      );
    }
    if (slot.isTaken && slot.takenById !== company.id) {
      throw new BadRequestException('This advert slot is already taken');
    }
    if (slot.isTaken && slot.takenById === company.id) {
      throw new BadRequestException('Your company already owns this advert slot');
    }

    const existingPending = await this.prisma.payment.findFirst({
      where: {
        kind: 'advert_slot',
        advertSlotId: slot.id,
        status: 'pending',
      },
      select: { id: true },
    });
    if (existingPending) {
      throw new BadRequestException(
        'There is already a pending payment for this advert slot',
      );
    }

    const baseAmount = slot.price;
    const amount = this.calculateGrossAmountForNet(baseAmount);
    const reference = this.generateReference('advert_slot');

    const paystack = await this.callPaystackInitialize({
      email: company.user.email,
      amount,
      reference,
      callbackUrl: this.callbackUrlFor('advert_slot'),
      metadata: {
        kind: 'advert_slot',
        advertSlotId: slot.id,
        companyId: company.id,
        userId: company.userId,
        baseAmount,
      },
    });

    await this.prisma.payment.create({
      data: {
        reference,
        kind: 'advert_slot',
        baseAmount,
        amount,
        status: 'pending',
        provider: 'paystack',
        providerResponse: paystack as unknown as Prisma.InputJsonValue,
        userId: company.userId,
        companyId: company.id,
        advertSlotId: slot.id,
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

  async initializeBrandingSlotPayment(
    dto: InitBrandingSlotPaymentDto,
    authUser: AuthUser,
  ): Promise<{
    reference: string;
    authorizationUrl: string;
    accessCode: string;
    amount: number;
    baseAmount: number;
  }> {
    const companyId = this.resolveCompanyIdForPayment(dto.companyId, authUser);
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { user: true },
    });
    if (!company) {
      throw new NotFoundException(`Company ${companyId} not found`);
    }
    if (company.user.registrationStatus !== RegistrationStatus.registered) {
      throw new BadRequestException(
        'Complete registration before purchasing a branding slot',
      );
    }

    const isAdmin = authUser.regType === 'admin';
    if (!isAdmin && company.userId !== authUser.id) {
      throw new ForbiddenException(
        'You can only purchase branding slots for your company profile',
      );
    }

    const slot = await this.prisma.brandingSlot.findUnique({
      where: { id: dto.brandingSlotId },
    });
    if (!slot) {
      throw new NotFoundException(
        `Branding slot ${dto.brandingSlotId} not found`,
      );
    }
    if (slot.isReserved) {
      throw new BadRequestException(
        'This branding slot is reserved and cannot be purchased',
      );
    }
    if (slot.isTaken && slot.takenById !== company.id) {
      throw new BadRequestException('This branding slot is already taken');
    }
    if (slot.isTaken && slot.takenById === company.id) {
      throw new BadRequestException(
        'Your company already owns this branding slot',
      );
    }

    const existingPending = await this.prisma.payment.findFirst({
      where: {
        kind: 'branding_slot',
        brandingSlotId: slot.id,
        status: 'pending',
      },
      select: { id: true },
    });
    if (existingPending) {
      throw new BadRequestException(
        'There is already a pending payment for this branding slot',
      );
    }

    const baseAmount = slot.price;
    const amount = this.calculateGrossAmountForNet(baseAmount);
    const reference = this.generateReference('branding_slot');

    const paystack = await this.callPaystackInitialize({
      email: company.user.email,
      amount,
      reference,
      callbackUrl: this.callbackUrlFor('branding_slot'),
      metadata: {
        kind: 'branding_slot',
        brandingSlotId: slot.id,
        companyId: company.id,
        userId: company.userId,
        baseAmount,
      },
    });

    await this.prisma.payment.create({
      data: {
        reference,
        kind: 'branding_slot',
        baseAmount,
        amount,
        status: 'pending',
        provider: 'paystack',
        providerResponse: paystack as unknown as Prisma.InputJsonValue,
        userId: company.userId,
        companyId: company.id,
        brandingSlotId: slot.id,
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

  async initializeSponsorshipPlanPayment(
    dto: InitSponsorshipPlanPaymentDto,
    authUser: AuthUser,
  ): Promise<{
    reference: string;
    authorizationUrl: string;
    accessCode: string;
    amount: number;
    baseAmount: number;
  }> {
    const companyId = this.resolveCompanyIdForPayment(dto.companyId, authUser);
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { user: true },
    });
    if (!company) {
      throw new NotFoundException(`Company ${companyId} not found`);
    }

    const isAdmin = authUser.regType === 'admin';
    if (!isAdmin && company.userId !== authUser.id) {
      throw new ForbiddenException(
        'You can only purchase sponsorship plans for your company profile',
      );
    }

    const plan = await this.prisma.sponsorshipPlan.findUnique({
      where: { id: dto.sponsorshipPlanId },
    });
    if (!plan || !plan.isActive) {
      throw new NotFoundException('Sponsorship plan not found or inactive');
    }

    const existingPending = await this.prisma.payment.findFirst({
      where: {
        kind: 'sponsorship_plan',
        companyId: company.id,
        sponsorshipPlanId: plan.id,
        status: 'pending',
      },
      select: { id: true },
    });
    if (existingPending) {
      throw new BadRequestException(
        'There is already a pending payment for this sponsorship plan',
      );
    }

    const baseAmount = plan.priceInKobo;
    const amount = this.calculateGrossAmountForNet(baseAmount);
    const reference = this.generateReference('sponsorship_plan');

    const paystack = await this.callPaystackInitialize({
      email: company.user.email,
      amount,
      reference,
      callbackUrl: this.callbackUrlFor('sponsorship_plan'),
      metadata: {
        kind: 'sponsorship_plan',
        companyId: company.id,
        sponsorshipPlanId: plan.id,
        userId: company.userId,
        baseAmount,
      },
    });

    await this.prisma.payment.create({
      data: {
        reference,
        kind: 'sponsorship_plan',
        baseAmount,
        amount,
        status: 'pending',
        provider: 'paystack',
        providerResponse: paystack as unknown as Prisma.InputJsonValue,
        userId: company.userId,
        companyId: company.id,
        sponsorshipPlanId: plan.id,
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

  async handleWebhook(
    event: string,
    data: Record<string, unknown>,
  ): Promise<void> {
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

    if (
      payment.status === PaymentStatus.success ||
      payment.status === PaymentStatus.refunded
    ) {
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

  private async handleChargeFailed(
    data: Record<string, unknown>,
  ): Promise<void> {
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
        company: { include: { booth: true } },
        masterclass: true,
        panelSession: true,
        presentation: true,
        hotelRoom: true,
        sponsorshipPlan: true,
        advertSlot: true,
        brandingSlot: true,
      },
    });
    if (!payment) {
      return;
    }

    if (payment.kind === 'booth') {
      const booth = payment.booth;
      const company = payment.company;
      if (!booth || !company) {
        await this.markPaymentFailed(
          payment,
          paystackData,
          'Missing booth/company',
        );
        return;
      }

      if (company.booth && company.booth.id !== booth.id) {
        await this.refundBecauseUnavailable(
          payment,
          paystackData,
          'Company already has another booth',
        );
        return;
      }

      if (
        (booth.isTaken && booth.takenById !== company.id) ||
        booth.isReserved
      ) {
        await this.refundBecauseUnavailable(
          payment,
          paystackData,
          'Booth became unavailable before assignment',
        );
        return;
      }

      if (!booth.isTaken || booth.takenById !== company.id) {
        await this.prisma.booth.update({
          where: { id: booth.id },
          data: {
            isTaken: true,
            takenById: company.id,
          },
        });
      }
      return;
    }

    if (payment.kind === 'masterclass') {
      const session = payment.masterclass;
      const company = payment.company;
      if (!session || !company || !payment.masterclassId) {
        await this.markPaymentFailed(
          payment,
          paystackData,
          'Missing masterclass/company',
        );
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
      if (session.isReserved) {
        await this.refundBecauseUnavailable(
          payment,
          paystackData,
          'Masterclass slot was reserved before payment completed',
        );
        return;
      }
      if (session.isTaken && session.takenById !== company.id) {
        await this.refundBecauseUnavailable(
          payment,
          paystackData,
          'Masterclass slot was taken by another company',
        );
        return;
      }
      if (!session.isTaken || session.takenById !== company.id) {
        await this.prisma.masterclass.update({
          where: { id: session.id },
          data: {
            isTaken: true,
            takenById: company.id,
          },
        });
      }
      return;
    }

    if (payment.kind === 'panel') {
      const session = payment.panelSession;
      const company = payment.company;
      if (!session || !company || !payment.panelSessionId) {
        await this.markPaymentFailed(
          payment,
          paystackData,
          'Missing panel/company',
        );
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
      if (session.isReserved) {
        await this.refundBecauseUnavailable(
          payment,
          paystackData,
          'Panel slot was reserved before payment completed',
        );
        return;
      }
      if (session.isTaken && session.takenById !== company.id) {
        await this.refundBecauseUnavailable(
          payment,
          paystackData,
          'Panel slot was taken by another company',
        );
        return;
      }
      if (!session.isTaken || session.takenById !== company.id) {
        await this.prisma.panelSession.update({
          where: { id: session.id },
          data: {
            isTaken: true,
            takenById: company.id,
          },
        });
      }
      return;
    }

    if (payment.kind === 'presentation') {
      const session = payment.presentation;
      const company = payment.company;
      if (!session || !company || !payment.presentationId) {
        await this.markPaymentFailed(
          payment,
          paystackData,
          'Missing presentation/company',
        );
        return;
      }
      if (session.status !== SessionStatus.published) {
        await this.refundBecauseUnavailable(
          payment,
          paystackData,
          'Presentation slot no longer published',
        );
        return;
      }
      if (session.isReserved) {
        await this.refundBecauseUnavailable(
          payment,
          paystackData,
          'Presentation slot was reserved before payment completed',
        );
        return;
      }
      if (session.isTaken && session.takenById !== company.id) {
        await this.refundBecauseUnavailable(
          payment,
          paystackData,
          'Presentation slot was taken by another company',
        );
        return;
      }
      if (!session.isTaken || session.takenById !== company.id) {
        await this.prisma.presentation.update({
          where: { id: session.id },
          data: {
            isTaken: true,
            takenById: company.id,
          },
        });
      }
      return;
    }

    if (payment.kind === 'sponsorship_plan') {
      const plan = payment.sponsorshipPlan;
      const company = payment.company;
      if (!plan || !company || !payment.sponsorshipPlanId) {
        await this.markPaymentFailed(
          payment,
          paystackData,
          'Missing sponsorship plan or company',
        );
        return;
      }
      if (!plan.isActive) {
        await this.refundBecauseUnavailable(
          payment,
          paystackData,
          'Sponsorship plan is no longer active',
        );
        return;
      }

      const nextTier = maxTier(company.highestSponsorshipTier, plan.tier);
      await this.prisma.company.update({
        where: { id: company.id },
        data: {
          sponsorshipPaidTotalKobo: { increment: plan.priceInKobo },
          ...(nextTier != null ? { highestSponsorshipTier: nextTier } : {}),
        },
      });
      return;
    }

    if (payment.kind === 'hotel_room') {
      const room = payment.hotelRoom;
      if (!room) {
        await this.markPaymentFailed(
          payment,
          paystackData,
          'Missing hotel room',
        );
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
      return;
    }

    if (payment.kind === 'advert_slot') {
      const slot = payment.advertSlot;
      const company = payment.company;
      if (!slot || !company || !payment.advertSlotId) {
        await this.markPaymentFailed(
          payment,
          paystackData,
          'Missing advert slot or company',
        );
        return;
      }
      if (slot.isReserved) {
        await this.refundBecauseUnavailable(
          payment,
          paystackData,
          'Advert slot was reserved before payment completed',
        );
        return;
      }
      if (slot.isTaken && slot.takenById !== company.id) {
        await this.refundBecauseUnavailable(
          payment,
          paystackData,
          'Advert slot was taken by another company',
        );
        return;
      }
      if (!slot.isTaken || slot.takenById !== company.id) {
        await this.prisma.advertSlot.update({
          where: { id: slot.id },
          data: {
            isTaken: true,
            takenById: company.id,
          },
        });
      }
      return;
    }

    if (payment.kind === 'branding_slot') {
      const slot = payment.brandingSlot;
      const company = payment.company;
      if (!slot || !company || !payment.brandingSlotId) {
        await this.markPaymentFailed(
          payment,
          paystackData,
          'Missing branding slot or company',
        );
        return;
      }
      if (slot.isReserved) {
        await this.refundBecauseUnavailable(
          payment,
          paystackData,
          'Branding slot was reserved before payment completed',
        );
        return;
      }
      if (slot.isTaken && slot.takenById !== company.id) {
        await this.refundBecauseUnavailable(
          payment,
          paystackData,
          'Branding slot was taken by another company',
        );
        return;
      }
      if (!slot.isTaken || slot.takenById !== company.id) {
        await this.prisma.brandingSlot.update({
          where: { id: slot.id },
          data: {
            isTaken: true,
            takenById: company.id,
          },
        });
      }
      return;
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

  async verifyPayment(
    reference: string,
    authUser: AuthUser,
  ): Promise<{
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
      throw new NotFoundException(
        `Payment ${reference} not found after verify`,
      );
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
          presentation: { select: { id: true, title: true } },
          hotelRoom: {
            select: {
              id: true,
              hotelName: true,
              roomType: true,
            },
          },
          company: { select: { id: true, companyName: true } },
          sponsorshipPlan: { select: { id: true, name: true, tier: true } },
          advertSlot: { select: { id: true, title: true } },
          brandingSlot: { select: { id: true, title: true } },
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
