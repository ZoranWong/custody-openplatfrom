package com.cregis.sdk.dto.request;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * Create Transaction request.
 */
@Data
@Builder
public class CreateTransactionRequest {
    private Long unitId;
    private String activityType;     // DEPOSIT, WITHDRAW, TRANSFER_IN, etc.
    private String coinId;
    private String network;
    private String amount;
    private String toAddress;
    private Map<String, Object> labels;
}
