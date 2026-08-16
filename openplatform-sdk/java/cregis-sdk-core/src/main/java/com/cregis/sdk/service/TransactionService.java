package com.cregis.sdk.service;

import com.cregis.sdk.core.config.SdkConfig;
import com.cregis.sdk.core.http.HttpClient;
import com.cregis.sdk.core.sign.Signer;
import com.cregis.sdk.dto.request.SubmitTaskRequest;
import com.cregis.sdk.dto.response.PageResponse;
import com.cregis.sdk.dto.response.TransactionResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Transaction service - uses Resource signature (with authorizationId).
 * Handles activity listing, fund record queries, and task submission (approvals/rejections).
 */
@Slf4j
public class TransactionService {

    private final SdkConfig config;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public TransactionService(SdkConfig config, HttpClient httpClient) {
        this.config = config;
        this.httpClient = httpClient;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * List activities (transactions) with pagination.
     * POST /api/thirdparty/treasury/activities
     *
     * @param authorizationId the resource access key (authorization ID)
     * @param request the query request with pagination and filter parameters
     * @return PageResponse containing transaction records
     */
    @SuppressWarnings("unchecked")
    public PageResponse<TransactionResponse> listActivities(String authorizationId,
                                                             Map<String, Object> request) {
        log.debug("Listing activities with authorizationId: {}", authorizationId);

        Map<String, Object> business = new LinkedHashMap<>();
        if (request != null) {
            business.putAll(request);
        }

        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/activities";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, new TypeReference<PageResponse<TransactionResponse>>() {});
    }

    /**
     * List activities asynchronously.
     * POST /api/thirdparty/treasury/activities
     *
     * @param authorizationId the resource access key
     * @param request the query request with pagination and filter parameters
     * @return CompletableFuture with PageResponse
     */
    @SuppressWarnings("unchecked")
    public CompletableFuture<PageResponse<TransactionResponse>> listActivitiesAsync(
            String authorizationId, Map<String, Object> request) {
        log.debug("Listing activities async with authorizationId: {}", authorizationId);

        Map<String, Object> business = new LinkedHashMap<>();
        if (request != null) {
            business.putAll(request);
        }

        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/activities";

        return httpClient.postAsync(url, jsonBody, new TypeReference<PageResponse<TransactionResponse>>() {});
    }

    /**
     * List fund records with pagination.
     * POST /api/thirdparty/treasury/fund-records
     *
     * @param authorizationId the resource access key
     * @param request the query request with pagination and filter parameters
     * @return PageResponse containing fund records
     */
    @SuppressWarnings("unchecked")
    public PageResponse<TransactionResponse> listFundRecords(String authorizationId,
                                                              Map<String, Object> request) {
        log.debug("Listing fund records with authorizationId: {}", authorizationId);

        Map<String, Object> business = new LinkedHashMap<>();
        if (request != null) {
            business.putAll(request);
        }

        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/fund-records";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, new TypeReference<PageResponse<TransactionResponse>>() {});
    }

    /**
     * List fund records asynchronously.
     * POST /api/thirdparty/treasury/fund-records
     *
     * @param authorizationId the resource access key
     * @param request the query request with pagination and filter parameters
     * @return CompletableFuture with PageResponse
     */
    @SuppressWarnings("unchecked")
    public CompletableFuture<PageResponse<TransactionResponse>> listFundRecordsAsync(
            String authorizationId, Map<String, Object> request) {
        log.debug("Listing fund records async with authorizationId: {}", authorizationId);

        Map<String, Object> business = new LinkedHashMap<>();
        if (request != null) {
            business.putAll(request);
        }

        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/fund-records";

        return httpClient.postAsync(url, jsonBody, new TypeReference<PageResponse<TransactionResponse>>() {});
    }

    /**
     * Submit a task (approval/rejection).
     * POST /api/thirdparty/treasury/submit-task/{taskId}
     *
     * @param authorizationId the resource access key
     * @param taskId the task ID to submit
     * @param request the submission request with signatures and confirmed flag
     * @return Map containing the submission result
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> submitTask(String authorizationId, String taskId,
                                           SubmitTaskRequest request) {
        log.debug("Submitting task with authorizationId: {}, taskId: {}",
                authorizationId, taskId);

        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/submit-task/" + taskId;
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, new TypeReference<Map<String, Object>>() {});
    }

    /**
     * Submit a task asynchronously.
     * POST /api/thirdparty/treasury/submit-task/{taskId}
     *
     * @param authorizationId the resource access key
     * @param taskId the task ID to submit
     * @param request the submission request
     * @return CompletableFuture with submission result
     */
    @SuppressWarnings("unchecked")
    public CompletableFuture<Map<String, Object>> submitTaskAsync(String authorizationId,
                                                                    String taskId,
                                                                    SubmitTaskRequest request) {
        log.debug("Submitting task async with authorizationId: {}, taskId: {}",
                authorizationId, taskId);

        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/submit-task/" + taskId;

        return httpClient.postAsync(url, jsonBody, new TypeReference<Map<String, Object>>() {});
    }

    /**
     * List unit-level fund records with pagination.
     * POST /api/thirdparty/treasury/unit-fund-records
     */
    @SuppressWarnings("unchecked")
    public PageResponse<Map<String, Object>> listUnitFundRecords(String authorizationId,
                                                                  Map<String, Object> request) {
        log.debug("Listing unit fund records with authorizationId: {}", authorizationId);

        Map<String, Object> business = new LinkedHashMap<>();
        if (request != null) {
            business.putAll(request);
        }

        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/unit-fund-records";
        return httpClient.post(url, jsonBody, new TypeReference<PageResponse<Map<String, Object>>>() {});
    }

    /**
     * List transfer-out orders with pagination.
     * POST /api/thirdparty/treasury/transfer-out-orders
     */
    @SuppressWarnings("unchecked")
    public PageResponse<Map<String, Object>> listTransferOutOrders(String authorizationId,
                                                                    Map<String, Object> request) {
        log.debug("Listing transfer-out orders with authorizationId: {}", authorizationId);

        Map<String, Object> business = new LinkedHashMap<>();
        if (request != null) {
            business.putAll(request);
        }

        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/transfer-out-orders";
        return httpClient.post(url, jsonBody, new TypeReference<PageResponse<Map<String, Object>>>() {});
    }

    /**
     * List transfer-in orders with pagination.
     * POST /api/thirdparty/treasury/transfer-in-orders
     */
    @SuppressWarnings("unchecked")
    public PageResponse<Map<String, Object>> listTransferInOrders(String authorizationId,
                                                                   Map<String, Object> request) {
        log.debug("Listing transfer-in orders with authorizationId: {}", authorizationId);

        Map<String, Object> business = new LinkedHashMap<>();
        if (request != null) {
            business.putAll(request);
        }

        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/transfer-in-orders";
        return httpClient.post(url, jsonBody, new TypeReference<PageResponse<Map<String, Object>>>() {});
    }
}
