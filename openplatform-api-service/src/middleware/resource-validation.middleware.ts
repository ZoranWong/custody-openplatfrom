/**
 * Resource Validation Middleware
 * Validates developer identity and signature for custody message forwarding
 *
 * Uses the validator services from src/services/validators/
 * - BasicValidator: for OAuth endpoints (BasicInfo only)
 * - ResourceValidator: for resource endpoints (BasicInfoWithAuthorization)
 *
 * Request format:
 * {
 *   basic: { appId, timestamp, nonce, signature },
 *   business: { ... }
 * }
 *
 * For resource operations (third-party/*):
 * {
 *   basic: { appId, timestamp, nonce, signature, authorizationId },
 *   business: { ... }
 * }
 */

import { Request, Response, NextFunction } from 'express';
// import { getAuthorizationService } from '../services/resource-authorization.service';
import { logger } from '../utils/logger';
import {
    ValidationErrorCodes,
    ValidationError,
    // maskSignature,
} from '../services/validators';
import { RequestWithContext } from '../requests/extended-request';
import {
    getApplicationRepository,
    getIsvDeveloperRepository,
} from '../repositories/repository.factory';
import { NonceCache } from '../middleware/nonce-cache';
import { IRequestValidator } from '../services/validators/interfaces';
import { BasicValidator } from '../services/validators/basic.validator';
import { ResourceValidator } from '../services/validators/resource.validator';

/**
 * Get or generate trace ID for the request
 */
function getTraceId(req: Request): string {
    return (
        (req.headers['x-trace-id'] as string) ||
        `val_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    );
}

/**
 * Extended Request interface for resource validation
 * Extends RequestWithContext which provides context property
 */
export interface ResourceValidationRequest extends RequestWithContext {
    authorizationId?: string;
    userId?: string;
}

// Default nonce cache instance
const defaultNonceCache = new NonceCache();

/**
 * Send error response with validation errors
 */
function sendValidationErrorResponse(
    res: Response,
    statusCode: number,
    errors: ValidationError[],
    req: RequestWithContext,
): void {
    // Map error codes to HTTP status codes
    const firstError = errors[0];
    let httpStatus = statusCode;

    if (firstError) {
        switch (firstError.code) {
            case ValidationErrorCodes.MISSING_FIELD:
                httpStatus = 400;
                break;
            case ValidationErrorCodes.INVALID_FORMAT:
                httpStatus = 400;
                break;
            case ValidationErrorCodes.TIMESTAMP_EXPIRED:
                httpStatus = 401;
                break;
            case ValidationErrorCodes.INVALID_SIGNATURE:
                httpStatus = 401;
                break;
        }
    }

    res.status(httpStatus).json({
        code: Number(firstError?.code) || statusCode,
        message: firstError?.message || 'Validation failed',
        errors: errors,
        trace_id: req.context?.traceId || getTraceId(req),
    });
}

/**
 * Configuration for request validator middleware
 */
export interface ValidationMiddlewareConfig {
    excludePaths?: string[];
    nonceCache?: NonceCache;
}

/**
 * Create request validator middleware
 *
 * 统一的中间件工厂函数，接受任意实现 IRequestValidator 接口的验证器
 *
 * @param validator 实现 IRequestValidator 接口的验证器
 * @param config 配置选项
 * @returns Express 中间件
 *
 * 使用示例：
 * ```typescript
 * // OAuth 场景
 * const basicMiddleware = createRequestValidatorMiddleware(
 *   createBasicValidator()
 * );
 *
 * // Resource 场景
 * const resourceMiddleware = createRequestValidatorMiddleware(
 *   createResourceValidator()
 * );
 * ```
 */
export function createRequestValidatorMiddleware(
    validator: IRequestValidator,
    config?: ValidationMiddlewareConfig,
) {
    const excludePaths = config?.excludePaths ?? [
        '/health',
        '/ready',
        '/metrics',
    ];
    const nonceCache = config?.nonceCache ?? defaultNonceCache;
    // const verifyAuthorization = config?.verifyAuthorization ?? false;

    return async (
        req: RequestWithContext,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {
        const traceId = getTraceId(req);
        // Skip excluded paths
        if (excludePaths.some((path) => req.path.startsWith(path))) {
            return next();
        }

        // Only allow POST method
        if (req.method !== 'POST') {
            res.status(405).json({
                code: 40501,
                message: 'Method not allowed. Only POST is supported.',
                trace_id: traceId,
            });
            return;
        }

        try {
            // Extract appId and authorizationId from request
            const appId = req.body.basic?.appId as string | undefined;

            // const authorizationId = req.body.basic?.authorizationId as string | undefined;

            // appId is required for validation
            if (!appId) {
                res.status(400).json({
                    code: 40001,
                    message: 'Missing required field: appId',
                    trace_id: traceId,
                });
                return;
            }
            const appRepo = getApplicationRepository();
            const devRepo = getIsvDeveloperRepository();

            // Query Application table to verify appId exists and is active
            const application = await appRepo.findByAppId(appId);

            // Verify application exists
            if (!application) {
                res.status(401).json({
                    code: 40103,
                    message: 'Invalid appId: application not found',
                    trace_id: traceId,
                });
                return;
            }

            // Verify application status
            if (application.status !== 'active') {
                res.status(401).json({
                    code: 40104,
                    message: 'Application is not active',
                    trace_id: traceId,
                });
                return;
            }

            // Query developer to verify status
            const developer = await devRepo.findById(application.isvDeveloperId);

            // Verify developer status
            if (!developer || developer.status !== 'active') {
                res.status(401).json({
                    code: 40105,
                    message: 'Developer account is not active',
                    trace_id: traceId,
                });
                return;
            }

            // Check for nonce replay
            const nonce = req.body.basic?.nonce as string | undefined;
            if (nonce && appId) {
                const isDuplicate = await nonceCache.isDuplicate(
                    appId,
                    nonce,
                );
                if (isDuplicate) {
                    res.status(401).json({
                        code: 40109,
                        message: 'Duplicate nonce detected',
                        trace_id: traceId,
                    });
                    return;
                }
            }

            // Attach application and developer to request context
            req.context = {
                application,
                developer,
            };

            // Use validator.validateRequest() for complete validation
            const validationResult = await validator.validateRequest(req);

            if (!validationResult.valid) {
                // Log signature verification failure
                if (validationResult.errors.some(e => e.field === 'signature')) {
                    logger.warn('Signature verification failed', {
                        type: 'audit',
                        event: 'signature_verification_failed',
                        basic: req.body?.basic,
                        business: req.body?.business,
                        reason: 'signature_mismatch',
                        trace_id: traceId,
                    });
                }
                sendValidationErrorResponse(res, 400, validationResult.errors, req);
                return;
            }

            // Record nonce for replay prevention
            if (nonce && appId) {
                await nonceCache.record(appId, nonce);
            }

            // Attach context to request
            req.context = {
                application,
                developer,
                traceId
            };

            next();
        } catch (error) {
            logger.error('Request validation error', {
                type: 'error',
                event: 'request_validation_error',
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                trace_id: traceId,
            });
            res.status(500).json({
                code: 50001,
                message: 'Internal server error during validation',
                trace_id: traceId,
            });
        }
    };
}

/**
 * Default resource validation middleware instance
 * 使用 ResourceValidator 并启用 AuthorizationService 验证
 */
export const resourceValidationMiddleware = createRequestValidatorMiddleware(
    createResourceValidatorInstance()
);

/**
 * Default basic validation middleware instance
 * 使用 BasicValidator 不启用 AuthorizationService 验证
 */
export const basicValidationMiddleware = createRequestValidatorMiddleware(
    createBasicValidatorInstance()
);


function createBasicValidatorInstance(): BasicValidator {
    return new BasicValidator();
}

function createResourceValidatorInstance(): ResourceValidator {
    return new ResourceValidator();
}

export default {
    createRequestValidatorMiddleware,
    resourceValidationMiddleware,
    basicValidationMiddleware,
    NonceCache,
};
