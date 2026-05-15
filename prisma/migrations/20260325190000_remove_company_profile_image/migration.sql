-- Preserve company images: use legacy profileImage as logo when logo was never set
UPDATE "Company"
SET "logo" = "profileImage"
WHERE "logo" IS NULL AND "profileImage" IS NOT NULL;

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "profileImage";
