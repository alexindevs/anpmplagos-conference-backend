-- Reassign any legacy speaker / special_guest users before shrinking RegType
UPDATE "User" SET "regType" = 'attendee' WHERE "regType"::text IN ('speaker', 'special_guest');

-- CreateEnum
CREATE TYPE "ConferenceProfileKind" AS ENUM ('speaker', 'special_guest');

-- CreateEnum
CREATE TYPE "ConferenceProfileHighlightType" AS ENUM ('keynote', 'featured');

-- CreateTable
CREATE TABLE "ConferenceProfile" (
    "id" TEXT NOT NULL,
    "kind" "ConferenceProfileKind" NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "profilePicture" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "qualifications" TEXT NOT NULL,
    "byline" TEXT NOT NULL,
    "highlightType" "ConferenceProfileHighlightType" NOT NULL,
    "description" TEXT NOT NULL,
    "websiteLink" TEXT,
    "facebookLink" TEXT,
    "xLink" TEXT,
    "instagramLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConferenceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConferenceProfile_kind_slug_key" ON "ConferenceProfile"("kind", "slug");

-- CreateIndex
CREATE INDEX "ConferenceProfile_kind_highlightType_idx" ON "ConferenceProfile"("kind", "highlightType");

-- CreateIndex
CREATE INDEX "ConferenceProfile_kind_name_idx" ON "ConferenceProfile"("kind", "name");

-- AlterEnum: replace RegType (PostgreSQL cannot drop enum values in place)
CREATE TYPE "RegType_new" AS ENUM ('member', 'attendee', 'company', 'admin');

ALTER TABLE "User" ALTER COLUMN "regType" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "regType" TYPE "RegType_new" USING ("regType"::text::"RegType_new");

DROP TYPE "RegType";
ALTER TYPE "RegType_new" RENAME TO "RegType";
