-- CreateTable
CREATE TABLE `commission_rules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `minSeats` INTEGER NOT NULL,
    `maxSeats` INTEGER NULL,
    `commissionRate` DOUBLE NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `leaderId` INTEGER NOT NULL,
    `totalSeats` INTEGER NOT NULL,
    `bookingAmount` DOUBLE NOT NULL,
    `commissionRate` DOUBLE NOT NULL,
    `commissionAmount` DOUBLE NOT NULL,
    `paymentStatus` ENUM('PENDING', 'PAID', 'PARTIALLY_PAID') NOT NULL DEFAULT 'PENDING',
    `paidAt` DATETIME(3) NULL,
    `paidAmount` DOUBLE NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `commissions_bookingId_key`(`bookingId`),
    INDEX `commissions_leaderId_idx`(`leaderId`),
    INDEX `commissions_paymentStatus_idx`(`paymentStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_leaderId_fkey` FOREIGN KEY (`leaderId`) REFERENCES `leaders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
