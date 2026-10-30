package com.cregis.sdk.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Fund record response (账户级资金流水).
 * Maps to OpenAPI `ProjectUnitFundRecord`.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class FundRecordResponse {
    private Long id;
    private String ecode;
    private Long projectId;
    private Long treasuryUnitId;
    private Long cusAccountId;
    private String txId;
    private String orderId;
    private String coinId;
    private String network;
    /** 出金地址 */
    private String fromAddr;
    /** 入金地址 */
    private String toAddr;
    /** 方向: IN/OUT */
    private String direction;
    private Long amount;
    private Long preBalance;
    private Long postBalance;
    private String fee;
    private String txType;
    private String createTime;
}
