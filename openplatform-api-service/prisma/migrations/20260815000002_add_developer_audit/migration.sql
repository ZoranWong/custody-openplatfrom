-- CreateTable
CREATE TABLE `developer_audit` (
    `id` VARCHAR(191) NOT NULL,
    `developer_id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `reason` TEXT NULL,
    `admin_id` VARCHAR(191) NOT NULL,
    `admin_email` VARCHAR(191) NOT NULL,
    `previous_status` VARCHAR(191) NULL,
    `new_status` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `developer_audit_developer_id_idx`(`developer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;