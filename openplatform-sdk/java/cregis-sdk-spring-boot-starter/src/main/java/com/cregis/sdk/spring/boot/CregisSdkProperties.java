package com.cregis.sdk.spring.boot;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * Spring Boot configuration properties for Cregis SDK.
 *
 * Prefix: cregis.sdk
 */
@Data
@ConfigurationProperties(prefix = "cregis.sdk")
public class CregisSdkProperties {

    /** Application ID (required) */
    private String appId;

    /** Application Secret (required) */
    private String appSecret;

    /** API Base URL (required) */
    private String baseUrl;

    /** HTTP client type: okhttp or netty */
    private String httpClientType = "okhttp";

    /** Connect timeout */
    private Duration connectTimeout = Duration.ofSeconds(10);

    /** Read timeout */
    private Duration readTimeout = Duration.ofSeconds(30);

    /** Maximum retry attempts */
    private int maxRetries = 3;
}
