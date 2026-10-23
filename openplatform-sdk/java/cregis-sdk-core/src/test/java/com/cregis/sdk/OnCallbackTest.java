package com.cregis.sdk;

import com.cregis.sdk.core.callback.CallbackHandler;
import com.cregis.sdk.core.config.SdkConfig;
import com.cregis.sdk.core.error.CregisSdkException;
import com.cregis.sdk.core.sign.Signer;
import jakarta.servlet.http.HttpServletRequest;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.BufferedReader;
import java.io.StringReader;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Full-protocol callback tests for {@link CregisClient#onCallback(HttpServletRequest, Map, CallbackHandler)}.
 *
 * Exercises timestamp replay protection, appId binding and event propagation
 * on top of the pure signature tests in {@link CallbackServiceTest}.
 *
 * Uses a stub implementation of HttpServletRequest rather than a mocking framework
 * to avoid ByteBuddy/inline-mock issues on newer JDKs.
 */
class OnCallbackTest {

    private static final String APP_ID = "550e8400-e29b-41d4-a716-446655440000";
    private static final String APP_SECRET = "test-secret-key";

    private static CregisClient client() {
        return new CregisClient(SdkConfig.builder()
                .appId(APP_ID)
                .appSecret(APP_SECRET)
                .baseUrl("http://localhost")
                .build());
    }

    private static CregisClient clientWithTolerance(long toleranceMs) {
        return new CregisClient(SdkConfig.builder()
                .appId(APP_ID)
                .appSecret(APP_SECRET)
                .baseUrl("http://localhost")
                .callbackTimestampToleranceMs(toleranceMs)
                .build());
    }

    private static String sign(String appId, String timestamp, String event, Map<String, Object> data) {
        return new com.cregis.sdk.core.callback.CallbackService()
                .buildSignature(APP_SECRET, appId, event, timestamp, data);
    }

    /** Minimal HttpServletRequest stub for testing. */
    private static final class StubRequest implements HttpServletRequest {
        private final Map<String, String> headers = new HashMap<>();
        private final String body;

        StubRequest(String appId, String timestamp, String event, String signature, String body) {
            headers.put("X-App-Id", appId);
            headers.put("X-Timestamp", timestamp);
            headers.put("X-Signature", signature);
            if (event != null) headers.put("X-Event", event);
            this.body = body;
        }

        @Override public String getHeader(String name) { return headers.get(name); }
        @Override public BufferedReader getReader() { return new BufferedReader(new StringReader(body)); }

        // --- boilerplate stubs (not used by onCallback) ---
        @Override public String getAuthType() { return null; }
        @Override public java.util.Enumeration<String> getHeaderNames() { return Collections.enumeration(headers.keySet()); }
        @Override public java.util.Map<String, String[]> getParameterMap() { return Collections.emptyMap(); }
        @Override public java.util.Enumeration<String> getParameterNames() { return Collections.emptyEnumeration(); }
        @Override public String[] getParameterValues(String name) { return null; }
        @Override public String getParameter(String name) { return null; }
        @Override public String getCharacterEncoding() { return null; }
        @Override public void setCharacterEncoding(String env) {}
        @Override public int getContentLength() { return body.length(); }
        @Override public long getContentLengthLong() { return body.length(); }
        @Override public String getContentType() { return "application/json"; }
        @Override public java.io.InputStream getInputStream() { return new java.io.ByteArrayInputStream(body.getBytes(java.nio.charset.StandardCharsets.UTF_8)); }
        @Override public String getProtocol() { return "HTTP/1.1"; }
        @Override public String getScheme() { return "http"; }
        @Override public String getServerName() { return "localhost"; }
        @Override public int getServerPort() { return 8080; }
        @Override public java.io.PrintWriter getWriter() { return null; }
        @Override public String getRemoteAddr() { return "127.0.0.1"; }
        @Override public String getRemoteHost() { return "localhost"; }
        @Override public void setAttribute(String name, Object o) {}
        @Override public String getAttribute(String name) { return null; }
        @Override public void removeAttribute(String name) {}
        @Override public boolean isSecure() { return false; }
        @Override public java.util.Locale getLocale() { return java.util.Locale.getDefault(); }
        @Override public java.util.Enumeration<java.util.Locale> getLocales() { return Collections.enumeration(Collections.singletonList(java.util.Locale.getDefault())); }
        @Override public boolean isUserInRole(String role) { return false; }
        @Override public java.security.Principal getUserPrincipal() { return null; }
        @Override public String getRemoteUser() { return null; }
        @Override public String getContextPath() { return ""; }
        @Override public jakarta.servlet.http.HttpSession getSession(boolean create) { return null; }
        @Override public jakarta.servlet.http.HttpSession getSession() { return null; }
        @Override public String changeSessionId() { return null; }
        @Override public String getRequestedSessionId() { return null; }
        @Override public jakarta.servlet.http.Cookie[] getCookies() { return new jakarta.servlet.http.Cookie[0]; }
        @Override public String getMethod() { return "POST"; }
        @Override public String getPathInfo() { return null; }
        @Override public String getPathTranslated() { return null; }
        @Override public String getQueryString() { return null; }
        @Override public boolean isRequestedSessionIdValid() { return false; }
        @Override public boolean isRequestedSessionIdFromCookie() { return false; }
        @Override public boolean isRequestedSessionIdFromURL() { return false; }
        @Override public String getRequestURI() { return "/callback"; }
        @Override public StringBuffer getRequestURL() { return new StringBuffer("http://localhost/callback"); }
        @Override public String getServletPath() { return ""; }
        @Override public String getLocalName() { return "localhost"; }
        @Override public String getLocalAddr() { return "127.0.0.1"; }
        @Override public int getLocalPort() { return 8080; }
        @Override public int getRemotePort() { return 12345; }
        @Override public jakarta.servlet.ServletContext getServletContext() { return null; }
        @Override public java.util.Map<String, String> getTrailerFields() { return Collections.emptyMap(); }
        @Override public boolean isTrailerFieldsReady() { return true; }
        @Override public long getDateHeader(String name) { return -1; }
        @Override public java.util.Enumeration<String> getHeaders(String name) { String v = headers.get(name); return v != null ? Collections.enumeration(Collections.singletonList(v)) : Collections.emptyEnumeration(); }
        @Override public int getIntHeader(String name) { return -1; }
        @Override public String getRealPath(String path) { return null; }
    }

    private static Map<String, Object> payload() {
        Map<String, Object> data = new HashMap<>();
        data.put("authorizeId", "123e4567-e89b-12d3-a456-426614174000");
        return data;
    }

    private static String json(Map<String, Object> data) {
        return Signer.serializeWithSortedKeys(data);
    }

    @Test
    @DisplayName("accepts a valid callback and reports the event name")
    void acceptsValidCallbackWithEvent() {
        String ts = String.valueOf(System.currentTimeMillis());
        Map<String, Object> data = payload();
        String sig = "sha256=" + sign(APP_ID, ts, "authorization.created", data);
        HttpServletRequest req = new StubRequest(APP_ID, ts, "authorization.created", sig, json(data));

        AtomicReference<String> seenEvent = new AtomicReference<>();
        AtomicReference<Map<String, Object>> seenData = new AtomicReference<>();

        client().onCallback(req, data, (body, event) -> {
            seenData.set(body);
            seenEvent.set(event);
        });

        assertEquals(data, seenData.get());
        assertEquals("authorization.created", seenEvent.get());
    }

    @Test
    @DisplayName("passes null event when X-Event is absent")
    void acceptsCallbackWithoutEvent() {
        String ts = String.valueOf(System.currentTimeMillis());
        Map<String, Object> data = payload();
        String sig = "sha256=" + sign(APP_ID, ts, null, data);
        HttpServletRequest req = new StubRequest(APP_ID, ts, null, sig, json(data));

        AtomicReference<String> seenEvent = new AtomicReference<>("sentinel");
        client().onCallback(req, data, (body, event) -> seenEvent.set(event));

        assertNull(seenEvent.get());
    }

    @Test
    @DisplayName("rejects a callback signed for a different appId")
    void rejectsForeignAppId() {
        String ts = String.valueOf(System.currentTimeMillis());
        String otherAppId = "11111111-1111-4111-8111-111111111111";
        Map<String, Object> data = payload();
        String sig = "sha256=" + sign(otherAppId, ts, "authorization.created", data);
        HttpServletRequest req = new StubRequest(otherAppId, ts, "authorization.created", sig, json(data));

        CregisSdkException ex = assertThrows(CregisSdkException.class,
                () -> client().onCallback(req, data, (body, event) -> {}));
        assertTrue(ex.getMessage().contains("appId"));
    }

    @Test
    @DisplayName("rejects a stale timestamp (replay protection)")
    void rejectsStaleTimestamp() {
        String stale = String.valueOf(System.currentTimeMillis() - 10 * 60 * 1000L);
        Map<String, Object> data = payload();
        String sig = "sha256=" + sign(APP_ID, stale, "authorization.created", data);
        HttpServletRequest req = new StubRequest(APP_ID, stale, "authorization.created", sig, json(data));

        CregisSdkException ex = assertThrows(CregisSdkException.class,
                () -> client().onCallback(req, data, (body, event) -> {}));
        assertTrue(ex.getMessage().toLowerCase().contains("timestamp"));
    }

    @Test
    @DisplayName("rejects a non-numeric timestamp")
    void rejectsMalformedTimestamp() {
        HttpServletRequest req = new StubRequest(APP_ID, "not-a-number", null, "sha256=deadbeef", "{}");

        assertThrows(CregisSdkException.class,
                () -> client().onCallback(req, Map.of(), (body, event) -> {}));
    }

    @Test
    @DisplayName("honours a custom tolerance window")
    void honoursCustomTolerance() {
        String tenMinutesAgo = String.valueOf(System.currentTimeMillis() - 10 * 60 * 1000L);
        Map<String, Object> data = payload();
        String sig = "sha256=" + sign(APP_ID, tenMinutesAgo, "authorization.created", data);
        HttpServletRequest req = new StubRequest(APP_ID, tenMinutesAgo, "authorization.created", sig, json(data));

        AtomicReference<Map<String, Object>> seen = new AtomicReference<>();
        clientWithTolerance(15 * 60 * 1000L).onCallback(req, data, (body, event) -> seen.set(body));

        assertEquals(data, seen.get());
    }

    @Test
    @DisplayName("skips the replay window when tolerance is 0")
    void skipsWindowWhenToleranceDisabled() {
        String longAgo = String.valueOf(System.currentTimeMillis() - 24 * 60 * 60 * 1000L);
        Map<String, Object> data = payload();
        String sig = "sha256=" + sign(APP_ID, longAgo, null, data);
        HttpServletRequest req = new StubRequest(APP_ID, longAgo, null, sig, json(data));

        AtomicReference<Map<String, Object>> seen = new AtomicReference<>();
        clientWithTolerance(0).onCallback(req, data, (body, event) -> seen.set(body));

        assertNotNull(seen.get());
    }

    @Test
    @DisplayName("rejects tampered payload")
    void rejectsTamperedPayload() {
        String ts = String.valueOf(System.currentTimeMillis());
        Map<String, Object> original = payload();
        Map<String, Object> tampered = Map.of("authorizeId", "tampered");
        String sig = "sha256=" + sign(APP_ID, ts, "authorization.created", original);
        HttpServletRequest req = new StubRequest(APP_ID, ts, "authorization.created", sig, json(tampered));

        assertThrows(CregisSdkException.class,
                () -> client().onCallback(req, tampered, (body, event) -> {}));
    }
}
