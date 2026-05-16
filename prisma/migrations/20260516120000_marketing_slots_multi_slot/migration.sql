-- Multi-slot model for AdvertSlot / BrandingSlot
-- Replace 1:1 ownership (isTaken/takenById/checkout holds) with totalSlots/availableSlots counters

-- AdvertSlot: add counter columns
ALTER TABLE "AdvertSlot" ADD COLUMN "totalSlots" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "AdvertSlot" ADD COLUMN "availableSlots" INTEGER NOT NULL DEFAULT 1;
UPDATE "AdvertSlot" SET "availableSlots" = CASE WHEN "isTaken" = true THEN 0 ELSE 1 END;

-- BrandingSlot: add counter columns
ALTER TABLE "BrandingSlot" ADD COLUMN "totalSlots" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "BrandingSlot" ADD COLUMN "availableSlots" INTEGER NOT NULL DEFAULT 1;
UPDATE "BrandingSlot" SET "availableSlots" = CASE WHEN "isTaken" = true THEN 0 ELSE 1 END;

-- Drop indexes that reference fields about to be removed
DROP INDEX IF EXISTS "AdvertSlot_takenById_idx";
DROP INDEX IF EXISTS "AdvertSlot_isTaken_isReserved_idx";
DROP INDEX IF EXISTS "AdvertSlot_checkoutHoldExpiresAt_idx";
DROP INDEX IF EXISTS "BrandingSlot_takenById_idx";
DROP INDEX IF EXISTS "BrandingSlot_isTaken_isReserved_idx";
DROP INDEX IF EXISTS "BrandingSlot_checkoutHoldExpiresAt_idx";

-- Drop foreign keys for takenById
ALTER TABLE "AdvertSlot" DROP CONSTRAINT IF EXISTS "AdvertSlot_takenById_fkey";
ALTER TABLE "BrandingSlot" DROP CONSTRAINT IF EXISTS "BrandingSlot_takenById_fkey";

-- Drop the old columns
ALTER TABLE "AdvertSlot" DROP COLUMN "isTaken";
ALTER TABLE "AdvertSlot" DROP COLUMN "takenById";
ALTER TABLE "AdvertSlot" DROP COLUMN "checkoutHoldExpiresAt";
ALTER TABLE "AdvertSlot" DROP COLUMN "checkoutHoldOrderId";
ALTER TABLE "AdvertSlot" DROP COLUMN "checkoutHoldPaymentId";

ALTER TABLE "BrandingSlot" DROP COLUMN "isTaken";
ALTER TABLE "BrandingSlot" DROP COLUMN "takenById";
ALTER TABLE "BrandingSlot" DROP COLUMN "checkoutHoldExpiresAt";
ALTER TABLE "BrandingSlot" DROP COLUMN "checkoutHoldOrderId";
ALTER TABLE "BrandingSlot" DROP COLUMN "checkoutHoldPaymentId";

-- Create new indexes
CREATE INDEX "AdvertSlot_availableSlots_idx" ON "AdvertSlot"("availableSlots");
CREATE INDEX "AdvertSlot_isReserved_idx" ON "AdvertSlot"("isReserved");
CREATE INDEX "BrandingSlot_availableSlots_idx" ON "BrandingSlot"("availableSlots");
CREATE INDEX "BrandingSlot_isReserved_idx" ON "BrandingSlot"("isReserved");
