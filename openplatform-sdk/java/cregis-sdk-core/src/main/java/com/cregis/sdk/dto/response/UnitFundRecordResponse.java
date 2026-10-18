package com.cregis.sdk.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Unit fund record response (财务单元级资金流水).
 * Maps to OpenAPI `ProjectUnitLedgerFundRecord`.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class UnitFundRecordResponse {
    private Long id;
    private String ecode;
    private Long projectId;
    private Long treasuryUnitId;
    private Long ledgerId;
    private String txId;
    private String orderId;
    private String coinId;
    private String network;
    private Long amount;
    private Long preBalance;
    private Long postBalance;
    private String fee;
    private String txType;
    private String createTime;
}
