import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Clears `checkoutHoldExpiresAt` / `checkoutHoldOrderId` / `checkoutHoldPaymentId` on catalog rows after the
 * hold TTL. Availability already ignores expired holds at read time; this job
 * keeps the database tidy and avoids stale order ids on inventory.
 */
@Injectable()
export class CheckoutHoldCleanupService {
  private readonly logger = new Logger(CheckoutHoldCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async releaseExpiredCheckoutHolds(): Promise<void> {
    const now = new Date();
    const clear = {
      checkoutHoldExpiresAt: null as Date | null,
      checkoutHoldOrderId: null as string | null,
      checkoutHoldPaymentId: null as string | null,
    };
    const where = { checkoutHoldExpiresAt: { lt: now } };

    const [booths, hotelRooms, masterclasses, panels, presentations, advertHolds, brandingHolds] =
      await Promise.all([
        this.prisma.booth.updateMany({ where, data: clear }),
        this.prisma.hotelRoom.updateMany({ where, data: clear }),
        this.prisma.masterclass.updateMany({ where, data: clear }),
        this.prisma.panelSession.updateMany({ where, data: clear }),
        this.prisma.presentation.updateMany({ where, data: clear }),
        this.prisma.advertSlotHold.deleteMany({ where: { expiresAt: { lt: now } } }),
        this.prisma.brandingSlotHold.deleteMany({ where: { expiresAt: { lt: now } } }),
      ]);

    const total =
      booths.count +
      hotelRooms.count +
      masterclasses.count +
      panels.count +
      presentations.count +
      advertHolds.count +
      brandingHolds.count;

    if (total > 0) {
      this.logger.log(
        `Released expired checkout holds on ${total} row(s) (booth=${booths.count}, hotelRoom=${hotelRooms.count}, masterclass=${masterclasses.count}, panel=${panels.count}, presentation=${presentations.count}, advertSlotHold=${advertHolds.count}, brandingSlotHold=${brandingHolds.count})`,
      );
    }
  }
}
