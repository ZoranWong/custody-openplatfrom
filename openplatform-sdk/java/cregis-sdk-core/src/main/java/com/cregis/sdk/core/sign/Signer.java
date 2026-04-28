package com.cregis.sdk.core.sign;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.*;

/**
 * Pure function signature class - stateless and thread-safe.
 * Implements the message signature algorithm for API authentication.
 *
 * Algorithm:
 *   Basic:    MD5(appSecret + appId + timestamp + nonce + MD5(sortedBusinessJSON))
 *   Resource: MD5(appSecret + appId + authorizationId + timestamp + nonce + MD5(sortedBusinessJSON))
 */
public final class Signer {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String NONCE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final int NONCE_LENGTH = 32;

    private Signer() {
        // Utility class
    }

    /**
     * Calculate Basic signature for OAuth endpoints.
     */
    public static String calculateBasicSignature(String appSecret, String appId, long timestamp,
                                                  String nonce, Map<String, Object> business) {
        String serializedBusiness = serializeWithSortedKeys(business);
        String businessMd5 = md5(serializedBusiness);
        String signString = appId + timestamp + nonce + businessMd5;
        return md5(appSecret + signString);
    }

    /**
     * Calculate Resource signature for third-party endpoints.
     */
    public static String calculateResourceSignature(String appSecret, String appId,
                                                     String authorizationId, long timestamp,
                                                     String nonce, Map<String, Object> business) {
        String serializedBusiness = serializeWithSortedKeys(business);
        String businessMd5 = md5(serializedBusiness);
        String signString = appId + authorizationId + timestamp + nonce + businessMd5;
        return md5(appSecret + signString);
    }

    /**
     * Recursively sort Map keys. Lists are passed through as-is, but nested Maps
     * within Lists are still sorted. Null values are filtered out.
     * This matches the Node.js sortKeys() behavior exactly.
     */
    @SuppressWarnings("unchecked")
    public static Map<String, Object> sortKeys(Map<String, Object> obj) {
        if (obj == null) {
            return new LinkedHashMap<>();
        }

        Map<String, Object> sorted = new LinkedHashMap<>();
        List<String> keys = new ArrayList<>(obj.keySet());
        Collections.sort(keys);

        for (String key : keys) {
            Object value = obj.get(key);
            if (value == null) {
                continue;
            }
            if (value instanceof Map<?, ?> mapValue) {
                sorted.put(key, sortKeys((Map<String, Object>) mapValue));
            } else if (value instanceof List<?> listValue) {
                sorted.put(key, processList(listValue));
            } else {
                sorted.put(key, value);
            }
        }

        return sorted;
    }

    @SuppressWarnings("unchecked")
    private static List<Object> processList(List<?> list) {
        List<Object> result = new ArrayList<>(list.size());
        for (Object item : list) {
            if (item instanceof Map<?, ?> mapItem) {
                result.add(sortKeys((Map<String, Object>) mapItem));
            } else if (item instanceof List<?> nestedList) {
                result.add(processList(nestedList));
            } else {
                result.add(item);
            }
        }
        return result;
    }

    /**
     * Serialize object to JSON with sorted keys.
     */
    public static String serializeWithSortedKeys(Map<String, Object> obj) {
        if (obj == null) {
            obj = new HashMap<>();
        }
        Map<String, Object> sorted = sortKeys(obj);
        try {
            return OBJECT_MAPPER.writeValueAsString(sorted);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to serialize business parameters", e);
        }
    }

    /**
     * Calculate MD5 hash of a string.
     */
    public static String md5(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return bytesToHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("MD5 algorithm not available", e);
        }
    }

    /**
     * Generate a random nonce using SecureRandom.
     * 32 characters from A-Za-z0-9, matching Node.js generateNonce() exactly.
     */
    public static String generateNonce() {
        StringBuilder result = new StringBuilder(NONCE_LENGTH);
        for (int i = 0; i < NONCE_LENGTH; i++) {
            result.append(NONCE_CHARS.charAt(SECURE_RANDOM.nextInt(NONCE_CHARS.length())));
        }
        return result.toString();
    }

    /**
     * Get current Unix timestamp in seconds (not milliseconds).
     */
    public static long getTimestamp() {
        return System.currentTimeMillis() / 1000;
    }

    /**
     * Build Basic Info for API request.
     */
    public static Map<String, Object> buildBasicInfo(String appId, String appSecret,
                                                      Map<String, Object> business) {
        long timestamp = getTimestamp();
        String nonce = generateNonce();
        String signature = calculateBasicSignature(appSecret, appId, timestamp, nonce, business);

        Map<String, Object> basic = new LinkedHashMap<>();
        basic.put("appId", appId);
        basic.put("timestamp", timestamp);
        basic.put("nonce", nonce);
        basic.put("signature", signature);
        return basic;
    }

    /**
     * Build Basic Info with Authorization for API request.
     */
    public static Map<String, Object> buildBasicInfoWithAuthorization(String appId, String appSecret,
                                                                       String authorizationId,
                                                                       Map<String, Object> business) {
        long timestamp = getTimestamp();
        String nonce = generateNonce();
        String signature = calculateResourceSignature(appSecret, appId, authorizationId, timestamp, nonce, business);

        Map<String, Object> basic = new LinkedHashMap<>();
        basic.put("appId", appId);
        basic.put("timestamp", timestamp);
        basic.put("nonce", nonce);
        basic.put("signature", signature);
        basic.put("authorizationId", authorizationId);
        return basic;
    }

    /**
     * Build the final request body: { "basic": {...}, "business": {...} }
     */
    public static String buildSignatureBody(Map<String, Object> basic, Map<String, Object> business) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("basic", basic);
        body.put("business", business);
        try {
            return OBJECT_MAPPER.writeValueAsString(body);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to build signature body", e);
        }
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
