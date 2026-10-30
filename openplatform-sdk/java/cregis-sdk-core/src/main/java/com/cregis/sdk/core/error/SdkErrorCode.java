package com.cregis.sdk.core.error;

import java.util.List;

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

    /** Request timeout */
    TIMEOUT_ERROR,

    /** API returned error response (unspecified) */
    API_ERROR,

    /** Gateway authentication / authorization failure (401xx / 403xx) */
    API_UNAUTHORIZED,

    /** Gateway rejected the request format or parameters (40001 / 40002) */
    API_VALIDATION_ERROR,

    /** Gateway rate limit or daily quota exceeded (42901) */
    API_RATE_LIMITED,

    /** Gateway / upstream server failure (5xx) */
    API_SERVER_ERROR,

    /** Custody rejected the request: invalid parameters or business rule (category VALIDATION) */
    CUSTODY_VALIDATION_ERROR,

    /** Custody rejected the request because of current state: missing / duplicate / pending (category STATE) */
    CUSTODY_STATE_ERROR,

    /** Custody resource key does not exist or is not active (400103) */
    CUSTODY_RESOURCE_NOT_EXISTS,

    /** Custody balance / poolable amount insufficient */
    CUSTODY_INSUFFICIENT_FUNDS,

    /** Other custody business error — inspect {@link CregisSdkException#getServerErrorCode()} */
    CUSTODY_BUSINESS_ERROR,

    /** Webhook signature verification failed */
    WEBHOOK_VERIFY_FAILED,

    // Legacy codes kept for source compatibility.

    /** @deprecated use {@link #API_VALIDATION_ERROR} */
    @Deprecated
    VALIDATION_ERROR,

    /** @deprecated use {@link #API_UNAUTHORIZED} (authorizationId expired) */
    @Deprecated
    TOKEN_EXPIRED;

    /**
     * Maps a business code from the gateway or custody response body to an SDK
     * error code. Custody codes are looked up in {@link CustodyErrorCodes}
     * (generated from docs/third-party-api-error-codes.md).
     */
    public static SdkErrorCode fromServerCode(int serverCode) {
        switch (serverCode) {
            case 40001:
            case 40002:
                return API_VALIDATION_ERROR;
            case 40101:
            case 40102:
            case 40103:
            case 40104:
            case 40105:
            case 40106:
            case 40107:
            case 40301:
            case 40401:
                return API_UNAUTHORIZED;
            case 42901:
                return API_RATE_LIMITED;
            case 500:
            case 50001:
            case 50201:
            case 50301:
            case 50401:
            case 50402:
                return API_SERVER_ERROR;
            default:
                break;
        }

        CustodyErrorCodes custody = CustodyErrorCodes.fromCode(serverCode);
        if (custody == null) {
            return API_ERROR;
        }
        if (custody == CustodyErrorCodes.THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS) {
            return CUSTODY_RESOURCE_NOT_EXISTS;
        }
        switch (custody) {
            case ACCOUNT_BALANCE_NOT_ENOUGH:
            case ADDRESS_BALANCE_NOT_ENOUGH:
                return CUSTODY_INSUFFICIENT_FUNDS;
            default:
                break;
        }
        switch (custody.getCategory()) {
            case "VALIDATION":
                return CUSTODY_VALIDATION_ERROR;
            case "STATE":
                return CUSTODY_STATE_ERROR;
            default:
                return CUSTODY_BUSINESS_ERROR;
        }
    }

    /** True when the SDK considers this error worth retrying. */
    public boolean isRetryableCode() {
        return this == TIMEOUT_ERROR || this == HTTP_ERROR
                || this == API_RATE_LIMITED || this == API_SERVER_ERROR;
    }

    /** Default human-readable message for this code. */
    public String getDefaultMessage() {
        switch (this) {
            case CONFIG_ERROR: return "Configuration error";
            case SIGNATURE_ERROR: return "Signature computation failed";
            case HTTP_ERROR: return "HTTP request failed";
            case TIMEOUT_ERROR: return "Request timed out";
            case API_UNAUTHORIZED: return "Authentication or authorization failed";
            case API_VALIDATION_ERROR: return "Invalid request parameters";
            case API_RATE_LIMITED: return "Rate limit or daily quota exceeded";
            case API_SERVER_ERROR: return "Gateway or upstream server error";
            case CUSTODY_VALIDATION_ERROR: return "Custody rejected the request (parameters or business rule)";
            case CUSTODY_STATE_ERROR: return "Custody rejected the request because of current state";
            case CUSTODY_RESOURCE_NOT_EXISTS: return "resourceKey does not exist or is not active in custody (400103)";
            case CUSTODY_INSUFFICIENT_FUNDS: return "Insufficient balance or poolable amount in custody";
            case CUSTODY_BUSINESS_ERROR: return "Other custody business error";
            default: return "API request failed";
        }
    }

    /** Codes that represent an error returned by the API (vs local/SDK failures). */
    public static List<SdkErrorCode> apiCodes() {
        return List.of(API_ERROR, API_UNAUTHORIZED, API_VALIDATION_ERROR, API_RATE_LIMITED,
                API_SERVER_ERROR, CUSTODY_VALIDATION_ERROR, CUSTODY_STATE_ERROR,
                CUSTODY_RESOURCE_NOT_EXISTS, CUSTODY_INSUFFICIENT_FUNDS, CUSTODY_BUSINESS_ERROR);
    }
}
