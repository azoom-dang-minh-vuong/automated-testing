/*
  Warnings:

  - You are about to alter the column `name` on the `customers` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(100)`.
  - You are about to alter the column `email` on the `customers` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(100)`.
  - A unique constraint covering the columns `[tel]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tel` to the `customers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `customers` ADD COLUMN `tel` VARCHAR(20) NOT NULL,
    MODIFY `name` VARCHAR(100) NOT NULL,
    MODIFY `email` VARCHAR(100) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `customers_tel_key` ON `customers`(`tel`);
