package com.cregis.sdk.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

/**
 * Merchant board response (护卫队信息). Maps to OpenAPI `MerchantBoard`.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class BoardResponse {
    private Long id;
    private String ecode;
    private Long projectId;
    private List<StaffDTO> userInfos;
    private Integer threshold;
    private String status;
    private Long creatorUserId;
    private String createTime;
    private String updateTime;
}
