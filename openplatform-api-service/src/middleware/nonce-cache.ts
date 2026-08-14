import { getCache } from '../services/cache.service';

/**
 * Nonce cache for replay attack prevention, using the unified cache layer
 * (configurable memory/redis/file backend via .env CACHE_DRIVER)
 */
export class NonceCache {
    private ttl: number;
    private cacheInstance: any = null;

    constructor(ttlSeconds: number = 3600) {
        this.ttl = ttlSeconds * 1000;
    }

    private async ensureCache(): Promise<any> {
        if (!this.cacheInstance) {
            this.cacheInstance = await getCache();
        }
        return this.cacheInstance;
    }

    private getKey(appId: string, nonce: string): string {
        return `nonce:${appId}:${nonce}`;
    }

    async isDuplicate(appId: string, nonce: string): Promise<boolean> {
        const cache = await this.ensureCache();
        const key = this.getKey(appId, nonce);
        const value = await cache.get(key);
        return value !== undefined && value !== null;
    }

    async record(appId: string, nonce: string): Promise<void> {
        const cache = await this.ensureCache();
        const key = this.getKey(appId, nonce);
        await cache.set(key, '1', this.ttl);
    }

    async clear(): Promise<void> {
        const cache = await this.ensureCache();
        if (typeof cache.clear === 'function') {
            await cache.clear();
        }
    }
}
