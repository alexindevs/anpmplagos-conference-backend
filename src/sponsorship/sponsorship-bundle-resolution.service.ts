import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ConferenceDay,
  PaymentKind,
  PaymentStatus,
  Prisma,
  SessionSlotDuration,
  SessionStatus,
  SponsorTier,
} from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import {
  isBlockedByOtherCheckoutHold,
  type CheckoutHoldExclude,
} from '../commerce/checkout-hold.util';

export type SponsorshipBundleResolutionEntry = {
  sponsorshipPlanId: string;
  boothId?: string | null;
  masterclassId?: string | null;
  presentationId?: string | null;
  advertSlotIds: string[];
  brandingSlotIds: string[];
};

export type SponsorshipResolutionPayload = {
  bundles: SponsorshipBundleResolutionEntry[];
};

const BUNDLE_BOOTH_TIERS: ReadonlySet<SponsorTier> = new Set([
  SponsorTier.gold,
  SponsorTier.platinum,
  SponsorTier.headliner,
]);

export function parseSponsorshipResolution(
  raw: unknown,
): SponsorshipResolutionPayload | null {
  if (raw == null || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (Array.isArray(o.bundles)) {
    const bundles: SponsorshipBundleResolutionEntry[] = [];
    for (const b of o.bundles) {
      if (!b || typeof b !== 'object') continue;
      const e = b as Record<string, unknown>;
      if (typeof e.sponsorshipPlanId !== 'string') continue;
      bundles.push({
        sponsorshipPlanId: e.sponsorshipPlanId,
        boothId: typeof e.boothId === 'string' ? e.boothId : null,
        masterclassId:
          typeof e.masterclassId === 'string' ? e.masterclassId : null,
        presentationId:
          typeof e.presentationId === 'string' ? e.presentationId : null,
        advertSlotIds: Array.isArray(e.advertSlotIds)
          ? e.advertSlotIds.filter((x): x is string => typeof x === 'string')
          : [],
        brandingSlotIds: Array.isArray(e.brandingSlotIds)
          ? e.brandingSlotIds.filter((x): x is string => typeof x === 'string')
          : [],
      });
    }
    return bundles.length ? { bundles } : null;
  }
  return null;
}

type CheckoutTarget = { orderId: string } | { paymentId: string };

@Injectable()
export class SponsorshipBundleResolutionService {
  private holdPayload(target: CheckoutTarget, expiresAt: Date) {
    if ('orderId' in target) {
      return {
        checkoutHoldExpiresAt: expiresAt,
        checkoutHoldOrderId: target.orderId,
        checkoutHoldPaymentId: null as string | null,
      };
    }
    return {
      checkoutHoldExpiresAt: expiresAt,
      checkoutHoldOrderId: null as string | null,
      checkoutHoldPaymentId: target.paymentId,
    };
  }

  /**
   * Resolves bundle inventory for every `sponsorship_plan` line and places checkout holds.
   */
  async resolveAllForCheckout(
    tx: Prisma.TransactionClient,
    params: {
      orderId: string;
      lineInputs: Array<{ type: string; sponsorshipPlanId?: string | null }>;
      expiresAt: Date;
    },
  ): Promise<SponsorshipResolutionPayload | null> {
    const planIds = params.lineInputs
      .filter((l) => l.type === 'sponsorship_plan' && l.sponsorshipPlanId)
      .map((l) => l.sponsorshipPlanId!);
    if (!planIds.length) {
      return null;
    }
    const exclude: CheckoutHoldExclude = { orderId: params.orderId };
    const target: CheckoutTarget = { orderId: params.orderId };
    const bundles: SponsorshipBundleResolutionEntry[] = [];
    for (const planId of planIds) {
      bundles.push(
        await this.resolveSinglePlanAndPlaceHolds(tx, {
          planId,
          expiresAt: params.expiresAt,
          exclude,
          checkoutTarget: target,
        }),
      );
    }
    return { bundles };
  }

  async resolveForLegacyPaymentInit(
    tx: Prisma.TransactionClient,
    params: { planId: string; paymentId: string; expiresAt: Date },
  ): Promise<SponsorshipResolutionPayload> {
    const entry = await this.resolveSinglePlanAndPlaceHolds(tx, {
      planId: params.planId,
      expiresAt: params.expiresAt,
      exclude: { paymentId: params.paymentId },
      checkoutTarget: { paymentId: params.paymentId },
    });
    return { bundles: [entry] };
  }

  private assertMarketingSlotAvailable(
    slot: {
      id: string;
      title: string;
      availableSlots: number;
      isReserved: boolean;
    },
    label: string,
  ) {
    if (slot.isReserved) {
      throw new BadRequestException(
        `${label} "${slot.title}" is reserved and not available for this plan`,
      );
    }
    if (slot.availableSlots <= 0) {
      throw new BadRequestException(
        `${label} "${slot.title}" is sold out`,
      );
    }
  }

  private async resolveSinglePlanAndPlaceHolds(
    tx: Prisma.TransactionClient,
    opts: {
      planId: string;
      expiresAt: Date;
      exclude: CheckoutHoldExclude;
      checkoutTarget: CheckoutTarget;
    },
  ): Promise<SponsorshipBundleResolutionEntry> {
    const plan = await tx.sponsorshipPlan.findUnique({
      where: { id: opts.planId },
      include: {
        advertSlots: { include: { advertSlot: true } },
        brandingSlots: { include: { brandingSlot: true } },
      },
    });
    if (!plan?.isActive) {
      throw new BadRequestException('Sponsorship plan is not available');
    }

    if (plan.bundleBoothTier) {
      if (!BUNDLE_BOOTH_TIERS.has(plan.bundleBoothTier)) {
        throw new BadRequestException(
          'bundleBoothTier may only be gold, platinum, or headliner',
        );
      }
    }

    const mcFull =
      plan.bundleMasterclassDuration != null &&
      plan.bundleMasterclassDay != null;
    const mcPartial =
      (plan.bundleMasterclassDuration != null) !==
      (plan.bundleMasterclassDay != null);
    if (mcPartial) {
      throw new BadRequestException(
        'Masterclass bundle rule requires both bundleMasterclassDuration and bundleMasterclassDay, or neither',
      );
    }

    const prFull =
      plan.bundlePresentationDuration != null &&
      plan.bundlePresentationDay != null;
    const prPartial =
      (plan.bundlePresentationDuration != null) !==
      (plan.bundlePresentationDay != null);
    if (prPartial) {
      throw new BadRequestException(
        'Presentation bundle rule requires both bundlePresentationDuration and bundlePresentationDay, or neither',
      );
    }

    const hold = this.holdPayload(opts.checkoutTarget, opts.expiresAt);
    const entry: SponsorshipBundleResolutionEntry = {
      sponsorshipPlanId: plan.id,
      advertSlotIds: [],
      brandingSlotIds: [],
    };

    for (const link of plan.advertSlots) {
      const slot = link.advertSlot;
      this.assertMarketingSlotAvailable(slot, 'Advert slot');
      entry.advertSlotIds.push(slot.id);
    }

    for (const link of plan.brandingSlots) {
      const slot = link.brandingSlot;
      this.assertMarketingSlotAvailable(slot, 'Branding slot');
      entry.brandingSlotIds.push(slot.id);
    }

    if (plan.bundleBoothTier) {
      const booth = await this.pickFirstAvailableBooth(tx, {
        tier: plan.bundleBoothTier,
        exclude: opts.exclude,
      });
      if (!booth) {
        throw new BadRequestException(
          `No ${plan.bundleBoothTier} booth is available for this sponsorship plan`,
        );
      }
      await tx.booth.update({ where: { id: booth.id }, data: hold });
      entry.boothId = booth.id;
    }

    if (mcFull) {
      const mc = await this.pickFirstAvailableMasterclass(tx, {
        duration: plan.bundleMasterclassDuration as SessionSlotDuration,
        day: plan.bundleMasterclassDay as ConferenceDay,
        exclude: opts.exclude,
      });
      if (!mc) {
        throw new BadRequestException(
          'There are no masterclass slots available.',
        );
      }
      await tx.masterclass.update({ where: { id: mc.id }, data: hold });
      entry.masterclassId = mc.id;
    }

    if (prFull) {
      const pr = await this.pickFirstAvailablePresentation(tx, {
        duration: plan.bundlePresentationDuration as SessionSlotDuration,
        day: plan.bundlePresentationDay as ConferenceDay,
        exclude: opts.exclude,
      });
      if (!pr) {
        throw new BadRequestException(
          'There are no presentation slots available.',
        );
      }
      await tx.presentation.update({ where: { id: pr.id }, data: hold });
      entry.presentationId = pr.id;
    }

    return entry;
  }

  private async pickFirstAvailableBooth(
    tx: Prisma.TransactionClient,
    params: { tier: SponsorTier; exclude: CheckoutHoldExclude },
  ) {
    const booths = await tx.booth.findMany({
      where: {
        tier: params.tier,
        isTaken: false,
      },
      orderBy: [{ isReserved: 'asc' }, { id: 'asc' }],
    });
    return (
      booths.find(
        (b) =>
          !isBlockedByOtherCheckoutHold(
            b.checkoutHoldExpiresAt,
            b.checkoutHoldOrderId,
            b.checkoutHoldPaymentId,
            params.exclude,
          ),
      ) ?? null
    );
  }

  private async pickFirstAvailableMasterclass(
    tx: Prisma.TransactionClient,
    params: {
      duration: SessionSlotDuration;
      day: ConferenceDay;
      exclude: CheckoutHoldExclude;
    },
  ) {
    const rows = await tx.masterclass.findMany({
      where: {
        status: SessionStatus.published,
        slotDuration: params.duration,
        conferenceDay: params.day,
        isTaken: false,
        isReserved: false,
      },
      orderBy: { id: 'asc' },
    });
    return (
      rows.find(
        (s) =>
          !isBlockedByOtherCheckoutHold(
            s.checkoutHoldExpiresAt,
            s.checkoutHoldOrderId,
            s.checkoutHoldPaymentId,
            params.exclude,
          ),
      ) ?? null
    );
  }

  private async pickFirstAvailablePresentation(
    tx: Prisma.TransactionClient,
    params: {
      duration: SessionSlotDuration;
      day: ConferenceDay;
      exclude: CheckoutHoldExclude;
    },
  ) {
    const rows = await tx.presentation.findMany({
      where: {
        status: SessionStatus.published,
        slotDuration: params.duration,
        conferenceDay: params.day,
        isTaken: false,
        isReserved: false,
      },
      orderBy: { id: 'asc' },
    });
    return (
      rows.find(
        (s) =>
          !isBlockedByOtherCheckoutHold(
            s.checkoutHoldExpiresAt,
            s.checkoutHoldOrderId,
            s.checkoutHoldPaymentId,
            params.exclude,
          ),
      ) ?? null
    );
  }

  /** True if this company has any successful sponsorship purchase (legacy or conference order). */
  async companyHasSuccessfulSponsorshipPurchase(
    prisma: Prisma.TransactionClient | Pick<PrismaService, 'payment'>,
    companyId: string,
  ): Promise<boolean> {
    const legacy = await prisma.payment.findFirst({
      where: {
        companyId,
        status: PaymentStatus.success,
        kind: PaymentKind.sponsorship_plan,
      },
      select: { id: true },
    });
    if (legacy) {
      return true;
    }
    const viaOrder = await prisma.payment.findFirst({
      where: {
        companyId,
        status: PaymentStatus.success,
        kind: PaymentKind.order,
        order: {
          items: { some: { type: 'sponsorship_plan' } },
        },
      },
      select: { id: true },
    });
    return !!viaOrder;
  }

  async assertNoPriorSponsorshipPurchase(
    prisma: Prisma.TransactionClient | Pick<PrismaService, 'payment'>,
    companyId: string,
  ): Promise<void> {
    if (await this.companyHasSuccessfulSponsorshipPurchase(prisma, companyId)) {
      throw new BadRequestException(
        'Your company has already purchased a sponsorship plan; additional sponsorship purchases are not allowed',
      );
    }
  }

  /**
   * Validates cart/order does not mix a bundle booth with a separate booth line, or an existing company booth.
   */
  async assertCheckoutCompatibleWithPlans(
    prisma: Prisma.TransactionClient | Pick<PrismaService, 'sponsorshipPlan' | 'company' | 'payment'>,
    params: {
      companyId: string | null;
      lineInputs: Array<{
        type: string;
        quantity?: number;
        boothId?: string | null;
        sponsorshipPlanId?: string | null;
      }>;
    },
  ): Promise<void> {
    const sponsorshipLines = params.lineInputs.filter(
      (l) => l.type === 'sponsorship_plan' && l.sponsorshipPlanId,
    );
    const planIds = sponsorshipLines.map((l) => l.sponsorshipPlanId!);
    if (!planIds.length) {
      return;
    }
    for (const line of sponsorshipLines) {
      const q = line.quantity ?? 1;
      if (q > 1) {
        throw new BadRequestException('Sponsorship plan quantity must be 1');
      }
    }
    const uniquePlanIds = [...new Set(planIds)];
    if (uniquePlanIds.length !== planIds.length) {
      throw new BadRequestException(
        'Duplicate sponsorship plans cannot be checked out together',
      );
    }
    if (uniquePlanIds.length > 1) {
      throw new BadRequestException(
        'Only one sponsorship plan may be checked out at a time',
      );
    }
    if (params.companyId) {
      await this.assertNoPriorSponsorshipPurchase(prisma, params.companyId);
    }
    const plans = await prisma.sponsorshipPlan.findMany({
      where: { id: { in: planIds } },
      select: { id: true, bundleBoothTier: true },
    });
    const boothBundleCount = plans.filter((p) => p.bundleBoothTier).length;
    if (boothBundleCount > 1) {
      throw new BadRequestException(
        'Only one sponsorship plan that includes a booth may be in the same checkout',
      );
    }
    const withBundleBooth = plans.filter((p) => p.bundleBoothTier != null);
    if (!withBundleBooth.length) {
      return;
    }
    const hasExplicitBoothLine = params.lineInputs.some(
      (l) => l.type === 'booth' && l.boothId,
    );
    if (hasExplicitBoothLine) {
      throw new BadRequestException(
        'Remove standalone booth items from the cart when purchasing a sponsorship plan that includes a booth',
      );
    }
    if (params.companyId) {
      const company = await prisma.company.findUnique({
        where: { id: params.companyId },
        select: { booth: { select: { id: true } } },
      });
      if (company?.booth) {
        throw new BadRequestException(
          'Your company already has a booth; plans that include a booth cannot be purchased',
        );
      }
    }
  }
}
