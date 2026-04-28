package com.cregis.sdk.dto.request;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * Create Payout request.
 */
@Data
@Builder
public class CreatePayoutRequest {
    private Long unitId;
    private List<Map<String, String>> payTo;       // [{ "address": "...", "amount": "..." }]
    private String coinId;
    private String network;
    private String operation;       // withdraw, allocate, payout
    private String orderId;
    private String merchantType;
    private Map<String, Object> labels;
}
