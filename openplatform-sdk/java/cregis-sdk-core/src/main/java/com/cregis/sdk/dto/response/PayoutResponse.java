package com.cregis.sdk.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

/**
 * Payout response.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class PayoutResponse {
    private Long id;
    private String orderId;
    private Long unitId;
    private String unitEcode;
    private String coinId;
    private String network;
    private String amount;
    private String fee;
    private String status;
    private String fromAddress;
    private String toAddress;
    private String txHash;
    private String createdAt;
    private String updatedAt;
}
