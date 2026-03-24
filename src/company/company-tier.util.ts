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

export function effectiveDisplayTier(company: {
  booth?: { tier: SponsorTier | null } | null;
  highestSponsorshipTier: SponsorTier | null;
}): SponsorTier | null {
  return maxTier(company.booth?.tier ?? null, company.highestSponsorshipTier);
}
