package com.cregis.sdk.service;

import com.cregis.sdk.core.config.SdkConfig;
import com.cregis.sdk.core.http.HttpClient;
import com.cregis.sdk.core.sign.Signer;
import com.cregis.sdk.dto.request.FundControlUpdateRequest;
import com.cregis.sdk.dto.response.AuditTaskResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Fund control service - handles fund control rule updates.
 */
@Slf4j
public class FundControlService {

    private final SdkConfig config;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public FundControlService(SdkConfig config, HttpClient httpClient) {
        this.config = config;
        this.httpClient = httpClient;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Update fund control rules (修改资金流控制规则). The change goes through the
     * approval flow: custody returns the resulting audit task.
     * POST /api/thirdparty/treasury/fund-control-update
     */
    public AuditTaskResponse updateFundControl(String authorizationId, FundControlUpdateRequest request) {
        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/fund-control-update";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, AuditTaskResponse.class);
    }

    public CompletableFuture<AuditTaskResponse> updateFundControlAsync(String authorizationId, FundControlUpdateRequest request) {
        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/fund-control-update";
        return httpClient.postAsync(url, jsonBody, AuditTaskResponse.class);
    }
}
