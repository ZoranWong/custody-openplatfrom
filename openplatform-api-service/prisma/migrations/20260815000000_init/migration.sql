-- CreateTable
CREATE TABLE `isv_developer` (
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
    `kyb_status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `kyb_reviewed_at` DATETIME(3) NULL,
    `kyb_reviewed_by` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `isv_developer_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `applications` (
    `id` VARCHAR(191) NOT NULL,
    `isv_developer_id` VARCHAR(191) NOT NULL,
    `app_name` VARCHAR(191) NOT NULL,
    `app_description` VARCHAR(191) NULL,
    `app_logo_url` VARCHAR(191) NULL,
    `app_secret` VARCHAR(191) NOT NULL,
    `app_type` VARCHAR(191) NOT NULL DEFAULT 'corporate',
    `callback_url` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `applications_isv_developer_id_idx`(`isv_developer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `oauth_resources` (
    `id` VARCHAR(191) NOT NULL,
    `app_id` VARCHAR(191) NOT NULL,
    `resource_key` VARCHAR(191) NULL,
    `authorized_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `oauth_resources_resource_key_idx`(`resource_key`),
    UNIQUE INDEX `oauth_resources_app_id_resource_key_key`(`app_id`, `resource_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_logs` (
    `id` VARCHAR(191) NOT NULL,
    `trace_id` VARCHAR(191) NULL,
    `app_id` VARCHAR(191) NOT NULL,
    `endpoint` VARCHAR(191) NOT NULL,
    `method` VARCHAR(191) NOT NULL,
    `request_headers` JSON NULL,
    `request_body` JSON NULL,
    `response_status` INTEGER NULL,
    `response_body` JSON NULL,
    `response_time` INTEGER NULL,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `api_logs_app_id_created_at_idx`(`app_id`, `created_at`),
    INDEX `api_logs_trace_id_idx`(`trace_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `metrics` (
    `id` VARCHAR(191) NOT NULL,
    `app_id` VARCHAR(191) NOT NULL,
    `metric_type` VARCHAR(191) NOT NULL,
    `metric_value` DECIMAL(20, 2) NULL,
    `period_start` DATETIME(3) NOT NULL,
    `period_end` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `metrics_app_id_period_start_idx`(`app_id`, `period_start`),
    INDEX `metrics_metric_type_idx`(`metric_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `traces` (
    `id` VARCHAR(191) NOT NULL,
    `trace_id` VARCHAR(191) NOT NULL,
    `app_id` VARCHAR(191) NULL,
    `service_name` VARCHAR(191) NULL,
    `operation_name` VARCHAR(191) NULL,
    `span_id` VARCHAR(191) NULL,
    `parent_span_id` VARCHAR(191) NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NULL,
    `duration` INTEGER NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `tags` JSON NULL,
    `logs` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `traces_trace_id_idx`(`trace_id`),
    INDEX `traces_app_id_idx`(`app_id`),
    INDEX `traces_start_time_idx`(`start_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `isv_users` (
    `id` VARCHAR(191) NOT NULL,
    `isv_developer_id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'developer',
    `status` VARCHAR(191) NOT NULL DEFAULT 'inactive',
    `allowed_applications` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `isv_users_email_key`(`email`),
    INDEX `isv_users_isv_developer_id_idx`(`isv_developer_id`),
    INDEX `isv_users_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bindings` (
    `id` VARCHAR(191) NOT NULL,
    `isv_developer_id` VARCHAR(191) NOT NULL,
    `binding_type` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `account_id` VARCHAR(191) NULL,
    `account_detail` JSON NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `bound_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `bindings_isv_developer_id_idx`(`isv_developer_id`),
    INDEX `bindings_binding_type_idx`(`binding_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `endpoint_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `isv_developer_id` VARCHAR(191) NOT NULL,
    `endpoint` VARCHAR(191) NOT NULL,
    `method` VARCHAR(191) NOT NULL,
    `permission` VARCHAR(191) NOT NULL DEFAULT 'read',
    `is_enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `endpoint_permissions_isv_developer_id_idx`(`isv_developer_id`),
    UNIQUE INDEX `endpoint_permissions_isv_developer_id_endpoint_method_key`(`isv_developer_id`, `endpoint`, `method`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `jti` VARCHAR(191) NOT NULL,
    `appid` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `expires_at` BIGINT NOT NULL,
    `revoked` BOOLEAN NOT NULL DEFAULT false,
    `replaced_by_jti` VARCHAR(191) NULL,
    `created_at` BIGINT NOT NULL,
    `last_used_at` BIGINT NULL,

    UNIQUE INDEX `refresh_tokens_jti_key`(`jti`),
    INDEX `refresh_tokens_appid_idx`(`appid`),
    INDEX `refresh_tokens_jti_idx`(`jti`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admins` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'viewer',
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admins_email_key`(`email`),
    INDEX `admins_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `applications` ADD CONSTRAINT `applications_isv_developer_id_fkey` FOREIGN KEY (`isv_developer_id`) REFERENCES `isv_developer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oauth_resources` ADD CONSTRAINT `oauth_resources_app_id_fkey` FOREIGN KEY (`app_id`) REFERENCES `applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_logs` ADD CONSTRAINT `api_logs_app_id_fkey` FOREIGN KEY (`app_id`) REFERENCES `applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `metrics` ADD CONSTRAINT `metrics_app_id_fkey` FOREIGN KEY (`app_id`) REFERENCES `applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `isv_users` ADD CONSTRAINT `isv_users_isv_developer_id_fkey` FOREIGN KEY (`isv_developer_id`) REFERENCES `isv_developer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bindings` ADD CONSTRAINT `bindings_isv_developer_id_fkey` FOREIGN KEY (`isv_developer_id`) REFERENCES `isv_developer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `endpoint_permissions` ADD CONSTRAINT `endpoint_permissions_isv_developer_id_fkey` FOREIGN KEY (`isv_developer_id`) REFERENCES `isv_developer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

