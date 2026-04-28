package com.cregis.sdk.dto.request;

import lombok.Builder;
import lombok.Data;

/**
 * List Payouts request.
 */
@Data
@Builder
public class ListPayoutsRequest {
    private Long unitId;
    private Integer pageNum;
    private Integer pageSize;
    private String orderId;
    private String status;
}
