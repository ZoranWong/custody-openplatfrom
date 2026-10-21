package com.cregis.sdk;

import com.cregis.sdk.core.callback.CallbackRequest;
import com.cregis.sdk.core.config.SdkConfig;
import com.cregis.sdk.core.error.CregisSdkException;
import com.cregis.sdk.core.sign.Signer;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Full-protocol callback tests for {@link CregisClient#onCallback}.
 *
 * Exercises timestamp replay protection, appId binding and event propagation
 * on top of the pure signature tests in {@link CallbackServiceTest}.
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

    private static CallbackRequest request(String appId, String timestamp, String event,
                                           Map<String, Object> data) {
        return CallbackRequest.builder()
                .appId(appId)
                .timestamp(timestamp)
                .event(event)
                .signature("sha256=" + sign(appId, timestamp, event, data))
                .data(data)
                .build();
    }

    private static Map<String, Object> payload() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("authorizeId", "123e4567-e89b-12d3-a456-426614174000");
        return data;
    }

    @Test
    @DisplayName("accepts a valid callback and reports the event name")
    void acceptsValidCallbackWithEvent() {
        String ts = String.valueOf(System.currentTimeMillis());
        Map<String, Object> data = payload();
        CallbackRequest req = request(APP_ID, ts, "authorization.created", data);

        AtomicReference<String> seenEvent = new AtomicReference<>();
        AtomicReference<Map<String, Object>> seenData = new AtomicReference<>();

        client().onCallback(req, (body, event) -> {
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
        CallbackRequest req = request(APP_ID, ts, null, payload());

        AtomicReference<String> seenEvent = new AtomicReference<>("sentinel");
        client().onCallback(req, (body, event) -> seenEvent.set(event));

        assertNull(seenEvent.get());
    }

    @Test
    @DisplayName("rejects a callback signed for a different appId")
    void rejectsForeignAppId() {
        String ts = String.valueOf(System.currentTimeMillis());
        String otherAppId = "11111111-1111-4111-8111-111111111111";
        CallbackRequest req = request(otherAppId, ts, "authorization.created", payload());

        CregisSdkException ex = assertThrows(CregisSdkException.class,
                () -> client().onCallback(req, (body, event) -> {}));
        assertTrue(ex.getMessage().contains("appId"));
    }

    @Test
    @DisplayName("rejects a stale timestamp (replay protection)")
    void rejectsStaleTimestamp() {
        String stale = String.valueOf(System.currentTimeMillis() - 10 * 60 * 1000L);
        CallbackRequest req = request(APP_ID, stale, "authorization.created", payload());

        CregisSdkException ex = assertThrows(CregisSdkException.class,
                () -> client().onCallback(req, (body, event) -> {}));
        assertTrue(ex.getMessage().toLowerCase().contains("timestamp"));
    }

    @Test
    @DisplayName("rejects a non-numeric timestamp")
    void rejectsMalformedTimestamp() {
        CallbackRequest req = CallbackRequest.builder()
                .appId(APP_ID)
                .timestamp("not-a-number")
                .signature("sha256=deadbeef")
                .data(payload())
                .build();

        assertThrows(CregisSdkException.class,
                () -> client().onCallback(req, (body, event) -> {}));
    }

    @Test
    @DisplayName("honours a custom tolerance window")
    void honoursCustomTolerance() {
        String tenMinutesAgo = String.valueOf(System.currentTimeMillis() - 10 * 60 * 1000L);
        CallbackRequest req = request(APP_ID, tenMinutesAgo, "authorization.created", payload());

        AtomicReference<Map<String, Object>> seen = new AtomicReference<>();
        clientWithTolerance(15 * 60 * 1000L).onCallback(req, (body, event) -> seen.set(body));

        assertEquals(payload(), seen.get());
    }

    @Test
    @DisplayName("skips the replay window when tolerance is 0")
    void skipsWindowWhenToleranceDisabled() {
        String longAgo = String.valueOf(System.currentTimeMillis() - 24 * 60 * 60 * 1000L);
        CallbackRequest req = request(APP_ID, longAgo, null, payload());

        AtomicReference<Map<String, Object>> seen = new AtomicReference<>();
        clientWithTolerance(0).onCallback(req, (body, event) -> seen.set(body));

        assertNotNull(seen.get());
    }

    @Test
    @DisplayName("rejects tampered payload")
    void rejectsTamperedPayload() {
        String ts = String.valueOf(System.currentTimeMillis());
        Map<String, Object> original = payload();
        CallbackRequest req = CallbackRequest.builder()
                .appId(APP_ID)
                .timestamp(ts)
                .event("authorization.created")
                .signature("sha256=" + sign(APP_ID, ts, "authorization.created", original))
                .data(Map.of("authorizeId", "tampered"))
                .build();

        assertThrows(CregisSdkException.class,
                () -> client().onCallback(req, (body, event) -> {}));
    }
}
