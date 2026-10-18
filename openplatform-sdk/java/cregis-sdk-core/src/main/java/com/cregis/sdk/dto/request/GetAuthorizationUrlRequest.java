package com.cregis.sdk.dto.request;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Get Authorization URL request (获取授权 URL).
 */
@Data
@Builder
public class GetAuthorizationUrlRequest {
    /** 权限列表 */
    private List<String> permissions;
    /** 防 CSRF 状态 */
    private String state;
    /** 授权成功后的回调通知地址 */
    private String callback;
    /** 开发者生成的 token，用于回调时身份映射 */
    private String token;
}
