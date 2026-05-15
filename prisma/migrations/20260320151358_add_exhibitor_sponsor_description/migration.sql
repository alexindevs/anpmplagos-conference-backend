/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Attendee` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sponsorTakenById]` on the table `Booth` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `Exhibitor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `Member` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Attendee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `Exhibitor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `Member` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SponsorStatus" AS ENUM ('pending_pledge', 'pending_payment', 'active', 'cancelled');

-- CreateEnum
CREATE TYPE "SponsorTier" AS ENUM ('platinum', 'gold', 'silver', 'bronze', 'custom');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('draft', 'published', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('booth', 'masterclass', 'panel');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'success', 'failed', 'refunded');

-- AlterEnum
ALTER TYPE "RegType" ADD VALUE 'sponsor';

-- AlterTable
ALTER TABLE "Attendee" ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Booth" ADD COLUMN     "sponsorTakenById" TEXT;

-- AlterTable
ALTER TABLE "Exhibitor" ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Sponsor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "website" TEXT,
    "contactEmail" TEXT NOT NULL,
    "primaryContactName" TEXT NOT NULL,
    "primaryContactPhone" TEXT NOT NULL,
    "sponsorAmount" INTEGER,
    "status" "SponsorStatus" NOT NULL DEFAULT 'pending_pledge',
    "tier" "SponsorTier",
    "logo" TEXT,
    "headerImage" TEXT,
    "boothId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Masterclass" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "priceInKobo" INTEGER NOT NULL,
    "sponsorId" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Masterclass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PanelSession" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "priceInKobo" INTEGER NOT NULL,
    "sponsorId" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PanelSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "kind" "PaymentKind" NOT NULL,
    "baseAmount" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL,
    "providerResponse" JSONB,
    "userId" TEXT NOT NULL,
    "exhibitorId" TEXT,
    "sponsorId" TEXT,
    "boothId" TEXT,
    "masterclassId" TEXT,
    "panelSessionId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sponsor_userId_key" ON "Sponsor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Sponsor_slug_key" ON "Sponsor"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Sponsor_boothId_key" ON "Sponsor"("boothId");

-- CreateIndex
CREATE INDEX "Masterclass_sponsorId_idx" ON "Masterclass"("sponsorId");

-- CreateIndex
CREATE INDEX "PanelSession_sponsorId_idx" ON "PanelSession"("sponsorId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

-- CreateIndex
CREATE INDEX "Payment_kind_boothId_idx" ON "Payment"("kind", "boothId");

-- CreateIndex
CREATE INDEX "Payment_kind_masterclassId_idx" ON "Payment"("kind", "masterclassId");

-- CreateIndex
CREATE INDEX "Payment_kind_panelSessionId_idx" ON "Payment"("kind", "panelSessionId");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendee_slug_key" ON "Attendee"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Booth_sponsorTakenById_key" ON "Booth"("sponsorTakenById");

-- CreateIndex
CREATE UNIQUE INDEX "Exhibitor_slug_key" ON "Exhibitor"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Member_slug_key" ON "Member"("slug");

-- AddForeignKey
ALTER TABLE "Booth" ADD CONSTRAINT "Booth_sponsorTakenById_fkey" FOREIGN KEY ("sponsorTakenById") REFERENCES "Sponsor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Masterclass" ADD CONSTRAINT "Masterclass_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanelSession" ADD CONSTRAINT "PanelSession_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_exhibitorId_fkey" FOREIGN KEY ("exhibitorId") REFERENCES "Exhibitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_boothId_fkey" FOREIGN KEY ("boothId") REFERENCES "Booth"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_masterclassId_fkey" FOREIGN KEY ("masterclassId") REFERENCES "Masterclass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_panelSessionId_fkey" FOREIGN KEY ("panelSessionId") REFERENCES "PanelSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
