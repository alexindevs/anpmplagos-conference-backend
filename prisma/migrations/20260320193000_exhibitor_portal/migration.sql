-- AlterTable
ALTER TABLE "Exhibitor" ADD COLUMN "profileViews" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Exhibitor" ADD COLUMN "hotelBookingUrl" TEXT;

-- CreateTable
CREATE TABLE "ExhibitorProduct" (
    "id" TEXT NOT NULL,
    "exhibitorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExhibitorProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExhibitorLead" (
    "id" TEXT NOT NULL,
    "exhibitorId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExhibitorLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExhibitorProduct_exhibitorId_idx" ON "ExhibitorProduct"("exhibitorId");

-- CreateIndex
CREATE INDEX "ExhibitorLead_exhibitorId_idx" ON "ExhibitorLead"("exhibitorId");

-- AddForeignKey
ALTER TABLE "ExhibitorProduct" ADD CONSTRAINT "ExhibitorProduct_exhibitorId_fkey" FOREIGN KEY ("exhibitorId") REFERENCES "Exhibitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExhibitorLead" ADD CONSTRAINT "ExhibitorLead_exhibitorId_fkey" FOREIGN KEY ("exhibitorId") REFERENCES "Exhibitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
