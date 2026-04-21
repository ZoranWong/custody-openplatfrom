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
}

/**
 * Callback Service for signature verification
 */
export class CallbackService {
  /**
   * Verify callback signature using HMAC-SHA256
   *
   * Signature algorithm:
   * - With event:    HMAC-SHA256(appSecret, appId + "." + event + "." + timestamp)
   * - Without event: HMAC-SHA256(appSecret, appId + "." + timestamp)
   *
   * @param params - Verification parameters
   * @returns true if signature is valid, false otherwise
   */
  verifySignature(params: VerifySignatureParams): boolean {
    // Build signData based on whether event is present
    let signData = params.appId;
    if (params.event) {
      signData += '.' + params.event;
    }
    signData += '.' + params.timestamp;

    // Calculate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', params.appSecret)
      .update(signData)
      .digest('hex');

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
   * @returns HMAC-SHA256 signature in hex format
   */
  buildSignature(
    appSecret: string,
    appId: string,
    timestamp: string,
    event?: string
  ): string {
    let signData = appId;
    if (event) {
      signData += '.' + event;
    }
    signData += '.' + timestamp;

    return crypto
      .createHmac('sha256', appSecret)
      .update(signData)
      .digest('hex');
  }
}
