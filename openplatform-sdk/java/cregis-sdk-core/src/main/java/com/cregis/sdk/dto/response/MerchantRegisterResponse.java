package com.cregis.sdk.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Merchant register response (三方平台注册企业结果).
 * Maps to OpenAPI `ThirdMerchantRegisterResult`.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class MerchantRegisterResponse {
    private String ecode;
    private String vaultCode;
    private String resourceAccessKey;
    private Boolean alreadyExists;
    private MerchantResponse merchant;
}
