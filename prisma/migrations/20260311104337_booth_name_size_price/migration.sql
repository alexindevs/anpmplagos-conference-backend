/*
  Warnings:

  - You are about to drop the column `floorSection` on the `Booth` table. All the data in the column will be lost.
  - You are about to drop the column `hall` on the `Booth` table. All the data in the column will be lost.
  - Added the required column `name` to the `Booth` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price` to the `Booth` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `Booth` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Booth" DROP COLUMN "floorSection",
DROP COLUMN "hall",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "price" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "size" TEXT NOT NULL;
