package com.cregis.sdk;

import com.cregis.sdk.core.sign.Signer;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Signer unit tests — offline, no network.
 * Golden values match the Node SDK (same algorithm).
 */
class SignerTest {

    private static final String APP_ID = "550e8400-e29b-41d4-a716-446655440000";
    private static final String APP_SECRET = "test-secret-key";
    private static final String AUTHORIZATION_ID = "123e4567-e89b-12d3-a456-426614174000";
    private static final long TIMESTAMP = 1742947200L;
    private static final String NONCE = "abc123def456";

    @Test
    @DisplayName("md5 of empty object JSON")
    void emptyBusinessMd5() {
        assertEquals("99914b932bd37a50b983c5e7c90ae93b", Signer.md5("{}"));
    }

    @Test
    @DisplayName("md5 of known string")
    void knownMd5() {
        assertEquals("a7353f7cddce808de0032747a0b7be50", Signer.md5("{\"key\":\"value\"}"));
    }

    @Test
    @DisplayName("Basic signature matches golden value")
    void basicSignatureGoldenValue() {
        Map<String, Object> business = Map.of("key", "value");
        String sig = Signer.calculateBasicSignature(APP_SECRET, APP_ID, TIMESTAMP, NONCE, business);
        assertEquals("41efb76d9da6762a71fa4e74b9b19065", sig);
    }

    @Test
    @DisplayName("Resource signature matches golden value and differs from basic")
    void resourceSignatureGoldenValue() {
        Map<String, Object> business = Map.of("key", "value");
        String basic = Signer.calculateBasicSignature(APP_SECRET, APP_ID, TIMESTAMP, NONCE, business);
        String resource = Signer.calculateResourceSignature(APP_SECRET, APP_ID, AUTHORIZATION_ID, TIMESTAMP, NONCE, business);
        assertEquals("6d9a8bf996f20f28c870f76c1394fdb6", resource);
        assertNotEquals(basic, resource);
    }

    @Test
    @DisplayName("signature is stable for identical inputs")
    void signatureStable() {
        Map<String, Object> business = Map.of("key", "value");
        assertEquals(
                Signer.calculateBasicSignature(APP_SECRET, APP_ID, TIMESTAMP, NONCE, business),
                Signer.calculateBasicSignature(APP_SECRET, APP_ID, TIMESTAMP, NONCE, business)
        );
    }

    @Test
    @DisplayName("sortKeys recursively sorts and filters nulls")
    void sortKeysRecursion() {
        Map<String, Object> input = new LinkedHashMap<>();
        input.put("zebra", "last");
        input.put("alpha", "first");
        input.put("nullValue", null);
        input.put("nested", Map.of("b", 2, "a", 1));

        Map<String, Object> sorted = Signer.sortKeys(input);
        assertEquals(List.of("alpha", "nested", "zebra"), new ArrayList<>(sorted.keySet()));
        assertFalse(sorted.containsKey("nullValue"));
    }

    @Test
    @DisplayName("nonce is 32-char alphanumeric")
    void nonceFormat() {
        String charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        String nonce = Signer.generateNonce();
        assertEquals(32, nonce.length());
        for (char c : nonce.toCharArray()) {
            assertTrue(charset.indexOf(c) >= 0);
        }
    }

    @Test
    @DisplayName("timestamp is Unix seconds")
    void timestampIsSeconds() {
        long ts = Signer.getTimestamp();
        long now = System.currentTimeMillis() / 1000;
        assertTrue(Math.abs(ts - now) <= 1);
    }

    @Test
    @DisplayName("buildBasicInfoWithAuthorization includes authorizationId")
    void buildResourceInfoIncludesAuthorizationId() {
        Map<String, Object> business = new LinkedHashMap<>();
        business.put("unitId", 1);
        Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                APP_ID, APP_SECRET, AUTHORIZATION_ID, business);
        assertEquals(AUTHORIZATION_ID, basic.get("authorizationId"));
        assertNotNull(basic.get("signature"));
    }
}
