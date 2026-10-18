package com.cregis.sdk.dto.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Fund control rule (资金流规则). Maps to OpenAPI `FundControlRule`.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class FundControlRule {
    private List<String> guardians;
    private String threshold;
    private String perTransferLimit;
    private String dailyTransferLimit;
}
