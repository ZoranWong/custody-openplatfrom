/**
 * Signature Utility for SDK Client
 * Generates signed request parameters for custody platform API calls
 *
 * Signature Algorithm (must match backend):
 * 1. Sort business JSON by keys and stringify: JSON.stringify(sortKeys(business))
 * 2. Calculate MD5 of business: md5 = MD5(serialized JSON)
 * 3. Build signature string: appId + timestamp + nonce + md5(business)
 * 4. Sign with appSecret: MD5(appSecret + signatureString)
 * 5. Put signature in basic.signature field
 */

import * as crypto from 'crypto'

/**
 * Basic parameters for request
 */
export interface BasicParams {
  appId: string
  resourceKey: string
  timestamp: number
  nonce: string
  signature: string
}

/**
 * Signed request structure
 */
export interface SignedRequest {
  basic: BasicParams
  business: Record<string, unknown>
}

/**
 * Configuration options for signature generation
 */
export interface SignatureOptions {
  /**
   * Timestamp in seconds (default: current time)
   */
  timestamp?: number

  /**
   * Nonce string (default: auto-generated)
   */
  nonce?: string

  /**
   * Nonce length (default: 16)
   */
  nonceLength?: number
}

/**
 * Generate a random nonce string
 */
export function generateNonce(length: number = 16): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Sort object keys recursively for consistent JSON serialization
 * This ensures MD5 hash is consistent between client and server
 */
export function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sortObjectKeys(item))
  }

  const sorted: Record<string, unknown> = {}
  const keys = Object.keys(obj).sort()

  for (const key of keys) {
    sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key])
  }

  return sorted
}

/**
 * Calculate MD5 hash of business data
 * @param businessData - Business data object
 * @returns MD5 hex string
 */
export function calculateBusinessMd5(businessData: Record<string, unknown> | null): string {
  if (!businessData || Object.keys(businessData).length === 0) {
    return crypto.createHash('md5').update('').digest('hex')
  }

  const sorted = sortObjectKeys(businessData) as Record<string, unknown>
  const jsonString = JSON.stringify(sorted)
  return crypto.createHash('md5').update(jsonString).digest('hex')
}

/**
 * Build signature string: appId + resourceKey + timestamp + nonce + md5(business)
 */
export function buildSignatureString(
  appId: string,
  resourceKey: string,
  timestamp: number,
  nonce: string,
  businessMd5: string
): string {
  return appId + resourceKey + timestamp + nonce + businessMd5
}

/**
 * Generate signature using MD5
 * @param appSecret - Application secret
 * @param signatureString - String to sign
 * @returns MD5 hex string
 */
export function generateSignature(appSecret: string, signatureString: string): string {
  return crypto
    .createHash('md5')
    .update(appSecret + signatureString)
    .digest('hex')
}

/**
 * Build basic parameters with signature
 */
export function buildBasicParams(
  appId: string,
  appSecret: string,
  resourceKey: string,
  businessData: Record<string, unknown> | null,
  options: SignatureOptions = {}
): BasicParams {
  const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000)
  const nonce = options.nonce ?? generateNonce(options.nonceLength ?? 16)

  // Calculate MD5 of business data
  const businessMd5 = calculateBusinessMd5(businessData)

  // Build signature string with resourceKey
  const signatureString = buildSignatureString(appId, resourceKey, timestamp, nonce, businessMd5)

  // Generate signature
  const signature = generateSignature(appSecret, signatureString)

  return {
    appId,
    resourceKey,
    timestamp,
    nonce,
    signature
  }
}

/**
 * Build complete signed request
 */
export function buildSignedRequest(
  appId: string,
  appSecret: string,
  resourceKey: string,
  businessData: Record<string, unknown> | null,
  options: SignatureOptions = {}
): SignedRequest {
  const basic = buildBasicParams(appId, appSecret, resourceKey, businessData, options)

  return {
    basic,
    business: businessData ?? {}
  }
}

/**
 * Verify signature (for testing purposes)
 */
export function verifySignature(
  appSecret: string,
  signature: string,
  appId: string,
  resourceKey: string,
  timestamp: number,
  nonce: string,
  businessMd5: string
): boolean {
  const signatureString = buildSignatureString(appId, resourceKey, timestamp, nonce, businessMd5)
  const expectedSignature = generateSignature(appSecret, signatureString)

  // Check length before timing-safe comparison
  if (signature.length !== expectedSignature.length) {
    return false
  }

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'utf8'),
    Buffer.from(expectedSignature, 'utf8')
  )
}

export default {
  generateNonce,
  sortObjectKeys,
  calculateBusinessMd5,
  buildSignatureString,
  generateSignature,
  buildBasicParams,
  buildSignedRequest,
  verifySignature
}
