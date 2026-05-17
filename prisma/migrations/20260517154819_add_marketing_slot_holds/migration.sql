-- CreateTable
CREATE TABLE "AdvertSlotHold" (
    "id" TEXT NOT NULL,
    "advertSlotId" TEXT NOT NULL,
    "orderId" TEXT,
    "paymentId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdvertSlotHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandingSlotHold" (
    "id" TEXT NOT NULL,
    "brandingSlotId" TEXT NOT NULL,
    "orderId" TEXT,
    "paymentId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandingSlotHold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdvertSlotHold_advertSlotId_idx" ON "AdvertSlotHold"("advertSlotId");

-- CreateIndex
CREATE INDEX "AdvertSlotHold_expiresAt_idx" ON "AdvertSlotHold"("expiresAt");

-- CreateIndex
CREATE INDEX "AdvertSlotHold_orderId_idx" ON "AdvertSlotHold"("orderId");

-- CreateIndex
CREATE INDEX "AdvertSlotHold_paymentId_idx" ON "AdvertSlotHold"("paymentId");

-- CreateIndex
CREATE INDEX "BrandingSlotHold_brandingSlotId_idx" ON "BrandingSlotHold"("brandingSlotId");

-- CreateIndex
CREATE INDEX "BrandingSlotHold_expiresAt_idx" ON "BrandingSlotHold"("expiresAt");

-- CreateIndex
CREATE INDEX "BrandingSlotHold_orderId_idx" ON "BrandingSlotHold"("orderId");

-- CreateIndex
CREATE INDEX "BrandingSlotHold_paymentId_idx" ON "BrandingSlotHold"("paymentId");

-- AddForeignKey
ALTER TABLE "AdvertSlotHold" ADD CONSTRAINT "AdvertSlotHold_advertSlotId_fkey" FOREIGN KEY ("advertSlotId") REFERENCES "AdvertSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandingSlotHold" ADD CONSTRAINT "BrandingSlotHold_brandingSlotId_fkey" FOREIGN KEY ("brandingSlotId") REFERENCES "BrandingSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
