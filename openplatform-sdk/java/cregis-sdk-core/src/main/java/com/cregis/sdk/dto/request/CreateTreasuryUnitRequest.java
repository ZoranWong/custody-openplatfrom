package com.cregis.sdk.dto.request;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * Create Treasury Unit request.
 */
@Data
@Builder
public class CreateTreasuryUnitRequest {
    private String businessScope;      // DEDICATED_ACCOUNT, OMNIBUS_ACCOUNT, OPEN_API_PROXY
    private String topology;           // ORBIT, SINGLE_GENERAL, QUAD_SMART_ISOLATION
    private List<Map<String, String>> coinIds;     // [{ "coinId": "...", "network": "..." }]
    private List<Map<String, Object>> primaryManager;
    private List<Map<String, Object>> payoutManager;
    private List<Map<String, Object>> riskManager;
    private Map<String, Object> labels;  // Optional integration labels
}
