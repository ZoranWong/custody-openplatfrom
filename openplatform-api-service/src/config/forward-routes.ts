/**
 * Forward Routes Configuration
 * Defines routes that should be forwarded to backend services
 *
 * Configuration:
 * - routeId: Unique route identifier
 * - inboundPath: Developer-facing path (matching key)
 * - route: Custody backend path (forwarding target)
 * - method: HTTP method
 * - clientName: Backend service client name
 * - paramMapping: Parameter source mapping (url or context)
 */

/**
 * Parameter source type
 */
export type ParamSource = 'url' | 'context';

/**
 * Forward route configuration
 */
export interface ForwardRouteConfig {
    routeId: string;                                    // Unique route identifier
    inboundPath: string;                                 // Developer-facing path (matching key)
    route: string;                                      // Custody backend path (forwarding target)
    method: string;                                      // HTTP method
    clientName: string;                                  // Backend client name
    paramMapping?: Record<string, ParamSource>;           // Parameter source mapping (optional)
}

export interface BackendClientConfig {
    name: string;
    baseUrl: string;
    defaultTimeout: number;
}

/**
 * Backend clients configuration
 */
export const BACKEND_CLIENTS: BackendClientConfig[] = [
    {
        name: 'custodyService',
        baseUrl: process.env.CUSTODY_SERVICE_GATEWAY || 'http://localhost:4001',
        defaultTimeout: 30000,
    },
];

/**
 * Forward routes configuration
 * Based on docs/thirdparty-integration-guide.md - Third-Party Treasury Unit Management
 */
export const FORWARD_ROUTES: ForwardRouteConfig[] = [
    // ===== Third-Party Treasury Unit Management =====

    // Create treasury unit
    {
        routeId: 'treasury-create',
        inboundPath: '/api/thirdparty/treasury/create',
        route: '/api/third-party/create/{resourceKey}',
        method: 'POST',
        clientName: 'custodyService',
        paramMapping: { resourceKey: 'context' }
    },

    // List treasury units
    {
        routeId: 'treasury-list',
        inboundPath: '/api/thirdparty/treasury/list',
        route: '/api/third-party/list/{resourceKey}',
        method: 'POST',
        clientName: 'custodyService',
        paramMapping: { resourceKey: 'context' }
    },

    // Get treasury unit address
    {
        routeId: 'treasury-address',
        inboundPath: '/api/thirdparty/treasury/address',
        route: '/api/third-party/get-unit-address/{resourceKey}',
        method: 'POST',
        clientName: 'custodyService',
        paramMapping: { resourceKey: 'context' }
    },

    // Payout (出金)
    {
        routeId: 'treasury-payout',
        inboundPath: '/api/thirdparty/treasury/payout',
        route: '/api/third-party/payout/{resourceKey}',
        method: 'POST',
        clientName: 'custodyService',
        paramMapping: { resourceKey: 'context' }
    },

    // Submit task
    {
        routeId: 'treasury-submit-task',
        inboundPath: '/api/thirdparty/treasury/submit-task/{taskId}',
        route: '/api/third-party/submit/task/{resourceKey}/{taskId}',
        method: 'POST',
        clientName: 'custodyService',
        paramMapping: { resourceKey: 'context', taskId: 'url' }
    },

    // Query activities
    {
        routeId: 'treasury-activities',
        inboundPath: '/api/thirdparty/treasury/activities',
        route: '/api/third-party/activities/{resourceKey}',
        method: 'POST',
        clientName: 'custodyService',
        paramMapping: { resourceKey: 'context' }
    },

    // Query transfer-out orders
    {
        routeId: 'treasury-transfer-out',
        inboundPath: '/api/thirdparty/treasury/transfer-out-orders',
        route: '/api/third-party/transfer-out-orders/{resourceKey}',
        method: 'POST',
        clientName: 'custodyService',
        paramMapping: { resourceKey: 'context' }
    },

    // Query transfer-in orders
    {
        routeId: 'treasury-transfer-in',
        inboundPath: '/api/thirdparty/treasury/transfer-in-orders',
        route: '/api/third-party/transfer-in-orders/{resourceKey}',
        method: 'POST',
        clientName: 'custodyService',
        paramMapping: { resourceKey: 'context' }
    },

    // Query fund records
    {
        routeId: 'treasury-fund-records',
        inboundPath: '/api/thirdparty/treasury/fund-records',
        route: '/api/third-party/fund-records/{resourceKey}',
        method: 'POST',
        clientName: 'custodyService',
        paramMapping: { resourceKey: 'context' }
    },
];

// Validate forward routes on module load
validateForwardRoutes(FORWARD_ROUTES);

/**
 * Get backend client by name
 */
export function getBackendClient(name: string): BackendClientConfig | undefined {
    return BACKEND_CLIENTS.find(client => client.name === name);
}

/**
 * Normalize path: remove duplicate slashes and trailing slash
 * @param path - Path to normalize
 * @returns Normalized path
 */
export function normalizePath(path: string): string {
    // Remove duplicate slashes and trailing slash
    return path
        .replace(/\/+/g, '/')  // Replace multiple slashes with single slash
        .replace(/\/+$/, '');  // Remove trailing slash
}

/**
 * Parameter validation regex pattern: alphanumeric, underscore, hyphen, 1-64 chars
 */
const PARAM_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * Path traversal detection pattern
 */
const PATH_TRAVERSAL_PATTERN = /\.\.|\.\//;

/**
 * Validate parameter value to prevent path injection
 * @param value - Parameter value to validate
 * @returns Whether the value is valid
 */
export function validateParamValue(value: string): boolean {
    if (!value || typeof value !== 'string') {
        return false;
    }
    // Check length and allowed characters
    if (!PARAM_PATTERN.test(value)) {
        return false;
    }
    // Check for path traversal attempts
    if (PATH_TRAVERSAL_PATTERN.test(value)) {
        return false;
    }
    return true;
}

/**
 * Extract URL parameters from inboundPath pattern
 * @param inboundPath - Matching pattern, e.g., /submit-task/{taskId}
 * @param actualPath - Actual request path, e.g., /submit-task/123
 * @returns Extracted parameters, e.g., { taskId: '123' }
 * @throws Error if required parameter is missing
 */
export function extractUrlParams(inboundPath: string, actualPath: string): Record<string, string> {
    const params: Record<string, string> = {};
    const patternParts = normalizePath(inboundPath).split('/');
    const pathParts = normalizePath(actualPath).split('/');

    // Check if path has enough segments for required parameters
    if (pathParts.length < patternParts.length) {
        // Find which parameter is missing
        for (let i = 0; i < patternParts.length; i++) {
            const part = patternParts[i];
            if (part.startsWith('{') && part.endsWith('}')) {
                const paramName = part.slice(1, -1);
                if (i >= pathParts.length) {
                    throw new Error(`Missing required parameter: ${paramName}`);
                }
            }
        }
    }

    for (let i = 0; i < patternParts.length; i++) {
        const part = patternParts[i];
        if (part.startsWith('{') && part.endsWith('}')) {
            const paramName = part.slice(1, -1);
            const value = pathParts[i];
            if (value !== undefined) {
                params[paramName] = value;
            }
        }
    }

    return params;
}

/**
 * Find matching forward route by inboundPath
 * @param normalizedPath - Normalized request path
 * @returns Matched route config and URL parameters
 */
export function findForwardRoute(normalizedPath: string): { config: ForwardRouteConfig; urlParams: Record<string, string> } | undefined {
    for (const route of FORWARD_ROUTES) {
        if (matchRoute(route.inboundPath, normalizedPath)) {
            const urlParams = extractUrlParams(route.inboundPath, normalizedPath);
            return { config: route, urlParams };
        }
    }
    return undefined;
}

/**
 * Match route pattern with path
 * Supports patterns like /order/{id} where {id} matches any segment
 * @param pattern - Route pattern
 * @param path - Actual path
 * @returns Whether the path matches the pattern
 */
function matchRoute(pattern: string, path: string): boolean {
    const patternParts = normalizePath(pattern).split('/');
    const pathParts = normalizePath(path).split('/');

    if (patternParts.length !== pathParts.length) {
        return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
        const patternPart = patternParts[i];
        const pathPart = pathParts[i];

        // If pattern part is a parameter placeholder, it matches anything
        if (patternPart.startsWith('{') && patternPart.endsWith('}')) {
            continue;
        }

        // Otherwise, exact match required
        if (patternPart !== pathPart) {
            return false;
        }
    }

    return true;
}

/**
 * Extract parameters from route template
 * @param route - Route template with placeholders
 * @returns Array of parameter names
 */
function extractParamsFromTemplate(route: string): string[] {
    const params: string[] = [];
    const parts = route.split('/');
    for (const part of parts) {
        if (part.startsWith('{') && part.endsWith('}')) {
            params.push(part.slice(1, -1));
        }
    }
    return params;
}

/**
 * Build-time configuration validation
 * - Detect duplicate inboundPath
 * - Detect unmapped parameters in route
 * - Detect invalid clientName references
 * @param routes - Array of route configurations
 * @throws Error if validation fails
 */
export function validateForwardRoutes(routes: ForwardRouteConfig[]): void {
    // Check for duplicate inboundPath
    const inboundPathSet = new Set<string>();
    for (const route of routes) {
        if (inboundPathSet.has(route.inboundPath)) {
            throw new Error(`Duplicate inboundPath: ${route.inboundPath}`);
        }
        inboundPathSet.add(route.inboundPath);
    }

    // Check for duplicate routeId
    const routeIdSet = new Set<string>();
    for (const route of routes) {
        if (routeIdSet.has(route.routeId)) {
            throw new Error(`Duplicate routeId: ${route.routeId}`);
        }
        routeIdSet.add(route.routeId);
    }

    // Check for unmapped parameters in route
    const defaultParamMapping: Record<string, ParamSource> = { resourceKey: 'context' };
    for (const route of routes) {
        const routeParams = extractParamsFromTemplate(route.route);
        const paramMapping = route.paramMapping || defaultParamMapping;

        for (const param of routeParams) {
            // resourceKey defaults to context, other params must be explicitly mapped
            if (param !== 'resourceKey' && !paramMapping[param]) {
                throw new Error(`Unmapped parameter '${param}' in route '${route.routeId}': ${route.route}`);
            }
        }
    }

    // Check for invalid clientName references
    for (const route of routes) {
        const client = getBackendClient(route.clientName);
        if (!client) {
            throw new Error(`Invalid clientName '${route.clientName}' in route '${route.routeId}'`);
        }
    }
}
