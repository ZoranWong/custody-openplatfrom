package com.cregis.sdk.core.config;

import lombok.Builder;
import lombok.Data;
import lombok.ToString;

/**
 * SDK configuration POJO.
 */
@Data
@Builder
@ToString(exclude = "appSecret")
public class SdkConfig {

    /** Application ID (required) */
    private String appId;

    /** Application Secret (required) */
    private String appSecret;

    /** API Base URL (required) */
    private String baseUrl;

    /** HTTP client type: okhttp or netty */
    @Builder.Default
    private String httpClientType = "okhttp";

    /** Connect timeout in seconds */
    @Builder.Default
    private int connectTimeout = 10;

    /** Read timeout in seconds */
    @Builder.Default
    private int readTimeout = 30;

    /** Maximum retry attempts */
    @Builder.Default
    private int maxRetries = 3;

    /** Webhook enabled */
    @Builder.Default
    private boolean webhookEnabled = false;

    /** Webhook callback path */
    @Builder.Default
    private String webhookPath = "/cregis/callback";
}
