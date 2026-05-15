-- AlterTable
ALTER TABLE "Booth" ADD COLUMN "tier" "SponsorTier";

-- CreateIndex
CREATE INDEX "Booth_tier_idx" ON "Booth"("tier");
