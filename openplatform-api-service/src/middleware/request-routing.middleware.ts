/**
 * Request Routing Middleware
 * Express middleware for routing requests to backend services
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/jwt.types';
import {
    RequestRoutingService,
    createRequestRoutingService,
} from '../services/request-routing.service';
import { errorMapper } from '../services/error-mapper.service';
import { RoutingInfo, RoutingResult } from '../types/routing.types';
import { findRouteWithInfo } from '../config/routes';

/**
 * Routes that should be handled locally by this API server
 * instead of being forwarded to a backend service
 */
const LOCAL_ROUTES = [
    '/api/v1/applications',
    '/api/v1/isv',
    '/api/v1/billing',
    '/api/v1/usage',
    '/api/v1/admin',  // Admin authentication and management
    '/api/v1/oauth', // OAuth token and validation
];

/**
 * Check if a path should be handled locally
 */
function isLocalRoute(path: string): boolean {
    const isLocal = LOCAL_ROUTES.some(route => path.startsWith(route));
    logger.info('checking_local_route', { path, isLocal });
    return isLocal;
}

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
 * Configuration for routing middleware
 */
export interface RoutingMiddlewareConfig {
    /**
     * Custom routing service instance
     */
    routingService?: RequestRoutingService;

    /**
     * Whether to skip routing for health/check endpoints
     * @default true
     */
    skipHealthEndpoints?: boolean;
}

/**
 * Create request routing middleware
 */
export function createRequestRoutingMiddleware(
    config?: RoutingMiddlewareConfig
) {
    const routingService =
        config?.routingService || createRequestRoutingService();

    const skipHealthEndpoints = config?.skipHealthEndpoints ?? true;

    return async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        // Skip health/check endpoints
        if (skipHealthEndpoints) {
            const healthPatterns = ['/health', '/ready', '/metrics', '/ping'];
            if (healthPatterns.some((p) => req.path.startsWith(p))) {
                return next();
            }
        }

        // Skip routing for local routes - let Express route handlers handle them
        if (isLocalRoute(req.path)) {
            logger.info('local_route_skip', {
                path: req.path,
                method: req.method,
                body: req.body,
                query: req.query,
            });
            return next();
        }

        // Generate or get trace ID
        const traceId =
            (req.headers['x-trace-id'] as string) ||
            res.getHeader('X-Trace-Id') ||
            `rout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        res.setHeader('X-Trace-Id', traceId as string);

        try {
            // Use optimized findRouteWithInfo to get all routing info in one call
            const routeInfo = findRouteWithInfo(req.path, req.method);

            if (!routeInfo.allowed) {
                logger.info('route_not_found', {
                    path: req.path,
                    method: req.method,
                    traceId,
                });

                res.status(404).json({
                    code: routeInfo.error_code || 40401,
                    message: routeInfo.error_message || 'Route not found',
                    trace_id: traceId,
                });
                return;
            }

            // Attach routing info to request for downstream use (includes forwarder, forwardRoute, etc.)
            (req as any).routingInfo = routeInfo;
            (req as any).traceId = traceId;

            // Log request parameters
            // const sanitizedBody = req.body ? { ...req.body, appToken: req.body.appToken ? `${(req.body.appToken as string).substring(0, 20)}...` : undefined } : undefined;
            logger.info('route_matched', {
                path: req.path,
                method: req.method,
                backendService: routeInfo.backendService,
                backendPath: routeInfo.backendPath,
                forwarder: routeInfo.forwarder,
                traceId,
                query: req.query,
                body: req.body,
            });

            next();
        } catch (error) {
            logger.error('routing_middleware_error', {
                error: error instanceof Error ? error.message : String(error),
                path: req.path,
                traceId,
            });

            res.status(500).json({
                code: 50001,
                message: 'Internal routing error',
                trace_id: traceId,
            });
        }
    };
}

/**
 * Create backend request forwarding middleware
 * This middleware actually forwards the request to the backend
 */
export function createBackendForwardingMiddleware(
    routingService: RequestRoutingService = createRequestRoutingService()
) {
    return async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        // Skip forwarding for local routes
        if (isLocalRoute(req.path)) {
            return next();
        }

        const routingInfo = (req as any).routingInfo as RoutingInfo | undefined;
        const traceId = (req as any).traceId as string | undefined;

        if (!routingInfo) {
            logger.warn('no_routing_info', { path: req.path });
            return next();
        }

        try {
            const startTime = Date.now();

            // Forward request to backend
            const response = await routingService.forwardRequest(
                req.method,
                req.path,
                req.body,
                req.query as Record<string, unknown>,
                req.headers as Record<string, string>,
                req.appid,
                req.enterprise_id,
                traceId,
                req
            );

            const duration = Date.now() - startTime;

            logger.info('backend_response_forwarded', {
                backendService: routingInfo.backendService,
                backendPath: routingInfo.backendPath,
                duration,
                traceId,
            });

            // Send response back to client
            if (typeof response === 'object' && response !== null) {
                res.json(response);
            } else {
                res.send(response);
            }
        } catch (error) {
            const err = error as {
                code?: number;
                message?: string;
                trace_id?: string;
                retryCount?: number;
            };

            const mappedError = errorMapper.mapError(
                { code: err.code, message: err.message },
                traceId || 'unknown'
            );

            logger.error('backend_forwarding_failed', {
                backendService: routingInfo.backendService,
                errorCode: err.code,
                traceId: err.trace_id || traceId,
                retryCount: err.retryCount,
            });

            // Determine HTTP status code
            let httpStatus = 500;
            if (err.code && err.code >= 400 && err.code < 600) {
                httpStatus = err.code;
            } else if (err.code === 401) {
                httpStatus = 401;
            } else if (err.code === 403) {
                httpStatus = 403;
            } else if (err.code === 404) {
                httpStatus = 404;
            } else if (err.code === 429) {
                httpStatus = 429;
            } else if (err.code === 504) {
                httpStatus = 504;
            }

            res.status(httpStatus).json(mappedError);
        }
    };
}

/**
 * Combined routing and forwarding middleware
 * Use this for simple cases where routing and forwarding are together
 */
export function createCombinedRoutingMiddleware(
    config?: RoutingMiddlewareConfig
) {
    const routingMiddleware = createRequestRoutingMiddleware(config);
    const forwardingMiddleware = createBackendForwardingMiddleware(
        config?.routingService
    );

    return async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        // First, find the route
        const routeInfo = (req as any).routingInfo as RoutingInfo | undefined;

        if (!routeInfo) {
            // Need to find route first
            await new Promise<void>((resolve, reject) => {
                routingMiddleware(req, res, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }

        // Check if route was found
        const newRouteInfo = (req as any).routingInfo as RoutingInfo | undefined;
        if (!newRouteInfo) {
            // Route not found was already handled by routingMiddleware
            return;
        }

        // Forward to backend
        await new Promise<void>((resolve, reject) => {
            forwardingMiddleware(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    };
}

/**
 * Routing middleware instance for simple use cases
 */
export const requestRoutingMiddleware = createRequestRoutingMiddleware();

/**
 * Get routing info from request
 */
export function getRoutingInfo(req: Request): RoutingInfo | null {
    return (req as any).routingInfo || null;
}

/**
 * Get trace ID from request
 */
export function getTraceId(req: Request): string | null {
    return (req as any).traceId || (req.headers['x-trace-id'] as string) || null;
}
