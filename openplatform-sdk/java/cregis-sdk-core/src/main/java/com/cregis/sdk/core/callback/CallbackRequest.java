package com.cregis.sdk.core.callback;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

/**
 * Callback request received from the Cregis platform.
 *
 * Metadata (appId/event/timestamp/signature) is carried in HTTP headers, and the
 * HTTP body is the pure business data. This mirrors the unified webhook protocol:
 *
 * <pre>
 *   X-App-Id:       <appId>
 *   X-Timestamp:    <millis>
 *   X-Event:        <event type, optional>
 *   X-Signature:    sha256=<hex>
 *
 *   body: { ...business data... }
 * </pre>
 */
@Data
@Builder
public class CallbackRequest {
    /** Application ID (from X-App-Id header). */
    private String appId;
    /** Event type (from X-Event header, optional). */
    private String event;
    /** Unix timestamp in milliseconds (from X-Timestamp header). */
    private String timestamp;
    /** HMAC-SHA256 signature in hex (from X-Signature header). */
    private String signature;
    /** Business data payload (HTTP body). */
    private Map<String, Object> data;
}
