package com.cregis.sdk.core.http;

import com.cregis.sdk.core.error.CregisSdkException;
import com.fasterxml.jackson.core.type.TypeReference;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * HTTP client interface with both synchronous and asynchronous methods.
 */
public interface HttpClient {

    /**
     * Execute a synchronous HTTP request.
     */
    HttpResponse execute(HttpRequest request) throws CregisSdkException;

    /**
     * Execute an asynchronous HTTP request.
     */
    CompletableFuture<HttpResponse> executeAsync(HttpRequest request) throws CregisSdkException;

    /**
     * Send a POST request and parse the response.
     * Handles the { code, message, data, traceId } response format.
     */
    <T> T post(String url, String body, Class<T> responseType) throws CregisSdkException;

    /**
     * Send a POST request with TypeReference for generic type preservation.
     */
    <T> T post(String url, String body, TypeReference<T> typeRef) throws CregisSdkException;

    /**
     * Send a POST request asynchronously and parse the response.
     */
    <T> CompletableFuture<T> postAsync(String url, String body, Class<T> responseType) throws CregisSdkException;

    /**
     * Send a POST request asynchronously with TypeReference for generic type preservation.
     */
    <T> CompletableFuture<T> postAsync(String url, String body, TypeReference<T> typeRef) throws CregisSdkException;
}
