-- Baseline for api_log_snapshots: the table was created out-of-band on the
-- existing servers, so recreate it idempotently for fresh environments.
CREATE TABLE IF NOT EXISTS `api_log_snapshots` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `developer_id` varchar(191) NOT NULL,
  `date` date NOT NULL,
  `total_calls` int NOT NULL DEFAULT '0',
  `error_calls` int NOT NULL DEFAULT '0',
  `avg_response_time` int NOT NULL DEFAULT '0',
  `p95_response_time` int NOT NULL DEFAULT '0',
  `top_endpoints` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dev_date` (`developer_id`,`date`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
