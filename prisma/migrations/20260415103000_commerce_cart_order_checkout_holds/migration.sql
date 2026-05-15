-- AlterEnum: add `order` to PaymentKind
ALTER TYPE "PaymentKind" ADD VALUE 'order';

-- CreateEnum
CREATE TYPE "CartKind" AS ENUM ('conference', 'hotel');

-- CreateEnum
CREATE TYPE "CartItemType" AS ENUM (
  'booth',
  'masterclass',
  'panel',
  'presentation',
  'sponsorship_plan',
  'advert_slot',
  'branding_slot',
  'hotel_room'
);

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending_payment', 'paid', 'cancelled', 'failed');

-- Checkout hold columns (30-minute locks during order checkout)
ALTER TABLE "Booth" ADD COLUMN "checkoutHoldExpiresAt" TIMESTAMP(3);
ALTER TABLE "Booth" ADD COLUMN "checkoutHoldOrderId" TEXT;
CREATE INDEX "Booth_checkoutHoldExpiresAt_idx" ON "Booth"("checkoutHoldExpiresAt");

ALTER TABLE "HotelRoom" ADD COLUMN "checkoutHoldExpiresAt" TIMESTAMP(3);
ALTER TABLE "HotelRoom" ADD COLUMN "checkoutHoldOrderId" TEXT;
CREATE INDEX "HotelRoom_checkoutHoldExpiresAt_idx" ON "HotelRoom"("checkoutHoldExpiresAt");

ALTER TABLE "AdvertSlot" ADD COLUMN "checkoutHoldExpiresAt" TIMESTAMP(3);
ALTER TABLE "AdvertSlot" ADD COLUMN "checkoutHoldOrderId" TEXT;
CREATE INDEX "AdvertSlot_checkoutHoldExpiresAt_idx" ON "AdvertSlot"("checkoutHoldExpiresAt");

ALTER TABLE "BrandingSlot" ADD COLUMN "checkoutHoldExpiresAt" TIMESTAMP(3);
ALTER TABLE "BrandingSlot" ADD COLUMN "checkoutHoldOrderId" TEXT;
CREATE INDEX "BrandingSlot_checkoutHoldExpiresAt_idx" ON "BrandingSlot"("checkoutHoldExpiresAt");

ALTER TABLE "Masterclass" ADD COLUMN "checkoutHoldExpiresAt" TIMESTAMP(3);
ALTER TABLE "Masterclass" ADD COLUMN "checkoutHoldOrderId" TEXT;
CREATE INDEX "Masterclass_checkoutHoldExpiresAt_idx" ON "Masterclass"("checkoutHoldExpiresAt");

ALTER TABLE "PanelSession" ADD COLUMN "checkoutHoldExpiresAt" TIMESTAMP(3);
ALTER TABLE "PanelSession" ADD COLUMN "checkoutHoldOrderId" TEXT;
CREATE INDEX "PanelSession_checkoutHoldExpiresAt_idx" ON "PanelSession"("checkoutHoldExpiresAt");

ALTER TABLE "Presentation" ADD COLUMN "checkoutHoldExpiresAt" TIMESTAMP(3);
ALTER TABLE "Presentation" ADD COLUMN "checkoutHoldOrderId" TEXT;
CREATE INDEX "Presentation_checkoutHoldExpiresAt_idx" ON "Presentation"("checkoutHoldExpiresAt");

-- CreateTable Cart
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "CartKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Cart_userId_kind_key" ON "Cart"("userId", "kind");
CREATE INDEX "Cart_userId_idx" ON "Cart"("userId");
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable CartItem
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "type" "CartItemType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "boothId" TEXT,
    "masterclassId" TEXT,
    "panelSessionId" TEXT,
    "presentationId" TEXT,
    "sponsorshipPlanId" TEXT,
    "hotelRoomId" TEXT,
    "advertSlotId" TEXT,
    "brandingSlotId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CartItem_cartId_idx" ON "CartItem"("cartId");
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_boothId_fkey" FOREIGN KEY ("boothId") REFERENCES "Booth"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_masterclassId_fkey" FOREIGN KEY ("masterclassId") REFERENCES "Masterclass"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_panelSessionId_fkey" FOREIGN KEY ("panelSessionId") REFERENCES "PanelSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_sponsorshipPlanId_fkey" FOREIGN KEY ("sponsorshipPlanId") REFERENCES "SponsorshipPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_hotelRoomId_fkey" FOREIGN KEY ("hotelRoomId") REFERENCES "HotelRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_advertSlotId_fkey" FOREIGN KEY ("advertSlotId") REFERENCES "AdvertSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_brandingSlotId_fkey" FOREIGN KEY ("brandingSlotId") REFERENCES "BrandingSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable Order
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT,
    "cartKind" "CartKind" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending_payment',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Order_userId_idx" ON "Order"("userId");
CREATE INDEX "Order_companyId_idx" ON "Order"("companyId");
CREATE INDEX "Order_status_idx" ON "Order"("status");
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable OrderItem
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "CartItemType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitBaseAmountKobo" INTEGER NOT NULL,
    "titleSnapshot" TEXT,
    "boothId" TEXT,
    "masterclassId" TEXT,
    "panelSessionId" TEXT,
    "presentationId" TEXT,
    "sponsorshipPlanId" TEXT,
    "hotelRoomId" TEXT,
    "advertSlotId" TEXT,
    "brandingSlotId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_boothId_fkey" FOREIGN KEY ("boothId") REFERENCES "Booth"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_masterclassId_fkey" FOREIGN KEY ("masterclassId") REFERENCES "Masterclass"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_panelSessionId_fkey" FOREIGN KEY ("panelSessionId") REFERENCES "PanelSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_sponsorshipPlanId_fkey" FOREIGN KEY ("sponsorshipPlanId") REFERENCES "SponsorshipPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_hotelRoomId_fkey" FOREIGN KEY ("hotelRoomId") REFERENCES "HotelRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_advertSlotId_fkey" FOREIGN KEY ("advertSlotId") REFERENCES "AdvertSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_brandingSlotId_fkey" FOREIGN KEY ("brandingSlotId") REFERENCES "BrandingSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Payment.orderId
ALTER TABLE "Payment" ADD COLUMN "orderId" TEXT;
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
