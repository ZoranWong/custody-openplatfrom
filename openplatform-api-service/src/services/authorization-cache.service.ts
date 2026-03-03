/**
 * Authorization Cache Service
 * Provides TTL-based caching for authorization check results
 */

import { AuthorizationResult } from './resource-authorization.service'

/**
 * Cached authorization entry
 */
interface CachedAuthorization {
  /**
   * Authorization result
   */
  result: AuthorizationResult

  /**
   * Cache timestamp
   */
  cachedAt: number

  /**
   * TTL in milliseconds
   */
  ttl: number

  /**
   * Expiration timestamp
   */
  expiresAt: number
}

/**
 * Authorization Cache Configuration
 */
export interface AuthorizationCacheConfig {
  /**
   * Default TTL in seconds
   */
  defaultTtlSeconds?: number

  /**
   * Maximum cache size
   */
  maxCacheSize?: number
}

/**
 * Authorization Cache Service
 * Caches authorization check results with TTL
 */
export class AuthorizationCache {
  private cache: Map<string, CachedAuthorization> = new Map()
  private ttl: number
  private maxSize: number

  /**
   * Create a new AuthorizationCache
   * @param config Cache configuration
   */
  constructor(config: AuthorizationCacheConfig = {}) {
    this.ttl = (config.defaultTtlSeconds ?? 300) * 1000 // Default 5 minutes
    this.maxSize = config.maxCacheSize ?? 10000
  }

  /**
   * Generate cache key from appId and resourceKey
   */
  private getCacheKey(appId: string, resourceKey: string): string {
    return `${appId}:${resourceKey}`
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CachedAuthorization): boolean {
    return Date.now() > entry.expiresAt
  }

  /**
   * Get authorization result from cache
   * @param appId Application ID
   * @param resourceKey Resource key
   * @returns Cached authorization result or null if not found/expired
   */
  get(appId: string, resourceKey: string): AuthorizationResult | null {
    const key = this.getCacheKey(appId, resourceKey)
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key)
      return null
    }

    return entry.result
  }

  /**
   * Set authorization result in cache
   * @param appId Application ID
   * @param resourceKey Resource key
   * @param result Authorization result to cache
   * @param ttlSeconds Optional custom TTL in seconds
   */
  set(
    appId: string,
    resourceKey: string,
    result: AuthorizationResult,
    ttlSeconds?: number
  ): void {
    const key = this.getCacheKey(appId, resourceKey)
    const ttl = (ttlSeconds ?? this.ttl / 1000) * 1000
    const now = Date.now()

    // Cleanup if cache is full
    if (this.cache.size >= this.maxSize) {
      this.cleanup()
    }

    const entry: CachedAuthorization = {
      result,
      cachedAt: now,
      ttl,
      expiresAt: now + ttl
    }

    this.cache.set(key, entry)
  }

  /**
   * Invalidate cache entry for specific appId and resourceKey
   * @param appId Application ID
   * @param resourceKey Resource key
   */
  invalidate(appId: string, resourceKey: string): void {
    const key = this.getCacheKey(appId, resourceKey)
    this.cache.delete(key)
  }

  /**
   * Invalidate all cache entries for a specific appId
   * @param appId Application ID
   */
  invalidateByAppId(appId: string): void {
    const prefix = `${appId}:`
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Invalidate all cache entries for a specific userId
   * @param userId User ID
   */
  invalidateByUserId(userId: string): void {
    // This would require storing userId in cache - iterate all and check
    // For now, clear all cache if needed (conservative approach)
    // In production, store userId mapping for efficient invalidation
    for (const [key, entry] of this.cache.entries()) {
      if (entry.result.userId === userId) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Invalidate all cache entries (e.g., on authorization revocation)
   */
  invalidateAll(): void {
    this.cache.clear()
  }

  /**
   * Remove expired entries from cache
   * @returns Number of entries removed
   */
  cleanup(): number {
    let removed = 0
    const now = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        removed++
      }
    }

    return removed
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number
    maxSize: number
    ttl: number
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl
    }
  }
}

// Default singleton instance
let authorizationCache: AuthorizationCache | null = null

/**
 * Get the default AuthorizationCache instance
 */
export function getAuthorizationCache(config?: AuthorizationCacheConfig): AuthorizationCache {
  if (!authorizationCache) {
    authorizationCache = new AuthorizationCache(config)
  }
  return authorizationCache
}

/**
 * Reset the cache instance (useful for testing)
 */
export function resetAuthorizationCache(): void {
  authorizationCache = null
}

export default {
  AuthorizationCache,
  getAuthorizationCache,
  resetAuthorizationCache
}
