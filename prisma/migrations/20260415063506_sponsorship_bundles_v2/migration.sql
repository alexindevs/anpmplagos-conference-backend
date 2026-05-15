-- CreateEnum
CREATE TYPE "SessionSlotDuration" AS ENUM ('m10', 'm15', 'm20', 'm30', 'm45', 'h1', 'h2');

-- CreateEnum
CREATE TYPE "ConferenceDay" AS ENUM ('day_1', 'day_2');

-- AlterEnum
ALTER TYPE "SponsorTier" ADD VALUE 'bronze';

-- AlterTable
ALTER TABLE "AdvertSlot" ADD COLUMN     "checkoutHoldPaymentId" TEXT;

-- AlterTable
ALTER TABLE "Booth" ADD COLUMN     "checkoutHoldPaymentId" TEXT;

-- AlterTable
ALTER TABLE "BrandingSlot" ADD COLUMN     "checkoutHoldPaymentId" TEXT;

-- AlterTable
ALTER TABLE "HotelRoom" ADD COLUMN     "checkoutHoldPaymentId" TEXT;

-- AlterTable
ALTER TABLE "Masterclass" ADD COLUMN     "checkoutHoldPaymentId" TEXT,
ADD COLUMN     "conferenceDay" "ConferenceDay" NOT NULL DEFAULT 'day_1',
ADD COLUMN     "slotDuration" "SessionSlotDuration" NOT NULL DEFAULT 'm30';

-- AlterTable
ALTER TABLE "PanelSession" ADD COLUMN     "checkoutHoldPaymentId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "sponsorshipResolution" JSONB;

-- AlterTable
ALTER TABLE "Presentation" ADD COLUMN     "checkoutHoldPaymentId" TEXT,
ADD COLUMN     "conferenceDay" "ConferenceDay" NOT NULL DEFAULT 'day_1',
ADD COLUMN     "slotDuration" "SessionSlotDuration" NOT NULL DEFAULT 'm30';

-- AlterTable
ALTER TABLE "SponsorshipPlan" ADD COLUMN     "bundleBoothTier" "SponsorTier",
ADD COLUMN     "bundleMasterclassDay" "ConferenceDay",
ADD COLUMN     "bundleMasterclassDuration" "SessionSlotDuration",
ADD COLUMN     "bundlePresentationDay" "ConferenceDay",
ADD COLUMN     "bundlePresentationDuration" "SessionSlotDuration",
ADD COLUMN     "ticketAdmits" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "SponsorshipPlanAdvertSlot" (
    "id" TEXT NOT NULL,
    "sponsorshipPlanId" TEXT NOT NULL,
    "advertSlotId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SponsorshipPlanAdvertSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsorshipPlanBrandingSlot" (
    "id" TEXT NOT NULL,
    "sponsorshipPlanId" TEXT NOT NULL,
    "brandingSlotId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SponsorshipPlanBrandingSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SponsorshipPlanAdvertSlot_advertSlotId_idx" ON "SponsorshipPlanAdvertSlot"("advertSlotId");

-- CreateIndex
CREATE UNIQUE INDEX "SponsorshipPlanAdvertSlot_sponsorshipPlanId_advertSlotId_key" ON "SponsorshipPlanAdvertSlot"("sponsorshipPlanId", "advertSlotId");

-- CreateIndex
CREATE INDEX "SponsorshipPlanBrandingSlot_brandingSlotId_idx" ON "SponsorshipPlanBrandingSlot"("brandingSlotId");

-- CreateIndex
CREATE UNIQUE INDEX "SponsorshipPlanBrandingSlot_sponsorshipPlanId_brandingSlotI_key" ON "SponsorshipPlanBrandingSlot"("sponsorshipPlanId", "brandingSlotId");

-- AddForeignKey
ALTER TABLE "SponsorshipPlanAdvertSlot" ADD CONSTRAINT "SponsorshipPlanAdvertSlot_sponsorshipPlanId_fkey" FOREIGN KEY ("sponsorshipPlanId") REFERENCES "SponsorshipPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorshipPlanAdvertSlot" ADD CONSTRAINT "SponsorshipPlanAdvertSlot_advertSlotId_fkey" FOREIGN KEY ("advertSlotId") REFERENCES "AdvertSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorshipPlanBrandingSlot" ADD CONSTRAINT "SponsorshipPlanBrandingSlot_sponsorshipPlanId_fkey" FOREIGN KEY ("sponsorshipPlanId") REFERENCES "SponsorshipPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorshipPlanBrandingSlot" ADD CONSTRAINT "SponsorshipPlanBrandingSlot_brandingSlotId_fkey" FOREIGN KEY ("brandingSlotId") REFERENCES "BrandingSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
