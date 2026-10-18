package com.cregis.sdk;

import com.cregis.sdk.core.callback.CallbackService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * CallbackService unit tests — HMAC-SHA256 signature verification (with data).
 */
class CallbackServiceTest {

    private static final String APP_ID = "550e8400-e29b-41d4-a716-446655440000";
    private static final String APP_SECRET = "test-secret-key";
    private static final String TIMESTAMP = "1745220600000";

    private final CallbackService service = new CallbackService();

    @Test
    @DisplayName("verifies a signature without event or data")
    void verifyWithoutEvent() {
        String sig = service.buildSignature(APP_SECRET, APP_ID, null, TIMESTAMP, null);
        assertTrue(service.verifySignature(APP_SECRET, APP_ID, null, TIMESTAMP, sig, null));
    }

    @Test
    @DisplayName("verifies a signature with event and data")
    void verifyWithEventAndData() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("taskId", "T-1");
        data.put("amount", "100");
        String sig = service.buildSignature(APP_SECRET, APP_ID, "transaction.completed", TIMESTAMP, data);
        assertTrue(service.verifySignature(APP_SECRET, APP_ID, "transaction.completed", TIMESTAMP, sig, data));
    }

    @Test
    @DisplayName("rejects tampered data (data participates in signature)")
    void rejectsTamperedData() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("taskId", "T-1");
        data.put("amount", "100");
        String sig = service.buildSignature(APP_SECRET, APP_ID, "transaction.completed", TIMESTAMP, data);

        Map<String, Object> tampered = new LinkedHashMap<>();
        tampered.put("taskId", "T-1");
        tampered.put("amount", "999");
        assertFalse(service.verifySignature(APP_SECRET, APP_ID, "transaction.completed", TIMESTAMP, sig, tampered));
    }

    @Test
    @DisplayName("rejects signature signed with wrong secret")
    void rejectsWrongSecret() {
        String sig = service.buildSignature("wrong-secret", APP_ID, null, TIMESTAMP, null);
        assertFalse(service.verifySignature(APP_SECRET, APP_ID, null, TIMESTAMP, sig, null));
    }

    @Test
    @DisplayName("data digest is order-independent (sorted keys)")
    void dataDigestOrderIndependent() {
        Map<String, Object> a = new LinkedHashMap<>();
        a.put("a", 1);
        a.put("b", 2);
        Map<String, Object> b = new LinkedHashMap<>();
        b.put("b", 2);
        b.put("a", 1);

        String sigA = service.buildSignature(APP_SECRET, APP_ID, null, TIMESTAMP, a);
        String sigB = service.buildSignature(APP_SECRET, APP_ID, null, TIMESTAMP, b);
        assertEquals(sigA, sigB);
    }
}
