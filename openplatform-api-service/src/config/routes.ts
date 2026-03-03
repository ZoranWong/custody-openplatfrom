/**
 * Route Table Configuration
 * Maps API paths to backend services
 */

import { RouteConfig, RoutingResult, ForwardRouteConfig } from '../types/routing.types';

/**
 * Route table defining API path to backend service mappings
 *
 * Path Pattern Rules:
 * - Exact match: '/api/v1/resource' matches only that exact path
 * - Wildcard match: '/api/v1/resource*' matches '/api/v1/resource/123', '/api/v1/resource/sub/456'
 * - Method filter: Optional, ßif not specified matches all HTTP methods
 *
 * Backend Path Substitution:
 * - ${1} captures everything after the wildcard
 * - Example: pathPattern '/api/v1/enterprises*' with path '/api/v1/enterprises/123'
 *   produces backendPath '/api/v1/enterprises/123'
 */
export const ROUTE_TABLE: RouteConfig[] = [
    // ============Custody 消息转发 (使用 custody forwarder)===========
    // 统一入口：客户端所有请求使用 POST，通过 forwardRoutes 配置决定实际转发使用的 HTTP 方法
    {
        pathPattern: '/api/oauth/custody/*',
        forwarder: 'custody',
        backendService: 'custody-enterprise',
        backendPath: '/api/custody${1}',
        timeout: 30000,
        retryable: false,
        forwardRoutes: [
            // Enterprise 相关
            { path: '/enterprise/wallets', method: 'GET' },
            { path: '/enterprise/wallets', method: 'POST' },
            { path: '/enterprise/wallets/:id', method: 'GET' },
            { path: '/enterprise/wallets/:id', method: 'PUT' },
            { path: '/enterprise/wallets/:id', method: 'DELETE' },
            // Payment 相关
            { path: '/payment/orders', method: 'GET' },
            { path: '/payment/orders', method: 'POST' },
            { path: '/payment/orders/:id', method: 'GET' },
            { path: '/payment/orders/:id', method: 'PUT' },
            // Transfer 相关
            { path: '/transfer/transactions', method: 'GET' },
            { path: '/transfer/transactions', method: 'POST' },
            // Transaction 相关
            { path: '/transaction/history', method: 'GET' },
            // Account 相关
            { path: '/account/balances', method: 'GET' },
        ]
    },
];

/**
 * Extract wildcard suffix from path
 */
function extractWildcardSuffix(path: string, pathPattern: string): string {
    if (!pathPattern.endsWith('*')) {
        return ''
    }
    const prefix = pathPattern.slice(0, -1)
    if (path.startsWith(prefix)) {
        return path.substring(prefix.length)
    }
    return ''
}

/**
 * Build full backend path by replacing ${1} with wildcard suffix
 */
function buildBackendPath(backendPath: string, wildcardSuffix: string): string {
    return backendPath.replace('${1}', wildcardSuffix) || backendPath
}

/**
 * Find forward route config for the request path
 */
function findForwardRoute(
    forwardRoutes: ForwardRouteConfig[] | undefined,
    path: string,
    pathPattern: string
): ForwardRouteConfig | undefined {
    if (!forwardRoutes || forwardRoutes.length === 0) {
        return undefined
    }
    const wildcardSuffix = extractWildcardSuffix(path, pathPattern)
    return forwardRoutes.find(fr => fr.path === wildcardSuffix)
}

/**
 * Find matching route for a given path and method
 * Returns complete routing result including forwarder info and parsed path info
 */
export function findRoute(
    path: string,
    method: string
): RouteConfig | undefined {
    // First try exact match with method
    const exactMatch = ROUTE_TABLE.find(
        (route) =>
            route.pathPattern === path &&
            (!route.method || route.method === method)
    );
    if (exactMatch) {
        return exactMatch;
    }

    // Try wildcard match
    const wildcardMatch = ROUTE_TABLE.find((route) => {
        if (!route.pathPattern.endsWith('*')) return false;
        if (route.method && route.method !== method) return false;

        // Convert wildcard pattern to regex
        const pattern = route.pathPattern.slice(0, -1) + '.*';
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(path);
    });

    return wildcardMatch;
}

/**
 * Find matching route with full parsing info
 * Optimized version that returns all needed info in one call
 * Includes computed backendPath and forwardMethod
 */
export function findRouteWithInfo(
    path: string,
    method: string
): RoutingResult {
    const route = findRoute(path, method);

    if (!route) {
        return {
            allowed: false,
            error_code: 40401,
            error_message: 'Route not found',
        };
    }

    // Extract wildcard suffix
    const wildcardSuffix = extractWildcardSuffix(path, route.pathPattern);

    // Find forward route for HTTP method
    const forwardRoute = findForwardRoute(route.forwardRoutes, path, route.pathPattern);

    // Compute full backend path
    const fullBackendPath = buildBackendPath(route.backendPath, wildcardSuffix);

    // Determine forward method
    const forwardMethod = forwardRoute?.method || route.method;

    return {
        allowed: true,
        backendService: route.backendService,
        backendPath: fullBackendPath,  // Already computed
        timeout: route.timeout,
        forwarder: route.forwarder,
        wildcardSuffix,  // Already computed
        forwardRoute,
        forwardMethod,  // Already determined
    };
}

/**
 * Get all routes for a specific backend service
 */
export function getRoutesForService(serviceName: string): RouteConfig[] {
    return ROUTE_TABLE.filter((route) => route.backendService === serviceName);
}
