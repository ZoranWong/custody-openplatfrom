package com.cregis.sdk.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Merchant register response (三方平台注册企业结果).
 * Maps to OpenAPI `ThirdMerchantRegisterResult`, plus the gateway-added
 * {@code authorizedId}.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class MerchantRegisterResponse {
    private String ecode;
    private String vaultCode;
    /**
     * Gateway-side authorization record id (same value as {@code authorizeId}),
     * usable directly as {@code basic.authorizationId} for subsequent resource
     * calls. Present only on first registration; absent when {@code alreadyExists}
     * is true.
     */
    private String authorizedId;
    /**
     * Enterprise resource key returned by the upstream custody service.
     * The gateway strips this field before responding, so callers normally see
     * {@code authorizedId} instead. Kept for direct/upstream compatibility.
     */
    private String resourceAccessKey;
    private Boolean alreadyExists;
    private MerchantResponse merchant;
}
