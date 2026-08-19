/*
  Warnings:

  - A unique constraint covering the columns `[orderId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[payherePaymentId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `payments` ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'LKR',
    ADD COLUMN `metadata` JSON NULL,
    ADD COLUMN `orderId` VARCHAR(191) NULL,
    ADD COLUMN `payhereMd5Sig` VARCHAR(191) NULL,
    ADD COLUMN `payherePaymentId` VARCHAR(191) NULL,
    ADD COLUMN `payhereStatusCode` INTEGER NULL,
    ADD COLUMN `payhereStatusMsg` VARCHAR(191) NULL,
    ADD COLUMN `provider` ENUM('MANUAL', 'PAYHERE') NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN `status` ENUM('PENDING', 'SUCCESS', 'FAILED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    MODIFY `method` VARCHAR(191) NULL,
    MODIFY `transactionId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `payments_orderId_key` ON `payments`(`orderId`);

-- CreateIndex
CREATE UNIQUE INDEX `payments_payherePaymentId_key` ON `payments`(`payherePaymentId`);
