-- Widen kobo columns past INT4 max (~₦21.47M in kobo). Safe widen-only migration.
ALTER TABLE "SponsorshipPlan" ALTER COLUMN "priceInKobo" SET DATA TYPE BIGINT USING "priceInKobo"::bigint;
ALTER TABLE "OrderItem" ALTER COLUMN "unitBaseAmountKobo" SET DATA TYPE BIGINT USING "unitBaseAmountKobo"::bigint;
ALTER TABLE "Payment" ALTER COLUMN "baseAmount" SET DATA TYPE BIGINT USING "baseAmount"::bigint;
ALTER TABLE "Payment" ALTER COLUMN "amount" SET DATA TYPE BIGINT USING "amount"::bigint;
ALTER TABLE "Company" ALTER COLUMN "sponsorshipPaidTotalKobo" SET DATA TYPE BIGINT USING "sponsorshipPaidTotalKobo"::bigint;
