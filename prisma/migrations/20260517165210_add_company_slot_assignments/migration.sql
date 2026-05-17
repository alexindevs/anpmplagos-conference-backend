-- CreateTable
CREATE TABLE "CompanyAdvertSlotAssignment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "advertSlotId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyAdvertSlotAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyBrandingSlotAssignment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "brandingSlotId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyBrandingSlotAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyAdvertSlotAssignment_companyId_idx" ON "CompanyAdvertSlotAssignment"("companyId");

-- CreateIndex
CREATE INDEX "CompanyAdvertSlotAssignment_advertSlotId_idx" ON "CompanyAdvertSlotAssignment"("advertSlotId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyAdvertSlotAssignment_companyId_advertSlotId_key" ON "CompanyAdvertSlotAssignment"("companyId", "advertSlotId");

-- CreateIndex
CREATE INDEX "CompanyBrandingSlotAssignment_companyId_idx" ON "CompanyBrandingSlotAssignment"("companyId");

-- CreateIndex
CREATE INDEX "CompanyBrandingSlotAssignment_brandingSlotId_idx" ON "CompanyBrandingSlotAssignment"("brandingSlotId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyBrandingSlotAssignment_companyId_brandingSlotId_key" ON "CompanyBrandingSlotAssignment"("companyId", "brandingSlotId");

-- AddForeignKey
ALTER TABLE "CompanyAdvertSlotAssignment" ADD CONSTRAINT "CompanyAdvertSlotAssignment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyAdvertSlotAssignment" ADD CONSTRAINT "CompanyAdvertSlotAssignment_advertSlotId_fkey" FOREIGN KEY ("advertSlotId") REFERENCES "AdvertSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyBrandingSlotAssignment" ADD CONSTRAINT "CompanyBrandingSlotAssignment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyBrandingSlotAssignment" ADD CONSTRAINT "CompanyBrandingSlotAssignment_brandingSlotId_fkey" FOREIGN KEY ("brandingSlotId") REFERENCES "BrandingSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
