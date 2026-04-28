package com.cregis.sdk.core.config;

import com.cregis.sdk.core.error.CregisSdkException;
import com.cregis.sdk.core.error.SdkErrorCode;

/**
 * Validates SDK configuration at startup.
 */
public final class SdkConfigValidator {

    private SdkConfigValidator() {
        // Utility class
    }

    /**
     * Validate that all required configuration fields are present.
     * Throws IllegalStateException if any required field is missing.
     */
    public static void validate(SdkConfig config) {
        if (config == null) {
            throw new IllegalStateException("SdkConfig must not be null");
        }
        if (config.getAppId() == null || config.getAppId().isBlank()) {
            throw new IllegalStateException("cregis.sdk.app-id is required but not set");
        }
        if (config.getAppSecret() == null || config.getAppSecret().isBlank()) {
            throw new IllegalStateException("cregis.sdk.app-secret is required but not set");
        }
        if (config.getBaseUrl() == null || config.getBaseUrl().isBlank()) {
            throw new IllegalStateException("cregis.sdk.base-url is required but not set");
        }
    }
}
