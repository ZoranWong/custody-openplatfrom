package com.cregis.sdk.core.callback;

import com.cregis.sdk.core.sign.Signer;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Map;

/**
 * Callback Service — HMAC-SHA256 signature verification for callback messages
 * pushed from the Cregis platform to a developer server.
 *
 * <p>Signature algorithm (matches the Node SDK and gateway push implementation):
 * <pre>
 *   signData = appId + "." + [event] + "." + timestamp + "." + md5(sortedJSON(data))
 *   signature = HMAC-SHA256(appSecret, signData).toHex()
 * </pre>
 *
 * The {@code data} payload participates in the signature (via a sorted-key JSON
 * serialization followed by MD5), so callers can detect tampering of the body,
 * not just the appId/event/timestamp envelope.
 */
public class CallbackService {

    /**
     * Verify a callback signature using HMAC-SHA256 (constant-time comparison).
     *
     * @param appSecret application secret key
     * @param appId     application ID (UUID)
     * @param event     event type (optional)
     * @param timestamp Unix timestamp in milliseconds (string)
     * @param signature HMAC-SHA256 signature in hex format
     * @param data      event data payload (optional; participates in signature)
     * @return true if the signature is valid, false otherwise
     */
    public boolean verifySignature(String appSecret, String appId, String event,
                                   String timestamp, String signature,
                                   Map<String, Object> data) {
        if (signature == null) {
            return false;
        }
        String expected = buildSignature(appSecret, appId, event, timestamp, data);
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                signature.getBytes(StandardCharsets.UTF_8)
        );
    }

    /**
     * Build a callback signature (useful for testing).
     */
    public String buildSignature(String appSecret, String appId, String event,
                                 String timestamp, Map<String, Object> data) {
        StringBuilder signData = new StringBuilder(appId);
        if (event != null && !event.isEmpty()) {
            signData.append('.').append(event);
        }
        signData.append('.').append(timestamp);
        if (data != null) {
            signData.append('.').append(buildDataDigest(data));
        }
        return hmacSha256Hex(appSecret, signData.toString());
    }

    /**
     * Build a deterministic digest of the data payload: sorted-key JSON + MD5.
     */
    private String buildDataDigest(Map<String, Object> data) {
        String json = Signer.serializeWithSortedKeys(data);
        return Signer.md5(json);
    }

    private static String hmacSha256Hex(String secret, String message) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(message.getBytes(StandardCharsets.UTF_8));
            return bytesToHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("HMAC-SHA256 algorithm not available", e);
        } catch (java.security.InvalidKeyException e) {
            throw new IllegalArgumentException("Invalid HMAC key", e);
        }
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
