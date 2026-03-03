/**
 * Request Routing Service
 * Core logic for routing requests to backend services
 */

import { AxiosRequestConfig } from 'axios';
import {
  RouteConfig,
  BackendServiceConfig,
  RoutingResult,
  RoutingInfo,
  ServiceHealth,
} from '../types/routing.types';
import { HttpClient, createHttpClient, generateTraceId } from './http-client.service';
import { ROUTE_TABLE, findRoute, findRouteWithInfo } from '../config/routes';
import { BACKEND_SERVICES, getBackendService } from '../config/backend-services';
import { getForwarder, getForwarderRegistry } from './forwarders';
import { Request } from 'express';

/**
 * Simple structured logger
 */
const logger = {
  info: (message: string, data?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level: 'info', message, ...data }));
  },
  warn: (message: string, data?: Record<string, unknown>) => {
    console.warn(JSON.stringify({ level: 'warn', message, ...data }));
  },
  error: (message: string, data?: Record<string, unknown>) => {
    console.error(JSON.stringify({ level: 'error', message, ...data }));
  },
};

/**
 * Request Routing Service
 * Handles route matching and request forwarding to backend services
 */
export class RequestRoutingService {
  private readonly httpClients: Map<string, HttpClient> = new Map();
  private readonly routeTable: RouteConfig[];
  private readonly serviceHealth: Map<string, ServiceHealth> = new Map();

  constructor(
    backendServices: BackendServiceConfig[] = BACKEND_SERVICES,
    routeTable: RouteConfig[] = ROUTE_TABLE
  ) {
    this.routeTable = routeTable;

    // Initialize HTTP clients for each backend service
    for (const config of backendServices) {
      const client = createHttpClient(config);
      this.httpClients.set(config.name, client);
      logger.info('http_client_initialized', {
        service: config.name,
        baseUrl: config.baseUrl,
      });
    }
  }

  /**
   * Find matching route for a request
   */
  findRoute(path: string, method: string): RoutingResult {
    const route = findRoute(path, method);

    if (!route) {
      logger.warn('route_not_found', { path, method });
      return {
        allowed: false,
        error_code: 40401,
        error_message: 'Route not found',
      };
    }

    logger.info('route_found', {
      path,
      method,
      backendService: route.backendService,
      backendPath: route.backendPath,
    });

    return {
      allowed: true,
      backendService: route.backendService,
      backendPath: route.backendPath,
      timeout: route.timeout,
    };
  }

  /**
   * Forward request to backend service using configured forwarder
   */
  async forwardRequest(
    method: string,
    path: string,
    body: unknown,
    query: Record<string, unknown>,
    headers: Record<string, string>,
    appid?: string,
    enterpriseId?: string,
    traceId?: string,
    req?: Request
  ): Promise<unknown> {
    // Try to get routing info already stored on request (from middleware)
    // This avoids redundant route lookup
    const storedRouteInfo = req ? (req as any).routingInfo : undefined
    const routeInfo = storedRouteInfo || findRouteWithInfo(path, method)

    if (!routeInfo.allowed) {
      throw {
        code: routeInfo.error_code,
        message: routeInfo.error_message,
        trace_id: traceId,
      };
    }

    // Get forwarder name, default to 'default'
    const forwarderName = routeInfo.forwarder || 'default';
    const forwarder = getForwarder(forwarderName);

    if (!forwarder) {
      logger.error('forwarder_not_found', {
        forwarder: forwarderName,
        path,
      });
      throw {
        code: 50001,
        message: `Forwarder not found: ${forwarderName}`,
        trace_id: traceId,
      };
    }

    // Build full route config with parsed info
    const fullRoute: RouteConfig = {
      pathPattern: '',  // Not needed by forwarder
      backendService: routeInfo.backendService!,
      backendPath: routeInfo.backendPath!,
      timeout: routeInfo.timeout,
      forwarder: routeInfo.forwarder,
      forwardRoutes: routeInfo.forwardRoute ? [routeInfo.forwardRoute] : undefined,
    };

    // If we have the original request, use forwarder's forward method
    if (req) {
      logger.info('using_forwarder', {
        forwarder: forwarderName,
        path,
        method,
      });

      // Get the HTTP client for the backend service
      const httpClient = this.httpClients.get(routeInfo.backendService!);
      if (!httpClient) {
        throw {
          code: 50201,
          message: `Backend service client not found: ${routeInfo.backendService}`,
          trace_id: traceId,
        };
      }

      try {
        // Pass the pre-configured HTTP client to the forwarder
        const response = await forwarder.forward(fullRoute, httpClient, req);
        return response;
      } catch (error: any) {
        logger.error('forwarder_error', {
          forwarder: forwarderName,
          error: error.message,
        });
        throw error;
      }
    }

    // Fallback: original forwarding logic for backward compatibility
    return this.forwardWithClient(routeInfo, method, path, body, query, headers, appid, enterpriseId, traceId);
  }

  /**
   * Original forwarding logic using HttpClient (fallback)
   */
  private async forwardWithClient(
    route: RoutingResult,
    method: string,
    path: string,
    body: unknown,
    query: Record<string, unknown>,
    headers: Record<string, string>,
    appid?: string,
    enterpriseId?: string,
    traceId?: string
  ): Promise<unknown> {
    const client = this.httpClients.get(route.backendService!);
    if (!client) {
      const error = new Error(`Backend service not found: ${route.backendService}`);
      logger.error('backend_service_not_found', {
        service: route.backendService,
        path,
      });
      throw {
        code: 50001,
        message: 'Internal routing error',
        trace_id: traceId,
        internalError: error.message,
      };
    }

    // Build request configuration
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;
    if (!validMethods.includes(method as typeof validMethods[number])) {
      throw {
        code: 40001,
        message: 'Invalid HTTP method',
        trace_id: traceId,
      };
    }

    const requestConfig: AxiosRequestConfig = {
      method: method,
      url: route.backendPath,
      headers: {
        ...headers,
        // Preserve original headers but override with forwarding headers
        'X-Forwarded-For': headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown',
        'X-Forwarded-AppId': appid || '',
        'X-Forwarded-EnterpriseId': enterpriseId || '',
        'X-Original-Path': path,
        'X-Original-Method': method,
        'X-Trace-Id': traceId || generateTraceId(),
      },
      params: query,
      data: body,
      timeout: route.timeout || 30000,
    };

    logger.info('forwarding_request', {
      backendService: route.backendService,
      backendPath: route.backendPath,
      method,
      originalPath: path,
      traceId: requestConfig.headers?.['X-Trace-Id'],
    });

    try {
      const response = await client.request(requestConfig);

      logger.info('backend_response_received', {
        backendService: route.backendService,
        status: response.status,
        traceId: requestConfig.headers?.['X-Trace-Id'],
      });

      return response;
    } catch (error: unknown) {
      const axiosError = error as {
        code?: string;
        response?: { status: number; data: unknown };
        message?: string;
        retryCount?: number;
      };

      logger.error('backend_request_failed', {
        backendService: route.backendService,
        backendPath: route.backendPath,
        errorCode: axiosError.code,
        httpStatus: axiosError.response?.status,
        retryCount: axiosError.retryCount,
        traceId: requestConfig.headers?.['X-Trace-Id'],
      });

      // Re-throw with trace ID
      throw {
        code: axiosError.response?.status || 50001,
        message:
          (axiosError.response?.data as { message?: string })?.message ||
          axiosError.message ||
          'Backend service error',
        trace_id: requestConfig.headers?.['X-Trace-Id'],
        retryCount: axiosError.retryCount,
      };
    }
  }

  /**
   * Check health of all backend services
   */
  async checkAllServicesHealth(): Promise<ServiceHealth[]> {
    const healthChecks: Promise<ServiceHealth>[] = [];

    for (const [name, client] of this.httpClients) {
      healthChecks.push(this.checkServiceHealth(name, client));
    }

    const results = await Promise.all(healthChecks);

    // Update cache
    for (const health of results) {
      this.serviceHealth.set(health.serviceName, health);
    }

    return results;
  }

  /**
   * Check health of a single service
   */
  private async checkServiceHealth(
    name: string,
    client: HttpClient
  ): Promise<ServiceHealth> {
    const startTime = Date.now();
    const serviceConfig = getBackendService(name);

    try {
      const result = await client.healthCheck();
      const health: ServiceHealth = {
        serviceName: name,
        healthy: result.healthy,
        lastCheck: new Date(),
        responseTime: result.responseTime,
      };

      logger.info('service_health_check', {
        service: name,
        healthy: result.healthy,
        responseTime: result.responseTime,
      });

      return health;
    } catch (error) {
      const health: ServiceHealth = {
        serviceName: name,
        healthy: false,
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      logger.warn('service_health_check_failed', {
        service: name,
        error: health.error,
      });

      return health;
    }
  }

  /**
   * Get cached health status for a service
   */
  getServiceHealth(serviceName: string): ServiceHealth | undefined {
    return this.serviceHealth.get(serviceName);
  }

  /**
   * Get all registered services
   */
  getRegisteredServices(): string[] {
    return Array.from(this.httpClients.keys());
  }

  /**
   * Check if a service is healthy
   */
  isServiceHealthy(serviceName: string): boolean {
    const health = this.serviceHealth.get(serviceName);
    return health?.healthy ?? false;
  }

  /**
   * Get routing info for logging/monitoring
   */
  getRoutingInfo(path: string, method: string): RoutingInfo | null {
    const route = this.findRoute(path, method);
    if (!route.allowed) {
      return null;
    }

    return {
      backendService: route.backendService!,
      backendPath: route.backendPath!,
    };
  }
}

/**
 * Create default request routing service
 */
let routingServiceInstance: RequestRoutingService | null = null;

export function getRequestRoutingService(): RequestRoutingService {
  if (!routingServiceInstance) {
    routingServiceInstance = new RequestRoutingService();
  }
  return routingServiceInstance;
}

/**
 * Reset the singleton instance (for testing purposes)
 */
export function resetRequestRoutingService(): void {
  routingServiceInstance = null;
}

export function createRequestRoutingService(
  backendServices?: BackendServiceConfig[],
  routeTable?: RouteConfig[]
): RequestRoutingService {
  return new RequestRoutingService(backendServices, routeTable);
}
