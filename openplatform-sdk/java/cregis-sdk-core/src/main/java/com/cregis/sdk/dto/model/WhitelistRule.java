package com.cregis.sdk.dto.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Whitelist rule (白名单规则). Maps to OpenAPI `WhitelistRule`.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class WhitelistRule {
    private List<String> accounts;
    private List<WhitelistItem> addresses;
}
