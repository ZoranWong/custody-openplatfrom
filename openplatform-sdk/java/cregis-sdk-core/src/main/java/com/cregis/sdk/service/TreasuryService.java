package com.cregis.sdk.service;

import com.cregis.sdk.core.config.SdkConfig;
import com.cregis.sdk.core.http.HttpClient;
import com.cregis.sdk.core.sign.Signer;
import com.cregis.sdk.dto.request.CreateTreasuryUnitRequest;
import com.cregis.sdk.dto.request.GetTreasuryUnitRequest;
import com.cregis.sdk.dto.request.ListTreasuryUnitsRequest;
import com.cregis.sdk.dto.response.PageResponse;
import com.cregis.sdk.dto.response.TreasuryUnitResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Treasury Unit service - uses Resource signature (with authorizationId).
 * Handles creation, listing, and address retrieval of treasury units.
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
     * Create a new treasury unit.
     * POST /api/thirdparty/treasury/create
     */
    public TreasuryUnitResponse createUnit(String authorizationId, CreateTreasuryUnitRequest request) {
        log.debug("Creating treasury unit with authorizationId: {}", authorizationId);

        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/create";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, TreasuryUnitResponse.class);
    }

    /**
     * Create a new treasury unit asynchronously.
     * POST /api/thirdparty/treasury/create
     */
    public CompletableFuture<TreasuryUnitResponse> createUnitAsync(String authorizationId,
                                                                    CreateTreasuryUnitRequest request) {
        log.debug("Creating treasury unit async with authorizationId: {}", authorizationId);

        Map<String, Object> business = objectMapper.convertValue(request, Map.class);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/create";

        return httpClient.postAsync(url, jsonBody, TreasuryUnitResponse.class);
    }

    /**
     * List treasury units.
     * Backend returns: array of treasury units (not paginated).
     * POST /api/thirdparty/treasury/list
     */
    public List<TreasuryUnitResponse> listUnits(String authorizationId,
                                                         ListTreasuryUnitsRequest request) {
        log.debug("Listing treasury units with authorizationId: {}", authorizationId);

        Map<String, Object> business = new LinkedHashMap<>();
        if (request.getPageNum() != null) {
            business.put("pageNum", request.getPageNum());
        }
        if (request.getPageSize() != null) {
            business.put("pageSize", request.getPageSize());
        }
        if (request.getBusinessScope() != null) {
            business.put("businessScope", request.getBusinessScope());
        }

        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/list";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, new TypeReference<List<TreasuryUnitResponse>>() {});
    }

    /**
     * List treasury units asynchronously.
     * POST /api/thirdparty/treasury/list
     */
    public CompletableFuture<List<TreasuryUnitResponse>> listUnitsAsync(String authorizationId,
                                                                                  ListTreasuryUnitsRequest request) {
        log.debug("Listing treasury units async with authorizationId: {}", authorizationId);

        Map<String, Object> business = new LinkedHashMap<>();
        if (request.getPageNum() != null) {
            business.put("pageNum", request.getPageNum());
        }
        if (request.getPageSize() != null) {
            business.put("pageSize", request.getPageSize());
        }
        if (request.getBusinessScope() != null) {
            business.put("businessScope", request.getBusinessScope());
        }

        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/list";

        return httpClient.postAsync(url, jsonBody, new TypeReference<List<TreasuryUnitResponse>>() {});
    }

    /**
     * Get treasury unit addresses.
     * Backend returns: array of address objects.
     * POST /api/thirdparty/treasury/address
     */
    public List<Map> getUnitAddress(String authorizationId, GetTreasuryUnitRequest request) {
        log.debug("Getting treasury unit address with authorizationId: {}, unitId: {}",
                authorizationId, request.getUnitId());

        Map<String, Object> business = objectMapper.convertValue(request, Map.class);

        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/address";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, new TypeReference<List<Map>>() {});
    }

    /**
     * Get treasury unit addresses asynchronously.
     * POST /api/thirdparty/treasury/address
     */
    public CompletableFuture<List<Map>> getUnitAddressAsync(String authorizationId,
                                                                      GetTreasuryUnitRequest request) {
        log.debug("Getting treasury unit address async with authorizationId: {}, unitId: {}",
                authorizationId, request.getUnitId());

        Map<String, Object> business = objectMapper.convertValue(request, Map.class);

        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                config.getAppId(), config.getAppSecret(), authorizationId, business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/treasury/address";

        return httpClient.postAsync(url, jsonBody, new TypeReference<List<Map>>() {});
    }
}
