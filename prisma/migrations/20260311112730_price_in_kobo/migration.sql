/*
  Warnings:

  - You are about to alter the column `price` on the `Booth` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Integer`.
  - You are about to alter the column `price` on the `RegistrationPlan` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Integer`.

*/
-- AlterTable
ALTER TABLE "Booth" ALTER COLUMN "price" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "RegistrationPlan" ALTER COLUMN "price" SET DATA TYPE INTEGER;
