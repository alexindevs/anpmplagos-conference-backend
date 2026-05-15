-- AlterEnum
ALTER TYPE "PaymentKind" ADD VALUE 'hotel_room';

-- CreateTable
CREATE TABLE "HotelRoom" (
    "id" TEXT NOT NULL,
    "hotelName" TEXT NOT NULL,
    "roomType" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "isReserved" BOOLEAN NOT NULL DEFAULT false,
    "bookedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelRoom_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HotelRoom_hotelName_idx" ON "HotelRoom"("hotelName");
CREATE INDEX "HotelRoom_isBooked_isReserved_idx" ON "HotelRoom"("isBooked", "isReserved");
CREATE INDEX "HotelRoom_bookedById_idx" ON "HotelRoom"("bookedById");

ALTER TABLE "HotelRoom" ADD CONSTRAINT "HotelRoom_bookedById_fkey" FOREIGN KEY ("bookedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Payment" ADD COLUMN "hotelRoomId" TEXT;

CREATE INDEX "Payment_kind_hotelRoomId_idx" ON "Payment"("kind", "hotelRoomId");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_hotelRoomId_fkey" FOREIGN KEY ("hotelRoomId") REFERENCES "HotelRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
