package com.cregis.sdk.dto.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Travel Rule payload (Travel Rule 原始数据). Maps to OpenAPI `TravelRulePayload`.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class TravelRulePayload {
    private String beneficiaryType;
    private String beneficiaryName;
    private String beneficiaryDob;
    private String beneficiaryIdNumber;
    private String beneficiaryIdType;
    private String beneficiaryNationality;
    private String beneficiaryLegalName;
    private String beneficiaryLegalRegistrationNo;
    private String beneficiaryLegalCountry;
}
