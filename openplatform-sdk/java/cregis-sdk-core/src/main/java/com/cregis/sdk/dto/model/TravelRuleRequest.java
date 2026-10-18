package com.cregis.sdk.dto.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Travel Rule request (Travel Rule 信息). Maps to OpenAPI `TravelRuleRequest`.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class TravelRuleRequest {
    private String referenceId;
    private TravelRulePayload payload;
}
