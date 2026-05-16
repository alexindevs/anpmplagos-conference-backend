import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from './paystack.service';
import { SupportEmailService } from '../support/support-email.service';
import { CHECKOUT_HOLD_TTL_MS } from '../commerce/checkout-hold.util';
import { koboNumber } from '../common/kobo';

/** How long (ms) to extend checkout holds when a user claims they've paid. */
const CLAIM_HOLD_EXTENSION_MS = 2 * 60 * 60 * 1000; // 2 hours

@Injectable()
export class ManualPaymentService {
  private readonly logger = new Logger(ManualPaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paystack: PaystackService,
    private readonly supportEmail: SupportEmailService,
  ) {}

  private async getAdminEmails(): Promise<string[]> {
    const admins = await this.prisma.admin.findMany({
      where: { adminType: { in: ['superadmin', 'support'] } },
      include: { user: { select: { email: true } } },
    });
    return admins.map((a) => a.user.email).filter(Boolean);
  }

  /**
   * Cancel a pending payment. Can be called by the payment owner, any admin,
   * or internally by the cron job (pass `skipOwnerCheck: true`).
   */
  async cancelPendingPayment(
    reference: string,
    authUser: AuthUser | null,
    opts: { skipOwnerCheck?: boolean } = {},
  ): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { reference },
      select: {
        id: true,
        userId: true,
        orderId: true,
        status: true,
        provider: true,
      },
    });
    if (!payment) {
      throw new NotFoundException(`Payment ${reference} not found`);
    }
    if (payment.status !== 'pending') {
      throw new BadRequestException(
        `Payment is not pending (current status: ${payment.status})`,
      );
    }

    if (!opts.skipOwnerCheck && authUser) {
      const isAdmin = authUser.regType === 'admin';
      if (!isAdmin && authUser.id !== payment.userId) {
        throw new ForbiddenException(
          'You can only cancel your own pending payments',
        );
      }
    }

    await this.paystack.releaseCheckoutHoldsForPayment(payment.id);

    if (payment.orderId) {
      await this.paystack.releaseCheckoutHoldsForOrder(payment.orderId);
      await this.prisma.order.updateMany({
        where: { id: payment.orderId, status: 'pending_payment' },
        data: { status: 'failed' },
      });
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'failed' },
    });
  }

  /**
   * User confirms they have made the bank transfer.
   * Sets claimedPaidAt, extends checkout holds, and emails non-moderator admins.
   */
  async claimPaymentMade(reference: string, authUser: AuthUser): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { reference },
      include: {
        user: { select: { email: true } },
        order: { include: { items: true } },
      },
    });
    if (!payment) {
      throw new NotFoundException(`Payment ${reference} not found`);
    }
    if (payment.userId !== authUser.id) {
      throw new ForbiddenException(
        'You can only claim your own pending payments',
      );
    }
    if (payment.status !== 'pending') {
      throw new BadRequestException(
        `Payment is not pending (current status: ${payment.status})`,
      );
    }
    if (payment.provider !== 'manual') {
      throw new BadRequestException(
        'Payment claiming is only available in manual payment mode',
      );
    }
    if (payment.claimedPaidAt) {
      throw new BadRequestException('Payment has already been claimed');
    }

    const claimedAt = new Date();
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { claimedPaidAt: claimedAt },
    });

    // Extend checkout holds so slots remain reserved while admin reviews.
    if (payment.orderId) {
      await this.extendOrderCheckoutHolds(payment.orderId);
    }

    // Notify admins.
    const adminEmails = await this.getAdminEmails();
    if (adminEmails.length > 0) {
      const userName =
        authUser.member?.fullName ??
        authUser.attendee?.fullName ??
        authUser.company?.companyName ??
        payment.user.email;

      await this.supportEmail.sendPaymentClaimedEmail({
        to: adminEmails,
        userName,
        userEmail: payment.user.email,
        reference,
        paymentKind: payment.kind,
        baseAmountNgn: (koboNumber(payment.baseAmount) / 100).toLocaleString(
          'en-NG',
          { style: 'currency', currency: 'NGN' },
        ),
        claimedAt: claimedAt.toISOString(),
      });
    }
  }

  /**
   * Admin verifies a manual payment and triggers fulfillment.
   * Restricted to superadmin and support via NonModeratorAdminGuard on the route.
   */
  async adminVerifyPayment(
    reference: string,
    authUser: AuthUser,
  ): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { reference },
      select: {
        id: true,
        status: true,
        provider: true,
        paidAt: true,
      },
    });
    if (!payment) {
      throw new NotFoundException(`Payment ${reference} not found`);
    }
    if (payment.provider !== 'manual') {
      throw new BadRequestException('Only manual payments can be verified here');
    }
    if (payment.status !== 'pending') {
      throw new BadRequestException(
        `Payment is not pending (current status: ${payment.status})`,
      );
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'success', paidAt: new Date() },
    });

    await this.paystack.applySuccessfulPayment(payment.id, {
      source: 'manual_admin_verification',
      verifiedBy: authUser.id,
      verifiedAt: new Date().toISOString(),
    });
  }

  private async extendOrderCheckoutHolds(orderId: string): Promise<void> {
    const newExpiry = new Date(Date.now() + CLAIM_HOLD_EXTENSION_MS);
    const clear = { checkoutHoldExpiresAt: newExpiry };
    await Promise.all([
      this.prisma.booth.updateMany({
        where: { checkoutHoldOrderId: orderId },
        data: clear,
      }),
      this.prisma.hotelRoom.updateMany({
        where: { checkoutHoldOrderId: orderId },
        data: clear,
      }),
      this.prisma.masterclass.updateMany({
        where: { checkoutHoldOrderId: orderId },
        data: clear,
      }),
      this.prisma.panelSession.updateMany({
        where: { checkoutHoldOrderId: orderId },
        data: clear,
      }),
      this.prisma.presentation.updateMany({
        where: { checkoutHoldOrderId: orderId },
        data: clear,
      }),
    ]);
  }
}
