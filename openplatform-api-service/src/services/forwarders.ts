/**
 * Forwarders
 * Implementations of Forwarder interface for different routing strategies
 */

import { Request } from 'express'
import { RouteConfig, Forwarder, ForwardRouteConfig } from '../types/routing.types'
import { HttpClient } from './http-client.service'
import { getCurrentTraceId } from './trace.service'
import { ResourceValidationRequest } from '../middleware/resource-validation.middleware'

/**
 * Simple logger (consistent with other services)
 */
const logger = {
  info: (message: string, data?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level: 'info', message, ...data }))
  },
  warn: (message: string, data?: Record<string, unknown>) => {
    console.warn(JSON.stringify({ level: 'warn', message, ...data }))
  },
  error: (message: string, data?: Record<string, unknown>) => {
    console.error(JSON.stringify({ level: 'error', message, ...data }))
  },
}

/**
 * Extract wildcard part from path
 * /api/v1/custody/enterprise/wallets -> /enterprise/wallets
 */
function extractWildcardSuffix(path: string, pathPattern: string): string {
  const patternParts = pathPattern.split('*')
  if (patternParts.length === 1) {
    return ''
  }
  const prefix = patternParts[0]
  if (path.startsWith(prefix)) {
    return path.substring(prefix.length)
  }
  return ''
}

/**
 * Find matching forward route configuration for a given path
 * Used to determine the HTTP method for forwarding
 */
function findForwardRoute(
  route: RouteConfig,
  reqPath: string
): ForwardRouteConfig | undefined {
  if (!route.forwardRoutes || route.forwardRoutes.length === 0) {
    return undefined
  }

  const wildcardSuffix = extractWildcardSuffix(reqPath, route.pathPattern)

  return route.forwardRoutes.find(fr => fr.path === wildcardSuffix)
}

/**
 * Default Forwarder
 * Standard request forwarding with basic header forwarding
 */
export class DefaultForwarder implements Forwarder {
  name = 'default'

  async forward(route: RouteConfig, httpClient: HttpClient, req: Request): Promise<unknown> {
    // Use pre-computed backendPath from routeInfo
    const backendPath = route.backendPath

    // Use pre-computed forwardMethod if available
    const forwardMethod = route.method || 'POST'

    // Build headers
    const headers = this.buildHeaders(req)

    logger.info('default_forwarder_request', {
      method: forwardMethod,
      path: req.path,
      backendPath: route.backendPath,
    })

    try {
      // Use the pre-configured HTTP client
      const response = await httpClient.request({
        method: forwardMethod as any,
        url: backendPath,
        headers,
        data: req.body,
        timeout: route.timeout,
        params: req.query,
      })
      return response
    } catch (error: any) {
      logger.error('default_forwarder_error', {
        error: error.message,
        status: error.response?.status,
      })
      throw error
    }
  }

  /**
   * Build forwarding headers
   */
  protected buildHeaders(req: Request): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Forwarded-For': req.ip || 'unknown',
      'X-Forwarded-Method': req.method,
      'X-Forwarded-Path': req.path,
    }

    const traceId = getCurrentTraceId()
    if (traceId) {
      headers['X-Trace-Id'] = traceId
    }

    return headers
  }
}

/**
 * Custody Forwarder
 * Forwarder for custody message forwarding with signature verification
 *
 * Request format:
 * {
 *   basic: { appId, resourceKey, timestamp, nonce, signature },
 *   business: { ... }
 * }
 */
export class CustodyForwarder implements Forwarder {
  name = 'custody'

  /**
   * Validate custody request - signature verification
   */
  async validate(route: RouteConfig, req: Request): Promise<void> {
    const resourceReq = req as ResourceValidationRequest

    // Check basic info exists
    const body = req.body as Record<string, any> | undefined
    if (!body?.basic) {
      throw {
        code: 40101,
        message: 'Missing basic info in request body',
      }
    }

    const { appId, resourceKey, timestamp, nonce, signature } = body.basic

    // Validate required fields
    if (!appId || !resourceKey || !timestamp || !nonce || !signature) {
      throw {
        code: 40101,
        message: 'Missing required basic fields',
      }
    }

    // Note: Full validation (app lookup, signature check, authorization check)
    // is delegated to resource-validation middleware or done here
    // For now, we validate basic format

    logger.info('custody_forwarder_validated', {
      appId,
      resourceKey,
      path: req.path,
    })
  }

  async forward(route: RouteConfig, httpClient: HttpClient, req: Request): Promise<unknown> {
    // Use pre-computed backendPath from routeInfo
    const backendPath = route.backendPath

    // Use pre-computed forwardMethod from routeInfo
    const forwardMethod = route.method || 'POST'

    // Build custody-specific headers
    const headers = this.buildHeaders(req)

    logger.info('custody_forwarder_request', {
      clientMethod: req.method,
      forwardMethod,
      path: req.path,
      backendPath: route.backendPath,
    })

    try {
      // Use the pre-configured HTTP client
      const response = await httpClient.request({
        method: forwardMethod as any,
        url: backendPath,
        headers,
        data: req.body,
        timeout: route.timeout,
        params: req.query,
      })
      return response
    } catch (error: any) {
      logger.error('custody_forwarder_error', {
        error: error.message,
        status: error.response?.status,
      })

      // Forward error response
      if (error.response) {
        throw {
          code: error.response.status,
          message: error.response.data?.message || 'Custody service error',
          data: error.response.data,
        }
      }

      throw {
        code: 50201,
        message: 'Failed to forward to custody service',
      }
    }
  }

  /**
   * Build forwarding headers with custody-specific headers
   */
  protected buildHeaders(req: Request): Record<string, string> {
    const resourceReq = req as ResourceValidationRequest
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Forwarded-For': req.ip || 'unknown',
      'X-Forwarded-Method': req.method,
      'X-Forwarded-Path': req.path,
    }

    // Add custody-specific headers if available
    if (resourceReq.developerContext?.appId) {
      headers['X-Forwarded-AppId'] = resourceReq.developerContext.appId
    }
    if (resourceReq.developerContext?.developerId) {
      headers['X-Forwarded-DeveloperId'] = resourceReq.developerContext.developerId
    }
    if (resourceReq.authorizationId) {
      headers['X-Forwarded-AuthorizationId'] = resourceReq.authorizationId
    }
    if (resourceReq.userId) {
      headers['X-Forwarded-UserId'] = resourceReq.userId
    }
    if (resourceReq.resourceKey) {
      headers['X-Forwarded-ResourceKey'] = resourceReq.resourceKey
    }

    const traceId = getCurrentTraceId()
    if (traceId) {
      headers['X-Trace-Id'] = traceId
    }

    return headers
  }
}

/**
 * Forwarder Registry
 * Manages and provides access to registered forwarders
 */
export class ForwarderRegistryImpl {
  private forwarders: Map<string, Forwarder> = new Map()

  constructor() {
    // Register default forwarders
    this.register(new DefaultForwarder())
    this.register(new CustodyForwarder())
  }

  register(forwarder: Forwarder): void {
    this.forwarders.set(forwarder.name, forwarder)
    logger.info('forwarder_registered', { name: forwarder.name })
  }

  get(name: string): Forwarder | undefined {
    return this.forwarders.get(name)
  }

  getAll(): Forwarder[] {
    return Array.from(this.forwarders.values())
  }
}

// Singleton instance
let forwarderRegistry: ForwarderRegistryImpl | null = null

/**
 * Get forwarder registry instance
 */
export function getForwarderRegistry(): ForwarderRegistryImpl {
  if (!forwarderRegistry) {
    forwarderRegistry = new ForwarderRegistryImpl()
  }
  return forwarderRegistry
}

/**
 * Get forwarder by name
 */
export function getForwarder(name: string): Forwarder | undefined {
  return getForwarderRegistry().get(name)
}

export default {
  DefaultForwarder,
  CustodyForwarder,
  getForwarderRegistry,
  getForwarder,
}
