/*
  Warnings:

  - Added the required column `expire_at` to the `refresh_tokens` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `refresh_tokens` ADD COLUMN `expire_at` DATETIME(3) NOT NULL;
