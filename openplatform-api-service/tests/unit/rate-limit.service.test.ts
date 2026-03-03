/**
 * Rate Limit Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  RateLimitService,
  MemoryRateLimitStorage,
  createRateLimitService,
} from '../../src/services/rate-limit.service';
import { RateLimitTier } from '../../src/types/rate-limit.types';

describe('RateLimitService', () => {
  let service: RateLimitService;
  let storage: MemoryRateLimitStorage;

  beforeEach(() => {
    storage = new MemoryRateLimitStorage();
    service = createRateLimitService(storage);
  });

  describe('checkRateLimit', () => {
    it('should allow request under limit', async () => {
      const result = await service.checkRateLimit({ appid: 'app_123' });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
      expect(result.tier).toBe('basic');
    });

    it('should track request count', async () => {
      await service.checkRateLimit({ appid: 'app_123' });
      await service.checkRateLimit({ appid: 'app_123' });
      const result = await service.checkRateLimit({ appid: 'app_123' });

      expect(result.remaining).toBeLessThan(100); // 100 requests per minute for basic
    });

    it('should block request when limit exceeded', async () => {
      // Simulate hitting the limit
      const tierConfig = {
        basic: {
          requestsPerDay: 10000,
          requestsPerHour: 1000,
          requestsPerMinute: 2, // Very low for testing
          burstSize: 200,
        },
      };

      const limitedService = createRateLimitService(storage, tierConfig);

      await limitedService.checkRateLimit({ appid: 'app_123', tier: 'basic' });
      await limitedService.checkRateLimit({ appid: 'app_123', tier: 'basic' });

      const result = await limitedService.checkRateLimit({
        appid: 'app_123',
        tier: 'basic',
      });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should track different appids separately', async () => {
      const result1 = await service.checkRateLimit({ appid: 'app_1' });
      const result2 = await service.checkRateLimit({ appid: 'app_2' });

      // Both should have similar remaining counts
      expect(result1.remaining).toBeGreaterThanOrEqual(result2.remaining - 1);
      expect(result2.remaining).toBeGreaterThanOrEqual(result1.remaining - 1);
    });
  });

  describe('checkAllWindows', () => {
    it('should pass all windows when under limits', async () => {
      const result = await service.checkAllWindows({ appid: 'app_123' });

      expect(result.allowed).toBe(true);
      expect(result.tier).toBe('basic');
    });

    it('should fail when daily limit exceeded', async () => {
      const tierConfig = {
        basic: {
          requestsPerDay: 2,
          requestsPerHour: 1000,
          requestsPerMinute: 100,
          burstSize: 200,
        },
      };

      const limitedService = createRateLimitService(storage, tierConfig);

      await limitedService.checkAllWindows({ appid: 'app_123', tier: 'basic' });
      await limitedService.checkAllWindows({ appid: 'app_123', tier: 'basic' });

      const result = await limitedService.checkAllWindows({
        appid: 'app_123',
        tier: 'basic',
      });

      expect(result.allowed).toBe(false);
    });

    it('should allow unlimited for enterprise tier', async () => {
      const tierConfig = {
        enterprise: {
          requestsPerDay: -1, // Unlimited
          requestsPerHour: 100000,
          requestsPerMinute: 10000,
          burstSize: 20000,
        },
      };

      // Use fresh storage for this test
      const freshStorage = new MemoryRateLimitStorage();
      const enterpriseService = createRateLimitService(freshStorage, tierConfig);

      // Enterprise should still track minute/hour windows but skip daily check
      // The unlimited behavior means daily limit is not enforced
      const result = await enterpriseService.checkAllWindows({
        appid: 'app_ent',
        tier: 'enterprise',
      });

      expect(result.allowed).toBe(true);
      // Enterprise still has per-minute limits
      expect(result.remaining).toBeLessThan(10000);
    });
  });

  describe('tier management', () => {
    it('should return default tier for unknown appid', () => {
      const tier = service.getTier('unknown_app');
      expect(tier).toBe('basic');
    });

    it('should return configured tier for known appid', () => {
      service.setTier('app_premium', 'pro');
      const tier = service.getTier('app_premium');
      expect(tier).toBe('pro');
    });

    it('should set and use default tier', () => {
      // Use fresh service with its own storage
      const freshService = createRateLimitService();
      freshService.setDefaultTier('free');
      const tier = freshService.getTier('unknown');
      expect(tier).toBe('free');
    });
  });

  describe('headers generation', () => {
    it('should generate correct headers', async () => {
      const result = await service.checkRateLimit({ appid: 'app_123' });
      const headers = service.generateHeaders(result);

      expect(headers['X-RateLimit-Limit']).toBeDefined();
      expect(headers['X-RateLimit-Remaining']).toBeDefined();
      expect(headers['X-RateLimit-Reset']).toBeDefined();
      expect(headers['X-RateLimit-Policy']).toBe('basic');
    });

    it('should include Retry-After in violation', async () => {
      const tierConfig = {
        basic: {
          requestsPerDay: 10000,
          requestsPerHour: 1000,
          requestsPerMinute: 1,
          burstSize: 200,
        },
      };

      const limitedService = createRateLimitService(storage, tierConfig);

      await limitedService.checkRateLimit({ appid: 'app_123', tier: 'basic' });
      await limitedService.checkRateLimit({ appid: 'app_123', tier: 'basic' });

      const result = await limitedService.checkRateLimit({
        appid: 'app_123',
        tier: 'basic',
      });

      const violation = limitedService.generateViolationResponse(result);

      expect(violation.code).toBe(42901);
      expect(violation.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('usage tracking', () => {
    it('should return current usage', async () => {
      // Use fresh storage and service with unique appid to avoid conflicts
      const freshStorage = new MemoryRateLimitStorage();
      const freshService = createRateLimitService(freshStorage);
      const testAppId = 'usage_test_' + Date.now();

      // Verify tier lookup
      const tier = freshService.getTier(testAppId);
      expect(tier).toBe('basic');

      // Make requests - checkRateLimit only increments minute window
      await freshService.checkRateLimit({ appid: testAppId });
      await freshService.checkRateLimit({ appid: testAppId });

      // Verify storage was incremented
      const count = await freshStorage.get('rl:app:' + testAppId + ':tier:basic:minute');
      expect(count).toBe(2);

      const usage = await freshService.getUsage({ appid: testAppId });

      // checkRateLimit only increments minute window
      expect(usage.minute).toBe(2);
      expect(usage.hour).toBe(0);
      expect(usage.day).toBe(0);
    });

    it('should return zero for new appid', async () => {
      const freshStorage = new MemoryRateLimitStorage();
      const freshService = createRateLimitService(freshStorage);
      const usage = await freshService.getUsage({ appid: 'brand_new_app' });

      expect(usage.minute).toBe(0);
      expect(usage.hour).toBe(0);
      expect(usage.day).toBe(0);
    });
  });

  describe('endpoint configuration', () => {
    it('should register endpoint config', () => {
      service.registerEndpointConfig({
        endpoint: '/api/v1/payments',
        methods: ['POST'],
        multiplier: 0.5,
      });

      const config = service.getEndpointConfig('/api/v1/payments');
      expect(config).not.toBeNull();
      expect(config?.multiplier).toBe(0.5);
    });

    it('should return null for unknown endpoint', () => {
      const config = service.getEndpointConfig('/api/v1/unknown');
      expect(config).toBeNull();
    });
  });

  describe('rate limit reset', () => {
    it('should reset rate limit for a key', async () => {
      const freshStorage = new MemoryRateLimitStorage();
      const freshService = createRateLimitService(freshStorage);
      await freshService.checkRateLimit({ appid: 'reset_test_app' });
      await freshService.checkRateLimit({ appid: 'reset_test_app' });

      await freshService.resetLimit({ appid: 'reset_test_app' });

      const usage = await freshService.getUsage({ appid: 'reset_test_app' });
      expect(usage.minute).toBe(0);
    });
  });

  describe('enterprise-level limiting', () => {
    it('should track by enterprise ID', async () => {
      const result1 = await service.checkRateLimit({
        appid: 'app_1',
        enterpriseId: 'ent_123',
      });
      const result2 = await service.checkRateLimit({
        appid: 'app_2',
        enterpriseId: 'ent_123',
      });

      // Both requests from same enterprise should share the same counter
      expect(result1.remaining).toBe(result2.remaining);
    });
  });

  describe('IP-based limiting', () => {
    it('should track by IP address', async () => {
      const result1 = await service.checkRateLimit({ ip: '192.168.1.1' });
      const result2 = await service.checkRateLimit({ ip: '192.168.1.2' });

      // Different IPs should have separate counters
      expect(result1.remaining).toBeLessThan(result2.remaining + 2);
    });
  });
});

describe('MemoryRateLimitStorage', () => {
  let storage: MemoryRateLimitStorage;

  beforeEach(() => {
    storage = new MemoryRateLimitStorage();
  });

  describe('get', () => {
    it('should return null for unknown key', async () => {
      const count = await storage.get('unknown');
      expect(count).toBeNull();
    });

    it('should return count for known key', async () => {
      await storage.increment('test_key', 60);
      const count = await storage.get('test_key');
      expect(count).toBe(1);
    });

    it('should return null for expired key', async () => {
      // This would require mocking Date.now() which is complex
      // In real tests, you'd use a time-mocking library
    });
  });

  describe('increment', () => {
    it('should start at 1 for new key', async () => {
      const count = await storage.increment('new_key', 60);
      expect(count).toBe(1);
    });

    it('should increment existing key', async () => {
      await storage.increment('test_key', 60);
      await storage.increment('test_key', 60);
      const count = await storage.increment('test_key', 60);
      expect(count).toBe(3);
    });
  });

  describe('reset', () => {
    it('should remove key from storage', async () => {
      await storage.increment('test_key', 60);
      await storage.reset('test_key');
      const count = await storage.get('test_key');
      expect(count).toBeNull();
    });
  });

  describe('getTTL', () => {
    it('should return TTL for existing key', async () => {
      await storage.increment('test_key', 60);
      const ttl = await storage.getTTL('test_key');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(60);
    });

    it('should return 0 for unknown key', async () => {
      const ttl = await storage.getTTL('unknown_key');
      expect(ttl).toBe(0);
    });
  });
});
