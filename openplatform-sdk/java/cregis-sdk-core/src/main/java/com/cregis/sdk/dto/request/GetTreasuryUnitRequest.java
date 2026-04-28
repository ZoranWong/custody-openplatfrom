package com.cregis.sdk.dto.request;

import lombok.Builder;
import lombok.Data;

/**
 * Get Treasury Unit request.
 */
@Data
@Builder
public class GetTreasuryUnitRequest {
    private Long unitId;
}
