-- Alert settings per developer
CREATE TABLE `developer_alert_settings` (
  `id` varchar(191) NOT NULL,
  `developer_id` varchar(191) NOT NULL,
  `alert_email` varchar(191) DEFAULT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '0',
  `window_seconds` int NOT NULL DEFAULT '300',
  `error_threshold` int NOT NULL DEFAULT '10',
  `cooldown_seconds` int NOT NULL DEFAULT '3600',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dev_alert` (`developer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Alert firing history
CREATE TABLE `developer_alert_events` (
  `id` varchar(191) NOT NULL,
  `developer_id` varchar(191) NOT NULL,
  `window_end` datetime(3) NOT NULL,
  `error_count` int NOT NULL,
  `total_count` int NOT NULL,
  `sample_errors` json DEFAULT NULL,
  `sent` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `developer_alert_events_dev_window_idx` (`developer_id`,`window_end`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
