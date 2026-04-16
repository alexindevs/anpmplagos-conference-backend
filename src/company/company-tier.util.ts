import { SponsorTier } from '@prisma/client';

const RANK: Record<SponsorTier, number> = {
  default: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
  platinum: 4,
  headliner: 5,
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
 * Companies start at **default** until a booth or sponsorship plan raises recognition.
 * Stored `highestSponsorshipTier` is updated on booth purchase (booth tier when set)
 * and when sponsorship exceeds the current tier; we still max with live `booth.tier` for consistency.
 */
export function effectiveDisplayTier(company: {
  booth?: { tier: SponsorTier | null } | null;
  highestSponsorshipTier: SponsorTier | null;
}): SponsorTier {
  return (
    maxTier(
      company.highestSponsorshipTier ?? SponsorTier.default,
      company.booth?.tier ?? null,
    ) ?? SponsorTier.default
  );
}
