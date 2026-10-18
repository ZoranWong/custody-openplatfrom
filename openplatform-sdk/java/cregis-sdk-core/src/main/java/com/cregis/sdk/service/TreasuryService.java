package com.cregis.sdk.service;

import com.cregis.sdk.core.config.SdkConfig;
import com.cregis.sdk.core.http.HttpClient;
import com.cregis.sdk.core.sign.Signer;
import com.cregis.sdk.dto.request.AddUnitCoinsRequest;
import com.cregis.sdk.dto.request.CreateCustomUnitRequest;
import com.cregis.sdk.dto.request.CreateTreasuryUnitRequest;
import com.cregis.sdk.dto.request.CreateUnitAddressRequest;
import com.cregis.sdk.dto.request.GetUnitAddressRequest;
import com.cregis.sdk.dto.request.ListTreasuryUnitsRequest;
import com.cregis.sdk.dto.request.PoolingRequest;
import com.cregis.sdk.dto.response.AuditTaskResponse;
import com.cregis.sdk.dto.response.PayoutResponse;
import com.cregis.sdk.dto.response.TreasuryUnitResponse;
import com.cregis.sdk.dto.response.UnitAccountResponse;
import com.cregis.sdk.dto.response.UnitAddressResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Treasury service - uses Resource signature (with authorizationId).
 * Handles treasury unit operations including creation, listing, and address management.
 */
@Slf4j
public class TreasuryService {

    private final SdkConfig config;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public TreasuryService(SdkConfig config, HttpClient httpClient) {
        this.config = config;
        this.httpClient = httpClient;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Create a treasury unit (创建财务单元).
     * POST /api/thirdparty/treasury/create
     */
    public TreasuryUnitResponse createTreasuryUnit(String authorizationId, CreateTreasuryUnitRequest request) {
        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/create";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, TreasuryUnitResponse.class);
    }

    public CompletableFuture<TreasuryUnitResponse> createTreasuryUnitAsync(String authorizationId, CreateTreasuryUnitRequest request) {
        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/create";
        return httpClient.postAsync(url, jsonBody, TreasuryUnitResponse.class);
    }

    /**
     * Create a custom treasury unit (创建自定义结构财务单元).
     * POST /api/thirdparty/treasury/create-custom
     */
    public TreasuryUnitResponse createCustomUnit(String authorizationId, CreateCustomUnitRequest request) {
        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/create-custom";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, TreasuryUnitResponse.class);
    }

    public CompletableFuture<TreasuryUnitResponse> createCustomUnitAsync(String authorizationId, CreateCustomUnitRequest request) {
        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/create-custom";
        return httpClient.postAsync(url, jsonBody, TreasuryUnitResponse.class);
    }

    /**
     * List treasury units (查询财务单元列表).
     * POST /api/thirdparty/treasury/list
     */
    public List<TreasuryUnitResponse> listTreasuryUnits(String authorizationId, ListTreasuryUnitsRequest request) {
        Map<String, Object> business = new LinkedHashMap<>();
        if (request != null) {
            if (request.getPageNum() != null) business.put("pageNum", request.getPageNum());
            if (request.getPageSize() != null) business.put("pageSize", request.getPageSize());
            if (request.getSortFields() != null) business.put("sortFields", request.getSortFields());
        }

        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/list";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, new TypeReference<List<TreasuryUnitResponse>>() {});
    }

    public CompletableFuture<List<TreasuryUnitResponse>> listTreasuryUnitsAsync(String authorizationId, ListTreasuryUnitsRequest request) {
        Map<String, Object> business = new LinkedHashMap<>();
        if (request != null) {
            if (request.getPageNum() != null) business.put("pageNum", request.getPageNum());
            if (request.getPageSize() != null) business.put("pageSize", request.getPageSize());
            if (request.getSortFields() != null) business.put("sortFields", request.getSortFields());
        }

        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/list";
        return httpClient.postAsync(url, jsonBody, new TypeReference<List<TreasuryUnitResponse>>() {});
    }

    /**
     * List unit accounts (查询账户列表).
     * POST /api/thirdparty/treasury/list-unit-account/{unitId}
     */
    public List<UnitAccountResponse> listUnitAccount(String authorizationId, Long unitId) {
        Map<String, Object> business = new LinkedHashMap<>();
        business.put("unitId", unitId);

        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/list-unit-account/" + unitId;
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, new TypeReference<List<UnitAccountResponse>>() {});
    }

    public CompletableFuture<List<UnitAccountResponse>> listUnitAccountAsync(String authorizationId, Long unitId) {
        Map<String, Object> business = new LinkedHashMap<>();
        business.put("unitId", unitId);

        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/list-unit-account/" + unitId;
        return httpClient.postAsync(url, jsonBody, new TypeReference<List<UnitAccountResponse>>() {});
    }

    /**
     * Create unit address by account type (创建地址).
     * POST /api/thirdparty/treasury/create-unit-address/{unitId}/{accountType}/{network}/{coinId}/{number}
     */
    public void createUnitAddress(String authorizationId, CreateUnitAddressRequest request) {
        Map<String, Object> business = new LinkedHashMap<>();
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/create-unit-address/"
                + request.getUnitId() + "/" + request.getAccountType() + "/"
                + request.getNetwork() + "/" + request.getCoinId() + "/" + request.getNumber();
        log.debug("POST {}", url);

        httpClient.post(url, jsonBody, Void.class);
    }

    public CompletableFuture<Void> createUnitAddressAsync(String authorizationId, CreateUnitAddressRequest request) {
        Map<String, Object> business = new LinkedHashMap<>();
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/create-unit-address/"
                + request.getUnitId() + "/" + request.getAccountType() + "/"
                + request.getNetwork() + "/" + request.getCoinId() + "/" + request.getNumber();
        return httpClient.postAsync(url, jsonBody, Void.class);
    }

    /**
     * Create unit address by account id (根据账户id创建地址).
     * POST /api/thirdparty/treasury/create-unit-address-by-account/{cusAccountId}/{number}
     */
    public void createUnitAddressByAccount(String authorizationId, Long cusAccountId, Integer number) {
        Map<String, Object> business = new LinkedHashMap<>();
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/create-unit-address-by-account/"
                + cusAccountId + "/" + number;
        log.debug("POST {}", url);

        httpClient.post(url, jsonBody, Void.class);
    }

    /**
     * Get unit addresses (查询单位地址).
     * POST /api/thirdparty/treasury/address
     */
    public List<UnitAddressResponse> getUnitAddress(String authorizationId, GetUnitAddressRequest request) {
        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/address";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, new TypeReference<List<UnitAddressResponse>>() {});
    }

    public CompletableFuture<List<UnitAddressResponse>> getUnitAddressAsync(String authorizationId, GetUnitAddressRequest request) {
        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/address";
        return httpClient.postAsync(url, jsonBody, new TypeReference<List<UnitAddressResponse>>() {});
    }

    /**
     * Get unit addresses by account id (根据账户id查询地址).
     * POST /api/thirdparty/treasury/address-by-account/{cusAccountId}
     */
    public List<UnitAddressResponse> getUnitAddressByAccount(String authorizationId, Long cusAccountId, GetUnitAddressRequest request) {
        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/address-by-account/" + cusAccountId;
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, new TypeReference<List<UnitAddressResponse>>() {});
    }

    /**
     * Pooling request (发起归集).
     * POST /api/thirdparty/treasury/pooling
     */
    public PayoutResponse pooling(String authorizationId, PoolingRequest request) {
        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/pooling";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, PayoutResponse.class);
    }

    /**
     * Add coins to unit (给财务单元添加币种/网络).
     * POST /api/thirdparty/treasury/add-coins
     */
    public List<AuditTaskResponse> addCoins(String authorizationId, AddUnitCoinsRequest request) {
        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/add-coins";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, new TypeReference<List<AuditTaskResponse>>() {});
    }

    public CompletableFuture<List<AuditTaskResponse>> addCoinsAsync(String authorizationId, AddUnitCoinsRequest request) {
        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/add-coins";
        return httpClient.postAsync(url, jsonBody, new TypeReference<List<AuditTaskResponse>>() {});
    }
}
