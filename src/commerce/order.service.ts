import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CartItem,
  CartItemType,
  CartKind,
  Prisma,
  RegistrationStatus,
} from '@prisma/client';
import { AuthUser } from '../auth/auth.service';
import { PaystackService } from '../payments/paystack.service';
import { PrismaService } from '../prisma/prisma.service';
import { SponsorshipBundleResolutionService } from '../sponsorship/sponsorship-bundle-resolution.service';
import { CHECKOUT_HOLD_TTL_MS } from './checkout-hold.util';
import {
  assertAdvertSlotsNotBundleOnly,
  assertBrandingSlotsNotBundleOnly,
} from '../marketing-slots/marketing-slot-bundle-guard';
import { CheckoutOrderDto } from './dto/checkout-order.dto';
import { koboBigInt, koboNumber } from '../common/kobo';
import {
  applyEarlyBirdDiscountToBigIntKobo,
  cartLineGetsEarlyBirdDiscount,
  getEarlyBirdDiscountPercent,
} from '../common/early-bird-discount.util';

type CartItemWithRelations = CartItem & {
  booth: { price: number; name: string } | null;
  masterclass: { priceInKobo: number; title: string } | null;
  panelSession: { priceInKobo: number; title: string } | null;
  presentation: { priceInKobo: number; title: string } | null;
  sponsorshipPlan: { priceInKobo: bigint | number; name: string } | null;
  hotelRoom: { price: number; hotelName: string; roomType: string } | null;
  advertSlot: { price: number; title: string } | null;
  brandingSlot: { price: number; title: string } | null;
};

/** Line payload for `orderItem.createMany` (no `orderId` until mapped). */
type OrderLineSnapshotInput = Pick<
  Prisma.OrderItemCreateManyInput,
  | 'type'
  | 'quantity'
  | 'unitBaseAmountKobo'
  | 'titleSnapshot'
  | 'boothId'
  | 'masterclassId'
  | 'panelSessionId'
  | 'presentationId'
  | 'sponsorshipPlanId'
  | 'hotelRoomId'
  | 'advertSlotId'
  | 'brandingSlotId'
>;

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystack: PaystackService,
    private readonly sponsorshipBundleResolution: SponsorshipBundleResolutionService,
  ) {}

  private needsCompany(items: { type: CartItemType }[]): boolean {
    return items.some((i) =>
      [
        'booth',
        'masterclass',
        'panel',
        'presentation',
        'sponsorship_plan',
        'advert_slot',
        'branding_slot',
      ].includes(i.type),
    );
  }

  private resolveCompanyIdForCheckout(
    authUser: AuthUser,
    cartKind: CartKind,
    items: { type: CartItemType }[],
  ): string | null {
    if (cartKind === 'hotel') {
      return null;
    }
    if (!this.needsCompany(items)) {
      return null;
    }
    if (authUser.regType !== 'company' || !authUser.company?.id) {
      throw new BadRequestException(
        'Conference checkout requires a signed-in company account',
      );
    }
    return authUser.company.id;
  }

  private snapshotForItem(item: CartItemWithRelations): OrderLineSnapshotInput {
    let unit = 0;
    let title: string | null = null;
    switch (item.type) {
      case 'booth':
        unit = item.booth?.price ?? 0;
        title = item.booth?.name ?? null;
        break;
      case 'masterclass':
        unit = item.masterclass?.priceInKobo ?? 0;
        title = item.masterclass?.title ?? null;
        break;
      case 'panel':
        unit = item.panelSession?.priceInKobo ?? 0;
        title = item.panelSession?.title ?? null;
        break;
      case 'presentation':
        unit = item.presentation?.priceInKobo ?? 0;
        title = item.presentation?.title ?? null;
        break;
      case 'sponsorship_plan':
        unit = koboNumber(item.sponsorshipPlan?.priceInKobo ?? 0n);
        title = item.sponsorshipPlan?.name ?? null;
        break;
      case 'hotel_room':
        unit = item.hotelRoom?.price ?? 0;
        title = item.hotelRoom
          ? `${item.hotelRoom.hotelName} — ${item.hotelRoom.roomType}`
          : null;
        break;
      case 'advert_slot':
        unit = item.advertSlot?.price ?? 0;
        title = item.advertSlot?.title ?? null;
        break;
      case 'branding_slot':
        unit = item.brandingSlot?.price ?? 0;
        title = item.brandingSlot?.title ?? null;
        break;
      default:
        unit = 0;
    }
    return {
      type: item.type,
      quantity: item.quantity,
      unitBaseAmountKobo: koboBigInt(unit),
      titleSnapshot: title,
      boothId: item.boothId,
      masterclassId: item.masterclassId,
      panelSessionId: item.panelSessionId,
      presentationId: item.presentationId,
      sponsorshipPlanId: item.sponsorshipPlanId,
      hotelRoomId: item.hotelRoomId,
      advertSlotId: item.advertSlotId,
      brandingSlotId: item.brandingSlotId,
    };
  }

  private async assertNoPendingCheckout(
    userId: string,
    cartKind: CartKind,
  ): Promise<void> {
    const open = await this.prisma.order.findFirst({
      where: {
        userId,
        cartKind,
        status: 'pending_payment',
        payments: { some: { kind: 'order', status: 'pending' } },
      },
      select: { id: true },
    });
    if (open) {
      throw new BadRequestException(
        'You already have a checkout in progress for this cart. Complete or cancel it first.',
      );
    }
  }

  private async placeCheckoutHoldsTx(
    tx: Prisma.TransactionClient,
    orderId: string,
    lines: OrderLineSnapshotInput[],
    expiresAt: Date,
  ): Promise<void> {
    for (const line of lines) {
      if (line.boothId) {
        await tx.booth.update({
          where: { id: line.boothId },
          data: {
            checkoutHoldExpiresAt: expiresAt,
            checkoutHoldOrderId: orderId,
            checkoutHoldPaymentId: null,
          },
        });
      }
      if (line.masterclassId) {
        await tx.masterclass.update({
          where: { id: line.masterclassId },
          data: {
            checkoutHoldExpiresAt: expiresAt,
            checkoutHoldOrderId: orderId,
            checkoutHoldPaymentId: null,
          },
        });
      }
      if (line.panelSessionId) {
        await tx.panelSession.update({
          where: { id: line.panelSessionId },
          data: {
            checkoutHoldExpiresAt: expiresAt,
            checkoutHoldOrderId: orderId,
            checkoutHoldPaymentId: null,
          },
        });
      }
      if (line.presentationId) {
        await tx.presentation.update({
          where: { id: line.presentationId },
          data: {
            checkoutHoldExpiresAt: expiresAt,
            checkoutHoldOrderId: orderId,
            checkoutHoldPaymentId: null,
          },
        });
      }
      if (line.hotelRoomId) {
        await tx.hotelRoom.update({
          where: { id: line.hotelRoomId },
          data: {
            checkoutHoldExpiresAt: expiresAt,
            checkoutHoldOrderId: orderId,
            checkoutHoldPaymentId: null,
          },
        });
      }
    }
  }

  async checkout(authUser: AuthUser, dto: CheckoutOrderDto) {
    const userId = authUser.id;
    await this.assertNoPendingCheckout(userId, dto.cartKind);

    const cart = await this.prisma.cart.findUnique({
      where: { userId_kind: { userId, kind: dto.cartKind } },
      include: {
        items: {
          include: {
            booth: { select: { name: true, price: true } },
            masterclass: { select: { title: true, priceInKobo: true } },
            panelSession: { select: { title: true, priceInKobo: true } },
            presentation: { select: { title: true, priceInKobo: true } },
            sponsorshipPlan: { select: { name: true, priceInKobo: true } },
            hotelRoom: {
              select: { hotelName: true, roomType: true, price: true },
            },
            advertSlot: { select: { title: true, price: true } },
            brandingSlot: { select: { title: true, price: true } },
          },
        },
      },
    });
    if (!cart?.items.length) {
      throw new BadRequestException('Your cart is empty');
    }

    const companyId = this.resolveCompanyIdForCheckout(
      authUser,
      dto.cartKind,
      cart.items,
    );

    if (dto.cartKind === 'conference' && companyId) {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        include: { user: true },
      });
      if (!company) {
        throw new NotFoundException('Company not found');
      }
      if (company.user.registrationStatus !== RegistrationStatus.registered) {
        throw new BadRequestException(
          'Complete registration before checking out',
        );
      }
    }

    if (dto.cartKind === 'hotel') {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { company: true },
      });
      if (!user || user.registrationStatus !== RegistrationStatus.registered) {
        throw new BadRequestException(
          'Complete registration before checking out hotel cart',
        );
      }
      const canBookMultipleHotelRooms = authUser.regType === 'company';
      if (!canBookMultipleHotelRooms) {
        const [bookedCount, pendingLegacy, pendingOrder] = await Promise.all([
          this.prisma.hotelRoom.count({
            where: { bookedById: userId, isBooked: true },
          }),
          this.prisma.payment.count({
            where: { userId, kind: 'hotel_room', status: 'pending' },
          }),
          this.prisma.order.count({
            where: {
              userId,
              cartKind: 'hotel',
              status: 'pending_payment',
              payments: { some: { kind: 'order', status: 'pending' } },
            },
          }),
        ]);
        const cartRoomCount = cart.items.length;
        if (bookedCount + pendingLegacy + pendingOrder + cartRoomCount > 1) {
          throw new BadRequestException(
            'Only one hotel room per non-company account (including items in this cart)',
          );
        }
      }
    }

    const lineInputs = cart.items.map((it) =>
      this.snapshotForItem(it as CartItemWithRelations),
    );

    const discountPct = getEarlyBirdDiscountPercent();
    const checkoutLines: OrderLineSnapshotInput[] =
      discountPct > 0
        ? lineInputs.map((line) => {
            if (!cartLineGetsEarlyBirdDiscount(dto.cartKind, line.type)) {
              return line;
            }
            return {
              ...line,
              unitBaseAmountKobo: applyEarlyBirdDiscountToBigIntKobo(
                koboBigInt(line.unitBaseAmountKobo),
                discountPct,
              ),
            };
          })
        : lineInputs;

    if (dto.cartKind === 'conference' && companyId) {
      await this.sponsorshipBundleResolution.assertCheckoutCompatibleWithPlans(
        this.prisma,
        { companyId, lineInputs },
      );
      const advertIds = lineInputs
        .filter((l) => l.type === 'advert_slot' && l.advertSlotId)
        .map((l) => l.advertSlotId!);
      const brandingIds = lineInputs
        .filter((l) => l.type === 'branding_slot' && l.brandingSlotId)
        .map((l) => l.brandingSlotId!);
      await assertAdvertSlotsNotBundleOnly(this.prisma, advertIds);
      await assertBrandingSlotsNotBundleOnly(this.prisma, brandingIds);
    }

    const baseTotal = checkoutLines.reduce(
      (sum, line) =>
        sum + koboNumber(line.unitBaseAmountKobo) * line.quantity,
      0,
    );
    if (baseTotal <= 0) {
      throw new BadRequestException('Unable to compute order total');
    }
    const isManual = this.paystack.isManualMode();
    const chargedTotal = isManual
      ? baseTotal
      : this.paystack.grossAmountForNetBase(baseTotal);
    const reference = this.paystack.paymentReferenceForKind('order');

    const expiresAt = new Date(Date.now() + CHECKOUT_HOLD_TTL_MS);

    const { orderId, paymentId } = await this.prisma.$transaction(
      async (tx) => {
        const order = await tx.order.create({
          data: {
            userId,
            companyId,
            cartKind: dto.cartKind,
            status: 'pending_payment',
          },
        });

        await tx.orderItem.createMany({
          data: checkoutLines.map((line) => ({
            ...line,
            orderId: order.id,
          })),
        });

        await this.placeCheckoutHoldsTx(tx, order.id, checkoutLines, expiresAt);

        const sponsorshipResolution =
          await this.sponsorshipBundleResolution.resolveAllForCheckout(tx, {
            orderId: order.id,
            lineInputs: checkoutLines,
            expiresAt,
          });

        const payment = await tx.payment.create({
          data: {
            reference,
            kind: 'order',
            baseAmount: koboBigInt(baseTotal),
            amount: koboBigInt(chargedTotal),
            status: 'pending',
            provider: isManual ? 'manual' : 'paystack',
            providerResponse: {} as Prisma.InputJsonValue,
            userId,
            companyId,
            orderId: order.id,
            ...(sponsorshipResolution
              ? {
                  sponsorshipResolution:
                    sponsorshipResolution as unknown as Prisma.InputJsonValue,
                }
              : {}),
          },
        });

        return { orderId: order.id, paymentId: payment.id };
      },
    );

    if (isManual) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      return { orderId, reference, manualMode: true, baseAmount: baseTotal };
    }

    try {
      const init = await this.paystack.initializePaystackForOrderPayment(
        paymentId,
        authUser,
      );
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      return { orderId, ...init };
    } catch (err) {
      await this.paystack.releaseOrderCheckoutHolds(orderId);
      await this.prisma.payment.deleteMany({ where: { id: paymentId } });
      await this.prisma.order.delete({ where: { id: orderId } });
      throw err;
    }
  }
}
