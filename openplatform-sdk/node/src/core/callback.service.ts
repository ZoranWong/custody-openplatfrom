/**
 * Cregis OpenPlatform SDK - Callback Service
 *
 * Handles signature verification for callback messages from Cregis platform.
 * Supports two callback scenarios:
 * - Business parameter callback: signature based on appId + "." + timestamp
 * - Global Application callback: signature based on appId + "." + event + "." + timestamp
 */

import crypto from 'crypto';

/**
 * Parameters for callback signature verification
 */
export interface VerifySignatureParams {
  /** Application secret key */
  appSecret: string;
  /** Application ID (UUID) */
  appId: string;
  /** Event type (present for global Application callbacks, absent for business parameter callbacks) */
  event?: string;
  /** Unix timestamp in milliseconds (string) */
  timestamp: string;
  /** HMAC-SHA256 signature in hex format */
  signature: string;
  /** Event data payload (participates in signature for integrity) */
  data?: Record<string, unknown>;
}

/**
 * Callback Service for signature verification
 */
export class CallbackService {
  /**
   * Verify callback signature using HMAC-SHA256
   *
   * Signature algorithm:
   * - With event + data:    HMAC-SHA256(appSecret, appId + "." + event + "." + timestamp + "." + md5(sortedJSON(data)))
   * - Without event + data: HMAC-SHA256(appSecret, appId + "." + timestamp + "." + md5(sortedJSON(data)))
   *
   * @param params - Verification parameters
   * @returns true if signature is valid, false otherwise
   */
  verifySignature(params: VerifySignatureParams): boolean {
    const expectedSignature = this.buildSignature(
      params.appSecret,
      params.appId,
      params.timestamp,
      params.event,
      params.data,
    );

    // Use timingSafeEqual to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedSignature);
    const actualBuffer = Buffer.from(params.signature);

    // Buffers must be the same length for timingSafeEqual
    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  }

  /**
   * Build callback signature (useful for testing)
   *
   * @param appSecret - Application secret key
   * @param appId - Application ID
   * @param timestamp - Unix timestamp in milliseconds
   * @param event - Optional event type
   * @param data - Optional event data payload
   * @returns HMAC-SHA256 signature in hex format
   */
  buildSignature(
    appSecret: string,
    appId: string,
    timestamp: string,
    event?: string,
    data?: Record<string, unknown>
  ): string {
    let signData = appId;
    if (event) {
      signData += '.' + event;
    }
    signData += '.' + timestamp;
    if (data !== undefined) {
      signData += '.' + this.buildDataDigest(data);
    }

    return crypto
      .createHmac('sha256', appSecret)
      .update(signData)
      .digest('hex');
  }

  /**
   * Build a deterministic digest of the data payload for signature inclusion.
   * Sorted-key JSON serialization + MD5, matching the server-side implementation.
   */
  private buildDataDigest(data: Record<string, unknown>): string {
    const sorted = sortObjectKeys(data);
    return crypto.createHash('md5').update(JSON.stringify(sorted)).digest('hex');
  }
}

/**
 * Recursively sort object keys for deterministic JSON serialization.
 */
function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sortObjectKeys(item));
  }
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}
