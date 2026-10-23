package com.cregis.sdk;

import com.cregis.sdk.core.config.SdkConfig;
import com.cregis.sdk.core.error.CregisSdkException;
import jakarta.servlet.http.HttpServletRequest;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Proxy;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Full-protocol callback tests for {@link CregisClient#onCallback(HttpServletRequest, Map, CallbackHandler)}.
 *
 * Exercises timestamp replay protection, appId binding and event propagation
 * on top of the pure signature tests in {@link CallbackServiceTest}.
 *
 * The request is stubbed with a {@link Proxy} instead of a mocking framework or a
 * hand-written implementation: the servlet API evolves between releases (e.g.
 * {@code upgrade()} was added in 6.0), and a dynamic proxy compiles against any
 * version without listing every abstract method.
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

    /** Stub HTTP request that only answers header lookups; everything else is a default. */
    private static HttpServletRequest mockRequest(String appId, String timestamp,
                                                  String event, String signature) {
        Map<String, String> headers = new HashMap<>();
        headers.put("X-App-Id", appId);
        headers.put("X-Timestamp", timestamp);
        headers.put("X-Signature", signature);
        if (event != null) {
            headers.put("X-Event", event);
        }

        return (HttpServletRequest) Proxy.newProxyInstance(
                HttpServletRequest.class.getClassLoader(),
                new Class<?>[]{HttpServletRequest.class},
                (proxy, method, args) -> {
                    switch (method.getName()) {
                        case "getHeader":
                            return headers.get((String) args[0]);
                        case "getHeaders": {
                            String value = headers.get((String) args[0]);
                            return value == null ? Collections.emptyEnumeration()
                                    : Collections.enumeration(List.of(value));
                        }
                        case "getHeaderNames":
                            return Collections.enumeration(headers.keySet());
                        case "toString":
                            return "StubHttpServletRequest";
                        case "hashCode":
                            return System.identityHashCode(proxy);
                        case "equals":
                            return proxy == args[0];
                        default:
                            Class<?> returnType = method.getReturnType();
                            if (returnType == boolean.class) {
                                return false;
                            }
                            if (returnType == int.class) {
                                return 0;
                            }
                            if (returnType == long.class) {
                                return 0L;
                            }
                            return null;
                    }
                });
    }

    private static Map<String, Object> payload() {
        Map<String, Object> data = new HashMap<>();
        data.put("authorizeId", "123e4567-e89b-12d3-a456-426614174000");
        return data;
    }

    @Test
    @DisplayName("accepts a valid callback and reports the event name")
    void acceptsValidCallbackWithEvent() {
        String ts = String.valueOf(System.currentTimeMillis());
        Map<String, Object> data = payload();
        String sig = "sha256=" + sign(APP_ID, ts, "authorization.created", data);
        HttpServletRequest req = mockRequest(APP_ID, ts, "authorization.created", sig);

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
        HttpServletRequest req = mockRequest(APP_ID, ts, null, sig);

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
        HttpServletRequest req = mockRequest(otherAppId, ts, "authorization.created", sig);

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
        HttpServletRequest req = mockRequest(APP_ID, stale, "authorization.created", sig);

        CregisSdkException ex = assertThrows(CregisSdkException.class,
                () -> client().onCallback(req, data, (body, event) -> {}));
        assertTrue(ex.getMessage().toLowerCase().contains("timestamp"));
    }

    @Test
    @DisplayName("rejects a non-numeric timestamp")
    void rejectsMalformedTimestamp() {
        HttpServletRequest req = mockRequest(APP_ID, "not-a-number", null, "sha256=deadbeef");

        assertThrows(CregisSdkException.class,
                () -> client().onCallback(req, Map.of(), (body, event) -> {}));
    }

    @Test
    @DisplayName("honours a custom tolerance window")
    void honoursCustomTolerance() {
        String tenMinutesAgo = String.valueOf(System.currentTimeMillis() - 10 * 60 * 1000L);
        Map<String, Object> data = payload();
        String sig = "sha256=" + sign(APP_ID, tenMinutesAgo, "authorization.created", data);
        HttpServletRequest req = mockRequest(APP_ID, tenMinutesAgo, "authorization.created", sig);

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
        HttpServletRequest req = mockRequest(APP_ID, longAgo, null, sig);

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
        HttpServletRequest req = mockRequest(APP_ID, ts, "authorization.created", sig);

        assertThrows(CregisSdkException.class,
                () -> client().onCallback(req, tampered, (body, event) -> {}));
    }
}