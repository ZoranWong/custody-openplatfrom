-- CreateTable
CREATE TABLE `developer_applications` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `legal_name` VARCHAR(191) NOT NULL,
    `registration_number` VARCHAR(191) NULL,
    `jurisdiction` VARCHAR(191) NULL,
    `date_of_incorporation` VARCHAR(191) NULL,
    `registered_address` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `ubo_info` JSON NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `reviewed_at` DATETIME(3) NULL,
    `reviewed_by` VARCHAR(191) NULL,
    `reject_reason` VARCHAR(191) NULL,
    `developer_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `developer_applications_email_key`(`email`),
    INDEX `developer_applications_status_idx`(`status`),
    INDEX `developer_applications_email_idx`(`email`),
    INDEX `developer_applications_developer_id_idx`(`developer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;