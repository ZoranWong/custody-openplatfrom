-- Add developerId and subscriptionId to ApiLog table
ALTER TABLE `api_logs`
  ADD COLUMN `developer_id` VARCHAR(191) NULL,
  ADD COLUMN `subscription_id` VARCHAR(191) NULL,
  ADD INDEX `api_logs_developer_id_idx` (`developer_id`),
  ADD INDEX `api_logs_subscription_id_idx` (`subscription_id`);