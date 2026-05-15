-- CreateTable
CREATE TABLE "ModeratorInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModeratorInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventDay" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventDayId" TEXT NOT NULL,
    "markedById" TEXT NOT NULL,
    "entryIndex" INTEGER NOT NULL,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModeratorInvite_token_key" ON "ModeratorInvite"("token");

-- CreateIndex
CREATE INDEX "ModeratorInvite_token_idx" ON "ModeratorInvite"("token");

-- CreateIndex
CREATE INDEX "ModeratorInvite_email_idx" ON "ModeratorInvite"("email");

-- CreateIndex
CREATE INDEX "EventDay_date_idx" ON "EventDay"("date");

-- CreateIndex
CREATE INDEX "EventDay_isActive_idx" ON "EventDay"("isActive");

-- CreateIndex
CREATE INDEX "AttendanceRecord_userId_eventDayId_idx" ON "AttendanceRecord"("userId", "eventDayId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_eventDayId_idx" ON "AttendanceRecord"("eventDayId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_markedById_idx" ON "AttendanceRecord"("markedById");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_userId_eventDayId_entryIndex_key" ON "AttendanceRecord"("userId", "eventDayId", "entryIndex");

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_eventDayId_fkey" FOREIGN KEY ("eventDayId") REFERENCES "EventDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
