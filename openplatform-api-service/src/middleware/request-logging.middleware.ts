/**
 * Request Logging Middleware
 * Custom Morgan tokens for enhanced request logging
 */

import morgan from 'morgan';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Morgan token type augmentation
interface MorganTokenGenerator {
  (req: Request, res: Response): string;
}

// Custom token storage
const customTokens: Map<string, MorganTokenGenerator> = new Map();

/**
 * Register custom morgan tokens
 */
function registerCustomTokens(): void {
  // Token: trace_id - get or generate trace ID
  morgan.token('trace_id', (req: Request) => {
    const traceId = req.headers['x-trace-id'] as string;
    if (traceId) return traceId;
    // If no trace ID, generate one (shouldn't happen as middleware runs first)
    return uuidv4();
  });

  // Token: appid - get application ID from auth
  morgan.token('appid', (req: Request) => {
    const appid = req.headers['x-app-id'] as string ||
                  (req as any).appId ||
                  (req as any).appid ||
                  '-';
    return appid;
  });

  // Token: response_time - calculate response time
  morgan.token('response_time', (req: Request, res: Response) => {
    const startTime = (req as any)._startTime;
    if (!startTime) return '-';
    const diff = process.hrtime(startTime);
    const ms = diff[0] * 1000 + diff[1] / 1000000;
    return ms.toFixed(2);
  });

  // Token: status - HTTP status code (already built-in but redefined for clarity)
  morgan.token('status', (req: Request, res: Response) => {
    return res.statusCode.toString();
  });

  // Token: ip - client IP address
  morgan.token('ip', (req: Request) => {
    const forwarded = req.headers['x-forwarded-for'] as string;
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || '-';
  });

  // Token: user_agent
  morgan.token('user_agent', (req: Request) => {
    return req.headers['user-agent'] || '-';
  });

  // Token: content_length - request content length
  morgan.token('content_length', (req: Request) => {
    return req.headers['content-length'] || '0';
  });

  // Token: response_length - response content length
  morgan.token('response_length', (req: Request, res: Response) => {
    const contentLength = res.getHeader('content-length');
    return contentLength ? contentLength.toString() : '0';
  });

  // Token: path_with_method - combine method and path
  morgan.token('path_with_method', (req: Request) => {
    return `${req.method} ${req.originalUrl || req.url}`;
  });
}

/**
 * Create custom JSON format for logging
 * This format includes all required fields per acceptance criteria
 */
function createJsonFormat(): string {
  return JSON.stringify({
    timestamp: ':date[iso]',
    trace_id: ':trace_id',
    appid: ':appid',
    method: ':method',
    path: ':url',
    ip: ':ip',
    user_agent: ':user_agent',
    content_length: ':content_length',
    response_time: ':response_time',
    status: ':status',
    response_length: ':response_length',
  });
}

/**
 * Create compact JSON format (no spaces)
 */
function createCompactJsonFormat(): string {
  const format = createJsonFormat();
  return format.replace(/\s/g, '');
}

/**
 * Create combined format with trace_id
 */
function createCombinedFormat(): string {
  return ':trace_id :appid :path_with_method :status :response_time :content_length - :response_length';
}

/**
 * Get environment-specific format
 */
export function getMorganFormat(): string {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'production') {
    return createCompactJsonFormat();
  }

  // Development - use JSON for structured logging
  return createJsonFormat();
}

/**
 * Initialize request logging middleware
 * This should be called before using morgan
 */
export function initRequestLogging(): void {
  registerCustomTokens();
}

/**
 * Create request logging middleware with custom format
 */
export function createRequestLoggingMiddleware() {
  initRequestLogging();

  // Set custom format for JSON logging
  const format = getMorganFormat();

  return morgan(format, {
    stream: {
      write: (message: string) => {
        // Handle JSON log message
        try {
          const logObj = JSON.parse(message.trim());
          // Use console.log to output
          console.log(JSON.stringify({
            ...logObj,
            level: 'info',
          }));
        } catch {
          // If not JSON, just output as-is
          console.log(message.trim());
        }
      },
    },
    // Skip health checks to reduce noise
    skip: (req: Request) => {
      return req.path === '/health' || req.path === '/healthcheck';
    },
  });
}

/**
 * Create audit logging format for security events
 */
export function createAuditFormat(): string {
  return JSON.stringify({
    timestamp: ':date[iso]',
    level: 'audit',
    trace_id: ':trace_id',
    appid: ':appid',
    event: ':event',
    status: ':status',
    ip: ':ip',
    user_agent: ':user_agent',
    reason: ':reason',
  });
}

export default {
  initRequestLogging,
  createRequestLoggingMiddleware,
  getMorganFormat,
  createAuditFormat,
};
