/**
 * Checkout holds: `checkoutHoldExpiresAt` plus either `checkoutHoldOrderId` (cart order)
 * or `checkoutHoldPaymentId` (legacy single-item init before an order exists).
 */
export function isCheckoutHoldActive(
  expiresAt: Date | null | undefined,
  holdOrderId: string | null | undefined,
  holdPaymentId?: string | null | undefined,
  now: Date = new Date(),
): boolean {
  const hasHold = !!(holdOrderId || holdPaymentId);
  return !!(
    hasHold &&
    expiresAt &&
    expiresAt.getTime() > now.getTime()
  );
}

export type CheckoutHoldExclude = {
  orderId?: string | null;
  paymentId?: string | null;
};

/** True if another buyer's active hold blocks this purchase attempt. */
export function isBlockedByOtherCheckoutHold(
  expiresAt: Date | null | undefined,
  holdOrderId: string | null | undefined,
  holdPaymentId: string | null | undefined,
  exclude?: CheckoutHoldExclude,
  now: Date = new Date(),
): boolean {
  if (!isCheckoutHoldActive(expiresAt, holdOrderId, holdPaymentId, now)) {
    return false;
  }
  if (exclude?.orderId && holdOrderId === exclude.orderId) {
    return false;
  }
  if (exclude?.paymentId && holdPaymentId === exclude.paymentId) {
    return false;
  }
  return true;
}

export const CHECKOUT_HOLD_TTL_MS = 30 * 60 * 1000;
