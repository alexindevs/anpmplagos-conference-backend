/*
  Warnings:

  - You are about to drop the column `companyId` on the `Masterclass` table. All the data in the column will be lost.
  - You are about to drop the column `endTime` on the `Masterclass` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Masterclass` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `Masterclass` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `PanelSession` table. All the data in the column will be lost.
  - You are about to drop the column `endTime` on the `PanelSession` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `PanelSession` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `PanelSession` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "PaymentKind" ADD VALUE 'presentation';

-- AlterEnum
ALTER TYPE "SupportTicketCategory" ADD VALUE 'presentation';

-- DropForeignKey
ALTER TABLE "Masterclass" DROP CONSTRAINT "Masterclass_companyId_fkey";

-- DropForeignKey
ALTER TABLE "PanelSession" DROP CONSTRAINT "PanelSession_companyId_fkey";

-- DropIndex
DROP INDEX "Masterclass_companyId_idx";

-- DropIndex
DROP INDEX "PanelSession_companyId_idx";

-- AlterTable
ALTER TABLE "Masterclass" DROP COLUMN "companyId",
DROP COLUMN "endTime",
DROP COLUMN "location",
DROP COLUMN "startTime",
ADD COLUMN     "isReserved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isTaken" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "takenById" TEXT;

-- AlterTable
ALTER TABLE "PanelSession" DROP COLUMN "companyId",
DROP COLUMN "endTime",
DROP COLUMN "location",
DROP COLUMN "startTime",
ADD COLUMN     "isReserved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isTaken" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "takenById" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "presentationId" TEXT;

-- CreateTable
CREATE TABLE "Presentation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceInKobo" INTEGER NOT NULL,
    "isTaken" BOOLEAN NOT NULL DEFAULT false,
    "isReserved" BOOLEAN NOT NULL DEFAULT false,
    "takenById" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Presentation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Presentation_takenById_idx" ON "Presentation"("takenById");

-- CreateIndex
CREATE INDEX "Presentation_isTaken_isReserved_idx" ON "Presentation"("isTaken", "isReserved");

-- CreateIndex
CREATE INDEX "Masterclass_takenById_idx" ON "Masterclass"("takenById");

-- CreateIndex
CREATE INDEX "Masterclass_isTaken_isReserved_idx" ON "Masterclass"("isTaken", "isReserved");

-- CreateIndex
CREATE INDEX "PanelSession_takenById_idx" ON "PanelSession"("takenById");

-- CreateIndex
CREATE INDEX "PanelSession_isTaken_isReserved_idx" ON "PanelSession"("isTaken", "isReserved");

-- CreateIndex
CREATE INDEX "Payment_kind_presentationId_idx" ON "Payment"("kind", "presentationId");

-- AddForeignKey
ALTER TABLE "Masterclass" ADD CONSTRAINT "Masterclass_takenById_fkey" FOREIGN KEY ("takenById") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanelSession" ADD CONSTRAINT "PanelSession_takenById_fkey" FOREIGN KEY ("takenById") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presentation" ADD CONSTRAINT "Presentation_takenById_fkey" FOREIGN KEY ("takenById") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
