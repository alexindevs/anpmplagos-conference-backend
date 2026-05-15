-- Company unification: Exhibitor + Sponsor -> Company, single booth occupant, sponsorship plans

-- PaymentKind
ALTER TYPE "PaymentKind" ADD VALUE 'sponsorship_plan';

-- SponsorshipPlan catalog
CREATE TABLE "SponsorshipPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceInKobo" INTEGER NOT NULL,
    "tier" "SponsorTier" NOT NULL,
    "perks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsorshipPlan_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SponsorshipPlan" ("id", "name", "priceInKobo", "tier", "perks", "isActive", "createdAt", "updatedAt")
VALUES
    ('spl_silver', 'Silver Sponsorship', 150000000, 'silver', ARRAY['Logo on website', 'Program mention']::TEXT[], true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('spl_gold', 'Gold Sponsorship', 350000000, 'gold', ARRAY['Silver perks', 'Session branding']::TEXT[], true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('spl_platinum', 'Platinum Sponsorship', 750000000, 'platinum', ARRAY['Gold perks', 'Keynote mention']::TEXT[], true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('spl_headliner', 'Headliner Sponsorship', 1500000000, 'headliner', ARRAY['Platinum perks', 'Premier placement']::TEXT[], true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Company (migrate from Exhibitor + Sponsor)
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "boothPreference" TEXT,
    "website" TEXT,
    "contactEmail" TEXT NOT NULL,
    "primaryContactName" TEXT NOT NULL,
    "primaryContactPhone" TEXT NOT NULL,
    "headerImage" TEXT,
    "logo" TEXT,
    "profileImage" TEXT,
    "profileViews" INTEGER NOT NULL DEFAULT 0,
    "sponsorshipPaidTotalKobo" INTEGER NOT NULL DEFAULT 0,
    "highestSponsorshipTier" "SponsorTier",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Company_userId_key" ON "Company"("userId");
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

INSERT INTO "Company" (
    "id", "userId", "slug", "companyName", "tagline", "description", "boothPreference",
    "website", "contactEmail", "primaryContactName", "primaryContactPhone",
    "headerImage", "logo", "profileImage", "profileViews",
    "sponsorshipPaidTotalKobo", "highestSponsorshipTier",
    "createdAt", "updatedAt"
)
SELECT
    e."id",
    e."userId",
    e."slug",
    e."companyName",
    e."tagline",
    e."description",
    e."boothPreference",
    e."website",
    e."contactEmail",
    e."primaryContactName",
    e."primaryContactPhone",
    e."headerImage",
    NULL,
    e."profileImage",
    e."profileViews",
    0,
    e."tier",
    e."createdAt",
    e."updatedAt"
FROM "Exhibitor" e;

INSERT INTO "Company" (
    "id", "userId", "slug", "companyName", "tagline", "description", "boothPreference",
    "website", "contactEmail", "primaryContactName", "primaryContactPhone",
    "headerImage", "logo", "profileImage", "profileViews",
    "sponsorshipPaidTotalKobo", "highestSponsorshipTier",
    "createdAt", "updatedAt"
)
SELECT
    s."id",
    s."userId",
    s."slug",
    s."companyName",
    s."tagline",
    s."description",
    NULL,
    s."website",
    s."contactEmail",
    s."primaryContactName",
    s."primaryContactPhone",
    s."headerImage",
    s."logo",
    NULL,
    0,
    COALESCE(s."sponsorAmount", 0),
    CASE WHEN s."status"::text = 'active' THEN s."tier" ELSE NULL END,
    s."createdAt",
    s."updatedAt"
FROM "Sponsor" s
WHERE NOT EXISTS (SELECT 1 FROM "Company" c WHERE c."userId" = s."userId");

ALTER TABLE "Company" ADD CONSTRAINT "Company_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Payment: companyId + sponsorshipPlanId
ALTER TABLE "Payment" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "sponsorshipPlanId" TEXT;

UPDATE "Payment" SET "companyId" = "exhibitorId" WHERE "exhibitorId" IS NOT NULL;
UPDATE "Payment" SET "companyId" = "sponsorId" WHERE "companyId" IS NULL AND "sponsorId" IS NOT NULL;

ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_exhibitorId_fkey";
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_sponsorId_fkey";

ALTER TABLE "Payment" DROP COLUMN "exhibitorId";
ALTER TABLE "Payment" DROP COLUMN "sponsorId";

CREATE INDEX "Payment_companyId_idx" ON "Payment"("companyId");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_sponsorshipPlanId_fkey" FOREIGN KEY ("sponsorshipPlanId") REFERENCES "SponsorshipPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Masterclass / PanelSession
ALTER TABLE "Masterclass" DROP CONSTRAINT IF EXISTS "Masterclass_sponsorId_fkey";
ALTER TABLE "PanelSession" DROP CONSTRAINT IF EXISTS "PanelSession_sponsorId_fkey";

ALTER TABLE "Masterclass" RENAME COLUMN "sponsorId" TO "companyId";
ALTER TABLE "PanelSession" RENAME COLUMN "sponsorId" TO "companyId";

DROP INDEX IF EXISTS "Masterclass_sponsorId_idx";
DROP INDEX IF EXISTS "PanelSession_sponsorId_idx";

CREATE INDEX "Masterclass_companyId_idx" ON "Masterclass"("companyId");
CREATE INDEX "PanelSession_companyId_idx" ON "PanelSession"("companyId");

ALTER TABLE "Masterclass" ADD CONSTRAINT "Masterclass_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PanelSession" ADD CONSTRAINT "PanelSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ExhibitorProduct -> CompanyProduct
ALTER TABLE "ExhibitorProduct" DROP CONSTRAINT IF EXISTS "ExhibitorProduct_exhibitorId_fkey";
ALTER TABLE "ExhibitorProduct" RENAME COLUMN "exhibitorId" TO "companyId";
ALTER TABLE "ExhibitorProduct" RENAME TO "CompanyProduct";
DROP INDEX IF EXISTS "ExhibitorProduct_exhibitorId_idx";
CREATE INDEX "CompanyProduct_companyId_idx" ON "CompanyProduct"("companyId");
ALTER TABLE "CompanyProduct" ADD CONSTRAINT "CompanyProduct_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ExhibitorLead -> CompanyLead
ALTER TABLE "ExhibitorLead" DROP CONSTRAINT IF EXISTS "ExhibitorLead_exhibitorId_fkey";
ALTER TABLE "ExhibitorLead" RENAME COLUMN "exhibitorId" TO "companyId";
ALTER TABLE "ExhibitorLead" RENAME TO "CompanyLead";
DROP INDEX IF EXISTS "ExhibitorLead_exhibitorId_idx";
CREATE INDEX "CompanyLead_companyId_idx" ON "CompanyLead"("companyId");
ALTER TABLE "CompanyLead" ADD CONSTRAINT "CompanyLead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ExhibitorRepresentative -> CompanyRepresentative
ALTER TABLE "ExhibitorRepresentative" DROP CONSTRAINT IF EXISTS "ExhibitorRepresentative_exhibitorId_fkey";
ALTER TABLE "ExhibitorRepresentative" RENAME COLUMN "exhibitorId" TO "companyId";
ALTER TABLE "ExhibitorRepresentative" RENAME TO "CompanyRepresentative";
DROP INDEX IF EXISTS "ExhibitorRepresentative_exhibitorId_idx";
CREATE INDEX "CompanyRepresentative_companyId_idx" ON "CompanyRepresentative"("companyId");
ALTER TABLE "CompanyRepresentative" ADD CONSTRAINT "CompanyRepresentative_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Booth: single occupant (Company)
ALTER TABLE "Booth" DROP CONSTRAINT IF EXISTS "Booth_takenById_fkey";
ALTER TABLE "Booth" DROP CONSTRAINT IF EXISTS "Booth_sponsorTakenById_fkey";

UPDATE "Booth" SET "takenById" = "sponsorTakenById" WHERE "takenById" IS NULL AND "sponsorTakenById" IS NOT NULL;

ALTER TABLE "Booth" DROP COLUMN IF EXISTS "sponsorTakenById";
DROP INDEX IF EXISTS "Booth_sponsorTakenById_key";

ALTER TABLE "Booth" ADD CONSTRAINT "Booth_takenById_fkey" FOREIGN KEY ("takenById") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Sponsor booth FK (Sponsor.boothId) before dropping Sponsor
ALTER TABLE "Sponsor" DROP CONSTRAINT IF EXISTS "Sponsor_boothId_fkey";

-- RegType: exhibitor + sponsor -> company
CREATE TYPE "RegType_new" AS ENUM ('member', 'attendee', 'company', 'admin');

ALTER TABLE "User" ALTER COLUMN "regType" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "regType" TYPE "RegType_new" USING (
  CASE "regType"::text
    WHEN 'member' THEN 'member'::"RegType_new"
    WHEN 'attendee' THEN 'attendee'::"RegType_new"
    WHEN 'admin' THEN 'admin'::"RegType_new"
    WHEN 'exhibitor' THEN 'company'::"RegType_new"
    WHEN 'sponsor' THEN 'company'::"RegType_new"
    ELSE 'attendee'::"RegType_new"
  END
);

DROP TYPE "RegType";
ALTER TYPE "RegType_new" RENAME TO "RegType";

-- Drop legacy profile tables
ALTER TABLE "Sponsor" DROP CONSTRAINT IF EXISTS "Sponsor_userId_fkey";
DROP TABLE "Sponsor";

ALTER TABLE "Exhibitor" DROP CONSTRAINT IF EXISTS "Exhibitor_userId_fkey";
DROP TABLE "Exhibitor";

DROP TYPE "SponsorStatus";
