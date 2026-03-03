/**
 * Validation Middleware
 * Express middleware for request validation
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/jwt.types';
import { ValidationRule } from '../types/validation.types';
import { ValidationService } from '../services/validation.service';
import { errorMapper } from '../services/error-mapper.service';
import { basicFieldValidators } from '../services/validators/request.validators';

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
 * Validation middleware configuration
 */
export interface ValidationMiddlewareConfig {
  service?: ValidationService;
  validators?: {
    basic?: ValidationRule[];
    data?: ValidationRule[];
  };
  skipHealthEndpoints?: boolean;
}

/**
 * Validation result attached to request
 */
export interface ValidationResultInfo {
  valid: boolean;
  validatedAt: string;
  fields?: {
    basic?: boolean;
    data?: boolean;
  };
}

/**
 * Create validation middleware
 */
export function createValidationMiddleware(
  config?: ValidationMiddlewareConfig
) {
  const validationService = config?.service || new ValidationService();
  const basicValidators = config?.validators?.basic ?? basicFieldValidators;
  const dataValidators = config?.validators?.data;
  const skipHealthEndpoints = config?.skipHealthEndpoints ?? true;

  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const traceId =
      (req as any).traceId ||
      req.headers['x-trace-id'] ||
      res.getHeader('X-Trace-Id') ||
      `val_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    res.setHeader('X-Trace-Id', traceId as string);

    // Skip health/check endpoints
    if (skipHealthEndpoints) {
      const healthPatterns = ['/health', '/ready', '/metrics', '/ping'];
      if (healthPatterns.some((p) => req.path.startsWith(p))) {
        return next();
      }
    }

    // Validate Content-Type for POST/PUT/PATCH requests
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'DELETE') {
      const contentType = req.headers['content-type'];
      if (!contentType || !contentType.includes('application/json')) {
        logger.warn('invalid_content_type', {
          path: req.path,
          method: req.method,
          contentType,
          traceId,
        });

        res.status(400).json(
          errorMapper.mapError(
            {
              code: 40002,
              message: 'Content-Type must be application/json',
            },
            traceId
          )
        );
        return;
      }
    }

    // Validate basic fields if configured (defaults to true, skips GET/DELETE)
    const shouldValidateBasic = basicValidators && req.body &&
      req.method !== 'GET' && req.method !== 'DELETE' && req.method !== 'HEAD';
    if (shouldValidateBasic) {
      const basicResult = validationService.validateBasic(req.body);

      if (!basicResult.valid) {
        const error = validationService.getErrorResponse(basicResult, traceId);

        logger.warn('validation_failed_basic', {
          path: req.path,
          method: req.method,
          errors: basicResult.errors,
          traceId,
        });

        res.status(400).json(error);
        return;
      }
    }

    // Validate data fields if configured
    if (dataValidators && req.body?.data) {
      const dataResult = validationService.validateData(
        req.body.data,
        dataValidators
      );

      if (!dataResult.valid) {
        const error = validationService.getErrorResponse(dataResult, traceId);

        logger.warn('validation_failed_data', {
          path: req.path,
          method: req.method,
          errors: dataResult.errors,
          traceId,
        });

        res.status(400).json(error);
        return;
      }
    }

    // Attach validation result to request
    const validationResult: ValidationResultInfo = {
      valid: true,
      validatedAt: new Date().toISOString(),
      fields: {
        basic: basicValidators ? true : undefined,
        data: dataValidators ? true : undefined,
      },
    };

    (req as any).validationResult = validationResult;

    logger.info('validation_passed', {
      path: req.path,
      method: req.method,
      traceId,
    });

    next();
  };
}

/**
 * Create endpoint-specific validation middleware
 */
export function createEndpointValidationMiddleware(
  validators: ValidationRule[]
) {
  const validationService = new ValidationService();

  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const traceId = (req as any).traceId || 'unknown';

    // Validate the request body against provided rules
    const result = validationService.validate(req.body, validators);

    if (!result.valid) {
      const error = validationService.getErrorResponse(result, traceId);

      logger.warn('endpoint_validation_failed', {
        path: req.path,
        method: req.method,
        errors: result.errors,
        traceId,
      });

      res.status(400).json(error);
      return;
    }

    // Attach validation result
    (req as any).validationResult = {
      valid: true,
      validatedAt: new Date().toISOString(),
    };

    next();
  };
}

/**
 * Create business rule validation middleware
 */
export function createBusinessRuleValidationMiddleware(
  validateBusinessRules: (
    body: Record<string, unknown>
  ) => { valid: boolean; errors: string[] }
) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const traceId = (req as any).traceId || 'unknown';

    if (!req.body || typeof req.body !== 'object') {
      next();
      return;
    }

    const result = validateBusinessRules(req.body as Record<string, unknown>);

    if (!result.valid) {
      logger.warn('business_rule_validation_failed', {
        path: req.path,
        method: req.method,
        errors: result.errors,
        traceId,
      });

      res.status(400).json(
        errorMapper.mapError(
          {
            code: 40003,
            message: result.errors.join('; '),
          },
          traceId
        )
      );
      return;
    }

    next();
  };
}

/**
 * Get validation result from request
 */
export function getValidationResult(req: Request): ValidationResultInfo | null {
  return (req as any).validationResult || null;
}

/**
 * Check if request passed validation
 */
export function isValidationPassed(req: Request): boolean {
  const result = getValidationResult(req);
  return result?.valid ?? false;
}

/**
 * Default validation middleware (validates basic fields)
 */
export const defaultValidationMiddleware = createValidationMiddleware({
  validators: {
    basic: basicFieldValidators,
  },
});

/**
 * Validation middleware for JSON bodies
 */
export const jsonBodyValidationMiddleware = createValidationMiddleware();

/**
 * Validation middleware factory for specific endpoint rules
 */
export function validateEndpoint(
  validators: ValidationRule[],
  options?: { skipHealth?: boolean }
) {
  return createValidationMiddleware({
    validators: { data: validators },
    skipHealthEndpoints: options?.skipHealth ?? true,
  });
}
