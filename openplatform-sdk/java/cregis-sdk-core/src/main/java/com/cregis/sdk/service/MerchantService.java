package com.cregis.sdk.service;

import com.cregis.sdk.core.config.SdkConfig;
import com.cregis.sdk.core.http.HttpClient;
import com.cregis.sdk.core.sign.Signer;
import com.cregis.sdk.dto.request.MerchantRegisterRequest;
import com.cregis.sdk.dto.response.MerchantRegisterResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Merchant service - handles enterprise registration.
 * Does NOT use resourceAccessKey; returns one on success.
 */
@Slf4j
public class MerchantService {

    private final SdkConfig config;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public MerchantService(SdkConfig config, HttpClient httpClient) {
        this.config = config;
        this.httpClient = httpClient;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Register merchant enterprise (三方平台注册企业).
     * POST /api/thirdparty/merchant/register
     */
    public MerchantRegisterResponse registerMerchant(MerchantRegisterRequest request) {
        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfo(config.getAppId(), config.getAppSecret(), business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/merchant/register";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, MerchantRegisterResponse.class);
    }

    public CompletableFuture<MerchantRegisterResponse> registerMerchantAsync(MerchantRegisterRequest request) {
        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfo(config.getAppId(), config.getAppSecret(), business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/merchant/register";
        return httpClient.postAsync(url, jsonBody, MerchantRegisterResponse.class);
    }
}
