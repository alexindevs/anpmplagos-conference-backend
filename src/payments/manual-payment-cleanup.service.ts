import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ManualPaymentService } from './manual-payment.service';

const MANUAL_PAYMENT_TTL_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class ManualPaymentCleanupService {
  private readonly logger = new Logger(ManualPaymentCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly manualPayment: ManualPaymentService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cancelStalePendingManualPayments(): Promise<void> {
    const cutoff = new Date(Date.now() - MANUAL_PAYMENT_TTL_MS);

    const stale = await this.prisma.payment.findMany({
      where: {
        provider: 'manual',
        status: 'pending',
        claimedPaidAt: null,
        createdAt: { lt: cutoff },
      },
      select: { reference: true },
    });

    if (stale.length === 0) {
      return;
    }

    let cancelled = 0;
    for (const { reference } of stale) {
      try {
        await this.manualPayment.cancelPendingPayment(reference, null, {
          skipOwnerCheck: true,
        });
        cancelled++;
      } catch (err) {
        this.logger.error(
          `Failed to cancel stale manual payment ${reference}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    this.logger.log(
      `Manual payment cleanup: cancelled ${cancelled}/${stale.length} stale pending payments`,
    );
  }
}
