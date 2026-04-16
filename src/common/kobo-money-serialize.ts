/**
 * Deep-clone JSON-like trees and stringify selected kobo fields for HTTP responses.
 * Only: SponsorshipPlan.priceInKobo, OrderItem.unitBaseAmountKobo,
 * Payment base/amount pairs, Company.sponsorshipPaidTotalKobo.
 */

function isJsonObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== 'object') {
    return false;
  }
  if (Array.isArray(v) || v instanceof Date) {
    return false;
  }
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

function isSponsorshipPlanShape(o: Record<string, unknown>): boolean {
  return (
    'perks' in o ||
    'bundleBoothTier' in o ||
    ('ticketAdmits' in o && 'priceInKobo' in o)
  );
}

/** Objects that carry Paystack/charge amounts in kobo (base + gross pair). */
function shouldStringifyPaymentAmountFields(o: Record<string, unknown>): boolean {
  if (!('amount' in o) || !('baseAmount' in o)) {
    return false;
  }
  if (!('reference' in o)) {
    return false;
  }
  return (
    'kind' in o ||
    'status' in o ||
    'authorizationUrl' in o ||
    'orderId' in o ||
    'provider' in o ||
    'createdAt' in o
  );
}

export function serializeKoboMoneyFields(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(serializeKoboMoneyFields);
  }
  if (!isJsonObject(value)) {
    return value;
  }

  const o = value;
  const planLike = isSponsorshipPlanShape(o);
  const paymentAmounts = shouldStringifyPaymentAmountFields(o);

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    // `priceInKobo` is BigInt only on SponsorshipPlan; partial cart selects omit perks/ticketAdmits.
    if (
      k === 'priceInKobo' &&
      (typeof v === 'bigint' ||
        (planLike && typeof v === 'number'))
    ) {
      out[k] = String(v);
    } else if (
      (k === 'unitBaseAmountKobo' || k === 'sponsorshipPaidTotalKobo') &&
      (typeof v === 'bigint' || typeof v === 'number')
    ) {
      out[k] = String(v);
    } else if (
      (k === 'baseAmount' || k === 'amount') &&
      paymentAmounts &&
      (typeof v === 'bigint' || typeof v === 'number')
    ) {
      out[k] = String(v);
    } else {
      out[k] = serializeKoboMoneyFields(v);
    }
  }
  return out;
}
