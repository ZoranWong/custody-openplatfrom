/**
 * Routing Types
 * Defines interfaces for request routing configuration
 */

import type { Request } from 'express';
import type { HttpClient } from '../services/http-client.service';

/**
 * Forward route configuration for specifying HTTP method per path
 * Used with wildcard path patterns to define method for each specific path
 */
export interface ForwardRouteConfig {
  /**
   * Path suffix (the part after the wildcard)
   * Example: for '/api/v1/custody/*', path could be '/wallets'
   */
  path: string;

  /**
   * HTTP method to use when forwarding to backend service
   */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

/**
 * Route configuration for API path to backend service mapping
 */
export interface RouteConfig {
  /**
   * API path pattern (supports wildcard *)
   * Examples: '/api/v1/enterprises', '/api/v1/enterprises*', '/api/v1/*'
   */
  pathPattern: string;

  /**
   * HTTP method filter (optional)
   * If not specified, route matches all methods
   * For forwarder-based routing, use forwardRoutes instead
   */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL';

  /**
   * Forwarder name used to process and forward the request
   * Options: 'default', 'custody', or custom forwarder name
   * @default 'default'
   */
  forwarder?: string;

  /**
   * Backend service identifier
   */
  backendService: string;

  /**
   * Backend path pattern with variable substitution
   * ${1} captures the wildcard suffix
   * Example: '/api/v1/enterprises${1}' for '/api/v1/enterprises/123'
   */
  backendPath: string;

  /**
   * Request timeout in milliseconds
   * @default 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Whether this request is idempotent and safe to retry
   * @default true for GET, PUT, DELETE; false for POST
   */
  retryable?: boolean;

  /**
   * Forward routes configuration for wildcard patterns
   * Used to specify HTTP method for each specific path
   * Example:
   *   pathPattern: '/api/v1/custody/*'
   *   forwardRoutes: [
   *     { path: '/wallets', method: 'GET' },
   *     { path: '/orders', method: 'POST' }
   *   ]
   */
  forwardRoutes?: ForwardRouteConfig[];
}

/**
 * Backend service configuration
 */
export interface BackendServiceConfig {
  /**
   * Unique service identifier (matches backendService in RouteConfig)
   */
  name: string;

  /**
   * Base URL of the backend service
   */
  baseUrl: string;

  /**
   * Health check endpoint path
   */
  healthCheckPath?: string;

  /**
   * Default request timeout in milliseconds
   * @default 30000 (30 seconds)
   */
  defaultTimeout: number;

  /**
   * Maximum retry attempts for failed requests
   * @default 3
   */
  maxRetries?: number;

  /**
   * Delay between retries in milliseconds
   * @default 1000
   */
  retryDelay?: number;
}

/**
 * Result of route matching
 */
export interface RoutingResult {
  /**
   * Whether a matching route was found
   */
  allowed: boolean;

  /**
   * Backend service identifier (if allowed)
   */
  backendService?: string;

  /**
   * Backend path with substitutions applied (if allowed)
   */
  backendPath?: string;

  /**
   * Timeout for this specific request (if allowed)
   */
  timeout?: number;

  /**
   * Error code (if not allowed)
   */
  error_code?: number;

  /**
   * Error message (if not allowed)
   */
  error_message?: string;

  /**
   * Forwarder name (if configured)
   */
  forwarder?: string;

  /**
   * Wildcard suffix extracted from path (e.g., '/enterprise/wallets' from '/api/v1/custody/enterprise/wallets')
   */
  wildcardSuffix?: string;

  /**
   * Forward route config for HTTP method determination
   */
  forwardRoute?: ForwardRouteConfig;

  /**
   * Pre-computed HTTP method for forwarding (already determined)
   */
  forwardMethod?: string;
}

/**
 * Request routing information attached to the request
 */
export interface RoutingInfo {
  /**
   * Backend service identifier
   */
  backendService: string;

  /**
   * Backend path being called
   */
  backendPath: string;

  /**
   * Whether the request was retried
   */
  retryCount?: number;
}

/**
 * Backend service health status
 */
export interface ServiceHealth {
  serviceName: string;
  healthy: boolean;
  lastCheck: Date;
  responseTime?: number;
  error?: string;
}

/**
 * Error mapping configuration
 */
export interface ErrorMappingConfig {
  /**
   * Custody error code
   */
  custodyCode: number;

  /**
   * Platform error code
   */
  platformCode: number;

  /**
   * Default message if not provided
   */
  defaultMessage: string;
}

/**
 * Forwarder interface for request processing and forwarding
 * Different forwarders handle request validation, parameter assembly, and forwarding differently
 */
export interface Forwarder {
  /**
   * Forwarder name
   */
  name: string;

  /**
   * Process and forward the request to backend service
   * @param route matched route configuration
   * @param httpClient pre-configured HTTP client from backend service
   * @param req original HTTP request
   * @returns Forwarded response from backend service
   */
  forward(
    route: RouteConfig,
    httpClient: HttpClient,
    req: Request
  ): Promise<unknown>;

  /**
   * Validate request before forwarding
   * @param route matched route configuration
   * @param req original HTTP request
   * @returns Validation result, throw error if validation fails
   */
  validate?(route: RouteConfig, req: Request): Promise<void>;
}

/**
 * Forwarder registry for managing available forwarders
 */
export interface ForwarderRegistry {
  /**
   * Register a forwarder
   */
  register(forwarder: Forwarder): void;

  /**
   * Get forwarder by name
   */
  get(name: string): Forwarder | undefined;

  /**
   * Get all registered forwarders
   */
  getAll(): Forwarder[];
}
