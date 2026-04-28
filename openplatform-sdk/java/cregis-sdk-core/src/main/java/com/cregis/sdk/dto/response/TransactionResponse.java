package com.cregis.sdk.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Transaction (Activity) response.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class TransactionResponse {
    private Long id;
    private String activityId;
    private Long unitId;
    private String unitEcode;
    private String coinId;
    private String network;
    private String type;
    private String direction;
    private String amount;
    private String balanceBefore;
    private String balanceAfter;
    private String fee;
    private String txHash;
    private String fromAddress;
    private String toAddress;
    private String status;
    private String createdAt;
}
