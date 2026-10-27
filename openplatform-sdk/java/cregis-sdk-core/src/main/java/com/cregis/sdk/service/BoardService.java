package com.cregis.sdk.service;

import com.cregis.sdk.core.config.SdkConfig;
import com.cregis.sdk.core.http.HttpClient;
import com.cregis.sdk.core.sign.Signer;
import com.cregis.sdk.dto.request.InitBoardRequest;
import com.cregis.sdk.dto.request.UpdateBoardRequest;
import com.cregis.sdk.dto.response.AuditTaskResponse;
import com.cregis.sdk.dto.response.BoardResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Board service - handles guardian board (护卫队) initialization.
 */
@Slf4j
public class BoardService {

    private final SdkConfig config;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public BoardService(SdkConfig config, HttpClient httpClient) {
        this.config = config;
        this.httpClient = httpClient;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Initialize board (初始化护卫队).
     * POST /api/thirdparty/board/init
     */
    public BoardResponse initBoard(String authorizationId, InitBoardRequest request) {
        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/board/init";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, BoardResponse.class);
    }

    public CompletableFuture<BoardResponse> initBoardAsync(String authorizationId, InitBoardRequest request) {
        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/board/init";
        return httpClient.postAsync(url, jsonBody, BoardResponse.class);
    }

    /**
     * Update board (修改护卫队).
     * POST /api/thirdparty/board/update
     * <p>
     * The change goes through the approval flow: custody returns the resulting
     * audit task, not the board.
     */
    public AuditTaskResponse updateBoard(String authorizationId, UpdateBoardRequest request) {
        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/board/update";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, AuditTaskResponse.class);
    }

    public CompletableFuture<AuditTaskResponse> updateBoardAsync(String authorizationId, UpdateBoardRequest request) {
        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/board/update";
        return httpClient.postAsync(url, jsonBody, AuditTaskResponse.class);
    }
}
