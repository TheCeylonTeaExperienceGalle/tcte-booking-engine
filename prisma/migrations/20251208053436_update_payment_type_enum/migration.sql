/*
  Warnings:

  - The values [Installment] on the enum `bookings_paymentType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `balance` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `payments` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `bookings` MODIFY `paymentType` ENUM('Full', 'Partial') NOT NULL DEFAULT 'Full';

-- AlterTable
ALTER TABLE `payments` DROP COLUMN `balance`,
    DROP COLUMN `totalAmount`;
