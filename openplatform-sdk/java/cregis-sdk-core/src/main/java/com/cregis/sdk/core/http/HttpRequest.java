package com.cregis.sdk.core.http;

import lombok.Data;

import java.util.HashMap;
import java.util.Map;

/**
 * HTTP request model.
 */
@Data
public class HttpRequest {

    private String method = "POST";

    private String url;

    private Map<String, String> headers = new HashMap<>();

    private String body;

    /**
     * Fluent builder for HttpRequest.
     */
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String method = "POST";
        private String url;
        private Map<String, String> headers = new HashMap<>();
        private String body;

        public Builder method(String method) {
            this.method = method;
            return this;
        }

        public Builder url(String url) {
            this.url = url;
            return this;
        }

        public Builder header(String key, String value) {
            this.headers.put(key, value);
            return this;
        }

        public Builder headers(Map<String, String> headers) {
            this.headers = headers;
            return this;
        }

        public Builder body(String body) {
            this.body = body;
            return this;
        }

        public HttpRequest build() {
            HttpRequest req = new HttpRequest();
            req.setMethod(this.method);
            req.setUrl(this.url);
            req.setHeaders(this.headers);
            req.setBody(this.body);
            return req;
        }
    }
}
