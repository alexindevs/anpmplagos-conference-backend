-- Member profile: optional title; organization address and ANPMP zone (required on API for new signups).
ALTER TABLE "Member" ADD COLUMN "title" TEXT;
ALTER TABLE "Member" ADD COLUMN "organizationAddress" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Member" ADD COLUMN "zone" TEXT NOT NULL DEFAULT '';
