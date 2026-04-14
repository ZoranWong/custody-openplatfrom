/**
 * In-memory nonce cache for replay attack prevention
 */
export class NonceCache {
    private cache: Map<string, number> = new Map();
    private ttl: number;

    constructor(ttlSeconds: number = 3600) {
        this.ttl = ttlSeconds * 1000;
    }

    private getKey(appId: string, nonce: string): string {
        return `${appId}:${nonce}`;
    }

    async isDuplicate(appId: string, nonce: string): Promise<boolean> {
        const key = this.getKey(appId, nonce);
        return this.cache.has(key);
    }

    async record(appId: string, nonce: string): Promise<void> {
        const key = this.getKey(appId, nonce);
        this.cache.set(key, Date.now());

        // Cleanup old entries periodically
        if (this.cache.size > 10000) {
            const now = Date.now();
            for (const [k, v] of this.cache.entries()) {
                if (now - v > this.ttl) {
                    this.cache.delete(k);
                }
            }
        }
    }

    clear(): void {
        this.cache.clear();
    }
}
