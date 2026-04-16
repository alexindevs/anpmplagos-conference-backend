import type { CartItemType, CartKind } from '@prisma/client';

/**
 * Early-bird windows (server **local** calendar):
 * - Before June 1 → **10%** off eligible catalog base (kobo).
 * - June 1 through June 30 → **5%** off.
 * - July 1 onward → **0%**.
 */
export function getEarlyBirdDiscountPercent(now: Date = new Date()): number {
  const y = now.getFullYear();
  const june1 = new Date(y, 5, 1, 0, 0, 0, 0);
  const july1 = new Date(y, 6, 1, 0, 0, 0, 0);
  const t = now.getTime();
  if (t < june1.getTime()) {
    return 10;
  }
  if (t < july1.getTime()) {
    return 5;
  }
  return 0;
}

export function applyEarlyBirdDiscountToIntKobo(
  baseAmountKobo: number,
  discountPercent: number,
): number {
  if (discountPercent <= 0 || baseAmountKobo <= 0) {
    return baseAmountKobo;
  }
  return Math.floor((baseAmountKobo * (100 - discountPercent)) / 100);
}

export function applyEarlyBirdDiscountToBigIntKobo(
  baseAmountKobo: bigint,
  discountPercent: number,
): bigint {
  if (discountPercent <= 0 || baseAmountKobo <= 0n) {
    return baseAmountKobo;
  }
  return (baseAmountKobo * BigInt(100 - discountPercent)) / 100n;
}

/** Booth + sponsorship plan lines on the **conference** cart only. */
export function cartLineGetsEarlyBirdDiscount(
  cartKind: CartKind,
  lineType: CartItemType,
): boolean {
  return (
    cartKind === 'conference' &&
    (lineType === 'booth' || lineType === 'sponsorship_plan')
  );
}
