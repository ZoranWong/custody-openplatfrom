package com.cregis.sdk.dto.response;

import com.cregis.sdk.dto.model.PayTo;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

/**
 * Transfer-out order response (出金订单).
 * Maps to OpenAPI `ProjectUnitTransferOutOrder`.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class PayoutResponse {
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
    private String taskId;
    private String inputAmount;
    private Long totalAmount;
    private String fundFlowCode;
    private String orderState;
    private List<PayTo> payToList;
    private String note;
    private String businessId;
    private Integer txCount;
    private String failReason;
    private String taskInitiator;
    private String source;
    private String taskOperation;
    // Travel Rule / VASP counterparty info (2026-10 API revision)
    private String vaspDid;
    private String vaspName;
    private String vaspReviewStatus;
    private String vaspReviewedBy;
    private String vaspReviewedAt;
}
