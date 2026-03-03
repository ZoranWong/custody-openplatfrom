import { Request, Response, NextFunction } from 'express';

/**
 * Extended Request with signature verification results
 */
export interface SignedRequest extends Request {
  /**
   * Application ID from verified signature
   */
  appid?: string;

  /**
   * Indicates if request passed signature verification
   */
  isSignatureValid?: boolean;
}

/**
 * Signature middleware configuration
 */
export interface SignatureMiddlewareConfig {
  /**
   * Path patterns to exclude from signature verification
   * @default ['/health', '/ready']
   */
  excludePaths?: string[];

  /**
   * Timestamp validation window in seconds
   * @default 300 (5 minutes)
   */
  timestampWindow?: number;

  /**
   * Nonce cache TTL in seconds
   * @default 300 (5 minutes)
   */
  nonceTtl?: number;
}

/**
 * Signature verification result
 */
export interface SignatureVerificationResult {
  /**
   * Whether signature is valid
   */
  valid: boolean;

  /**
   * Error code if invalid
   */
  errorCode?: number;

  /**
   * Error message if invalid
   */
  errorMessage?: string;
}

/**
 * Signature header names
 */
export const SIGNATURE_HEADERS = {
  APPID: 'x-appid',
  NONCE: 'x-nonce',
  TIMESTAMP: 'x-timestamp',
  SIGN: 'x-sign',
} as const;

/**
 * Required signature headers
 */
export const REQUIRED_SIGNATURE_HEADERS = [
  SIGNATURE_HEADERS.APPID,
  SIGNATURE_HEADERS.NONCE,
  SIGNATURE_HEADERS.TIMESTAMP,
  SIGNATURE_HEADERS.SIGN,
] as const;
