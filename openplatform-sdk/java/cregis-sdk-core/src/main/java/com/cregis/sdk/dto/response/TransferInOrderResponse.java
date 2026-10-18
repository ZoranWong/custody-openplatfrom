package com.cregis.sdk.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Transfer-in order response (入金订单).
 * Maps to OpenAPI `ProjectUnitTransferInOrder`.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class TransferInOrderResponse {
    private Long id;
    private String ecode;
    private String vaultCode;
    private Long projectId;
    private Long treasuryUnitId;
    private Long ledgerId;
    private Long cusAccountId;
    private String address;
    private String coinId;
    private String network;
    private String businessScope;
    private String travelRuleReferenceId;
    private String travelRulePayload;
    private String travelRuleStatus;
    private String travelRuleCheckStatus;
    private String travelRuleCheckPayload;
    private String kytStatus;
    private Double kytRiskScore;
    private String kytPayload;
    private Double kyaRiskScore;
    private String complianceProvider;
    private String orderId;
    private String txId;
    private String fee;
    private String callbackStatus;
    private String createTime;
    private String updateTime;
    private String cpAddress;
    private Long amount;
    private String orderState;
    private Integer type;
    private String note;
    private Integer initiator;
}
