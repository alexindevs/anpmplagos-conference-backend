-- AdvertSlot, BrandingSlot, PaymentKind advert_slot + branding_slot

ALTER TYPE "PaymentKind" ADD VALUE 'advert_slot';
ALTER TYPE "PaymentKind" ADD VALUE 'branding_slot';

CREATE TABLE "AdvertSlot" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "description" TEXT,
    "isTaken" BOOLEAN NOT NULL DEFAULT false,
    "isReserved" BOOLEAN NOT NULL DEFAULT false,
    "takenById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdvertSlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrandingSlot" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "description" TEXT,
    "isTaken" BOOLEAN NOT NULL DEFAULT false,
    "isReserved" BOOLEAN NOT NULL DEFAULT false,
    "takenById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandingSlot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdvertSlot_takenById_idx" ON "AdvertSlot"("takenById");
CREATE INDEX "AdvertSlot_isTaken_isReserved_idx" ON "AdvertSlot"("isTaken", "isReserved");

CREATE INDEX "BrandingSlot_takenById_idx" ON "BrandingSlot"("takenById");
CREATE INDEX "BrandingSlot_isTaken_isReserved_idx" ON "BrandingSlot"("isTaken", "isReserved");

ALTER TABLE "AdvertSlot" ADD CONSTRAINT "AdvertSlot_takenById_fkey" FOREIGN KEY ("takenById") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BrandingSlot" ADD CONSTRAINT "BrandingSlot_takenById_fkey" FOREIGN KEY ("takenById") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Payment" ADD COLUMN "advertSlotId" TEXT,
ADD COLUMN "brandingSlotId" TEXT;

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_advertSlotId_fkey" FOREIGN KEY ("advertSlotId") REFERENCES "AdvertSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_brandingSlotId_fkey" FOREIGN KEY ("brandingSlotId") REFERENCES "BrandingSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Payment_kind_advertSlotId_idx" ON "Payment"("kind", "advertSlotId");
CREATE INDEX "Payment_kind_brandingSlotId_idx" ON "Payment"("kind", "brandingSlotId");
