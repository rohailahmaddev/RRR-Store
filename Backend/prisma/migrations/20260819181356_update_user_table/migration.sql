/*
  Warnings:

  - A unique constraint covering the columns `[verify_token]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `users_verify_token_key` ON `users`(`verify_token`);
