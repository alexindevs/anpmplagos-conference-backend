-- CreateEnum
CREATE TYPE "EventPassType" AS ENUM ('conference', 'hotel');

-- CreateTable
CREATE TABLE "EventPass" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "EventPassType" NOT NULL,
    "qrCodeUrl" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventPass_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventPass_userId_idx" ON "EventPass"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventPass_userId_type_key" ON "EventPass"("userId", "type");

-- AddForeignKey
ALTER TABLE "EventPass" ADD CONSTRAINT "EventPass_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
