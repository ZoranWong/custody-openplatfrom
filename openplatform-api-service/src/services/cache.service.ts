import { createCache as createCacheManager } from 'cache-manager';
import { Keyv } from 'keyv';

function createCacheStore() {
  const driver = process.env.CACHE_DRIVER || 'memory';
  const ttl = parseInt(process.env.CACHE_DEFAULT_TTL || '3600', 10) * 1000;

  switch (driver) {
    case 'redis': {
      // Dynamic require to avoid requiring redis package when not used
      try {
        const { default: KeyvRedis } = require('@keyv/redis');
        return createCacheManager({
          stores: [
            new Keyv(),
            new Keyv(new KeyvRedis(process.env.CACHE_REDIS_URL)),
          ],
          ttl,
        });
      } catch {
        console.warn('Redis store not available, falling back to memory cache');
        return createCacheManager({
          stores: [new Keyv()],
          ttl,
        });
      }
    }
    case 'mysql': {
      // Dynamic require to avoid requiring mysql package when not used
      try {
        const { default: KeyvMysql } = require('@keyv/mysql');
        return createCacheManager({
          stores: [
            new Keyv(),
            new Keyv(new KeyvMysql(process.env.CACHE_MYSQL_URL)),
          ],
          ttl,
        });
      } catch {
        console.warn('MySQL store not available, falling back to memory cache');
        return createCacheManager({
          stores: [new Keyv()],
          ttl,
        });
      }
    }
    case 'memory':
    default:
      return createCacheManager({
        stores: [new Keyv()],
        ttl,
      });
  }
}

// Lazy singleton
let cacheStore: any = null;

export async function getCache(): Promise<ReturnType<typeof createCacheManager>> {
  if (!cacheStore) {
    cacheStore = createCacheStore();
  }
  return cacheStore;
}

// Reset cache instance (useful for testing)
export function resetCache(): void {
  cacheStore = null;
}