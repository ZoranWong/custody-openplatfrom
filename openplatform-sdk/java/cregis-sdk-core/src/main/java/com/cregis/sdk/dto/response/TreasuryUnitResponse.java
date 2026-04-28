package com.cregis.sdk.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * Treasury Unit response.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class TreasuryUnitResponse {
    private Long id;
    private String ecode;
    private String name;
    private String custodyServiceMode;
    private List<Map<String, String>> coinIds;
    private List<TreasuryAccount> accounts;
    private String status;
    private String creationType;
    private String createTime;
    private List<String> networks;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TreasuryAccount {
        private String accountName;
        private String accountType;
    }
}
