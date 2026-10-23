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
  routeId: string; // Unique route identifier
  name?: string; // Human-readable API name for display
  inboundPath: string; // Developer-facing path (matching key)
  route: string; // Custody backend path (forwarding target)
  method: string; // HTTP method
  clientName: string; // Backend client name
  paramMapping?: Record<string, ParamSource>; // Parameter source mapping (optional)
  responseHandler?: (response: any) => Promise<any>; // Custom response handler
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
 * Based on Apifox Custody-backend (13 APIs):
 *   https://s.apifox.cn/f3031687-1674-45bb-b4fd-13d3bf8cf910/llms.txt
 *   docs/thirdparty-integration-guide.md - Third-Party Treasury Unit Management
 */
export const FORWARD_ROUTES: ForwardRouteConfig[] = [
  // ===== Third-Party Treasury Unit Management =====

  // Create treasury unit
  {
    routeId: 'treasury-create',
    name: 'Create Treasury Unit',
    inboundPath: '/api/thirdparty/treasury/create',
    route: '/api/third-party/create/{resourceKey}',
    method: 'POST',
    clientName: 'custodyService',
    paramMapping: { resourceKey: 'context' },
  },

  // List treasury units
  {
    routeId: 'treasury-list',
    name: 'List Treasury Units',
    inboundPath: '/api/thirdparty/treasury/list',
    route: '/api/third-party/list/{resourceKey}',
    method: 'POST',
    clientName: 'custodyService',
    paramMapping: { resourceKey: 'context' },
  },

  // Get treasury unit address
  {
    routeId: 'treasury-address',
    name: 'Get Treasury Unit Address',
    inboundPath: '/api/thirdparty/treasury/address',
    route: '/api/third-party/get-unit-address/{resourceKey}',
    method: 'POST',
    clientName: 'custodyService',
    paramMapping: { resourceKey: 'context' },
  },

  // Payout (出金)
  {
    routeId: 'treasury-payout',
    name: 'Create Payout',
    inboundPath: '/api/thirdparty/treasury/payout',
    route: '/api/third-party/payout/{resourceKey}',
    method: 'POST',
    clientName: 'custodyService',
    paramMapping: { resourceKey: 'context' },
  },

  // Submit task
  {
    routeId: 'treasury-submit-task',
    name: 'Submit Task',
    inboundPath: '/api/thirdparty/treasury/submit-task/{taskId}',
    route: '/api/third-party/submit/task/{resourceKey}/{taskId}',
    method: 'POST',
    clientName: 'custodyService',
    paramMapping: { resourceKey: 'context', taskId: 'url' },
  },

  // Query activities
  {
    routeId: 'treasury-activities',
    name: 'List Activities',
    inboundPath: '/api/thirdparty/treasury/activities',
    route: '/api/third-party/activities/{resourceKey}',
    method: 'POST',
    clientName: 'custodyService',
    paramMapping: { resourceKey: 'context' },
  },

  // Query transfer-out orders
  {
    routeId: 'treasury-transfer-out',
    name: 'List Transfer-Out Orders',
    inboundPath: '/api/thirdparty/treasury/transfer-out-orders',
    route: '/api/third-party/transfer-out-orders/{resourceKey}',
    method: 'POST',
    clientName: 'custodyService',
    paramMapping: { resourceKey: 'context' },
  },

  // Query transfer-in orders
  {
    routeId: 'treasury-transfer-in',
    name: 'List Transfer-In Orders',
    inboundPath: '/api/thirdparty/treasury/transfer-in-orders',
    route: '/api/third-party/transfer-in-orders/{resourceKey}',
    method: 'POST',
    clientName: 'custodyService',
    paramMapping: { resourceKey: 'context' },
  },

  // Query fund records
  {
    routeId: 'treasury-fund-records',
    name: 'List Fund Records',
    inboundPath: '/api/thirdparty/treasury/fund-records',
    route: '/api/third-party/fund-records/{resourceKey}',
    method: 'POST',
    clientName: 'custodyService',
    paramMapping: { resourceKey: 'context' },
  },
  // Query unit fund records
  {
    routeId: 'treasury-unit-fund-records',
    name: 'List Unit Fund Records',
    inboundPath: '/api/thirdparty/treasury/unit-fund-records',
    route: '/api/third-party/unit-fund-records/{resourceKey}',
    method: 'POST',
    clientName: 'custodyService',
    paramMapping: { resourceKey: 'context' },
  },

  // Pooling request (归集请求)
  {
    routeId: 'treasury-pooling',
    name: 'Pooling Request',
    inboundPath: '/api/thirdparty/treasury/pooling',
    route: '/api/third-party/pooling/{resourceKey}',
    method: 'POST',
    clientName: 'custodyService',
    paramMapping: { resourceKey: 'context' },
  },

  // Create unit address by unit account type (创建地址)
  {
    routeId: 'treasury-create-unit-address',
    name: 'Create Unit Address',
    inboundPath: '/api/thirdparty/treasury/create-unit-address/{unitId}/{accountType}/{network}/{coinId}/{number}',
    route: '/api/third-party/create-unit-address/{resourceKey}/{unitId}/{accountType}/{network}/{coinId}/{number}',
    method: 'POST',
    clientName: 'custodyService',
    paramMapping: {
      resourceKey: 'context',
      unitId: 'url',
      accountType: 'url',
      network: 'url',
      coinId: 'url',
      number: 'url',
    },
  },

  // Create unit address by account id (根据账户id创建地址)
  {
    routeId: 'treasury-create-unit-address-by-account',
    name: 'Create Unit Address By Account',
    inboundPath: '/api/thirdparty/treasury/create-unit-address-by-account/{cusAccountId}/{number}',
    route: '/api/third-party/create-unit-address/{resourceKey}/{cusAccountId}/{number}',
    method: 'POST',
    clientName: 'custodyService',
    paramMapping: { resourceKey: 'context', cusAccountId: 'url', number: 'url' },
  },

  // List unit accounts (查询账户列表)
  {
    routeId: 'treasury-list-unit-account',
    name: 'List Unit Accounts',
    inboundPath: '/api/thirdparty/treasury/list-unit-account/{unitId}',
    route: '/api/third-party/list-unit-account/{resourceKey}/{unitId}',
    method: 'POST',
    clientName: 'custodyService',
    paramMapping: { resourceKey: 'context', unitId: 'url' },
  },

  // Get unit address by account id (根据账户id查询地址)
  {
    routeId: 'treasury-address-by-account',
    name: 'Get Unit Address By Account',
    inboundPath: '/api/thirdparty/treasury/address-by-account/{cusAccountId}',
    route: '/api/third-party/get-unit-address/{resourceKey}/{cusAccountId}',
    method: 'POST',
    clientName: 'custodyService',
    paramMapping: { resourceKey: 'context', cusAccountId: 'url' },
  },

  // ===== Third-Party Enterprise & User Management =====

  // Create custom treasury unit (创建自定义结构unit)
  {
    routeId: 'treasury-create-custom',
    name: 'Create Custom Treasury Unit',
    inboundPath: '/api/thirdparty/treasury/create-custom',
    route: '/api/third-party/create-custom/{resourceKey}',
    method: 'POST',
    clientName: 'custodyService',
    paramMapping: { resourceKey: 'context' },
  },

  // Register merchant enterprise (三方平台注册企业) — no resourceKey
  {
    routeId: 'merchant-register',
    name: 'Register Merchant',
    inboundPath: '/api/thirdparty/merchant/register',
    route: '/api/third-party/merchant/register',
    method: 'POST',
    clientName: 'custodyService',
  },

  // Add user (三方平台添加用户)
  {
    routeId: 'user-add',
    name: 'Add User',
    inboundPath: '/api/thirdparty/user/add',
    route: '/api/third-party/user/add/{resourceKey}',
    method: 'POST',
    clientName: 'custodyService',
    paramMapping: { resourceKey: 'context' },
  },

  // Initialize board (初始化护卫队)
  {
    routeId: 'board-init',
    name: 'Initialize Board',
    inboundPath: '/api/thirdparty/board/init',
    route: '/api/third-party/board/init/{resourceKey}',
    method: 'POST',
    clientName: 'custodyService',
    paramMapping: { resourceKey: 'context' },
  },

  // Add coins to unit (给财务单元添加币种/网络)
  {
    routeId: 'treasury-add-coins',
    name: 'Add Coins',
    inboundPath: '/api/thirdparty/treasury/add-coins',
    route: '/api/third-party/add-coins/{resourceKey}',
    method: 'POST',
    clientName: 'custodyService',
    paramMapping: { resourceKey: 'context' },
  },

  // Update fund control rules (修改资金流控制规则)
  {
    routeId: 'treasury-fund-control-update',
    name: 'Update Fund Control',
    inboundPath: '/api/thirdparty/treasury/fund-control-update',
    route: '/api/third-party/fundControl/update/{resourceKey}',
    method: 'POST',
    clientName: 'custodyService',
    paramMapping: { resourceKey: 'context' },
  },

  // Update whitelist (白名单设置) — note backend misspells 'whiltlist'
  {
    routeId: 'treasury-whiltlist-update',
    name: 'Update Whitelist',
    inboundPath: '/api/thirdparty/treasury/whitelist-update',
    route: '/api/third-party/whiltlist/update/{resourceKey}',
    method: 'POST',
    clientName: 'custodyService',
    paramMapping: { resourceKey: 'context' },
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
