import { SponsorTier } from '@prisma/client';

const RANK: Record<SponsorTier, number> = {
  silver: 1,
  gold: 2,
  platinum: 3,
  headliner: 4,
};

export function tierRank(t: SponsorTier | null | undefined): number {
  if (t == null) return 0;
  return RANK[t] ?? 0;
}

export function maxTier(
  a: SponsorTier | null | undefined,
  b: SponsorTier | null | undefined,
): SponsorTier | null {
  if (tierRank(a) >= tierRank(b)) return a ?? null;
  return b ?? null;
}

/**
 * Exhibitors default to **gold** when no higher source applies.
 * Stored `highestSponsorshipTier` is updated on booth purchase (booth tier when set)
 * and when sponsorship exceeds the current tier; we still max with live `booth.tier` for consistency.
 */
export function effectiveDisplayTier(company: {
  booth?: { tier: SponsorTier | null } | null;
  highestSponsorshipTier: SponsorTier | null;
}): SponsorTier {
  return (
    maxTier(
      company.highestSponsorshipTier ?? SponsorTier.gold,
      company.booth?.tier ?? null,
    ) ?? SponsorTier.gold
  );
}
