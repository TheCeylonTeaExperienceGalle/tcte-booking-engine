-- AlterTable
ALTER TABLE `bookings` MODIFY `paymentType` ENUM('Full', 'Installment', 'Partial') NOT NULL DEFAULT 'Full';
