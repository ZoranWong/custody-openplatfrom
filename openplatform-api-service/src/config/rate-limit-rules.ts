/**
 * Rate Limit Configuration
 * Pre-defined rate limit rules for different endpoints
 */

import {
  RateLimitTier,
  RateLimitTierConfig,
  EndpointRateLimitConfig,
  RateLimitMiddlewareConfig,
} from '../types/rate-limit.types';

/**
 * Tier configurations
 */
export const TIER_CONFIGS: Record<RateLimitTier, RateLimitTierConfig> = {
  free: {
    requestsPerDay: 1000,
    requestsPerHour: 100,
    requestsPerMinute: 10,
    burstSize: 20,
  },
  basic: {
    requestsPerDay: 10000,
    requestsPerHour: 1000,
    requestsPerMinute: 100,
    burstSize: 200,
  },
  pro: {
    requestsPerDay: 100000,
    requestsPerHour: 10000,
    requestsPerMinute: 1000,
    burstSize: 2000,
  },
  enterprise: {
    requestsPerDay: -1, // Unlimited
    requestsPerHour: 100000,
    requestsPerMinute: 10000,
    burstSize: 20000,
  },
};

/**
 * Tier to appid mapping
 */
export const TIER_APP_MAPPING: Record<RateLimitTier, string[]> = {
  free: ['app_free_001', 'app_free_002'],
  basic: ['app_basic_001', 'app_basic_002', 'app_basic_003'],
  pro: ['app_pro_001', 'app_pro_002'],
  enterprise: ['app_enterprise_001'],
};

/**
 * Endpoint-specific rate limit configurations
 * Apply multipliers to base tier limits
 */
export const ENDPOINT_CONFIGS: EndpointRateLimitConfig[] = [
  // High-traffic endpoints - stricter limits
  {
    endpoint: '/api/v1/enterprises',
    methods: ['GET'],
    multiplier: 0.5, // 50% of base tier limit
    customLimits: {
      perMinute: 30,
    },
  },
  {
    endpoint: '/api/v1/units',
    methods: ['GET'],
    multiplier: 0.5,
    customLimits: {
      perMinute: 30,
    },
  },
  // Write operations - stricter limits
  {
    endpoint: '/api/v1/payments',
    methods: ['POST'],
    multiplier: 0.3, // 30% of base tier limit
    customLimits: {
      perMinute: 10,
      perHour: 100,
    },
  },
  {
    endpoint: '/api/v1/transfers',
    methods: ['POST'],
    multiplier: 0.3,
    customLimits: {
      perMinute: 10,
      perHour: 100,
    },
  },
  {
    endpoint: '/api/v1/pooling',
    methods: ['POST'],
    multiplier: 0.2, // 20% of base tier limit
    customLimits: {
      perMinute: 5,
      perHour: 50,
    },
  },
  // Sensitive operations - very strict limits
  {
    endpoint: '/api/v1/webhooks',
    methods: ['POST'],
    multiplier: 1.0, // Full tier limit
  },
  {
    endpoint: '/api/v1/signatures',
    methods: ['POST'],
    multiplier: 0.5,
    customLimits: {
      perMinute: 20,
      perHour: 500,
    },
  },
  // Read-heavy endpoints - relaxed limits
  {
    endpoint: '/api/v1/transactions',
    methods: ['GET'],
    multiplier: 1.5, // 150% of base tier limit
    customLimits: {
      perMinute: 150,
      perHour: 1500,
    },
  },
  {
    endpoint: '/api/v1/accounts',
    methods: ['GET'],
    multiplier: 1.5,
    customLimits: {
      perMinute: 150,
      perHour: 1500,
    },
  },
  // Health and status endpoints - no rate limiting
  {
    endpoint: '/health',
    methods: ['GET'],
    multiplier: 0,
    customLimits: {
      perMinute: 0,
    },
  },
  {
    endpoint: '/ready',
    methods: ['GET'],
    multiplier: 0,
    customLimits: {
      perMinute: 0,
    },
  },
  {
    endpoint: '/metrics',
    methods: ['GET'],
    multiplier: 0,
    customLimits: {
      perMinute: 0,
    },
  },
];

/**
 * Whitelisted IPs (no rate limiting)
 */
export const WHITELIST_IPS: string[] = [
  '127.0.0.1',
  '::1',
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
];

/**
 * Whitelisted appids (no rate limiting)
 */
export const WHITELIST_APPIDS: string[] = [
  'app_internal_001',
  'app_monitoring_001',
];

/**
 * Whitelisted enterprise IDs (no rate limiting)
 */
export const WHITELIST_ENTERPRISE_IDS: string[] = [
  'ent_internal',
  'ent_monitoring',
];

/**
 * Complete middleware configuration
 */
export const RATE_LIMIT_CONFIG: RateLimitMiddlewareConfig = {
  tierConfig: TIER_CONFIGS,
  defaultTier: 'basic',
  endpointConfigs: ENDPOINT_CONFIGS,
  whiteList: {
    appids: WHITELIST_APPIDS,
    enterpriseIds: WHITELIST_ENTERPRISE_IDS,
    ips: WHITELIST_IPS,
  },
  skipHealthEndpoints: true,
  enableEnterpriseLimit: true,
  enableEndpointLimit: true,
  storageType: 'memory',
};

/**
 * Strict configuration for sensitive operations
 */
export const STRICT_RATE_LIMIT_CONFIG: RateLimitMiddlewareConfig = {
  ...RATE_LIMIT_CONFIG,
  defaultTier: 'free',
  endpointConfigs: ENDPOINT_CONFIGS.map((config) => ({
    ...config,
    multiplier: Math.max(0.1, config.multiplier * 0.5),
  })),
};

/**
 * Relaxed configuration for public endpoints
 */
export const RELAXED_RATE_LIMIT_CONFIG: RateLimitMiddlewareConfig = {
  ...RATE_LIMIT_CONFIG,
  defaultTier: 'basic',
  endpointConfigs: ENDPOINT_CONFIGS.map((config) => ({
    ...config,
    multiplier: Math.min(2.0, config.multiplier * 1.5),
  })),
};

/**
 * Get tier configuration by tier name
 */
export function getTierConfig(tier: RateLimitTier): RateLimitTierConfig {
  return TIER_CONFIGS[tier];
}

/**
 * Get endpoint configuration by path
 */
export function getEndpointConfig(
  path: string,
  method: string
): EndpointRateLimitConfig | null {
  for (const config of ENDPOINT_CONFIGS) {
    if (path.startsWith(config.endpoint) && config.methods.includes(method)) {
      return config;
    }
  }
  return null;
}

/**
 * Calculate effective rate limit for an endpoint
 */
export function calculateEffectiveLimit(
  baseLimit: number,
  endpointConfig: EndpointRateLimitConfig | null
): number {
  if (!endpointConfig || endpointConfig.multiplier === 0) {
    return 0; // No rate limiting
  }

  if (endpointConfig.customLimits?.perMinute) {
    return endpointConfig.customLimits.perMinute;
  }

  return Math.floor(baseLimit * endpointConfig.multiplier);
}
