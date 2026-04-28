package com.cregis.sdk.spring.boot;

import com.cregis.sdk.CregisClient;
import com.cregis.sdk.core.config.SdkConfig;
import com.cregis.sdk.core.http.HttpClient;
import com.cregis.sdk.core.http.OkHttpClientAdapter;
import com.cregis.sdk.http.netty.NettyHttpClientAdapter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Spring Boot auto-configuration for Cregis SDK.
 */
@Configuration
@EnableConfigurationProperties(CregisSdkProperties.class)
public class CregisSdkAutoConfiguration {

    private static final Logger log = LoggerFactory.getLogger(CregisSdkAutoConfiguration.class);

    @Bean
    @ConditionalOnMissingBean(CregisClient.class)
    public CregisClient cregisClient(CregisSdkProperties properties) {
        SdkConfig config = SdkConfig.builder()
                .appId(properties.getAppId())
                .appSecret(properties.getAppSecret())
                .baseUrl(properties.getBaseUrl())
                .httpClientType(properties.getHttpClientType())
                .connectTimeout((int) properties.getConnectTimeout().toSeconds())
                .readTimeout((int) properties.getReadTimeout().toSeconds())
                .maxRetries(properties.getMaxRetries())
                .build();

        log.info("Initializing Cregis SDK with baseUrl={}, httpClientType={}",
                config.getBaseUrl(), config.getHttpClientType());

        return new CregisClient(config);
    }

    @Bean
    @ConditionalOnMissingBean(HttpClient.class)
    @ConditionalOnProperty(name = "cregis.sdk.http-client-type", havingValue = "netty", matchIfMissing = false)
    @ConditionalOnClass(NettyHttpClientAdapter.class)
    public HttpClient nettyHttpClient(CregisSdkProperties properties) {
        log.info("Using Netty HTTP client for Cregis SDK");
        return new NettyHttpClientAdapter((int) properties.getConnectTimeout().toSeconds());
    }

    @Bean
    @ConditionalOnMissingBean(HttpClient.class)
    @ConditionalOnProperty(name = "cregis.sdk.http-client-type", havingValue = "okhttp", matchIfMissing = true)
    public HttpClient okHttpClient(CregisSdkProperties properties) {
        log.info("Using OkHttp HTTP client for Cregis SDK");
        return new OkHttpClientAdapter(
                (int) properties.getConnectTimeout().toSeconds(),
                (int) properties.getReadTimeout().toSeconds(),
                50,
                300
        );
    }
}
