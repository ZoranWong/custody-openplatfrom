package com.cregis.sdk.dto.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Payout target (出金目标). Maps to OpenAPI `PayTo`.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class PayTo {
    private String to;
    private Long amount;
    private Double kyaRiskScore;
    private List<String> ruleNames;
}
