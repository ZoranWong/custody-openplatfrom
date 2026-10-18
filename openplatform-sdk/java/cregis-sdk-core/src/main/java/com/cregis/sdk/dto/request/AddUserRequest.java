package com.cregis.sdk.dto.request;

import lombok.Builder;
import lombok.Data;

/**
 * Add user request (三方平台添加用户).
 * Maps to OpenAPI `ThirdAddUserRequest`.
 */
@Data
@Builder
public class AddUserRequest {
    /** 邮箱（登录账号） */
    private String email;
    /** 密码 */
    private String password;
    /** 公钥 */
    private String publicKey;
    /** 企业code */
    private String ecode;
    /** 角色 */
    private String role;
}
