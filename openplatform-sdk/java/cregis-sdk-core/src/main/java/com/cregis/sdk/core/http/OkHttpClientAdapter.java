package com.cregis.sdk.core.http;

import com.cregis.sdk.core.error.CregisSdkException;
import com.cregis.sdk.core.error.SdkErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.*;
import okio.BufferedSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

/**
 * Default OkHttp-based HTTP client implementation (synchronous + async).
 */
public class OkHttpClientAdapter implements HttpClient {

    private static final Logger log = LoggerFactory.getLogger(OkHttpClientAdapter.class);
    private static final long MAX_CONTENT_LENGTH = 10 * 1024 * 1024; // 10MB
    private static final MediaType JSON_MEDIA_TYPE = MediaType.parse("application/json; charset=utf-8");

    private final OkHttpClient okHttpClient;
    private final ObjectMapper objectMapper;

    public OkHttpClientAdapter(int connectTimeoutSeconds, int readTimeoutSeconds,
                                int maxIdleConnections, int maxIdleTimeSeconds) {
        this.objectMapper = new ObjectMapper();
        ConnectionPool connectionPool = new ConnectionPool(
                maxIdleConnections,
                maxIdleTimeSeconds,
                TimeUnit.SECONDS
        );

        this.okHttpClient = new OkHttpClient.Builder()
                .connectionPool(connectionPool)
                .connectTimeout(connectTimeoutSeconds, TimeUnit.SECONDS)
                .readTimeout(readTimeoutSeconds, TimeUnit.SECONDS)
                .build();
    }

    public OkHttpClientAdapter() {
        this(10, 30, 50, 300);
    }

    @Override
    public HttpResponse execute(HttpRequest request) throws CregisSdkException {
        Request.Builder reqBuilder = new Request.Builder()
                .url(request.getUrl());

        request.getHeaders().forEach(reqBuilder::header);

        if ("POST".equalsIgnoreCase(request.getMethod()) && request.getBody() != null) {
            reqBuilder.post(RequestBody.create(request.getBody(), JSON_MEDIA_TYPE));
        }

        Request httpRequest = reqBuilder.build();

        try (Response response = okHttpClient.newCall(httpRequest).execute()) {
            ResponseBody responseBody = response.body();
            String body = responseBody != null ? responseBody.string() : "";

            if (responseBody != null && responseBody.contentLength() > MAX_CONTENT_LENGTH) {
                throw new CregisSdkException(SdkErrorCode.HTTP_ERROR,
                        "Response body exceeds maximum size limit of " + MAX_CONTENT_LENGTH + " bytes");
            }

            Map<String, String> headers = new HashMap<>();
            for (String name : response.headers().names()) {
                headers.put(name, response.header(name));
            }

            return HttpResponse.builder()
                    .statusCode(response.code())
                    .headers(headers)
                    .body(body)
                    .build();
        } catch (IOException e) {
            throw new CregisSdkException(SdkErrorCode.HTTP_ERROR,
                    "HTTP request failed: " + e.getMessage(), e);
        }
    }

    @Override
    public CompletableFuture<HttpResponse> executeAsync(HttpRequest request) throws CregisSdkException {
        Request.Builder reqBuilder = new Request.Builder()
                .url(request.getUrl());

        request.getHeaders().forEach(reqBuilder::header);

        if ("POST".equalsIgnoreCase(request.getMethod()) && request.getBody() != null) {
            reqBuilder.post(RequestBody.create(request.getBody(), JSON_MEDIA_TYPE));
        }

        Request httpRequest = reqBuilder.build();
        CompletableFuture<HttpResponse> future = new CompletableFuture<>();

        okHttpClient.newCall(httpRequest).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                future.completeExceptionally(new CregisSdkException(SdkErrorCode.HTTP_ERROR,
                        "HTTP request failed: " + e.getMessage(), e));
            }

            @Override
            public void onResponse(Call call, Response response) {
                try (response) {
                    ResponseBody responseBody = response.body();
                    String body = responseBody != null ? responseBody.string() : "";

                    Map<String, String> headers = new HashMap<>();
                    for (String name : response.headers().names()) {
                        headers.put(name, response.header(name));
                    }

                    future.complete(HttpResponse.builder()
                            .statusCode(response.code())
                            .headers(headers)
                            .body(body)
                            .build());
                } catch (IOException e) {
                    future.completeExceptionally(new CregisSdkException(SdkErrorCode.HTTP_ERROR,
                            "Failed to read response: " + e.getMessage(), e));
                }
            }
        });

        return future;
    }

    @Override
    @SuppressWarnings("unchecked")
    public <T> T post(String url, String body, Class<T> responseType) throws CregisSdkException {
        HttpRequest request = HttpRequest.builder()
                .method("POST")
                .url(url)
                .header("Content-Type", "application/json")
                .body(body)
                .build();

        HttpResponse response = execute(request);
        return parseResponse(response, responseType);
    }

    @Override
    @SuppressWarnings("unchecked")
    public <T> CompletableFuture<T> postAsync(String url, String body, Class<T> responseType) throws CregisSdkException {
        HttpRequest request = HttpRequest.builder()
                .method("POST")
                .url(url)
                .header("Content-Type", "application/json")
                .body(body)
                .build();

        return executeAsync(request).thenApply(resp -> parseResponse(resp, responseType));
    }

    @Override
    @SuppressWarnings("unchecked")
    public <T> T post(String url, String body, TypeReference<T> typeRef) throws CregisSdkException {
        HttpRequest request = HttpRequest.builder()
                .method("POST")
                .url(url)
                .header("Content-Type", "application/json")
                .body(body)
                .build();

        HttpResponse response = execute(request);
        return parseResponse(response, typeRef);
    }

    @Override
    @SuppressWarnings("unchecked")
    public <T> CompletableFuture<T> postAsync(String url, String body, TypeReference<T> typeRef) throws CregisSdkException {
        HttpRequest request = HttpRequest.builder()
                .method("POST")
                .url(url)
                .header("Content-Type", "application/json")
                .body(body)
                .build();

        return executeAsync(request).thenApply(resp -> parseResponse(resp, typeRef));
    }

    @SuppressWarnings("unchecked")
    private <T> T parseResponse(HttpResponse response, Class<T> responseType) throws CregisSdkException {
        if (response.getStatusCode() >= 500) {
            throw new CregisSdkException(SdkErrorCode.API_ERROR,
                    "Server error: HTTP " + response.getStatusCode(),
                    response.getStatusCode());
        }

        try {
            JsonNode rootNode = objectMapper.readTree(response.getBody());
            int code = rootNode.has("code") ? rootNode.get("code").asInt() : -1;
            String message = rootNode.has("message") ? rootNode.get("message").asText() : "Unknown error";
            String traceId = rootNode.has("traceId") ? rootNode.get("traceId").asText() : null;

            // Code 0 or 200 means SUCCESS - don't throw exception
            if (code != 0 && code != 200) {
                throw CregisSdkException.fromApiResponse(code, message, response.getStatusCode(), traceId);
            }

            JsonNode dataNode = rootNode.get("data");
            if (dataNode == null || dataNode.isNull()) {
                if (responseType == Void.class || responseType == void.class) {
                    return null;
                }
                return (T) objectMapper.treeToValue(objectMapper.createObjectNode(), responseType);
            }

            return objectMapper.treeToValue(dataNode, responseType);
        } catch (JsonProcessingException e) {
            throw new CregisSdkException(SdkErrorCode.API_ERROR,
                    "Failed to parse response: " + e.getMessage(), e);
        }
    }

    @SuppressWarnings("unchecked")
    private <T> T parseResponse(HttpResponse response, TypeReference<T> typeRef) throws CregisSdkException {
        if (response.getStatusCode() >= 500) {
            throw new CregisSdkException(SdkErrorCode.API_ERROR,
                    "Server error: HTTP " + response.getStatusCode(),
                    response.getStatusCode());
        }

        try {
            JsonNode rootNode = objectMapper.readTree(response.getBody());
            int code = rootNode.has("code") ? rootNode.get("code").asInt() : -1;
            String message = rootNode.has("message") ? rootNode.get("message").asText() : "Unknown error";
            String traceId = rootNode.has("traceId") ? rootNode.get("traceId").asText() : null;

            // Code 0 or 200 means SUCCESS - don't throw exception
            if (code != 0 && code != 200) {
                throw CregisSdkException.fromApiResponse(code, message, response.getStatusCode(), traceId);
            }

            JsonNode dataNode = rootNode.get("data");
            if (dataNode == null || dataNode.isNull()) {
                return objectMapper.readValue("{}", objectMapper.constructType(typeRef.getType()));
            }

            return objectMapper.readValue(objectMapper.treeAsTokens(dataNode), objectMapper.constructType(typeRef.getType()));
        } catch (IOException e) {
            throw new CregisSdkException(SdkErrorCode.API_ERROR,
                    "Failed to parse response: " + e.getMessage(), e);
        }
    }
}
