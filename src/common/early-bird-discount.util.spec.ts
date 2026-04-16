import {
  applyEarlyBirdDiscountToIntKobo,
  getEarlyBirdDiscountPercent,
} from './early-bird-discount.util';

describe('early-bird-discount.util', () => {
  it('returns 10% before June 1', () => {
    expect(getEarlyBirdDiscountPercent(new Date('2026-05-31T12:00:00'))).toBe(
      10,
    );
  });

  it('returns 5% in June', () => {
    expect(getEarlyBirdDiscountPercent(new Date('2026-06-15T12:00:00'))).toBe(
      5,
    );
  });

  it('returns 0% from July 1', () => {
    expect(getEarlyBirdDiscountPercent(new Date('2026-07-01T00:00:00'))).toBe(
      0,
    );
  });

  it('floors kobo when applying percent', () => {
    expect(applyEarlyBirdDiscountToIntKobo(100, 10)).toBe(90);
    expect(applyEarlyBirdDiscountToIntKobo(101, 10)).toBe(90);
  });
});
