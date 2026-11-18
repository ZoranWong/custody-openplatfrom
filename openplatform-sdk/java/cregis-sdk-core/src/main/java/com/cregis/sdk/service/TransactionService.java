package com.cregis.sdk.service;

import com.cregis.sdk.core.config.SdkConfig;
import com.cregis.sdk.core.http.HttpClient;
import com.cregis.sdk.core.sign.Signer;
import com.cregis.sdk.dto.request.QueryRequest;
import com.cregis.sdk.dto.request.SubmitTaskRequest;
import com.cregis.sdk.dto.request.TaskDetailRequest;
import com.cregis.sdk.dto.request.TaskListRequest;
import com.cregis.sdk.dto.response.AuditTaskResponse;
import com.cregis.sdk.dto.response.FundRecordResponse;
import com.cregis.sdk.dto.response.PageResponse;
import com.cregis.sdk.dto.response.TransactionResponse;
import com.cregis.sdk.dto.response.UnitFundRecordResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;

import java.util.LinkedHashMap;
import java.util.List;
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
     * List activities (活动记录) with pagination.
     * POST /api/thirdparty/treasury/activities
     */
    public PageResponse<TransactionResponse> listActivities(String authorizationId, QueryRequest request) {
        Map<String, Object> business = toBusinessMap(request);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/activities";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, new TypeReference<PageResponse<TransactionResponse>>() {});
    }

    public CompletableFuture<PageResponse<TransactionResponse>> listActivitiesAsync(String authorizationId, QueryRequest request) {
        Map<String, Object> business = toBusinessMap(request);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/activities";
        return httpClient.postAsync(url, jsonBody, new TypeReference<PageResponse<TransactionResponse>>() {});
    }

    /**
     * List fund records (账户级资金流水) with pagination.
     * POST /api/thirdparty/treasury/fund-records
     */
    public PageResponse<FundRecordResponse> listFundRecords(String authorizationId, QueryRequest request) {
        Map<String, Object> business = toBusinessMap(request);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/fund-records";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, new TypeReference<PageResponse<FundRecordResponse>>() {});
    }

    public CompletableFuture<PageResponse<FundRecordResponse>> listFundRecordsAsync(String authorizationId, QueryRequest request) {
        Map<String, Object> business = toBusinessMap(request);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/fund-records";
        return httpClient.postAsync(url, jsonBody, new TypeReference<PageResponse<FundRecordResponse>>() {});
    }

    /**
     * List unit fund records (财务单元级资金流水) with pagination.
     * POST /api/thirdparty/treasury/unit-fund-records
     */
    public PageResponse<UnitFundRecordResponse> listUnitFundRecords(String authorizationId, QueryRequest request) {
        Map<String, Object> business = toBusinessMap(request);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/unit-fund-records";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, new TypeReference<PageResponse<UnitFundRecordResponse>>() {});
    }

    public CompletableFuture<PageResponse<UnitFundRecordResponse>> listUnitFundRecordsAsync(String authorizationId, QueryRequest request) {
        Map<String, Object> business = toBusinessMap(request);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/unit-fund-records";
        return httpClient.postAsync(url, jsonBody, new TypeReference<PageResponse<UnitFundRecordResponse>>() {});
    }

    /**
     * Submit a task (审批/拒绝) — returns void (backend returns empty data).
     * POST /api/thirdparty/treasury/submit-task/{taskId}
     */
    public void submitTask(String authorizationId, String taskId, SubmitTaskRequest request) {
        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/submit-task/" + taskId;
        log.debug("POST {}", url);

        httpClient.post(url, jsonBody, Void.class);
    }

    public CompletableFuture<Void> submitTaskAsync(String authorizationId, String taskId, SubmitTaskRequest request) {
        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/submit-task/" + taskId;
        return httpClient.postAsync(url, jsonBody, Void.class);
    }

    /**
     * List audit tasks (查询任务列表) with pagination.
     * POST /api/thirdparty/treasury/tasks (gateway forwards to custody GET /api/third-party/list/task/{resourceKey})
     */
    public PageResponse<AuditTaskResponse> listTasks(String authorizationId, TaskListRequest request) {
        Map<String, Object> business = toTaskListBusinessMap(request);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/tasks";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, new TypeReference<PageResponse<AuditTaskResponse>>() {});
    }

    public CompletableFuture<PageResponse<AuditTaskResponse>> listTasksAsync(String authorizationId, TaskListRequest request) {
        Map<String, Object> business = toTaskListBusinessMap(request);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/tasks";
        return httpClient.postAsync(url, jsonBody, new TypeReference<PageResponse<AuditTaskResponse>>() {});
    }

    private Map<String, Object> toTaskListBusinessMap(TaskListRequest request) {
        Map<String, Object> business = new LinkedHashMap<>();
        if (request == null) return business;
        if (request.getPageNum() != null) business.put("pageNum", request.getPageNum());
        if (request.getPageSize() != null) business.put("pageSize", request.getPageSize());
        if (request.getBusinessId() != null) business.put("businessId", request.getBusinessId());
        if (request.getTaskType() != null) business.put("taskType", request.getTaskType());
        if (request.getTaskId() != null) business.put("taskId", request.getTaskId());
        if (request.getState() != null) business.put("state", request.getState());
        return business;
    }

    /**
     * Query task detail (获取任务详情).
     * POST /api/thirdparty/task/detail (gateway forwards to custody GET /api/third-party/detail/task/{resourceKey}
     * and promotes business to query params)
     */
    public List<AuditTaskResponse> getTaskDetail(String authorizationId, TaskDetailRequest request) {
        Map<String, Object> business = toTaskDetailBusinessMap(request);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/task/detail";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, new TypeReference<List<AuditTaskResponse>>() {});
    }

    public CompletableFuture<List<AuditTaskResponse>> getTaskDetailAsync(String authorizationId, TaskDetailRequest request) {
        Map<String, Object> business = toTaskDetailBusinessMap(request);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/task/detail";
        return httpClient.postAsync(url, jsonBody, new TypeReference<List<AuditTaskResponse>>() {});
    }

    private Map<String, Object> toTaskDetailBusinessMap(TaskDetailRequest request) {
        Map<String, Object> business = new LinkedHashMap<>();
        if (request == null) return business;
        if (request.getBusinessId() != null) business.put("businessId", request.getBusinessId());
        if (request.getTaskType() != null) business.put("taskType", request.getTaskType());
        return business;
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
