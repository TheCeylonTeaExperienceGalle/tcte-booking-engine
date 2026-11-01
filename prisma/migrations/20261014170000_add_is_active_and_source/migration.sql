-- AlterTable
ALTER TABLE `roles` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `locations` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `bookings` ADD COLUMN `source` VARCHAR(191) NOT NULL DEFAULT 'ONLINE';
