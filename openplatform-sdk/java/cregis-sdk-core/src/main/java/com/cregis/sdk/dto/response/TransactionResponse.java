package com.cregis.sdk.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Activity record response (活动记录).
 * Maps to OpenAPI `ProjectUnitActivity`.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class TransactionResponse {
    private Long id;
    private String ecode;
    private Long projectId;
    private Long treasuryUnitId;
    private Long ledgerId;
    private Long cusAccountId;
    private String accountType;
    private Long cpAccountId;
    private String coinId;
    private String network;
    private String type;
    private Long amount;
    private String direction;
    private String orderId;
    private String businessId;
    private String status;
    private String travelRuleStatus;
    private String kytStatus;
    private String kyaStatus;
    private String createTime;
    private String updateTime;
}
