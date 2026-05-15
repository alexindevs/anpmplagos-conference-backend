-- Runs in a separate transaction after `default` exists on "SponsorTier".
ALTER TABLE "Company" ALTER COLUMN "highestSponsorshipTier" SET DEFAULT 'default'::"SponsorTier";
