package com.cregis.sdk.core.error;

/**
 * SDK internal error codes.
 */
public enum SdkErrorCode {
    /** Configuration error (missing required fields) */
    CONFIG_ERROR,

    /** Signature computation error */
    SIGNATURE_ERROR,

    /** HTTP request failed */
    HTTP_ERROR,

    /** API returned error response */
    API_ERROR,

    /** Parameter validation failed */
    VALIDATION_ERROR,

    /** Token/authorization expired */
    TOKEN_EXPIRED,

    /** Webhook signature verification failed */
    WEBHOOK_VERIFY_FAILED,

    /** Request timeout */
    TIMEOUT_ERROR
}
