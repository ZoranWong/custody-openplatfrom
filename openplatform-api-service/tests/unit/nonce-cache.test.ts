/**
 * Nonce Cache Tests
 * Tests for replay attack prevention with TTL-based nonce caching
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NonceCache } from '../../src/middleware/nonce-cache';

// Mock the cache.service module with a controllable time-based store
const store = new Map<string, { value: string; expiresAt: number }>();
let mockNow = Date.now();

vi.mock('../../src/services/cache.service', () => {
  return {
    getCache: vi.fn().mockImplementation(async () => {
      return {
        async get(key: string): Promise<string | undefined> {
          await new Promise((r) => setTimeout(r, 0));
          const entry = store.get(key);
          if (!entry) return undefined;
          if (mockNow > entry.expiresAt) {
            store.delete(key);
            return undefined;
          }
          return entry.value;
        },
        async set(key: string, value: string, ttl?: number): Promise<void> {
          await new Promise((r) => setTimeout(r, 0));
          const ttlMs = ttl ?? 3600 * 1000;
          store.set(key, {
            value,
            expiresAt: mockNow + ttlMs,
          });
        },
        async del(key: string): Promise<void> {
          await new Promise((r) => setTimeout(r, 0));
          store.delete(key);
        },
        async clear(): Promise<void> {
          await new Promise((r) => setTimeout(r, 0));
          store.clear();
        },
      };
    }),
    resetCache: vi.fn(() => {
      store.clear();
    }),
    __setNow: (t: number) => {
      mockNow = t;
    },
    __getStore: () => store,
  };
});

// Import after mock to get the mocked version
import { __setNow, __getStore, resetCache } from '../../src/services/cache.service';

describe('NonceCache', () => {
  let nonceCache: NonceCache;

  beforeEach(() => {
    // Use fake timers but only fake Date, not setTimeout/setInterval
    vi.useFakeTimers({ toFake: ['Date'] });
    // Use a fixed start time
    vi.setSystemTime(new Date('2026-08-13T10:00:00Z'));
    mockNow = Date.now();
    resetCache();
    __getStore().clear();
    nonceCache = new NonceCache(3600); // 1 hour TTL
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isDuplicate', () => {
    it('should return false when nonce has not been recorded', async () => {
      const result = await nonceCache.isDuplicate('app-123', 'nonce-001');
      expect(result).toBe(false);
    });

    it('should return true for a non-expired entry', async () => {
      await nonceCache.record('app-123', 'nonce-001');
      const result = await nonceCache.isDuplicate('app-123', 'nonce-001');
      expect(result).toBe(true);
    });

    it('should return false for an expired entry (TTL has passed)', async () => {
      await nonceCache.record('app-123', 'nonce-001');

      // Advance time past the TTL (3600 seconds = 1 hour)
      vi.advanceTimersByTime(3600 * 1000 + 1);
      mockNow = Date.now();

      const result = await nonceCache.isDuplicate('app-123', 'nonce-001');
      expect(result).toBe(false);
    });

    it('should clean up expired entries (check after TTL returns false twice)', async () => {
      await nonceCache.record('app-123', 'nonce-001');

      // Advance time past the TTL
      vi.advanceTimersByTime(3600 * 1000 + 1);
      mockNow = Date.now();

      // First call after expiry should return false
      const result1 = await nonceCache.isDuplicate('app-123', 'nonce-001');
      expect(result1).toBe(false);

      // Second call should also return false (entry was cleaned up)
      const result2 = await nonceCache.isDuplicate('app-123', 'nonce-001');
      expect(result2).toBe(false);
    });

    it('should return false for a non-expired entry of a different appId', async () => {
      await nonceCache.record('app-123', 'nonce-001');
      const result = await nonceCache.isDuplicate('app-456', 'nonce-001');
      expect(result).toBe(false);
    });

    it('should return false for a non-expired entry with a different nonce', async () => {
      await nonceCache.record('app-123', 'nonce-001');
      const result = await nonceCache.isDuplicate('app-123', 'nonce-002');
      expect(result).toBe(false);
    });

    it('should return true for a non-expired entry just before TTL expires', async () => {
      await nonceCache.record('app-123', 'nonce-001');

      // Advance to just before TTL expires
      vi.advanceTimersByTime(3600 * 1000 - 1);
      mockNow = Date.now();

      const result = await nonceCache.isDuplicate('app-123', 'nonce-001');
      expect(result).toBe(true);
    });
  });

  describe('record', () => {
    it('should record a nonce and make it detectable', async () => {
      await nonceCache.record('app-123', 'nonce-001');
      const result = await nonceCache.isDuplicate('app-123', 'nonce-001');
      expect(result).toBe(true);
    });

    it('should record multiple nonces for the same appId', async () => {
      await nonceCache.record('app-123', 'nonce-001');
      await nonceCache.record('app-123', 'nonce-002');
      await nonceCache.record('app-123', 'nonce-003');

      expect(await nonceCache.isDuplicate('app-123', 'nonce-001')).toBe(true);
      expect(await nonceCache.isDuplicate('app-123', 'nonce-002')).toBe(true);
      expect(await nonceCache.isDuplicate('app-123', 'nonce-003')).toBe(true);
    });

    it('should record nonces for different appIds independently', async () => {
      await nonceCache.record('app-123', 'nonce-001');
      await nonceCache.record('app-456', 'nonce-001');

      expect(await nonceCache.isDuplicate('app-123', 'nonce-001')).toBe(true);
      expect(await nonceCache.isDuplicate('app-456', 'nonce-001')).toBe(true);
    });

    it('should use the configured TTL from constructor', async () => {
      const shortCache = new NonceCache(1); // 1 second TTL
      await shortCache.record('app-123', 'nonce-001');

      // Should be a duplicate immediately
      expect(await shortCache.isDuplicate('app-123', 'nonce-001')).toBe(true);

      // Advance past 1 second
      vi.advanceTimersByTime(1001);
      mockNow = Date.now();

      // Should be expired
      expect(await shortCache.isDuplicate('app-123', 'nonce-001')).toBe(false);
    });

    it('should use default TTL of 3600 seconds when not specified', async () => {
      const defaultCache = new NonceCache();
      await defaultCache.record('app-123', 'nonce-001');

      // Should be a duplicate within the hour
      expect(await defaultCache.isDuplicate('app-123', 'nonce-001')).toBe(true);

      // Advance 30 minutes - should still be duplicate
      vi.advanceTimersByTime(30 * 60 * 1000);
      mockNow = Date.now();
      expect(await defaultCache.isDuplicate('app-123', 'nonce-001')).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all recorded nonces', async () => {
      await nonceCache.record('app-123', 'nonce-001');
      await nonceCache.record('app-456', 'nonce-002');

      await nonceCache.clear();

      expect(await nonceCache.isDuplicate('app-123', 'nonce-001')).toBe(false);
      expect(await nonceCache.isDuplicate('app-456', 'nonce-002')).toBe(false);
    });
  });
});