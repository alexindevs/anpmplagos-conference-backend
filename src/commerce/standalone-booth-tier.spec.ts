import { SponsorTier } from '@prisma/client';

/** Mirrors product rule enforced in cart and Paystack booth init. */
function standaloneBoothTierAllowed(tier: SponsorTier | null): boolean {
  if (tier == null) {
    return true;
  }
  return tier === SponsorTier.silver || tier === SponsorTier.bronze;
}

describe('standalone booth tier policy', () => {
  it('allows silver, bronze, and unset tier', () => {
    expect(standaloneBoothTierAllowed(SponsorTier.silver)).toBe(true);
    expect(standaloneBoothTierAllowed(SponsorTier.bronze)).toBe(true);
    expect(standaloneBoothTierAllowed(null)).toBe(true);
  });

  it('disallows bundle-only booth tiers for standalone purchase', () => {
    expect(standaloneBoothTierAllowed(SponsorTier.gold)).toBe(false);
    expect(standaloneBoothTierAllowed(SponsorTier.platinum)).toBe(false);
    expect(standaloneBoothTierAllowed(SponsorTier.headliner)).toBe(false);
  });
});
