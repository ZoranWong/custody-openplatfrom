-- Per-developer raw log retention. Existing rows keep the platform default (3 days).
ALTER TABLE `developer_alert_settings`
  ADD COLUMN `log_retention_days` INT NOT NULL DEFAULT 3;
