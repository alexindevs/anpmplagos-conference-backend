-- CreateEnum
CREATE TYPE "RegType" AS ENUM ('member', 'attendee', 'exhibitor');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('pending_payment', 'registered', 'cancelled');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "regType" "RegType" NOT NULL,
    "registrationStatus" "RegistrationStatus" NOT NULL DEFAULT 'pending_payment',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "bio" TEXT,
    "anpmpId" TEXT NOT NULL,
    "hasSpouse" BOOLEAN NOT NULL,
    "spouseName" TEXT,
    "spouseEmail" TEXT,
    "spousePhone" TEXT,
    "primarySpecialty" TEXT NOT NULL,
    "hospitalOrg" TEXT NOT NULL,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendee" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "bio" TEXT,
    "inMedicalField" BOOLEAN NOT NULL,
    "primarySpecialty" TEXT,
    "hospitalOrg" TEXT,
    "occupation" TEXT,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exhibitor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "tagline" TEXT,
    "boothPreference" TEXT,
    "website" TEXT,
    "contactEmail" TEXT NOT NULL,
    "primaryContactName" TEXT NOT NULL,
    "primaryContactPhone" TEXT NOT NULL,
    "headerImage" TEXT,
    "profileImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exhibitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExhibitorRepresentative" (
    "id" TEXT NOT NULL,
    "exhibitorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExhibitorRepresentative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booth" (
    "id" TEXT NOT NULL,
    "hall" TEXT NOT NULL,
    "floorSection" TEXT NOT NULL,
    "description" TEXT,
    "isTaken" BOOLEAN NOT NULL DEFAULT false,
    "takenById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "perks" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Member_userId_key" ON "Member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendee_userId_key" ON "Attendee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Exhibitor_userId_key" ON "Exhibitor"("userId");

-- CreateIndex
CREATE INDEX "ExhibitorRepresentative_exhibitorId_idx" ON "ExhibitorRepresentative"("exhibitorId");

-- CreateIndex
CREATE UNIQUE INDEX "Booth_takenById_key" ON "Booth"("takenById");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendee" ADD CONSTRAINT "Attendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exhibitor" ADD CONSTRAINT "Exhibitor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExhibitorRepresentative" ADD CONSTRAINT "ExhibitorRepresentative_exhibitorId_fkey" FOREIGN KEY ("exhibitorId") REFERENCES "Exhibitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booth" ADD CONSTRAINT "Booth_takenById_fkey" FOREIGN KEY ("takenById") REFERENCES "Exhibitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
