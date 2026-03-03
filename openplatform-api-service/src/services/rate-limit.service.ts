/**
 * Rate Limit Service
 * Core rate limiting logic using sliding window counter algorithm
 */

import {
  RateLimitTier,
  RateLimitTierConfig,
  RateLimitConfig,
  RateLimitResult,
  RateLimitHeaders,
  RateLimitViolation,
  RateLimitKey,
  EndpointRateLimitConfig,
} from '../types/rate-limit.types';

/**
 * Default tier configurations
 */
const DEFAULT_TIER_CONFIGS: Record<RateLimitTier, RateLimitTierConfig> = {
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
 * Rate limit storage interface (can be implemented with memory or Redis)
 */
export interface RateLimitStorage {
  get(key: string): Promise<number | null>;
  increment(key: string, windowSize: number): Promise<number>;
  reset(key: string): Promise<void>;
  getTTL(key: string): Promise<number>;
}

/**
 * In-memory rate limit storage (for single-instance deployment)
 */
export class MemoryRateLimitStorage implements RateLimitStorage {
  private store: Map<string, { count: number; expiresAt: number }> = new Map();

  async get(key: string): Promise<number | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.count;
  }

  async increment(key: string, windowSize: number): Promise<number> {
    const now = Date.now();
    const expiresAt = now + windowSize * 1000;

    const entry = this.store.get(key);
    if (!entry || now > entry.expiresAt) {
      this.store.set(key, { count: 1, expiresAt });
      return 1;
    }

    entry.count++;
    return entry.count;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  async getTTL(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;
    return Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000));
  }

  /**
   * Clean expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * Rate Limit Service
 */
export class RateLimitService {
  private storage: RateLimitStorage;
  private tierConfigs: Record<RateLimitTier, RateLimitTierConfig>;
  private tierMapping: Map<string, RateLimitTier>;
  private endpointConfigs: Map<string, EndpointRateLimitConfig>;
  private windowSizes = {
    minute: 60,
    hour: 3600,
    day: 86400,
  };

  constructor(
    storage?: RateLimitStorage,
    tierConfigs?: Partial<Record<RateLimitTier, RateLimitTierConfig>>
  ) {
    this.storage = storage || new MemoryRateLimitStorage();
    this.tierConfigs = { ...DEFAULT_TIER_CONFIGS, ...tierConfigs };
    this.tierMapping = new Map();
    this.endpointConfigs = new Map();

    // Set default tier mapping
    this.setDefaultTier('basic');
  }

  /**
   * Check if a request is allowed
   */
  async checkRateLimit(key: RateLimitKey): Promise<RateLimitResult> {
    const tier = key.tier || this.getTier(key.appid || '');
    const config = this.tierConfigs[tier];

    // Enterprise tier is unlimited for daily
    if (tier === 'enterprise' && config.requestsPerDay === -1) {
      return this.createUnlimitedResult(tier);
    }

    // Create a key with tier included for consistent key generation
    const keyWithTier = { ...key, tier };
    const windowKey = this.buildKey(keyWithTier, 'minute');
    const count = await this.storage.increment(windowKey, this.windowSizes.minute);
    const limit = this.getLimitForWindow(tier, 'minute');
    const remaining = Math.max(0, limit - count);
    const ttl = await this.storage.getTTL(windowKey);
    const resetAt = Date.now() + ttl * 1000;

    const allowed = count <= limit;

    return {
      allowed,
      remaining,
      resetAt,
      limit,
      tier,
    };
  }

  /**
   * Check rate limit with multiple windows
   */
  async checkAllWindows(key: RateLimitKey): Promise<RateLimitResult> {
    const tier = key.tier || this.getTier(key.appid || '');
    const config = this.tierConfigs[tier];

    // Check minute window first (most restrictive)
    const minuteResult = await this.checkMinuteWindow(key, tier);

    if (!minuteResult.allowed) {
      return minuteResult;
    }

    // Check hourly window
    const hourlyResult = await this.checkHourlyWindow(key, tier);

    if (!hourlyResult.allowed) {
      return hourlyResult;
    }

    // Check daily window (skip for enterprise tier)
    if (tier !== 'enterprise') {
      const dailyResult = await this.checkDailyWindow(key, tier);

      if (!dailyResult.allowed) {
        return dailyResult;
      }
    }

    // Return the most restrictive result
    return {
      allowed: true,
      remaining: Math.min(
        minuteResult.remaining,
        hourlyResult.remaining,
        tier === 'enterprise' ? 999999 : (await this.checkDailyWindow(key, tier)).remaining
      ),
      resetAt: Math.max(minuteResult.resetAt, hourlyResult.resetAt),
      limit: minuteResult.limit,
      tier,
    };
  }

  private async checkMinuteWindow(
    key: RateLimitKey,
    tier: RateLimitTier
  ): Promise<RateLimitResult> {
    const config = this.tierConfigs[tier];
    const keyWithTier = { ...key, tier };
    const windowKey = this.buildKey(keyWithTier, 'minute');
    const count = await this.storage.increment(windowKey, this.windowSizes.minute);
    const limit = config.requestsPerMinute;
    const remaining = Math.max(0, limit - count);
    const ttl = await this.storage.getTTL(windowKey);
    const resetAt = Date.now() + ttl * 1000;

    return {
      allowed: count <= limit,
      remaining,
      resetAt,
      limit,
      tier,
    };
  }

  private async checkHourlyWindow(
    key: RateLimitKey,
    tier: RateLimitTier
  ): Promise<RateLimitResult> {
    const config = this.tierConfigs[tier];
    const keyWithTier = { ...key, tier };
    const windowKey = this.buildKey(keyWithTier, 'hour');
    const count = await this.storage.increment(windowKey, this.windowSizes.hour);
    const limit = config.requestsPerHour;
    const remaining = Math.max(0, limit - count);
    const ttl = await this.storage.getTTL(windowKey);
    const resetAt = Date.now() + ttl * 1000;

    return {
      allowed: count <= limit,
      remaining,
      resetAt,
      limit,
      tier,
    };
  }

  private async checkDailyWindow(
    key: RateLimitKey,
    tier: RateLimitTier
  ): Promise<RateLimitResult> {
    const config = this.tierConfigs[tier];
    const keyWithTier = { ...key, tier };
    const windowKey = this.buildKey(keyWithTier, 'day');
    const count = await this.storage.increment(windowKey, this.windowSizes.day);
    const limit = config.requestsPerDay;
    const remaining = Math.max(0, limit - count);
    const ttl = await this.storage.getTTL(windowKey);
    const resetAt = Date.now() + ttl * 1000;

    return {
      allowed: count <= limit,
      remaining,
      resetAt,
      limit,
      tier,
    };
  }

  private createUnlimitedResult(tier: RateLimitTier): RateLimitResult {
    const resetAt = Date.now() + this.windowSizes.minute * 1000;
    return {
      allowed: true,
      remaining: 999999,
      resetAt,
      limit: 999999,
      tier,
    };
  }

  /**
   * Build rate limit key
   */
  private buildKey(key: RateLimitKey, window: string): string {
    const parts: string[] = ['rl'];

    if (key.appid) {
      parts.push(`app:${key.appid}`);
    }
    if (key.enterpriseId) {
      parts.push(`ent:${key.enterpriseId}`);
    }
    if (key.ip) {
      parts.push(`ip:${key.ip}`);
    }
    if (key.tier) {
      parts.push(`tier:${key.tier}`);
    }

    parts.push(window);

    return parts.join(':');
  }

  /**
   * Get limit for specific window
   */
  private getLimitForWindow(tier: RateLimitTier, window: string): number {
    const config = this.tierConfigs[tier];

    switch (window) {
      case 'minute':
        return config.requestsPerMinute;
      case 'hour':
        return config.requestsPerHour;
      case 'day':
        return config.requestsPerDay;
      default:
        return config.requestsPerMinute;
    }
  }

  /**
   * Get tier for an appid
   */
  getTier(appid: string): RateLimitTier {
    // First check if appid has a specific tier
    if (this.tierMapping.has(appid)) {
      return this.tierMapping.get(appid)!;
    }
    // Then check for default tier
    if (this.tierMapping.has('_default')) {
      return this.tierMapping.get('_default')!;
    }
    return 'basic';
  }

  /**
   * Set tier for an appid
   */
  setTier(appid: string, tier: RateLimitTier): void {
    this.tierMapping.set(appid, tier);
  }

  /**
   * Set default tier for unknown appids
   */
  setDefaultTier(tier: RateLimitTier): void {
    this.tierMapping.set('_default', tier);
  }

  /**
   * Generate rate limit headers
   */
  generateHeaders(result: RateLimitResult): RateLimitHeaders {
    const resetDate = new Date(result.resetAt);
    const unixTimestamp = Math.floor(resetDate.getTime() / 1000);

    return {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': Math.max(0, result.remaining).toString(),
      'X-RateLimit-Reset': unixTimestamp.toString(),
      'X-RateLimit-Policy': result.tier,
    };
  }

  /**
   * Generate violation response
   */
  generateViolationResponse(result: RateLimitResult): RateLimitViolation {
    const ttl = Math.ceil((result.resetAt - Date.now()) / 1000);

    return {
      code: 42901,
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: ttl,
      limit: result.limit,
      remaining: 0,
    };
  }

  /**
   * Get current usage for an appid
   */
  async getUsage(key: RateLimitKey): Promise<{
    minute: number;
    hour: number;
    day: number;
  }> {
    const tier = key.tier || this.getTier(key.appid || '');
    const keyWithTier = { ...key, tier };
    const minuteKey = this.buildKey(keyWithTier, 'minute');
    const hourKey = this.buildKey(keyWithTier, 'hour');
    const dayKey = this.buildKey(keyWithTier, 'day');

    const [minuteVal, hourVal, dayVal] = await Promise.all([
      this.storage.get(minuteKey),
      this.storage.get(hourKey),
      this.storage.get(dayKey),
    ]);

    return {
      minute: minuteVal || 0,
      hour: hourVal || 0,
      day: dayVal || 0,
    };
  }

  /**
   * Reset rate limit for a key
   */
  async resetLimit(key: RateLimitKey): Promise<void> {
    const tier = key.tier || this.getTier(key.appid || '');
    const keyWithTier = { ...key, tier };
    const windows = ['minute', 'hour', 'day'];

    await Promise.all(
      windows.map((window) => this.storage.reset(this.buildKey(keyWithTier, window)))
    );
  }

  /**
   * Register endpoint-specific configuration
   */
  registerEndpointConfig(config: EndpointRateLimitConfig): void {
    this.endpointConfigs.set(config.endpoint, config);
  }

  /**
   * Get endpoint configuration
   */
  getEndpointConfig(endpoint: string): EndpointRateLimitConfig | null {
    return this.endpointConfigs.get(endpoint) || null;
  }

  /**
   * Check if IP is whitelisted
   */
  isWhitelisted(ip: string, whiteList: string[]): boolean {
    return whiteList.includes(ip);
  }
}

/**
 * Create a rate limit service instance
 */
export function createRateLimitService(
  storage?: RateLimitStorage,
  tierConfigs?: Partial<Record<RateLimitTier, RateLimitTierConfig>>
): RateLimitService {
  return new RateLimitService(storage, tierConfigs);
}
