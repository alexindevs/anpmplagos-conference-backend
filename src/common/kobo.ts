/** Integer kobo amounts stored as Prisma `BigInt` — helpers for boundaries and math. */

export function koboBigInt(n: number | bigint): bigint {
  if (typeof n === 'bigint') {
    return n;
  }
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new TypeError('kobo amount must be a finite integer');
  }
  return BigInt(n);
}

/** Use before Paystack / fee math (expects safe JS `number`). */
export function koboNumber(n: bigint | number): number {
  if (typeof n === 'number') {
    return n;
  }
  const x = Number(n);
  if (!Number.isSafeInteger(x)) {
    throw new RangeError('kobo amount exceeds Number.MAX_SAFE_INTEGER');
  }
  return x;
}
