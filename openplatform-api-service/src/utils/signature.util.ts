import * as crypto from 'crypto';

/**
 * Signature parameters for HMAC computation
 */
export interface SignatureParams {
  appid: string;
  nonce: string;
  timestamp: number;
  method: string;
  path: string;
  body: string;
}

/**
 * Error codes for signature verification
 */
export enum SignatureErrorCode {
  MISSING_HEADERS = 40101,
  INVALID_SIGNATURE = 40102,
  EXPIRED_TIMESTAMP = 40103,
  DUPLICATE_NONCE = 40104,
}

/**
 * Computes HMAC-SHA256 signature for request authentication
 *
 * @param secretKey - The application secret key
 * @param params - Signature parameters containing request details
 * @returns Hex-encoded HMAC-SHA256 signature
 */
export function computeSignature(secretKey: string, params: SignatureParams): string {
  const signString = buildSignString(params);
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(signString, 'utf8');
  return hmac.digest('hex');
}

/**
 * Verifies if the provided signature matches the computed signature
 *
 * @param secretKey - The application secret key
 * @param providedSign - The signature provided by the client
 * @param params - Signature parameters containing request details
 * @returns true if signatures match, false otherwise
 */
export function verifySignature(
  secretKey: string,
  providedSign: string,
  params: SignatureParams
): boolean {
  const expectedSign = computeSignature(secretKey, params);
  const providedBuffer = Buffer.from(providedSign, 'hex');
  const expectedBuffer = Buffer.from(expectedSign, 'hex');

  // Timing-safe comparison only works with same-length buffers
  if (providedBuffer.length !== expectedBuffer.length) {
    // Perform a comparison to maintain constant time
    // but return false since lengths differ
    crypto.timingSafeEqual(expectedBuffer, expectedBuffer);
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

/**
 * Validates if the timestamp is within the allowed time window
 *
 * @param timestamp - Unix timestamp in seconds
 * @param windowSeconds - Maximum allowed age in seconds (default: 300 = 5 minutes)
 * @returns true if timestamp is valid, false if expired
 */
export function isTimestampValid(timestamp: number, windowSeconds: number = 300): boolean {
  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = currentTime - timestamp;
  return timeDiff >= 0 && timeDiff <= windowSeconds;
}

/**
 * Generates a canonical sign string from parameters
 *
 * @param params - Signature parameters
 * @returns Canonical string for signing
 */
export function buildSignString(params: SignatureParams): string {
  return [
    params.appid,
    params.nonce,
    params.timestamp.toString(),
    params.method,
    params.path,
    params.body,
  ].join('\n');
}

/**
 * Nonce cache interface for replay prevention
 */
export interface NonceCache {
  isDuplicate(appid: string, nonce: string): Promise<boolean>;
  record(appid: string, nonce: string, ttlSeconds: number): Promise<void>;
}

/**
 * In-memory nonce cache for development/testing
 * In production, use Redis-based implementation
 */
export class InMemoryNonceCache implements NonceCache {
  private cache: Map<string, { nonce: string; expiry: number }> = new Map();

  async isDuplicate(appid: string, nonce: string): Promise<boolean> {
    const key = `${appid}:${nonce}`;
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  async record(appid: string, nonce: string, ttlSeconds: number): Promise<void> {
    const key = `${appid}:${nonce}`;
    this.cache.set(key, {
      nonce,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }
}

/**
 * Creates a nonce cache key for storage
 *
 * @param appid - Application ID
 * @param nonce - Nonce value
 * @returns Cache key string
 */
export function createNonceCacheKey(appid: string, nonce: string): string {
  return `signature:nonce:${appid}:${nonce}`;
}
