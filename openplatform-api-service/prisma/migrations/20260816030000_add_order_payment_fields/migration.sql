-- Add payment fields to orders table
ALTER TABLE `orders`
  ADD COLUMN `external_payment_id` VARCHAR(191) NULL,
  ADD COLUMN `payment_method` VARCHAR(191) NULL,
  ADD COLUMN `proof_url` VARCHAR(191) NULL,
  ADD COLUMN `remark` VARCHAR(191) NULL,
  ADD COLUMN `confirmed_at` DATETIME(3) NULL;