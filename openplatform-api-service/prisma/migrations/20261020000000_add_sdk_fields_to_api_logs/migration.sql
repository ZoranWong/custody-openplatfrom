-- AlterTable
ALTER TABLE `api_logs` ADD COLUMN `sdk_name` VARCHAR(191) NULL,
ADD COLUMN `sdk_version` VARCHAR(191) NULL,
ADD COLUMN `sdk_language` VARCHAR(191) NULL;
