-- Remove region column and its unique constraint
ALTER TABLE `packages` DROP INDEX `packages_package_code_region_version_key`;
ALTER TABLE `packages` DROP COLUMN `region`;

-- Add new unique constraint on (package_code, version)
ALTER TABLE `packages` ADD UNIQUE INDEX `packages_package_code_version_key`(`package_code`, `version`);

-- Add feature boolean columns
ALTER TABLE `packages` ADD COLUMN `webhook` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `packages` ADD COLUMN `custom_domain` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `packages` ADD COLUMN `white_label` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `packages` ADD COLUMN `sla` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `packages` ADD COLUMN `ip_whitelist` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `packages` ADD COLUMN `auto_renew` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `packages` ADD COLUMN `log_retention_days` INTEGER NOT NULL DEFAULT 30;
ALTER TABLE `packages` ADD COLUMN `support_level` VARCHAR(191) NOT NULL DEFAULT 'community';

-- Update existing packages with feature flags based on package_code
UPDATE `packages` SET
  `webhook` = CASE WHEN `package_code` IN ('PROFESSIONAL', 'ENTERPRISE') THEN true ELSE false END,
  `custom_domain` = CASE WHEN `package_code` = 'ENTERPRISE' THEN true ELSE false END,
  `white_label` = CASE WHEN `package_code` = 'ENTERPRISE' THEN true ELSE false END,
  `sla` = CASE WHEN `package_code` = 'ENTERPRISE' THEN true ELSE false END,
  `ip_whitelist` = CASE WHEN `package_code` = 'ENTERPRISE' THEN true ELSE false END,
  `auto_renew` = CASE WHEN `package_code` = 'ENTERPRISE' THEN true ELSE false END,
  `log_retention_days` = CASE
    WHEN `package_code` = 'TRIAL' THEN 7
    WHEN `package_code` = 'BASIC' THEN 30
    WHEN `package_code` = 'PROFESSIONAL' THEN 90
    WHEN `package_code` = 'ENTERPRISE' THEN 180
    ELSE 30
  END,
  `support_level` = CASE
    WHEN `package_code` = 'TRIAL' THEN 'community'
    WHEN `package_code` = 'BASIC' THEN 'email'
    WHEN `package_code` = 'PROFESSIONAL' THEN 'priority'
    WHEN `package_code` = 'ENTERPRISE' THEN 'dedicated'
    ELSE 'community'
  END
WHERE `status` = 'active';

-- Seed 4 default packages if they don't exist for the version
INSERT IGNORE INTO `packages` (id, package_code, name, description, features, monthly_price, yearly_price, yearly_discount, daily_api_limit, max_applications, is_trial, webhook, custom_domain, white_label, sla, ip_whitelist, auto_renew, log_retention_days, support_level, status, version, sort_order, created_at, updated_at)
VALUES
(UUID(), 'TRIAL', '体验版', '免费试用30天，体验平台基本功能', '["每日1,000次API调用","1个应用","社区支持","30天有效期"]', 0, 0, 1.00, 1000, 1, true, false, false, false, false, false, false, 7, 'community', 'active', 1, 0, NOW(), NOW()),
(UUID(), 'BASIC', '基础版', '适合个人开发者和小团队', '["每日50,000次API调用","3个应用","邮件支持","API日志保留30天"]', 299.00, 2990.00, 0.83, 50000, 3, false, false, false, false, false, false, false, 30, 'email', 'active', 1, 1, NOW(), NOW()),
(UUID(), 'PROFESSIONAL', '中小企业版', '适合中小企业，功能更全面', '["每日200,000次API调用","10个应用","优先技术支持","Webhook支持","API日志保留90天"]', 999.00, 9990.00, 0.83, 200000, 10, false, true, false, false, false, false, false, 90, 'priority', 'active', 1, 2, NOW(), NOW()),
(UUID(), 'ENTERPRISE', '金融服务大型企业版', '为大型金融机构提供定制化服务', '["每日1,000,000次API调用","不限应用数","专属技术支持","自定义限流策略","Webhook支持","SLA保障","API日志保留180天","IP白名单"]', 4999.00, 49990.00, 0.83, 1000000, 999, false, true, true, true, true, true, true, 180, 'dedicated', 'active', 1, 3, NOW(), NOW());
