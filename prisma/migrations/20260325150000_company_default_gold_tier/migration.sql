-- Exhibitors default to gold; backfill existing NULL tiers
UPDATE "Company" SET "highestSponsorshipTier" = 'gold' WHERE "highestSponsorshipTier" IS NULL;

ALTER TABLE "Company" ALTER COLUMN "highestSponsorshipTier" SET DEFAULT 'gold';
