package com.cregis.sdk.service;

import com.cregis.sdk.core.config.SdkConfig;
import com.cregis.sdk.core.http.HttpClient;
import com.cregis.sdk.core.sign.Signer;
import com.cregis.sdk.dto.request.GetAuthorizationUrlRequest;
import com.cregis.sdk.dto.request.VerifyOAuthTokenRequest;
import com.cregis.sdk.dto.response.AuthorizationResponse;
import lombok.extern.slf4j.Slf4j;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * OAuth service - uses Basic signature (no authorizationId).
 * Handles OAuth authorization URL generation and token verification.
 */
@Slf4j
public class OAuthService {

    private final SdkConfig config;
    private final HttpClient httpClient;

    public OAuthService(SdkConfig config, HttpClient httpClient) {
        this.config = config;
        this.httpClient = httpClient;
    }

    /**
     * Get authorization URL for OAuth flow.
     * POST /api/thirdparty/oauth/authorizeUrl
     */
    public AuthorizationResponse getAuthorizationUrl(GetAuthorizationUrlRequest request) {
        Map<String, Object> business = new LinkedHashMap<>();
        business.put("permissions", request.getPermissions());
        business.put("state", request.getState());
        if (request.getCallback() != null) {
            business.put("callback", request.getCallback());
        }
        if (request.getToken() != null) {
            business.put("token", request.getToken());
        }

        Map<String, Object> basic = Signer.buildBasicInfo(config.getAppId(), config.getAppSecret(), business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/oauth/authorizeUrl";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, AuthorizationResponse.class);
    }

    /**
     * Get authorization URL asynchronously.
     * POST /api/thirdparty/oauth/authorizeUrl
     */
    public CompletableFuture<AuthorizationResponse> getAuthorizationUrlAsync(GetAuthorizationUrlRequest request) {
        Map<String, Object> business = new LinkedHashMap<>();
        business.put("permissions", request.getPermissions());
        business.put("state", request.getState());
        if (request.getCallback() != null) {
            business.put("callback", request.getCallback());
        }
        if (request.getToken() != null) {
            business.put("token", request.getToken());
        }

        Map<String, Object> basic = Signer.buildBasicInfo(config.getAppId(), config.getAppSecret(), business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/oauth/authorizeUrl";

        return httpClient.postAsync(url, jsonBody, AuthorizationResponse.class);
    }

    /**
     * Verify OAuth token.
     * POST /api/thirdparty/oauth/verify
     */
    public AuthorizationResponse verifyOAuthToken(VerifyOAuthTokenRequest request) {
        log.debug("Verifying OAuth token");

        Map<String, Object> business = new LinkedHashMap<>();
        business.put("oauthToken", request.getOauthToken());

        Map<String, Object> basic = Signer.buildBasicInfo(config.getAppId(), config.getAppSecret(), business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/oauth/verify";
        log.debug("POST {}", url);

        return httpClient.post(url, jsonBody, AuthorizationResponse.class);
    }

    /**
     * Verify OAuth token asynchronously.
     * POST /api/thirdparty/oauth/verify
     */
    public CompletableFuture<AuthorizationResponse> verifyOAuthTokenAsync(VerifyOAuthTokenRequest request) {
        log.debug("Verifying OAuth token async");

        Map<String, Object> business = new LinkedHashMap<>();
        business.put("oauthToken", request.getOauthToken());

        Map<String, Object> basic = Signer.buildBasicInfo(config.getAppId(), config.getAppSecret(), business);
        String jsonBody = Signer.buildSignatureBody(basic, business);

        String url = config.getBaseUrl() + "/api/thirdparty/oauth/verify";

        return httpClient.postAsync(url, jsonBody, AuthorizationResponse.class);
    }
}
