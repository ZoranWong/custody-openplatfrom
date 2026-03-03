/**
 * Request Logger Service
 * Service for logging HTTP requests and responses with structured data
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  logger,
  createChildLogger,
  setTraceId,
  clearTraceId,
  logRequest,
  logResponse,
  logError,
} from '../utils/logger.js';

/**
 * Request data interface
 */
export interface RequestData {
  method: string;
  path: string;
  url?: string;
  query?: Record<string, unknown>;
  headers: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  contentLength?: number;
  appid?: string;
  traceId?: string;
}

/**
 * Response data interface
 */
export interface ResponseData {
  status: number;
  responseTime: number;
  responseLength?: number;
  traceId?: string;
}

/**
 * Error data interface
 */
export interface ErrorData {
  message: string;
  error?: Error;
  context?: Record<string, unknown>;
  traceId?: string;
}

/**
 * Create request logger middleware
 * Logs incoming requests and outgoing responses
 */
export function createRequestLoggerMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Get or generate trace ID
    const traceId = req.headers['x-trace-id'] as string || uuidv4();
    req.headers['x-trace-id'] = traceId;
    res.setHeader('x-trace-id', traceId);

    // Set trace ID for logger context
    setTraceId(traceId);

    // Capture start time
    const startTime = process.hrtime.bigint();

    // Get client IP
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
               req.ip ||
               req.socket.remoteAddress ||
               '-';

    // Get user agent
    const userAgent = req.headers['user-agent'] || '-';

    // Get app ID from headers
    const appid = req.headers['x-app-id'] as string || '-';

    // Log incoming request
    logRequest({
      method: req.method,
      path: req.path,
      query: req.query as Record<string, unknown>,
      headers: {
        'content-type': req.headers['content-type'],
        'accept': req.headers['accept'],
      },
      ip,
      userAgent,
      contentLength: parseInt(req.headers['content-length'] as string || '0', 10),
      appid,
      traceId,
    });

    // Capture response
    const originalSend = res.send;
    let responseLength = 0;

    res.send = function (body: any): Response {
      responseLength = Buffer.isBuffer(body)
        ? body.length
        : typeof body === 'string'
          ? Buffer.byteLength(body)
          : Buffer.byteLength(JSON.stringify(body));

      return originalSend.call(this, body);
    };

    // Log response when finished
    res.on('finish', () => {
      const endTime = process.hrtime.bigint();
      const responseTime = Number(endTime - startTime) / 1_000_000; // Convert to ms

      logResponse({
        status: res.statusCode,
        responseTime,
        responseLength,
        traceId,
      });

      // Clear trace ID
      clearTraceId();
    });

    // Handle errors
    res.on('error', (err: Error) => {
      logError({
        message: 'Response error',
        error: err,
        context: { traceId },
        traceId,
      });
      clearTraceId();
    });

    next();
  };
}

/**
 * Create request logger service instance
 */
export function createRequestLoggerService() {
  const childLogger = createChildLogger({ service: 'request-logger' });

  return {
    /**
     * Log incoming request
     */
    logRequest(data: RequestData): void {
      childLogger.info('Request received', {
        type: 'request',
        method: data.method,
        path: data.path,
        query: data.query,
        ip: data.ip,
        user_agent: data.userAgent,
        content_length: data.contentLength,
        appid: data.appid,
        trace_id: data.traceId,
      });
    },

    /**
     * Log outgoing response
     */
    logResponse(data: ResponseData): void {
      const level = data.status >= 500 ? 'error' :
                    data.status >= 400 ? 'warn' : 'info';

      childLogger.log(level, 'Response sent', {
        type: 'response',
        status: data.status,
        response_time: data.responseTime,
        response_length: data.responseLength,
        trace_id: data.traceId,
      });
    },

    /**
     * Log error with stack trace
     */
    logError(data: ErrorData): void {
      childLogger.error(data.message, {
        type: 'error',
        error: data.error?.message,
        stack: data.error?.stack,
        context: data.context,
        trace_id: data.traceId,
      });
    },

    /**
     * Create middleware for specific route
     */
    middleware() {
      return createRequestLoggerMiddleware();
    },
  };
}

/**
 * Default export - create and export service instance
 */
export const requestLoggerService = createRequestLoggerService();

export default {
  createRequestLoggerMiddleware,
  createRequestLoggerService,
  requestLoggerService,
};
