-- AlterTable
ALTER TABLE "Exhibitor" ADD COLUMN "tier" "SponsorTier";

-- CreateIndex
CREATE INDEX "Exhibitor_tier_idx" ON "Exhibitor"("tier");
