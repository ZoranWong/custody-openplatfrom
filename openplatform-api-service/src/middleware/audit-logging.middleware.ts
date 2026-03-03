/**
 * Audit Logging Middleware
 * Middleware for logging security events: auth failures, authz failures,
 * rate limit hits, and validation errors
 */

import { Request, Response, NextFunction } from 'express';
import {
  logAuthFailure,
  logAuthzFailure,
  logRateLimitHit,
  logValidationError,
  logger,
} from '../utils/logger.js';

/**
 * Audit event types
 */
export type AuditEventType =
  | 'auth_failure'
  | 'authz_failure'
  | 'rate_limit'
  | 'validation_error';

/**
 * Audit log data
 */
export interface AuditLogData {
  event: AuditEventType;
  appid?: string;
  enterpriseId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  reason?: string;
  details?: Record<string, unknown>;
  traceId?: string;
}

/**
 * Create audit logging middleware
 * This middleware logs security-related events
 */
export function createAuditLoggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Get common data
    const traceId = req.headers['x-trace-id'] as string || '-';
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
               req.ip ||
               req.socket.remoteAddress ||
               '-';
    const userAgent = req.headers['user-agent'] || '-';
    const appid = (req as any).appId || (req.headers['x-app-id'] as string) || '-';

    // Store audit data in request for other middlewares to use
    (req as any)._auditData = {
      traceId,
      ip,
      userAgent,
      appid,
      path: req.path,
      method: req.method,
    };

    next();
  };
}

/**
 * Log authentication failure
 * Call this from signature middleware when signature validation fails
 */
export function logSignatureFailure(
  req: Request,
  reason: 'invalid_signature' | 'expired_timestamp' | 'missing_signature' | 'invalid_appid',
  details?: Record<string, unknown>
): void {
  const auditData = (req as any)._auditData || {};
  const traceId = req.headers['x-trace-id'] as string || auditData.traceId || '-';

  logAuthFailure({
    appid: auditData.appid,
    reason,
    details: {
      path: req.path,
      method: req.method,
      ...details,
    },
    traceId,
  });

  // Also log to main logger
  logger.warn('Signature validation failed', {
    type: 'audit',
    event: 'auth_failure',
    sub_event: 'signature_failure',
    reason,
    appid: auditData.appid,
    path: req.path,
    method: req.method,
    trace_id: traceId,
  });
}

/**
 * Log token/JWT authentication failure
 */
export function logTokenFailure(
  req: Request,
  reason: 'expired_token' | 'invalid_token' | 'missing_token' | 'malformed_token',
  details?: Record<string, unknown>
): void {
  const auditData = (req as any)._auditData || {};
  const traceId = req.headers['x-trace-id'] as string || auditData.traceId || '-';

  logAuthFailure({
    appid: auditData.appid,
    reason,
    details: {
      path: req.path,
      method: req.method,
      ...details,
    },
    traceId,
  });

  logger.warn('Token validation failed', {
    type: 'audit',
    event: 'auth_failure',
    sub_event: 'token_failure',
    reason,
    appid: auditData.appid,
    path: req.path,
    method: req.method,
    trace_id: traceId,
  });
}

/**
 * Log authorization failure
 * Call this from permission middleware when user lacks required permissions
 */
export function logAuthorizationFailure(
  req: Request,
  requiredPermission: string,
  reason?: string
): void {
  const auditData = (req as any)._auditData || {};
  const traceId = req.headers['x-trace-id'] as string || auditData.traceId || '-';
  const enterpriseId = (req as any).enterpriseId;

  logAuthzFailure({
    appid: auditData.appid,
    enterpriseId,
    requiredPermission,
    reason,
    traceId,
  });

  logger.warn('Authorization failed', {
    type: 'audit',
    event: 'authz_failure',
    required_permission: requiredPermission,
    reason,
    appid: auditData.appid,
    enterprise_id: enterpriseId,
    path: req.path,
    method: req.method,
    trace_id: traceId,
  });
}

/**
 * Log rate limit hit
 * Call this from rate limit middleware when limit is exceeded
 */
export function logRateLimitExceeded(
  req: Request,
  limit: number,
  remaining: number,
  resetTime: Date
): void {
  const auditData = (req as any)._auditData || {};
  const traceId = req.headers['x-trace-id'] as string || auditData.traceId || '-';

  logRateLimitHit({
    appid: auditData.appid,
    ip: auditData.ip,
    endpoint: req.path,
    limit,
    remaining,
    resetTime,
    traceId,
  });

  logger.warn('Rate limit exceeded', {
    type: 'audit',
    event: 'rate_limit',
    limit,
    remaining,
    reset_time: resetTime.toISOString(),
    appid: auditData.appid,
    ip: auditData.ip,
    path: req.path,
    method: req.method,
    trace_id: traceId,
  });
}

/**
 * Log validation error
 * Call this from validation middleware when request validation fails
 */
export function logValidationFailure(
  req: Request,
  errors: Array<{ field: string; message: string }>
): void {
  const auditData = (req as any)._auditData || {};
  const traceId = req.headers['x-trace-id'] as string || auditData.traceId || '-';

  logValidationError({
    appid: auditData.appid,
    path: req.path,
    errors,
    traceId,
  });

  logger.warn('Validation failed', {
    type: 'audit',
    event: 'validation_error',
    errors,
    appid: auditData.appid,
    path: req.path,
    method: req.method,
    trace_id: traceId,
  });
}

/**
 * Create a combined audit event logger
 */
export function createAuditLogger() {
  return {
    logSignatureFailure,
    logTokenFailure,
    logAuthorizationFailure,
    logRateLimitExceeded,
    logValidationFailure,
  };
}

/**
 * Default export
 */
export const auditLoggingMiddleware = createAuditLoggingMiddleware();
export const auditLogger = createAuditLogger();

export default {
  createAuditLoggingMiddleware,
  auditLoggingMiddleware,
  auditLogger,
  logSignatureFailure,
  logTokenFailure,
  logAuthorizationFailure,
  logRateLimitExceeded,
  logValidationFailure,
};
