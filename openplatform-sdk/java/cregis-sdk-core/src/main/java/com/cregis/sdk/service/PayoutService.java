package com.cregis.sdk.service;

import com.cregis.sdk.core.config.SdkConfig;
import com.cregis.sdk.core.http.HttpClient;
import com.cregis.sdk.core.sign.Signer;
import com.cregis.sdk.dto.request.CreatePayoutRequest;
import com.cregis.sdk.dto.request.ListPayoutsRequest;
import com.cregis.sdk.dto.response.PageResponse;
import com.cregis.sdk.dto.response.PayoutResponse;
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
     * Create a payout order.
     * POST /api/thirdparty/treasury/payout
     *
     * @param authorizationId the resource access key (authorization ID)
     * @param request the payout creation request
     * @return PayoutResponse with the created payout details
     */
    public PayoutResponse createPayout(String authorizationId, CreatePayoutRequest request) {
        log.debug("Creating payout with authorizationId: {}, unitId: {}",
                authorizationId, request.getUnitId());

        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/payout";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, PayoutResponse.class);
    }

    /**
     * Create a payout order asynchronously.
     * POST /api/thirdparty/treasury/payout
     *
     * @param authorizationId the resource access key
     * @param request the payout creation request
     * @return CompletableFuture with PayoutResponse
     */
    public CompletableFuture<PayoutResponse> createPayoutAsync(String authorizationId,
                                                                CreatePayoutRequest request) {
        log.debug("Creating payout async with authorizationId: {}, unitId: {}",
                authorizationId, request.getUnitId());

        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/payout";

        return httpClient.postAsync(url, jsonBody, PayoutResponse.class);
    }

    /**
     * List transfer-out orders with pagination.
     * POST /api/thirdparty/treasury/transfer-out-orders
     *
     * @param authorizationId the resource access key
     * @param request the list request with pagination and filter parameters
     * @return PageResponse containing payout records
     */
    @SuppressWarnings("unchecked")
    public PageResponse<PayoutResponse> listTransferOutOrders(String authorizationId,
                                                               ListPayoutsRequest request) {
        log.debug("Listing transfer-out orders with authorizationId: {}", authorizationId);

        Map<String, Object> business = new LinkedHashMap<>();
        if (request.getUnitId() != null) {
            business.put("unitId", request.getUnitId());
        }
        if (request.getPageNum() != null) {
            business.put("pageNum", request.getPageNum());
        }
        if (request.getPageSize() != null) {
            business.put("pageSize", request.getPageSize());
        }
        if (request.getOrderId() != null) {
            business.put("orderId", request.getOrderId());
        }
        if (request.getStatus() != null) {
            business.put("status", request.getStatus());
        }

        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/transfer-out-orders";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, new TypeReference<PageResponse<PayoutResponse>>() {});
    }

    /**
     * List transfer-out orders asynchronously.
     * POST /api/thirdparty/treasury/transfer-out-orders
     *
     * @param authorizationId the resource access key
     * @param request the list request with pagination and filter parameters
     * @return CompletableFuture with PageResponse
     */
    @SuppressWarnings("unchecked")
    public CompletableFuture<PageResponse<PayoutResponse>> listTransferOutOrdersAsync(
            String authorizationId, ListPayoutsRequest request) {
        log.debug("Listing transfer-out orders async with authorizationId: {}", authorizationId);

        Map<String, Object> business = new LinkedHashMap<>();
        if (request.getUnitId() != null) {
            business.put("unitId", request.getUnitId());
        }
        if (request.getPageNum() != null) {
            business.put("pageNum", request.getPageNum());
        }
        if (request.getPageSize() != null) {
            business.put("pageSize", request.getPageSize());
        }
        if (request.getOrderId() != null) {
            business.put("orderId", request.getOrderId());
        }
        if (request.getStatus() != null) {
            business.put("status", request.getStatus());
        }

        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/transfer-out-orders";

        return httpClient.postAsync(url, jsonBody, new TypeReference<PageResponse<PayoutResponse>>() {});
    }

    /**
     * List transfer-in orders with pagination.
     * POST /api/thirdparty/treasury/transfer-in-orders
     *
     * @param authorizationId the resource access key
     * @param request the list request with pagination and filter parameters
     * @return PageResponse containing payout records
     */
    @SuppressWarnings("unchecked")
    public PageResponse<PayoutResponse> listTransferInOrders(String authorizationId,
                                                              ListPayoutsRequest request) {
        log.debug("Listing transfer-in orders with authorizationId: {}", authorizationId);

        Map<String, Object> business = new LinkedHashMap<>();
        if (request.getUnitId() != null) {
            business.put("unitId", request.getUnitId());
        }
        if (request.getPageNum() != null) {
            business.put("pageNum", request.getPageNum());
        }
        if (request.getPageSize() != null) {
            business.put("pageSize", request.getPageSize());
        }
        if (request.getOrderId() != null) {
            business.put("orderId", request.getOrderId());
        }
        if (request.getStatus() != null) {
            business.put("status", request.getStatus());
        }

        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/transfer-in-orders";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, new TypeReference<PageResponse<PayoutResponse>>() {});
    }

    /**
     * List transfer-in orders asynchronously.
     * POST /api/thirdparty/treasury/transfer-in-orders
     *
     * @param authorizationId the resource access key
     * @param request the list request with pagination and filter parameters
     * @return CompletableFuture with PageResponse
     */
    @SuppressWarnings("unchecked")
    public CompletableFuture<PageResponse<PayoutResponse>> listTransferInOrdersAsync(
            String authorizationId, ListPayoutsRequest request) {
        log.debug("Listing transfer-in orders async with authorizationId: {}", authorizationId);

        Map<String, Object> business = new LinkedHashMap<>();
        if (request.getUnitId() != null) {
            business.put("unitId", request.getUnitId());
        }
        if (request.getPageNum() != null) {
            business.put("pageNum", request.getPageNum());
        }
        if (request.getPageSize() != null) {
            business.put("pageSize", request.getPageSize());
        }
        if (request.getOrderId() != null) {
            business.put("orderId", request.getOrderId());
        }
        if (request.getStatus() != null) {
            business.put("status", request.getStatus());
        }

        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/transfer-in-orders";

        return httpClient.postAsync(url, jsonBody, new TypeReference<PageResponse<PayoutResponse>>() {});
    }
}
