package com.cregis.sdk.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Merchant (商户信息). Maps to OpenAPI `Merchant`.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class MerchantResponse {
    private Long id;
    private String code;
    private String merchantName;
    private String source;
    private String alias;
    private String status;
    private String kybStatus;
    private String email;
    private String sumsubApplicantId;
    private String jurisdiction;
    private String registrationNumber;
    private String dateOfIncorporation;
    private String taxId;
    private String entityType;
    private String dbaName;
    private Long creatorId;
    private String createTime;
    private String updateTime;
}
