/*
  Warnings:

  - You are about to alter the column `role` on the `leaders` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(0))`.

*/
-- AlterTable
ALTER TABLE `leaders` ADD COLUMN `status` ENUM('ACTIVE', 'DEACTIVATED') NOT NULL DEFAULT 'ACTIVE',
    MODIFY `role` ENUM('USER', 'LEADER') NOT NULL DEFAULT 'USER';
