interface CacheEntry {
    key: string;
    timestamp: number;
}

/**
 * In-memory nonce cache for replay attack prevention
 */
export class NonceCache {
    private cache: Map<string, CacheEntry> = new Map();
    private ttl: number;

    constructor(ttlSeconds: number = 3600) {
        this.ttl = ttlSeconds * 1000;
    }

    private getKey(appId: string, nonce: string): string {
        return `${appId}:${nonce}`;
    }

    async isDuplicate(appId: string, nonce: string): Promise<boolean> {
        const key = this.getKey(appId, nonce);
        const entry = this.cache.get(key);

        if (!entry) {
            return false;
        }

        // Check if expired - if so, clean up and treat as not duplicate
        if (Date.now() > entry.timestamp + this.ttl) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    async record(appId: string, nonce: string): Promise<void> {
        const key = this.getKey(appId, nonce);
        const now = Date.now();

        this.cache.set(key, { key, timestamp: now });

        // Periodic cleanup of expired entries
        if (this.cache.size % 1000 === 0) {
            for (const [k, v] of this.cache.entries()) {
                if (now > v.timestamp + this.ttl) {
                    this.cache.delete(k);
                }
            }
        }
    }

    clear(): void {
        this.cache.clear();
    }
}
