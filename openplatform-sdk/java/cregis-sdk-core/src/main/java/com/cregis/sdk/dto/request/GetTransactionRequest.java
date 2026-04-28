package com.cregis.sdk.dto.request;

import lombok.Builder;
import lombok.Data;

/**
 * Get Transaction request.
 */
@Data
@Builder
public class GetTransactionRequest {
    private String activityId;
}
