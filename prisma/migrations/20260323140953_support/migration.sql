-- CreateEnum
CREATE TYPE "SupportTicketCategory" AS ENUM ('booth', 'masterclass', 'panel', 'hotel_room', 'directory', 'registrations', 'sponsorship', 'marketing_slots', 'company_profile', 'payments', 'other');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('open', 'answered', 'closed');

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "SupportTicketCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "screenshotUrls" TEXT[],
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicketResponse" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "responderAdminId" TEXT,
    "responseText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportTicket_userId_createdAt_idx" ON "SupportTicket"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicketResponse_ticketId_createdAt_idx" ON "SupportTicketResponse"("ticketId", "createdAt");

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketResponse" ADD CONSTRAINT "SupportTicketResponse_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketResponse" ADD CONSTRAINT "SupportTicketResponse_responderAdminId_fkey" FOREIGN KEY ("responderAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
