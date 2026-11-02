-- Raw log byte columns for traffic statistics
ALTER TABLE `api_logs`
  ADD COLUMN `request_bytes` INT NULL,
  ADD COLUMN `response_bytes` INT NULL,
  ADD INDEX `api_logs_developer_created_idx` (`developer_id`, `created_at`),
  ADD INDEX `api_logs_created_idx` (`created_at`);

-- Daily snapshot traffic total
ALTER TABLE `api_log_snapshots`
  ADD COLUMN `total_bytes` BIGINT NOT NULL DEFAULT 0;

-- Endpoint-level daily rollup
CREATE TABLE `api_log_endpoint_daily` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `developer_id` varchar(191) NOT NULL,
  `date` date NOT NULL,
  `endpoint` varchar(255) NOT NULL,
  `method` varchar(16) NOT NULL,
  `calls` int NOT NULL DEFAULT '0',
  `error_calls` int NOT NULL DEFAULT '0',
  `total_bytes` bigint NOT NULL DEFAULT '0',
  `avg_response_time` int NOT NULL DEFAULT '0',
  `max_response_time` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dev_date_endpoint` (`developer_id`,`date`,`endpoint`,`method`),
  KEY `api_log_endpoint_daily_dev_date_idx` (`developer_id`,`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Monthly rollup (5 year retention)
CREATE TABLE `api_log_monthly_snapshots` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `developer_id` varchar(191) NOT NULL,
  `month` date NOT NULL,
  `total_calls` int NOT NULL DEFAULT '0',
  `error_calls` int NOT NULL DEFAULT '0',
  `total_bytes` bigint NOT NULL DEFAULT '0',
  `avg_response_time` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dev_month` (`developer_id`,`month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
