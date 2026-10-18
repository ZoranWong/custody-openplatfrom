package com.cregis.sdk.service;

import com.cregis.sdk.core.config.SdkConfig;
import com.cregis.sdk.core.http.HttpClient;
import com.cregis.sdk.core.sign.Signer;
import com.cregis.sdk.dto.request.CreatePayoutRequest;
import com.cregis.sdk.dto.request.QueryRequest;
import com.cregis.sdk.dto.response.AuditTaskResponse;
import com.cregis.sdk.dto.response.PageResponse;
import com.cregis.sdk.dto.response.PayoutResponse;
import com.cregis.sdk.dto.response.TransferInOrderResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Payout service - uses Resource signature (with authorizationId).
 * Handles payout creation and transfer order listing (both in and out).
 */
@Slf4j
public class PayoutService {

    private final SdkConfig config;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public PayoutService(SdkConfig config, HttpClient httpClient) {
        this.config = config;
        this.httpClient = httpClient;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Create a payout order (出金操作).
     * POST /api/thirdparty/treasury/payout
     *
     * @return AuditTaskResponse (WCCIPCmdAuditTask)
     */
    public AuditTaskResponse createPayout(String authorizationId, CreatePayoutRequest request) {
        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/payout";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, AuditTaskResponse.class);
    }

    public CompletableFuture<AuditTaskResponse> createPayoutAsync(String authorizationId, CreatePayoutRequest request) {
        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/payout";
        return httpClient.postAsync(url, jsonBody, AuditTaskResponse.class);
    }

    /**
     * List transfer-out orders with pagination (查询出金订单).
     * POST /api/thirdparty/treasury/transfer-out-orders
     */
    public PageResponse<PayoutResponse> listTransferOutOrders(String authorizationId, QueryRequest request) {
        Map<String, Object> business = toBusinessMap(request);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/transfer-out-orders";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, new TypeReference<PageResponse<PayoutResponse>>() {});
    }

    public CompletableFuture<PageResponse<PayoutResponse>> listTransferOutOrdersAsync(String authorizationId, QueryRequest request) {
        Map<String, Object> business = toBusinessMap(request);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/transfer-out-orders";
        return httpClient.postAsync(url, jsonBody, new TypeReference<PageResponse<PayoutResponse>>() {});
    }

    /**
     * List transfer-in orders with pagination (查询入金订单).
     * POST /api/thirdparty/treasury/transfer-in-orders
     */
    public PageResponse<TransferInOrderResponse> listTransferInOrders(String authorizationId, QueryRequest request) {
        Map<String, Object> business = toBusinessMap(request);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/transfer-in-orders";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, new TypeReference<PageResponse<TransferInOrderResponse>>() {});
    }

    public CompletableFuture<PageResponse<TransferInOrderResponse>> listTransferInOrdersAsync(String authorizationId, QueryRequest request) {
        Map<String, Object> business = toBusinessMap(request);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/transfer-in-orders";
        return httpClient.postAsync(url, jsonBody, new TypeReference<PageResponse<TransferInOrderResponse>>() {});
    }

    private Map<String, Object> toBusinessMap(QueryRequest request) {
        Map<String, Object> business = new LinkedHashMap<>();
        if (request == null) return business;
        if (request.getPageIndex() != null) business.put("pageIndex", request.getPageIndex());
        if (request.getPageSize() != null) business.put("pageSize", request.getPageSize());
        if (request.getSortFields() != null) business.put("sortFields", request.getSortFields());
        if (request.getQueryList() != null && !request.getQueryList().isEmpty()) {
            business.put("queryList", objectMapper.convertValue(request.getQueryList(),
                    new TypeReference<java.util.List<Map<String, Object>>>() {}));
        }
        return business;
    }
}
