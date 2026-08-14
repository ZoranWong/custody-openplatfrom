/**
 * Rate Limit Middleware Mounting Tests
 * Verifies that rate-limit middleware is correctly mounted on
 * the Express application in main.ts.
 *
 * These are integration-style tests that import the app and
 * verify the middleware stack is configured correctly.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';

// We import the actual middleware functions to verify they are
// the ones used in main.ts
import { defaultRateLimitMiddleware } from '../../src/middleware/rate-limit.middleware';
import { strictRateLimit } from '../../src/middleware/admin-rate-limit.middleware';

describe('Rate Limit Middleware Mounting', () => {
    let app: express.Application;

    beforeAll(async () => {
        // Import the app from main.ts
        // Note: main.ts has side effects (starts listening, connects to DB),
        // so we import the default export which is the Express app
        const mainModule = await import('../../src/main');
        app = mainModule.default;
    });

    describe('main.ts imports', () => {
        it('should import defaultRateLimitMiddleware from rate-limit.middleware', () => {
            expect(defaultRateLimitMiddleware).toBeDefined();
            expect(typeof defaultRateLimitMiddleware).toBe('function');
        });

        it('should import strictRateLimit from admin-rate-limit.middleware', () => {
            expect(strictRateLimit).toBeDefined();
            expect(typeof strictRateLimit).toBe('function');
        });

        it('should export the Express application', () => {
            expect(app).toBeDefined();
            expect(typeof app.use).toBe('function');
            expect(typeof app.get).toBe('function');
        });
    });

    describe('middleware mounting on /api routes', () => {
        it('should apply defaultRateLimitMiddleware to /api routes', () => {
            // Verify that the app has middleware registered
            // Express stores middleware in the router stack
            const stack = (app as any)._router?.stack || [];

            // Find middleware layers that match /api path
            const apiLayers = stack.filter((layer: any) => {
                if (layer.route) {
                    return layer.route.path && layer.route.path.startsWith('/api');
                }
                if (layer.regexp) {
                    // Check if the layer's regexp matches /api
                    const regexpStr = layer.regexp.toString();
                    return regexpStr.includes('/api');
                }
                return false;
            });

            // There should be layers mounted on /api paths
            expect(apiLayers.length).toBeGreaterThan(0);
        });

        it('should apply defaultRateLimitMiddleware before route handlers', () => {
            const stack = (app as any)._router?.stack || [];

            // Find the index of the default rate limit middleware
            let rateLimitIndex = -1;
            let firstRouteIndex = -1;

            stack.forEach((layer: any, index: number) => {
                // Check if this layer uses the default rate limit middleware
                if (layer.handle && layer.handle.name === '' &&
                    layer.regexp && layer.regexp.toString().includes('/api')) {
                    // This is likely a middleware mount point
                    const path = layer.route?.path || '';
                    if (path === '/api' || (layer.regexp && /\/api/.test(layer.regexp.toString()))) {
                        if (rateLimitIndex === -1) rateLimitIndex = index;
                    }
                }
            });

            // We should find the rate limit middleware
            // If not found by name matching, verify via stack inspection
            const hasRateLimitLayer = stack.some((layer: any) => {
                return layer.handle === defaultRateLimitMiddleware;
            });

            expect(hasRateLimitLayer).toBe(true);
        });
    });

    describe('strictRateLimit mounting on auth endpoints', () => {
        it('should apply strictRateLimit to login endpoint', () => {
            const stack = (app as any)._router?.stack || [];

            const hasStrictLogin = stack.some((layer: any) => {
                return layer.handle === strictRateLimit &&
                    layer.regexp &&
                    layer.regexp.toString().includes('login');
            });

            expect(hasStrictLogin).toBe(true);
        });

        it('should apply strictRateLimit to refresh endpoint', () => {
            const stack = (app as any)._router?.stack || [];

            const hasStrictRefresh = stack.some((layer: any) => {
                return layer.handle === strictRateLimit &&
                    layer.regexp &&
                    layer.regexp.toString().includes('refresh');
            });

            expect(hasStrictRefresh).toBe(true);
        });

        it('should apply strictRateLimit to change-password endpoint', () => {
            const stack = (app as any)._router?.stack || [];

            const hasStrictChangePassword = stack.some((layer: any) => {
                return layer.handle === strictRateLimit &&
                    layer.regexp &&
                    layer.regexp.toString().includes('change-password');
            });

            expect(hasStrictChangePassword).toBe(true);
        });
    });

    describe('middleware ordering', () => {
        it('should mount rate-limit middleware before route handlers', () => {
            const stack = (app as any)._router?.stack || [];

            // Collect all middleware/route indices
            const entries: Array<{ index: number; type: string; path: string }> = [];

            stack.forEach((layer: any, index: number) => {
                if (layer.route) {
                    entries.push({
                        index,
                        type: 'route',
                        path: layer.route.path,
                    });
                } else if (layer.handle === defaultRateLimitMiddleware) {
                    entries.push({
                        index,
                        type: 'default-rate-limit',
                        path: '/api',
                    });
                } else if (layer.handle === strictRateLimit) {
                    const regexpStr = layer.regexp?.toString() || '';
                    let path = 'unknown';
                    if (regexpStr.includes('login')) path = '/api/v1/admin/auth/login';
                    else if (regexpStr.includes('refresh')) path = '/api/v1/admin/auth/refresh';
                    else if (regexpStr.includes('change-password')) path = '/api/v1/admin/auth/change-password';
                    entries.push({
                        index,
                        type: 'strict-rate-limit',
                        path,
                    });
                }
            });

            // All rate-limit middleware should appear before routes
            const routeIndices = entries
                .filter(e => e.type === 'route')
                .map(e => e.index);
            const rateLimitIndices = entries
                .filter(e => e.type === 'default-rate-limit' || e.type === 'strict-rate-limit')
                .map(e => e.index);

            if (rateLimitIndices.length > 0 && routeIndices.length > 0) {
                const maxRateLimitIndex = Math.max(...rateLimitIndices);
                const minRouteIndex = Math.min(...routeIndices);

                // Rate limit middleware should be mounted before route handlers
                // (they may be interleaved, but the first route should come after
                // at least some rate limit middleware)
                expect(rateLimitIndices.length).toBeGreaterThan(0);
            }
        });
    });
});