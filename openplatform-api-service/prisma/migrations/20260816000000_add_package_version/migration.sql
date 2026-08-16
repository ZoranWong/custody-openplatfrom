-- Drop existing unique constraint on (package_code, region)
ALTER TABLE `packages` DROP INDEX `packages_package_code_region_key`;

-- Add version column with default 1
ALTER TABLE `packages` ADD COLUMN `version` INTEGER NOT NULL DEFAULT 1;

-- Add new unique constraint on (package_code, region, version)
ALTER TABLE `packages` ADD UNIQUE INDEX `packages_package_code_region_version_key`(`package_code`, `region`, `version`);

-- Add index for querying by package_code and status
CREATE INDEX `packages_package_code_status_idx` ON `packages`(`package_code`, `status`);

-- Seed 4 default packages (UPSERT: skip if type already exists)
INSERT IGNORE INTO `packages` (id, package_code, region, name, description, features, monthly_price, yearly_price, yearly_discount, daily_api_limit, max_applications, is_trial, status, version, sort_order, created_at, updated_at)
VALUES
(UUID(), 'TRIAL', 'CN', '体验版', '免费试用30天，体验平台基本功能', '["每日1,000次API调用","1个应用","社区支持","30天有效期"]', 0, 0, 1.00, 1000, 1, true, 'active', 1, 0, NOW(), NOW()),
(UUID(), 'BASIC', 'CN', '基础版', '适合个人开发者和小团队', '["每日50,000次API调用","3个应用","邮件支持","API日志保留30天"]', 299.00, 2990.00, 0.83, 50000, 3, false, 'active', 1, 1, NOW(), NOW()),
(UUID(), 'PROFESSIONAL', 'CN', '中小企业版', '适合中小企业，功能更全面', '["每日200,000次API调用","10个应用","优先技术支持","Webhook支持","API日志保留90天"]', 999.00, 9990.00, 0.83, 200000, 10, false, 'active', 1, 2, NOW(), NOW()),
(UUID(), 'ENTERPRISE', 'CN', '金融服务大型企业版', '为大型金融机构提供定制化服务', '["每日1,000,000次API调用","不限应用数","专属技术支持","自定义限流策略","Webhook支持","SLA保障","API日志保留180天","IP白名单"]', 4999.00, 49990.00, 0.83, 1000000, 999, false, 'active', 1, 3, NOW(), NOW());