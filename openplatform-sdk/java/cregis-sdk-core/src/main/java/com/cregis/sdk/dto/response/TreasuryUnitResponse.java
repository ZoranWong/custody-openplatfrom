package com.cregis.sdk.dto.response;

import com.cregis.sdk.dto.model.CoinDto;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

/**
 * Treasury Unit response (财务单元).
 * Maps to OpenAPI `ProjectUnit`.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class TreasuryUnitResponse {
    private Long id;
    private String ecode;
    private Long projectId;
    private String name;
    private String ubo;
    private String custodyServiceMode;
    private String topology;
    private List<CoinDto> coinIds;
    private List<TreasuryAccount> accounts;
    private String businessPurpose;
    private String status;
    private Integer sort;
    private String creationType;
    private String developerId;
    private Long creatorId;
    private String remark;
    private List<String> networks;
    private String createTime;
    private String updateTime;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TreasuryAccount {
        @JsonProperty("account_name")
        private String accountName;
        @JsonProperty("account_type")
        private String accountType;
    }
}
