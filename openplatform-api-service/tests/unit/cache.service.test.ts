/**
 * Cache Service Tests
 * Tests for the unified cache layer backed by cache-manager
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// We need to mock cache-manager before importing the cache service
// The cache.service creates a Keyv memory store which works fine in tests
// so we only need to set the env var to 'memory'

describe('CacheService', () => {
  let getCache: typeof import('../../src/services/cache.service').getCache;
  let resetCache: typeof import('../../src/services/cache.service').resetCache;

  beforeEach(async () => {
    // Set env to memory driver for tests
    process.env.CACHE_DRIVER = 'memory';
    process.env.CACHE_DEFAULT_TTL = '3600';

    // Reset the module cache to get fresh imports
    vi.resetModules();

    const mod = await import('../../src/services/cache.service');
    getCache = mod.getCache;
    resetCache = mod.resetCache;

    // Reset the singleton before each test
    resetCache();
  });

  afterEach(() => {
    resetCache();
    delete process.env.CACHE_DRIVER;
    delete process.env.CACHE_DEFAULT_TTL;
  });

  describe('getCache()', () => {
    it('should return a cache instance (memory driver by default)', async () => {
      const cache = await getCache();
      expect(cache).toBeDefined();
      expect(typeof cache.get).toBe('function');
      expect(typeof cache.set).toBe('function');
      expect(typeof cache.del).toBe('function');
    });

    it('should be a singleton (calling getCache() twice returns the same instance)', async () => {
      const cache1 = await getCache();
      const cache2 = await getCache();
      expect(cache1).toBe(cache2);
    });
  });

  describe('cache.set(key, value)', () => {
    it('should store a value', async () => {
      const cache = await getCache();
      await cache.set('test-key', 'test-value');
      const value = await cache.get('test-key');
      expect(value).toBe('test-value');
    });

    it('should store different types of values', async () => {
      const cache = await getCache();

      await cache.set('string-key', 'hello');
      await cache.set('number-key', '42');
      await cache.set('object-key', JSON.stringify({ a: 1, b: 2 }));

      expect(await cache.get('string-key')).toBe('hello');
      expect(await cache.get('number-key')).toBe('42');
      const parsed = JSON.parse(await cache.get('object-key') as string);
      expect(parsed).toEqual({ a: 1, b: 2 });
    });
  });

  describe('cache.get(key)', () => {
    it('should return the stored value', async () => {
      const cache = await getCache();
      await cache.set('get-test-key', 'stored-value');
      const value = await cache.get('get-test-key');
      expect(value).toBe('stored-value');
    });

    it('should return undefined for a key that was never set', async () => {
      const cache = await getCache();
      const value = await cache.get('non-existent-key');
      expect(value).toBeUndefined();
    });
  });

  describe('cache.set(key, value, ttl)', () => {
    it('should support TTL in milliseconds', async () => {
      const cache = await getCache();

      // Set with a very short TTL (100ms)
      await cache.set('ttl-key', 'short-lived', 100);

      // Value should be available immediately
      const value = await cache.get('ttl-key');
      expect(value).toBe('short-lived');

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Value should be gone after TTL
      const expiredValue = await cache.get('ttl-key');
      expect(expiredValue).toBeUndefined();
    });

    it('should keep value when TTL has not expired', async () => {
      const cache = await getCache();

      // Set with a longer TTL (5 seconds)
      await cache.set('long-ttl-key', 'long-lived', 5000);

      // Wait a short time (well within TTL)
      await new Promise((resolve) => setTimeout(resolve, 100));

      const value = await cache.get('long-ttl-key');
      expect(value).toBe('long-lived');
    });
  });

  describe('cache.del(key)', () => {
    it('should delete a value', async () => {
      const cache = await getCache();
      await cache.set('delete-key', 'to-be-deleted');
      await cache.del('delete-key');
      const value = await cache.get('delete-key');
      expect(value).toBeUndefined();
    });

    it('should not throw when deleting a non-existent key', async () => {
      const cache = await getCache();
      await expect(cache.del('non-existent-key')).resolves.not.toThrow();
    });
  });

  describe('cache.get(key) after del', () => {
    it('should return undefined after del', async () => {
      const cache = await getCache();

      await cache.set('del-test-key', 'some-value');
      expect(await cache.get('del-test-key')).toBe('some-value');

      await cache.del('del-test-key');
      expect(await cache.get('del-test-key')).toBeUndefined();
    });

    it('should allow re-setting a key after deletion', async () => {
      const cache = await getCache();

      await cache.set('reuse-key', 'first-value');
      await cache.del('reuse-key');
      await cache.set('reuse-key', 'second-value');

      const value = await cache.get('reuse-key');
      expect(value).toBe('second-value');
    });
  });

  describe('resetCache()', () => {
    it('should create a new instance after reset', async () => {
      const cache1 = await getCache();
      resetCache();
      const cache2 = await getCache();

      // Should be a different instance
      expect(cache1).not.toBe(cache2);

      // But getCache() should still be singleton after reset
      const cache3 = await getCache();
      expect(cache2).toBe(cache3);
    });

    it('should clear previous data after reset', async () => {
      const cache1 = await getCache();
      await cache1.set('persist-key', 'should-be-gone');

      resetCache();
      const cache2 = await getCache();
      const value = await cache2.get('persist-key');
      expect(value).toBeUndefined();
    });
  });

  describe('cache.clear()', () => {
    it('should clear all entries', async () => {
      const cache = await getCache();
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      if (typeof cache.clear === 'function') {
        await cache.clear();

        expect(await cache.get('key1')).toBeUndefined();
        expect(await cache.get('key2')).toBeUndefined();
        expect(await cache.get('key3')).toBeUndefined();
      }
    });
  });
});