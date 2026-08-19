-- AlterTable
ALTER TABLE `bookings` MODIFY `paymentType` ENUM('Full', 'Partial', 'Later') NOT NULL DEFAULT 'Full';
