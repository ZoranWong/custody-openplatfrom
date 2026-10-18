package com.cregis.sdk.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Staff (审批人信息). Maps to OpenAPI `StaffDTO`.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class StaffDTO {
    private Long userId;
    private String userName;
    private String userEmail;
    private String publicKey;
}
