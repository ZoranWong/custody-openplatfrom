/**
 * Forward Routes Configuration
 * Defines routes that should be forwarded to backend services
 *
 * Configuration:
 * - route: Route pattern with path parameters (e.g., /order/{id:string})
 * - method: HTTP method (GET, POST, PUT, DELETE, etc.)
 * - clientName: Backend service client name
 */

export interface ForwardRouteConfig {
    route: string;
    method: string;
    clientName: string;
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
        name: 'custody-enterprise',
        baseUrl: process.env.CUSTODY_ENTERPRISE_URL || 'http://localhost:4001',
        defaultTimeout: 30000,
    },
];

/**
 * Forward routes configuration
 * Based on Custody-backend.md - Third-Party Financial Unit (Treasury Unit) Management
 */
export const FORWARD_ROUTES: ForwardRouteConfig[] = [
    // ===== Third-Party Financial Unit (Treasury Unit) Management =====

    // Create treasury unit
    { route: '/third-party/create/{resourceAccessKey}', method: 'POST', clientName: 'custody-enterprise' },

    // List treasury units
    { route: '/third-party/list/{resourceAccessKey}', method: 'POST', clientName: 'custody-enterprise' },

    // Get treasury unit address
    { route: '/third-party/get-unit-address/{resourceAccessKey}', method: 'POST', clientName: 'custody-enterprise' },

    // Payout (出金)
    { route: '/third-party/payout/{resourceAccessKey}', method: 'POST', clientName: 'custody-enterprise' },

    // Submit task
    { route: '/third-party/submit/task/{resourceAccessKey}/{taskId}', method: 'POST', clientName: 'custody-enterprise' },

    // Query activities
    { route: '/third-party/activities/{resourceAccessKey}', method: 'POST', clientName: 'custody-enterprise' },

    // Query transfer-out orders
    { route: '/third-party/transfer-out-orders/{resourceAccessKey}', method: 'POST', clientName: 'custody-enterprise' },

    // Query transfer-in orders
    { route: '/third-party/transfer-in-orders/{resourceAccessKey}', method: 'POST', clientName: 'custody-enterprise' },

    // Query fund records
    { route: '/third-party/fund-records/{resourceAccessKey}', method: 'POST', clientName: 'custody-enterprise' },
];

/**
 * Get backend client by name
 */
export function getBackendClient(name: string): BackendClientConfig | undefined {
    return BACKEND_CLIENTS.find(client => client.name === name);
}

/**
 * Find matching forward route
 */
export function findForwardRoute(path: string, method: string): ForwardRouteConfig | undefined {
    return FORWARD_ROUTES.find(route => {
        if (route.method !== method) return false;
        return matchRoute(route.route, path);
    });
}

/**
 * Match route pattern with path
 * Supports patterns like /order/{id} where {id} matches any segment
 */
function matchRoute(pattern: string, path: string): boolean {
    // Convert pattern like /order/{id} to regex
    const regexPattern = pattern
        .replace(/\{[^}]+\}/g, '[^/]+')  // Replace {param} with regex
        .replace(/\//g, '\\/');           // Escape slashes

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
}
