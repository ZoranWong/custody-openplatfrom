package com.cregis.sdk.service;

import com.cregis.sdk.core.config.SdkConfig;
import com.cregis.sdk.core.http.HttpClient;
import com.cregis.sdk.core.sign.Signer;
import com.cregis.sdk.dto.request.WhitelistUpdateRequest;
import com.cregis.sdk.dto.response.AuditTaskResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Whitelist service - handles whitelist management.
 */
@Slf4j
public class WhitelistService {

    private final SdkConfig config;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public WhitelistService(SdkConfig config, HttpClient httpClient) {
        this.config = config;
        this.httpClient = httpClient;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Update whitelist (白名单设置).
     * POST /api/thirdparty/treasury/whitelist-update
     */
    public AuditTaskResponse updateWhitelist(String authorizationId, WhitelistUpdateRequest request) {
        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/whitelist-update";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, AuditTaskResponse.class);
    }

    public CompletableFuture<AuditTaskResponse> updateWhitelistAsync(String authorizationId, WhitelistUpdateRequest request) {
        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/whitelist-update";
        return httpClient.postAsync(url, jsonBody, AuditTaskResponse.class);
    }
}
