-- AlterTable
ALTER TABLE `bookings` ADD COLUMN `checkoutAttemptId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `bookings_checkoutAttemptId_key` ON `bookings`(`checkoutAttemptId`);
