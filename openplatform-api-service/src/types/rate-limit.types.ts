/**
 * Rate Limiting Types
 * Type definitions for API rate limiting
 */

/**
 * Rate limit tiers
 */
export type RateLimitTier = 'free' | 'basic' | 'pro' | 'enterprise';

/**
 * Rate limit configuration per tier
 */
export interface RateLimitTierConfig {
  requestsPerDay: number;
  requestsPerHour: number;
  requestsPerMinute: number;
  burstSize: number;
}

/**
 * Complete rate limit configuration
 */
export interface RateLimitConfig {
  tier: RateLimitTier;
  windows: {
    daily: RateLimitWindowConfig;
    hourly: RateLimitWindowConfig;
    minute: RateLimitWindowConfig;
    burst: RateLimitWindowConfig;
  };
}

/**
 * Individual window configuration
 */
export interface RateLimitWindowConfig {
  windowSize: number;    // Window size in seconds
  maxRequests: number;    // Max requests in window
}

/**
 * Rate limit tier mapping
 */
export interface TierMapping {
  [appid: string]: RateLimitTier;
}

/**
 * Rate limit entry for tracking
 */
export interface RateLimitEntry {
  count: number;
  windowStart: number;
  tier: RateLimitTier;
  lastReset: number;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
  tier: RateLimitTier;
}

/**
 * Rate limit info for response headers
 */
export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'X-RateLimit-Policy': string;
  'Retry-After'?: string;
}

/**
 * Rate limit violation error
 */
export interface RateLimitViolation {
  code: number;
  message: string;
  retryAfter: number;
  limit: number;
  remaining: number;
}

/**
 * Rate limit key components
 */
export interface RateLimitKey {
  appid?: string;
  enterpriseId?: string;
  ip?: string;
  endpoint?: string;
  tier?: RateLimitTier;
}

/**
 * Endpoint-specific rate limit config
 */
export interface EndpointRateLimitConfig {
  endpoint: string;
  methods: string[];
  multiplier: number;
  customLimits?: {
    perMinute?: number;
    perHour?: number;
    perDay?: number;
  };
}

/**
 * WhiteList configuration for rate limiting
 */
export interface RateLimitWhiteList {
  appids: string[];
  enterpriseIds: string[];
  ips: string[];
}

/**
 * Configuration for rate limiting middleware
 */
export interface RateLimitMiddlewareConfig {
  tierConfig?: Record<RateLimitTier, RateLimitTierConfig>;
  defaultTier?: RateLimitTier;
  endpointConfigs?: EndpointRateLimitConfig[];
  whiteList?: RateLimitWhiteList;
  skipHealthEndpoints?: boolean;
  enableEnterpriseLimit?: boolean;
  enableEndpointLimit?: boolean;
  storageType?: 'memory' | 'redis';
  redisPrefix?: string;
}
