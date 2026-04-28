/**
 * Cregis OpenPlatform SDK - Signature Utilities
 *
 * Implements the message signature algorithm for API authentication.
 * See: docs/signature-spec.md
 */

import * as crypto from 'crypto';

/**
 * Sort object keys alphabetically
 */
function sortKeys<T extends Record<string, unknown>>(obj: T | null | undefined): T {
    // Normalize null/undefined to empty object for consistent signing
  if (obj === null || obj === undefined) {
      return {} as T;
  }

  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj).sort();

  for (const key of keys) {
    const value = obj[key];
    if (value !== null && value !== undefined) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        sorted[key] = sortKeys(value as Record<string, unknown>);
      } else if (Array.isArray(value)) {
        sorted[key] = value;
      } else {
        sorted[key] = value;
      }
    }
  }

  return sorted as T;
}

/**
 * Serialize object to JSON with sorted keys
 */
function serializeWithSortedKeys(obj: Record<string, unknown>): string {
    return JSON.stringify(sortKeys(obj ? obj : {}));
}

/**
 * Calculate MD5 hash
 */
export function md5(data: string): string {
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Generate a random nonce
 */
export function generateNonce(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Get current Unix timestamp in seconds
 */
export function getTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Validate UUID format
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Signature types
 */
export enum SignatureType {
  /** Basic signature for OAuth endpoints */
  BASIC = 'basic',
  /** Resource signature for third-party endpoints (includes authorizationId) */
  RESOURCE = 'resource',
}

/**
 * Basic signature parameters
 */
export interface BasicSignatureParams {
  appId: string;
  appSecret: string;
  timestamp: number;
  nonce: string;
  business: Record<string, unknown>;
}

/**
 * Resource signature parameters
 */
export interface ResourceSignatureParams extends BasicSignatureParams {
  authorizationId: string;
}

/**
 * Calculate signature for Basic endpoints (/oauth/*)
 *
 * Algorithm:
 * signature = MD5(appSecret + appId + timestamp + nonce + MD5(JSON.stringify(sortKeys(business))))
 */
export function calculateBasicSignature(params: BasicSignatureParams): string {
  const { appId, appSecret, timestamp, nonce, business } = params;

  // Step 1: Serialize business with sorted keys
  const serializedBusiness = serializeWithSortedKeys(business);

  // Step 2: Calculate business MD5
  const businessMd5 = md5(serializedBusiness);

  // Step 3: Build sign string
  const signString = `${appId}${timestamp}${nonce}${businessMd5}`;

  // Step 4: Calculate signature with appSecret
  const signature = md5(`${appSecret}${signString}`);

  return signature;
}

/**
 * Calculate signature for Resource endpoints (/third-party/*)
 *
 * Algorithm:
 * signature = MD5(appSecret + appId + authorizationId + timestamp + nonce + MD5(JSON.stringify(sortKeys(business))))
 */
export function calculateResourceSignature(params: ResourceSignatureParams): string {
  const { appId, appSecret, timestamp, nonce, business, authorizationId } = params;

  // Step 1: Serialize business with sorted keys
  const serializedBusiness = serializeWithSortedKeys(business);

  // Step 2: Calculate business MD5
  const businessMd5 = md5(serializedBusiness);

  // Step 3: Build sign string (includes authorizationId)
  const signString = `${appId}${authorizationId}${timestamp}${nonce}${businessMd5}`;

  // Step 4: Calculate signature with appSecret
  const signature = md5(`${appSecret}${signString}`);

  return signature;
}

/**
 * Build Basic Info for API request
 */
export function buildBasicInfo(params: BasicSignatureParams): {
  appId: string;
  timestamp: number;
  nonce: string;
  signature: string;
} {
  return {
    appId: params.appId,
    timestamp: params.timestamp,
    nonce: params.nonce,
    signature: calculateBasicSignature(params),
  };
}

/**
 * Build Basic Info with Authorization for API request
 */
export function buildBasicInfoWithAuthorization(params: ResourceSignatureParams): {
  appId: string;
  timestamp: number;
  nonce: string;
  signature: string;
  authorizationId: string;
} {
  return {
    appId: params.appId,
    timestamp: params.timestamp,
    nonce: params.nonce,
    signature: calculateResourceSignature(params),
    authorizationId: params.authorizationId,
  };
}

/**
 * Verify timestamp is within tolerance (default 5 minutes)
 */
export function isTimestampValid(timestamp: number, toleranceSeconds: number = 300): boolean {
  const now = getTimestamp();
  const diff = Math.abs(now - timestamp);
  return diff <= toleranceSeconds;
}
