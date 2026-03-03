/**
 * Trace Middleware
 * Extracts or generates trace_id for each request and propagates to downstream services
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import {
  generateTraceId,
  generateSpanId,
  extractTraceId,
  extractTraceState,
  generateTraceparent,
  generateTraceState,
  setTraceContext,
  runWithTraceContext,
  TRACE_HEADERS,
} from '../services/trace.service';
import { getTraceStorage } from '../services/trace-storage.service';
import { logger } from '../utils/logger';

/**
 * Trace middleware options
 */
export interface TraceMiddlewareOptions {
  /**
   * Whether to generate trace ID for new requests
   * @default true
   */
  generateTraceId?: boolean;

  /**
   * Header name for trace ID
   * @default 'x-trace-id'
   */
  traceIdHeader?: string;

  /**
   * Whether to include trace ID in response headers
   * @default true
   */
  includeInResponse?: boolean;

  /**
   * Whether to start a new span for each request
   * @default true
   */
  startSpan?: boolean;
}

/**
 * Default options
 */
const defaultOptions: Required<TraceMiddlewareOptions> = {
  generateTraceId: true,
  traceIdHeader: 'x-trace-id',
  includeInResponse: true,
  startSpan: true,
};

/**
 * Create trace middleware
 */
export function createTraceMiddleware(options: TraceMiddlewareOptions = {}): RequestHandler {
  const config = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    // Extract or generate trace ID
    let traceId = extractTraceId(req.headers as Record<string, string | string[] | undefined>);

    if (!traceId && config.generateTraceId) {
      traceId = generateTraceId();
    }

    if (!traceId) {
      // No trace ID available, continue without tracing
      return next();
    }

    // Store trace ID in request headers for downstream use
    req.headers[config.traceIdHeader] = traceId;

    // Extract trace state
    const traceState = extractTraceState(req.headers as Record<string, string | string[] | undefined>);

    // Generate span ID for this request
    const spanId = generateSpanId();

    // Parse traceparent if present
    const traceparent = req.headers[TRACE_HEADERS.TRACEPARENT] as string;
    const parentSpanId = traceparent ? traceparent.split('-')[2]?.substring(0, 16) : undefined;

    // Set trace context in AsyncLocalStorage
    setTraceContext({
      traceId,
      spanId,
      parentSpanId,
      sampled: true,
    });

    // Log trace initialization for correlation with C-5-1 request logging
    logger.info('Trace initialized', {
      type: 'trace',
      trace_id: traceId,
      span_id: spanId,
      parent_span_id: parentSpanId,
      method: req.method,
      path: req.path,
    });

    // Run request handling within trace context
    runWithTraceContext({ traceId, spanId, parentSpanId, sampled: true }, () => {
      // Add trace ID to response headers
      if (config.includeInResponse) {
        res.setHeader(config.traceIdHeader, traceId);

        // Add W3C traceparent header
        res.setHeader(
          TRACE_HEADERS.TRACEPARENT,
          generateTraceparent(traceId, spanId, true)
        );

        // Add trace state if present
        if (traceState.size > 0) {
          res.setHeader(TRACE_HEADERS.TRACESTATE, generateTraceState(traceState));
        }
      }

      // Start a new span for this request if enabled
      if (config.startSpan) {
        try {
          const traceStorage = getTraceStorage();
          const startTime = Date.now();

          // Store start time in request for duration calculation
          (req as any)._traceStartTime = startTime;
          (req as any)._traceSpanId = spanId;

          // Create span in storage
          const span = {
            spanId,
            traceId,
            parentId: parentSpanId,
            operationName: `${req.method} ${req.path}`,
            serviceName: 'api-gateway',
            startTime,
            tags: {
              httpMethod: req.method,
              httpUrl: req.originalUrl || req.url,
              httpHost: req.headers.host || '',
              httpScheme: req.protocol,
            },
            logs: [],
          };

          traceStorage.startSpan(traceId, span);
        } catch (error) {
          // Log but don't fail the request
          console.error('Failed to start trace span:', error);
        }
      }

      // Add trace info to response for later use
      res.locals.traceId = traceId;
      res.locals.spanId = spanId;
      res.locals.parentSpanId = parentSpanId;

      // Capture end span on response finish
      const originalEnd = res.end;
      res.end = function (...args: any[]) {
        if (config.startSpan && (req as any)._traceStartTime) {
          try {
            const traceStorage = getTraceStorage();
            const endTime = Date.now();
            const duration = endTime - (req as any)._traceStartTime;

            // Update span with response info
            traceStorage.endSpan(
              (req as any)._traceSpanId,
              {
                endTime,
                duration,
                tags: {
                  httpStatusCode: res.statusCode.toString(),
                  httpStatusText: res.statusMessage,
                  error: res.statusCode >= 400 ? 'true' : 'false',
                },
              }
            );
          } catch (error) {
            // Log but don't fail
            console.error('Failed to end trace span:', error);
          }
        }

        return (originalEnd as any).apply(this, args);
      };

      next();
    });
  };
}

export default {
  createTraceMiddleware,
};
