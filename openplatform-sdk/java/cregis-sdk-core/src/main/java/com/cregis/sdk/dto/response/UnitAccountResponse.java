package com.cregis.sdk.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Unit account response (账户信息).
 * Maps to OpenAPI `ProjectUnitAccount`.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class UnitAccountResponse {
    private Long id;
    private String ecode;
    private String vaultCode;
    private String vaultAccountId;
    private Long projectId;
    private Long treasuryUnitId;
    private String accountName;
    private String fundFlowCode;
    private String anycallCode;
    private String autoSignUrl;
    private Long balance;
    private Long freezeBalance;
    private Long holdBalance;
    private String coinId;
    private String network;
    private String type;
    private String accountType;
    private Integer status;
    private Long income;
    private Long outcome;
    private Boolean isSmart;
    private String remark;
    private String createTime;
    private String updateTime;
}
