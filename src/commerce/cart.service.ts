import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CartItemType,
  CartKind,
  Prisma,
  RegistrationStatus,
  SessionStatus,
  SponsorTier,
} from '@prisma/client';
import { AuthUser } from '../auth/auth.service';
import { isBlockedByOtherCheckoutHold } from './checkout-hold.util';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertAdvertSlotsNotBundleOnly,
  assertBrandingSlotsNotBundleOnly,
} from '../marketing-slots/marketing-slot-bundle-guard';
import { SponsorshipBundleResolutionService } from '../sponsorship/sponsorship-bundle-resolution.service';

const UNIQUE_SLOT_TYPES: CartItemType[] = [
  'booth',
  'masterclass',
  'panel',
  'presentation',
  'sponsorship_plan',
  'advert_slot',
  'branding_slot',
  'hotel_room',
];

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sponsorshipBundleResolution: SponsorshipBundleResolutionService,
  ) {}

  private async getOrCreateCart(userId: string, kind: CartKind) {
    return this.prisma.cart.upsert({
      where: { userId_kind: { userId, kind } },
      create: { userId, kind },
      update: {},
      include: { items: true },
    });
  }

  private assertSingleFkMatchesType(dto: AddCartItemDto): void {
    const fkMap: Record<CartItemType, string | undefined> = {
      booth: dto.boothId,
      masterclass: dto.masterclassId,
      panel: dto.panelSessionId,
      presentation: dto.presentationId,
      sponsorship_plan: dto.sponsorshipPlanId,
      hotel_room: dto.hotelRoomId,
      advert_slot: dto.advertSlotId,
      branding_slot: dto.brandingSlotId,
    };
    const expected = fkMap[dto.type];
    if (!expected?.trim()) {
      throw new BadRequestException(
        `Missing catalog id for cart item type ${dto.type}`,
      );
    }
    const extras = Object.entries(fkMap).filter(
      ([t, v]) => t !== dto.type && v != null && String(v).trim() !== '',
    );
    if (extras.length > 0) {
      throw new BadRequestException(
        'Send only the id field that matches cart item type',
      );
    }
  }

  private async assertHotelCartEligibility(
    authUser: AuthUser,
    userId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.registrationStatus !== RegistrationStatus.registered) {
      throw new BadRequestException(
        'Complete registration before adding hotel rooms to cart',
      );
    }
  }

  private resolveCompanyIdForCart(authUser: AuthUser): string {
    if (authUser.regType === 'admin') {
      throw new BadRequestException(
        'Admins cannot modify carts; use a company or attendee account',
      );
    }
    if (authUser.regType === 'company' && authUser.company?.id) {
      return authUser.company.id;
    }
    throw new BadRequestException(
      'Only company accounts can add conference purchases to the cart',
    );
  }

  async addItem(authUser: AuthUser, dto: AddCartItemDto) {
    const userId = authUser.id;
    this.assertSingleFkMatchesType(dto);

    if (dto.cartKind === 'conference' && dto.type === 'hotel_room') {
      throw new BadRequestException(
        'Hotel rooms belong in the hotel cart, not the conference cart',
      );
    }
    if (dto.cartKind === 'hotel' && dto.type !== 'hotel_room') {
      throw new BadRequestException(
        'Only hotel_room items are allowed in the hotel cart',
      );
    }

    const qty = dto.quantity ?? 1;
    if (UNIQUE_SLOT_TYPES.includes(dto.type) && qty !== 1) {
      throw new BadRequestException(
        `Quantity must be 1 for ${dto.type}; add another line for a different slot`,
      );
    }

    if (dto.cartKind === 'hotel') {
      await this.assertHotelCartEligibility(authUser, userId);
    }

    if (dto.cartKind === 'conference') {
      const companyId = this.resolveCompanyIdForCart(authUser);
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        include: { user: true },
      });
      if (!company) {
        throw new NotFoundException('Company not found');
      }
      if (company.user.registrationStatus !== RegistrationStatus.registered) {
        throw new BadRequestException(
          'Complete registration before adding items to the conference cart',
        );
      }
      await this.validateConferenceCatalogItem(dto, company.id);
    } else {
      await this.validateHotelRoomItem(dto.hotelRoomId!);
    }

    const cart = await this.getOrCreateCart(userId, dto.cartKind);

    if (dto.cartKind === 'conference') {
      const companyId = this.resolveCompanyIdForCart(authUser);
      await this.assertCartSponsorshipBoothCompatibility(cart.id, dto, companyId);
    }

    const duplicateWhere = this.duplicateLineWhere(cart.id, dto);
    const existing = await this.prisma.cartItem.findFirst({
      where: duplicateWhere,
    });

    if (dto.type === 'sponsorship_plan' && existing) {
      throw new BadRequestException(
        'This sponsorship plan is already in your cart',
      );
    }

    if (existing) {
      throw new BadRequestException('This item is already in your cart');
    }

    const data: Prisma.CartItemCreateInput = {
      cart: { connect: { id: cart.id } },
      type: dto.type,
      quantity: qty,
      booth: dto.boothId ? { connect: { id: dto.boothId } } : undefined,
      masterclass: dto.masterclassId
        ? { connect: { id: dto.masterclassId } }
        : undefined,
      panelSession: dto.panelSessionId
        ? { connect: { id: dto.panelSessionId } }
        : undefined,
      presentation: dto.presentationId
        ? { connect: { id: dto.presentationId } }
        : undefined,
      sponsorshipPlan: dto.sponsorshipPlanId
        ? { connect: { id: dto.sponsorshipPlanId } }
        : undefined,
      hotelRoom: dto.hotelRoomId
        ? { connect: { id: dto.hotelRoomId } }
        : undefined,
      advertSlot: dto.advertSlotId
        ? { connect: { id: dto.advertSlotId } }
        : undefined,
      brandingSlot: dto.brandingSlotId
        ? { connect: { id: dto.brandingSlotId } }
        : undefined,
    };

    return this.prisma.cartItem.create({
      data,
      include: {
        booth: { select: { id: true, name: true, price: true, tier: true } },
        masterclass: {
          select: { id: true, title: true, priceInKobo: true, status: true },
        },
        panelSession: {
          select: { id: true, title: true, priceInKobo: true, status: true },
        },
        presentation: {
          select: { id: true, title: true, priceInKobo: true, status: true },
        },
        sponsorshipPlan: {
          select: { id: true, name: true, priceInKobo: true, tier: true },
        },
        hotelRoom: {
          select: { id: true, hotelName: true, roomType: true, price: true },
        },
        advertSlot: { select: { id: true, title: true, price: true } },
        brandingSlot: { select: { id: true, title: true, price: true } },
      },
    });
  }

  private duplicateLineWhere(
    cartId: string,
    dto: AddCartItemDto,
  ): Prisma.CartItemWhereInput {
    const base: Prisma.CartItemWhereInput = { cartId, type: dto.type };
    switch (dto.type) {
      case 'booth':
        return { ...base, boothId: dto.boothId };
      case 'masterclass':
        return { ...base, masterclassId: dto.masterclassId };
      case 'panel':
        return { ...base, panelSessionId: dto.panelSessionId };
      case 'presentation':
        return { ...base, presentationId: dto.presentationId };
      case 'sponsorship_plan':
        return { ...base, sponsorshipPlanId: dto.sponsorshipPlanId };
      case 'hotel_room':
        return { ...base, hotelRoomId: dto.hotelRoomId };
      case 'advert_slot':
        return { ...base, advertSlotId: dto.advertSlotId };
      case 'branding_slot':
        return { ...base, brandingSlotId: dto.brandingSlotId };
      default:
        return base;
    }
  }

  private async validateConferenceCatalogItem(
    dto: AddCartItemDto,
    companyId: string,
  ): Promise<void> {
    switch (dto.type) {
      case 'booth': {
        const booth = await this.prisma.booth.findUnique({
          where: { id: dto.boothId! },
        });
        if (!booth) {
          throw new NotFoundException('Booth not found');
        }
        if (
          booth.isTaken ||
          booth.isReserved ||
          isBlockedByOtherCheckoutHold(
            booth.checkoutHoldExpiresAt,
            booth.checkoutHoldOrderId,
            booth.checkoutHoldPaymentId,
            undefined,
          )
        ) {
          throw new BadRequestException('Booth is not available');
        }
        const tier = booth.tier;
        if (
          tier &&
          tier !== SponsorTier.silver &&
          tier !== SponsorTier.bronze
        ) {
          throw new BadRequestException(
            'Only silver or bronze booths can be added to the cart standalone; higher tiers are assigned via sponsorship bundles',
          );
        }
        const company = await this.prisma.company.findUnique({
          where: { id: companyId },
          include: { booth: true },
        });
        if (company?.booth) {
          throw new BadRequestException('Your company already has a booth');
        }
        return;
      }
      case 'masterclass': {
        const s = await this.prisma.masterclass.findUnique({
          where: { id: dto.masterclassId! },
        });
        if (!s) {
          throw new NotFoundException('Masterclass not found');
        }
        this.assertSessionSlotForCart(s, companyId);
        return;
      }
      case 'panel': {
        const s = await this.prisma.panelSession.findUnique({
          where: { id: dto.panelSessionId! },
        });
        if (!s) {
          throw new NotFoundException('Panel session not found');
        }
        this.assertSessionSlotForCart(s, companyId);
        return;
      }
      case 'presentation': {
        const s = await this.prisma.presentation.findUnique({
          where: { id: dto.presentationId! },
        });
        if (!s) {
          throw new NotFoundException('Presentation not found');
        }
        this.assertSessionSlotForCart(s, companyId);
        return;
      }
      case 'sponsorship_plan': {
        const plan = await this.prisma.sponsorshipPlan.findUnique({
          where: { id: dto.sponsorshipPlanId! },
        });
        if (!plan?.isActive) {
          throw new BadRequestException('Sponsorship plan is not available');
        }
        await this.sponsorshipBundleResolution.assertNoPriorSponsorshipPurchase(
          this.prisma,
          companyId,
        );
        return;
      }
      case 'advert_slot': {
        const slot = await this.prisma.advertSlot.findUnique({
          where: { id: dto.advertSlotId! },
        });
        if (!slot) {
          throw new NotFoundException('Advert slot not found');
        }
        await assertAdvertSlotsNotBundleOnly(this.prisma, [slot.id]);
        this.assertMarketingSlotForCart(slot, companyId);
        return;
      }
      case 'branding_slot': {
        const slot = await this.prisma.brandingSlot.findUnique({
          where: { id: dto.brandingSlotId! },
        });
        if (!slot) {
          throw new NotFoundException('Branding slot not found');
        }
        await assertBrandingSlotsNotBundleOnly(this.prisma, [slot.id]);
        this.assertMarketingSlotForCart(slot, companyId);
        return;
      }
      default:
        throw new BadRequestException('Unsupported cart item type');
    }
  }

  private async assertCartSponsorshipBoothCompatibility(
    cartId: string,
    dto: AddCartItemDto,
    companyId: string,
  ): Promise<void> {
    const items = await this.prisma.cartItem.findMany({
      where: { cartId },
      select: { type: true, sponsorshipPlanId: true, boothId: true },
    });
    const planIds = items
      .filter((i) => i.type === 'sponsorship_plan' && i.sponsorshipPlanId)
      .map((i) => i.sponsorshipPlanId!);
    const planIdSet = new Set(planIds);
    if (dto.type === 'sponsorship_plan' && dto.sponsorshipPlanId) {
      planIdSet.add(dto.sponsorshipPlanId);
    }
    if (planIdSet.size > 1) {
      throw new BadRequestException(
        'Only one sponsorship plan may be in the cart at a time',
      );
    }
    const linkedPlans =
      planIdSet.size > 0
        ? await this.prisma.sponsorshipPlan.findMany({
            where: { id: { in: [...planIdSet] } },
            select: { id: true, bundleBoothTier: true },
          })
        : [];
    const boothBundlePlanCount = linkedPlans.filter((p) => p.bundleBoothTier)
      .length;
    if (boothBundlePlanCount > 1) {
      throw new BadRequestException(
        'Only one sponsorship plan that includes a booth may be in the cart at a time',
      );
    }
    const hasBundleBoothInCart = linkedPlans.some((p) => p.bundleBoothTier);

    if (dto.type === 'booth' && hasBundleBoothInCart) {
      throw new BadRequestException(
        'Remove sponsorship plans that include a booth before adding a standalone booth to the cart',
      );
    }

    if (dto.type === 'sponsorship_plan' && dto.sponsorshipPlanId) {
      const plan = await this.prisma.sponsorshipPlan.findUnique({
        where: { id: dto.sponsorshipPlanId },
        select: { bundleBoothTier: true },
      });
      if (plan?.bundleBoothTier) {
        if (items.some((i) => i.type === 'booth' && i.boothId)) {
          throw new BadRequestException(
            'Remove the booth from your cart before adding a sponsorship plan that includes a booth',
          );
        }
        const company = await this.prisma.company.findUnique({
          where: { id: companyId },
          select: { booth: { select: { id: true } } },
        });
        if (company?.booth) {
          throw new BadRequestException(
            'Your company already has a booth; you cannot purchase a plan that assigns another booth',
          );
        }
      }
    }
  }

  private assertSessionSlotForCart(
    slot: {
      status: SessionStatus;
      isReserved: boolean;
      isTaken: boolean;
      takenById: string | null;
      checkoutHoldExpiresAt: Date | null;
      checkoutHoldOrderId: string | null;
      checkoutHoldPaymentId: string | null;
    },
    companyId: string,
  ): void {
    if (slot.status !== SessionStatus.published) {
      throw new BadRequestException('Session is not available for purchase');
    }
    if (slot.isReserved) {
      throw new BadRequestException('This slot is reserved');
    }
    if (slot.isTaken && slot.takenById !== companyId) {
      throw new BadRequestException('This slot is already taken');
    }
    if (slot.isTaken && slot.takenById === companyId) {
      throw new BadRequestException('Your company already owns this slot');
    }
    if (
      isBlockedByOtherCheckoutHold(
        slot.checkoutHoldExpiresAt,
        slot.checkoutHoldOrderId,
        slot.checkoutHoldPaymentId,
        undefined,
      )
    ) {
      throw new BadRequestException(
        'This slot is held by another checkout in progress',
      );
    }
  }

  private assertMarketingSlotForCart(
    slot: {
      isReserved: boolean;
      availableSlots: number;
    },
    _companyId: string,
  ): void {
    if (slot.isReserved) {
      throw new BadRequestException('This slot is reserved');
    }
    if (slot.availableSlots <= 0) {
      throw new BadRequestException('This slot is sold out');
    }
  }

  private async validateHotelRoomItem(roomId: string): Promise<void> {
    const room = await this.prisma.hotelRoom.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException('Hotel room not found');
    }
    if (
      room.isBooked ||
      room.isReserved ||
      isBlockedByOtherCheckoutHold(
        room.checkoutHoldExpiresAt,
        room.checkoutHoldOrderId,
        room.checkoutHoldPaymentId,
        undefined,
      )
    ) {
      throw new BadRequestException('This room is not available');
    }
  }

  async getCurrent(authUser: AuthUser, cartKind: CartKind) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId_kind: { userId: authUser.id, kind: cartKind } },
      include: {
        items: {
          include: {
            booth: { select: { id: true, name: true, price: true, tier: true } },
            masterclass: {
              select: { id: true, title: true, priceInKobo: true, status: true },
            },
            panelSession: {
              select: { id: true, title: true, priceInKobo: true, status: true },
            },
            presentation: {
              select: { id: true, title: true, priceInKobo: true, status: true },
            },
            sponsorshipPlan: {
              select: { id: true, name: true, priceInKobo: true, tier: true },
            },
            hotelRoom: {
              select: {
                id: true,
                hotelName: true,
                roomType: true,
                price: true,
              },
            },
            advertSlot: { select: { id: true, title: true, price: true } },
            brandingSlot: { select: { id: true, title: true, price: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return cart ?? { id: null, userId: authUser.id, kind: cartKind, items: [] };
  }

  async removeItem(authUser: AuthUser, itemId: string) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }
    if (item.cart.userId !== authUser.id) {
      throw new ForbiddenException('You cannot remove another user’s cart item');
    }
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return { removed: true, id: itemId };
  }
}
