/**
 * Metrics Middleware
 * Express middleware for collecting request metrics
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/jwt.types';
import {
  createMetricsCollectorService,
  getMetricsCollector,
  MetricsCollectorService,
} from '../services/metrics-collector.service';

/**
 * Create metrics middleware
 */
export function createMetricsMiddleware(): (
  req: Request,
  res: Response,
  next: NextFunction
) => void {
  const metricsCollector = createMetricsCollectorService();

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip metrics for health and metrics endpoints
    if (
      req.path === '/health' ||
      req.path === '/metrics' ||
      req.path === '/ready' ||
      req.path === '/ping'
    ) {
      return next();
    }

    // Record start time
    const startTime = Date.now();

    // Increment active requests
    metricsCollector.incrementActiveRequests();

    // Get appid from request (if authenticated)
    const appid = (req as AuthenticatedRequest).appid || (req.body as any)?.appid || 'unknown';

    // Capture original end method
    const originalEnd = res.end.bind(res);

    // Override end method to capture response completion
    res.end = function (
      chunk?: any,
      encoding?: any,
      callback?: any
    ): typeof res {
      // Calculate duration
      const duration = Date.now() - startTime;

      // Get response status code
      const statusCode = res.statusCode;

      // Get request method
      const method = req.method;

      // Get endpoint (use original URL for path)
      const endpoint = req.originalUrl || req.url;

      // Record metrics asynchronously (don't block response)
      try {
        metricsCollector.recordRequest({
          method,
          endpoint,
          statusCode,
          duration,
          appid,
        });
      } catch (error) {
        // Log error but don't fail the request
        console.error('Error recording metrics:', error);
      }

      // Decrement active requests
      metricsCollector.decrementActiveRequests();

      // Call original end
      if (chunk !== undefined) {
        if (encoding === undefined) {
          // Fast path for most common case
          originalEnd(chunk, callback);
        } else {
          originalEnd(chunk, encoding, callback);
        }
      } else {
        originalEnd(callback);
      }

      return res;
    } as typeof res.end;

    next();
  };
}

/**
 * Get metrics collector instance
 */
export function getMetricsMiddleware(): (
  req: Request,
  res: Response,
  next: NextFunction
) => void {
  return createMetricsMiddleware();
}

export default createMetricsMiddleware;
