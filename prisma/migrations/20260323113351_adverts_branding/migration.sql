-- AlterTable
ALTER TABLE "CompanyLead" RENAME CONSTRAINT "ExhibitorLead_pkey" TO "CompanyLead_pkey";

-- AlterTable
ALTER TABLE "CompanyProduct" RENAME CONSTRAINT "ExhibitorProduct_pkey" TO "CompanyProduct_pkey";

-- AlterTable
ALTER TABLE "CompanyRepresentative" RENAME CONSTRAINT "ExhibitorRepresentative_pkey" TO "CompanyRepresentative_pkey";

-- AlterTable
ALTER TABLE "SponsorshipPlan" ALTER COLUMN "perks" DROP DEFAULT;
