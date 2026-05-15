-- Replace SponsorTier: headliner, platinum, gold, silver (removes bronze, custom — mapped to silver)
CREATE TYPE "SponsorTier_new" AS ENUM ('headliner', 'platinum', 'gold', 'silver');

ALTER TABLE "Exhibitor" ALTER COLUMN "tier" DROP DEFAULT;
ALTER TABLE "Exhibitor" ALTER COLUMN "tier" TYPE "SponsorTier_new" USING (
  CASE "tier"::text
    WHEN 'headliner' THEN 'headliner'::"SponsorTier_new"
    WHEN 'platinum' THEN 'platinum'::"SponsorTier_new"
    WHEN 'gold' THEN 'gold'::"SponsorTier_new"
    WHEN 'silver' THEN 'silver'::"SponsorTier_new"
    WHEN 'bronze' THEN 'silver'::"SponsorTier_new"
    WHEN 'custom' THEN 'silver'::"SponsorTier_new"
    ELSE NULL
  END
);

ALTER TABLE "Sponsor" ALTER COLUMN "tier" DROP DEFAULT;
ALTER TABLE "Sponsor" ALTER COLUMN "tier" TYPE "SponsorTier_new" USING (
  CASE "tier"::text
    WHEN 'headliner' THEN 'headliner'::"SponsorTier_new"
    WHEN 'platinum' THEN 'platinum'::"SponsorTier_new"
    WHEN 'gold' THEN 'gold'::"SponsorTier_new"
    WHEN 'silver' THEN 'silver'::"SponsorTier_new"
    WHEN 'bronze' THEN 'silver'::"SponsorTier_new"
    WHEN 'custom' THEN 'silver'::"SponsorTier_new"
    ELSE NULL
  END
);

ALTER TABLE "Booth" ALTER COLUMN "tier" DROP DEFAULT;
ALTER TABLE "Booth" ALTER COLUMN "tier" TYPE "SponsorTier_new" USING (
  CASE "tier"::text
    WHEN 'headliner' THEN 'headliner'::"SponsorTier_new"
    WHEN 'platinum' THEN 'platinum'::"SponsorTier_new"
    WHEN 'gold' THEN 'gold'::"SponsorTier_new"
    WHEN 'silver' THEN 'silver'::"SponsorTier_new"
    WHEN 'bronze' THEN 'silver'::"SponsorTier_new"
    WHEN 'custom' THEN 'silver'::"SponsorTier_new"
    ELSE NULL
  END
);

DROP TYPE "SponsorTier";
ALTER TYPE "SponsorTier_new" RENAME TO "SponsorTier";
