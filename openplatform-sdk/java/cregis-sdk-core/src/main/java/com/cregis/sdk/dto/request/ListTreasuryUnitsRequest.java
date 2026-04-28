package com.cregis.sdk.dto.request;

import lombok.Builder;
import lombok.Data;

/**
 * List Treasury Units request.
 */
@Data
@Builder
public class ListTreasuryUnitsRequest {
    private Integer pageNum;
    private Integer pageSize;
    private String businessScope;
}
