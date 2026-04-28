package com.cregis.sdk.core.http;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

/**
 * HTTP response model.
 */
@Data
@Builder
public class HttpResponse {

    private int statusCode;

    private Map<String, String> headers;

    private String body;
}
