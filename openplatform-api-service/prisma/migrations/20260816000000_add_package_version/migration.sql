-- Drop existing unique constraint on (package_code, region)
ALTER TABLE `packages` DROP INDEX `packages_package_code_region_key`;

-- Add version column with default 1
ALTER TABLE `packages` ADD COLUMN `version` INTEGER NOT NULL DEFAULT 1;

-- Add new unique constraint on (package_code, region, version)
ALTER TABLE `packages` ADD UNIQUE INDEX `packages_package_code_region_version_key`(`package_code`, `region`, `version`);

-- Add index for querying by package_code and status
CREATE INDEX `packages_package_code_status_idx` ON `packages`(`package_code`, `status`);