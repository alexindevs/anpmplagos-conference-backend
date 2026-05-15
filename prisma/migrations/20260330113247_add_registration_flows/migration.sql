-- AlterEnum
ALTER TYPE "PaymentKind" ADD VALUE 'registration';

-- AlterTable
ALTER TABLE "Company" ALTER COLUMN "highestSponsorshipTier" SET DEFAULT 'silver';
