package com.cregis.sdk.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * User created by `addUser` (三方平台添加用户).
 * Maps to OpenAPI `ConsoleUser`.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ConsoleUserResponse {
    private Long id;
    private String username;
    private String password;
    private String email;
    private String phone;
    /** 公钥 */
    private String pk;
    /** 状态: SUSPENDING/ACTIVE/INACTIVE */
    private String state;
    private Boolean apiFlag;
    private String ecode;
    private Boolean isSetPassword;
    private String loginTime;
    private String logoutTime;
    private String createTime;
    private String updateTime;
}
