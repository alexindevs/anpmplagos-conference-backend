import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

export const MARKETING_SLOT_BUNDLE_ONLY_MSG =
  'This slot is part of a sponsorship plan bundle and cannot be purchased separately';

type PlanLinkDb = Pick<
  PrismaService,
  'sponsorshipPlanAdvertSlot' | 'sponsorshipPlanBrandingSlot'
>;

export async function assertAdvertSlotsNotBundleOnly(
  prisma: PlanLinkDb,
  advertSlotIds: string[],
): Promise<void> {
  const ids = [...new Set(advertSlotIds.filter(Boolean))];
  if (!ids.length) {
    return;
  }
  const count = await prisma.sponsorshipPlanAdvertSlot.count({
    where: { advertSlotId: { in: ids } },
  });
  if (count > 0) {
    throw new BadRequestException(MARKETING_SLOT_BUNDLE_ONLY_MSG);
  }
}

export async function assertBrandingSlotsNotBundleOnly(
  prisma: PlanLinkDb,
  brandingSlotIds: string[],
): Promise<void> {
  const ids = [...new Set(brandingSlotIds.filter(Boolean))];
  if (!ids.length) {
    return;
  }
  const count = await prisma.sponsorshipPlanBrandingSlot.count({
    where: { brandingSlotId: { in: ids } },
  });
  if (count > 0) {
    throw new BadRequestException(MARKETING_SLOT_BUNDLE_ONLY_MSG);
  }
}
