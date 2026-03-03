/**
 * Structured Logger
 * Winston wrapper for structured JSON logging with trace_id support
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Log directory configuration - use process.cwd() for compatibility
const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
const env = process.env.NODE_ENV || 'development';

/**
 * Log level configuration per environment
 */
const logLevelConfig = {
  development: {
    console: 'debug',
    file: 'info',
    audit: 'warn',
  },
  production: {
    console: 'warn',
    file: 'info',
    audit: 'warn',
  },
  test: {
    console: 'debug',
    file: 'info',
    audit: 'debug',
  },
};

const levels = logLevelConfig[env as keyof typeof logLevelConfig] || logLevelConfig.development;

/**
 * Custom format with trace_id support
 */
const addTraceId = winston.format((info) => {
  // Get trace_id from various sources
  const traceId = (info as any).trace_id ||
                  (global as any).__trace_id ||
                  '-';
  info.trace_id = traceId;
  return info;
});

/**
 * JSON format with timestamp
 */
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'ISO' }),
  addTraceId(),
  winston.format.json()
);

/**
 * Console format for development
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, trace_id, ...metadata }) => {
    let msg = `${timestamp} [${level}]`;
    if (trace_id && trace_id !== '-') {
      msg += ` [${trace_id}]`;
    }
    msg += ` ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

/**
 * Create file transporter with rotation
 */
function createFileTransport(filename: string, level: string): winston.transport {
  const logSubDir = path.join(logDir, filename.split('.')[0]);

  // Create directory if it doesn't exist
  if (!fs.existsSync(logSubDir)) {
    fs.mkdirSync(logSubDir, { recursive: true });
  }

  return new winston.transports.File({
    filename: path.join(logSubDir, filename),
    level,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 30, // 30 days retention
    format: jsonFormat,
  });
}

/**
 * Logger configuration
 */
const loggerConfig: winston.LoggerOptions = {
  level: levels.console,
  levels: {
    error: 0,
    warn: 1,
    audit: 2,
    info: 3,
    debug: 4,
  },
  format: jsonFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      level: levels.console,
      format: env === 'production' ? jsonFormat : consoleFormat,
    }),
  ],
  // Handle uncaught exceptions
  exceptionHandlers: [
    createFileTransport('exceptions.log', 'error'),
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    createFileTransport('rejections.log', 'error'),
  ],
};

// Add file transports in production
if (env === 'production' || process.env.ENABLE_FILE_LOGGING === 'true') {
  const existingTransports = loggerConfig.transports as winston.transport[] | undefined;
  loggerConfig.transports = [
    ...(existingTransports || []),
    // Access logs
    createFileTransport('access.log', levels.file),
    // Error logs
    createFileTransport('error.log', 'error'),
    // Audit logs (separate file for security events)
    createFileTransport('audit.log', levels.audit),
  ];
}

/**
 * Create logger instance
 */
const logger = winston.createLogger(loggerConfig);

// Named export for logger
export { logger };

/**
 * Create child logger with default context
 */
export function createChildLogger(context: Record<string, unknown>): winston.Logger {
  return logger.child(context);
}

/**
 * Set trace_id for current context
 */
export function setTraceId(traceId: string): void {
  (global as any).__trace_id = traceId;
}

/**
 * Clear trace_id
 */
export function clearTraceId(): void {
  delete (global as any).__trace_id;
}

/**
 * Log request with structured data
 */
export function logRequest(data: {
  method: string;
  path: string;
  query?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  contentLength?: number;
  traceId?: string;
  appid?: string;
}): void {
  logger.info('Incoming request', {
    type: 'request',
    method: data.method,
    path: data.path,
    query: data.query,
    headers: data.headers,
    ip: data.ip,
    user_agent: data.userAgent,
    content_length: data.contentLength,
    trace_id: data.traceId,
    appid: data.appid,
  });
}

/**
 * Log response with structured data
 */
export function logResponse(data: {
  status: number;
  responseTime: number;
  responseLength?: number;
  traceId?: string;
}): void {
  const level = data.status >= 500 ? 'error' :
                data.status >= 400 ? 'warn' : 'info';

  logger.log(level, 'Response sent', {
    type: 'response',
    status: data.status,
    response_time: data.responseTime,
    response_length: data.responseLength,
    trace_id: data.traceId,
  });
}

/**
 * Log authentication failure
 */
export function logAuthFailure(data: {
  appid?: string;
  reason: string;
  details?: Record<string, unknown>;
  traceId?: string;
}): void {
  logger.warn('Authentication failed', {
    type: 'audit',
    event: 'auth_failure',
    appid: data.appid,
    reason: data.reason,
    details: data.details,
    trace_id: data.traceId || (global as any).__trace_id,
  });
}

/**
 * Log authorization failure
 */
export function logAuthzFailure(data: {
  appid?: string;
  enterpriseId?: string;
  requiredPermission?: string;
  reason?: string;
  traceId?: string;
}): void {
  logger.warn('Authorization failed', {
    type: 'audit',
    event: 'authz_failure',
    appid: data.appid,
    enterprise_id: data.enterpriseId,
    required_permission: data.requiredPermission,
    reason: data.reason,
    trace_id: data.traceId || (global as any).__trace_id,
  });
}

/**
 * Log rate limit hit
 */
export function logRateLimitHit(data: {
  appid?: string;
  ip?: string;
  endpoint?: string;
  limit?: number;
  remaining?: number;
  resetTime?: Date;
  traceId?: string;
}): void {
  logger.warn('Rate limit hit', {
    type: 'audit',
    event: 'rate_limit',
    appid: data.appid,
    ip: data.ip,
    endpoint: data.endpoint,
    limit: data.limit,
    remaining: data.remaining,
    reset_time: data.resetTime?.toISOString(),
    trace_id: data.traceId || (global as any).__trace_id,
  });
}

/**
 * Log validation error
 */
export function logValidationError(data: {
  appid?: string;
  path?: string;
  errors?: Array<{ field: string; message: string }>;
  traceId?: string;
}): void {
  logger.warn('Validation error', {
    type: 'audit',
    event: 'validation_error',
    appid: data.appid,
    path: data.path,
    errors: data.errors,
    trace_id: data.traceId || (global as any).__trace_id,
  });
}

/**
 * Log error with stack trace
 */
export function logError(data: {
  message: string;
  error?: Error;
  context?: Record<string, unknown>;
  traceId?: string;
}): void {
  logger.error(data.message, {
    type: 'error',
    error: data.error?.message,
    stack: data.error?.stack,
    context: data.context,
    trace_id: data.traceId || (global as any).__trace_id,
  });
}

export default logger;
