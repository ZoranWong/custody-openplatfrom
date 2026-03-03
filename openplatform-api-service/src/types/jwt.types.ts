/**
 * JWT Type Definitions
 * Shared types for JWT token management across the API Gateway
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Extended Request with JWT authentication info
 */
export interface AuthenticatedRequest extends Request {
  /**
   * Application ID from verified JWT token
   */
  appid?: string;

  /**
   * Enterprise ID from JWT token claims
   */
  enterprise_id?: string;

  /**
   * User ID from RefreshToken validation
   */
  user_id?: string;

  /**
   * Permissions granted to the application
   */
  permissions?: string[];

  /**
   * Unique token ID for revocation tracking
   */
  jti?: string;

  /**
   * Indicates if request passed JWT authentication
   */
  isAuthenticated?: boolean;
}

/**
 * JWT token pair returned from issuance
 */
export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Claims required for token issuance
 */
export interface TokenClaims {
  appid: string;
  user_id: string;
  enterprise_id?: string;
  permissions?: string[];
}

/**
 * JWT configuration options
 */
export interface JWTConfig {
  /**
   * AccessToken expiration in seconds (default: 7200 = 2 hours)
   */
  accessTokenExpiry: number;

  /**
   * RefreshToken expiration in seconds (default: 2592000 = 30 days)
   */
  refreshTokenExpiry: number;

  /**
   * Algorithm for signing (default: RS256)
   */
  algorithm: 'RS256';

  /**
   * Rate limit for token endpoints (requests per minute)
   */
  rateLimitPerMinute: number;
}

/**
 * Middleware configuration for JWT authentication
 */
export interface JWTAuthMiddlewareConfig {
  /**
   * Paths to exclude from authentication
   * @default ['/health', '/ready', '/metrics']
   */
  excludePaths?: string[];

  /**
   * Whether to allow requests without authentication header
   * @default false
   */
  allowNoAuth?: boolean;

  /**
   * Custom function to get public key
   */
  getPublicKey?: () => string;
}

/**
 * Token storage interfaces
 */
export interface RefreshTokenRecord {
  id: bigint;
  jti: string;
  appid: string;
  user_id: string;
  expires_at: number;
  revoked: boolean;
  replaced_by_jti: string | null;
  created_at: number;
  last_used_at: number | null;
}

export interface RefreshTokenRepository {
  create(record: Omit<RefreshTokenRecord, 'id'>): Promise<RefreshTokenRecord>;

  findByJti(jti: string): Promise<RefreshTokenRecord | null>;

  findByAppid(appid: string): Promise<RefreshTokenRecord[]>;

  update(
    jti: string,
    data: Partial<Omit<RefreshTokenRecord, 'jti' | 'appid' | 'created_at'>>
  ): Promise<RefreshTokenRecord | null>;

  revoke(jti: string): Promise<boolean>;

  markReplaced(jti: string, replacedByJti: string): Promise<boolean>;

  deleteExpired(): Promise<number>;
}

/**
 * Token blacklist interface for Redis-based revocation
 */
export interface TokenBlacklist {
  /**
   * Add a token to the blacklist
   */
  blacklist(jti: string, ttlSeconds: number): Promise<void>;

  /**
   * Check if a token is blacklisted
   */
  isBlacklisted(jti: string): Promise<boolean>;

  /**
   * Remove a token from the blacklist
   */
  remove(jti: string): Promise<void>;
}

/**
 * Credential validation service interface
 */
export interface CredentialService {
  /**
   * Validate app credentials
   */
  validateCredentials(appid: string, appsecret: string): Promise<{
    valid: boolean;
    user_id?: string;
    enterprise_id?: string;
    permissions?: string[];
  }>;
}

/**
 * Rate limiter interface
 */
export interface RateLimiter {
  /**
   * Check if request is rate limited
   */
  checkLimit(key: string): Promise<{
    limited: boolean;
    remaining: number;
    resetAt: number;
  }>;

  /**
   * Increment counter for a key
   */
  increment(key: string, ttlSeconds: number): Promise<void>;
}

/**
 * Error response for JWT authentication failures
 */
export interface JWTErrorResponse {
  code: number;
  message: string;
  trace_id: string;
}

/**
 * Success response for token issuance
 */
export interface TokenIssueResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
}
