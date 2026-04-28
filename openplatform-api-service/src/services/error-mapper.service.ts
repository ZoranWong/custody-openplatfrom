/**
 * Error Mapper Service
 * Maps Custody error codes to platform unified error codes
 */

import { BusinessCodes } from '../enums/business-codes.enum';
import { ErrorMappingConfig } from '../types/routing.types';

/**
 * Custody error code ranges:
 * - 4xxxx: Client errors
 * - 5xxxx: Server errors
 *
 * Platform error code ranges:
 * - 40001-40099: Parameter errors
 * - 40101-40199: Authentication errors
 * - 40301-40399: Authorization errors
 * - 40401-40499: Not found errors
 * - 50001-50099: Internal server errors
 * - 50401-50499: Gateway errors (timeout, etc.)
 */

/**
 * Default error mappings from Custody to platform codes
 */
const DEFAULT_ERROR_MAPPINGS: ErrorMappingConfig[] = [
  // 400 Parameter errors
  { custodyCode: BusinessCodes.PARAM_REQUIRED, platformCode: BusinessCodes.PARAM_REQUIRED, defaultMessage: 'Parameter error' },
  { custodyCode: BusinessCodes.PARAM_INVALID_FORMAT, platformCode: BusinessCodes.PARAM_INVALID_FORMAT, defaultMessage: 'Format error' },
  { custodyCode: BusinessCodes.PARAM_BUSINESS_RULE, platformCode: BusinessCodes.PARAM_BUSINESS_RULE, defaultMessage: 'Business rule error' },
  { custodyCode: BusinessCodes.PARAM_DUPLICATE, platformCode: BusinessCodes.PARAM_DUPLICATE, defaultMessage: 'Duplicate request' },
  { custodyCode: BusinessCodes.PARAM_INVALID_STATE, platformCode: BusinessCodes.PARAM_INVALID_STATE, defaultMessage: 'Invalid state' },

  // 401 Authentication errors
  { custodyCode: BusinessCodes.AUTH_MISSING_HEADERS, platformCode: BusinessCodes.AUTH_MISSING_HEADERS, defaultMessage: 'Authentication required' },
  { custodyCode: BusinessCodes.AUTH_INVALID_SIGNATURE, platformCode: BusinessCodes.AUTH_INVALID_SIGNATURE, defaultMessage: 'Token expired' },
  { custodyCode: BusinessCodes.AUTH_TIMESTAMP_EXPIRED_OR_INVALID_TOKEN, platformCode: BusinessCodes.AUTH_TIMESTAMP_EXPIRED_OR_INVALID_TOKEN, defaultMessage: 'Invalid signature' },

  // 403 Authorization errors
  { custodyCode: BusinessCodes.AUTHZ_ACCESS_DENIED, platformCode: BusinessCodes.AUTHZ_ACCESS_DENIED, defaultMessage: 'Access denied' },
  { custodyCode: BusinessCodes.AUTHZ_PERMISSION_DENIED, platformCode: BusinessCodes.AUTHZ_PERMISSION_DENIED, defaultMessage: 'Resource not found' },
  { custodyCode: BusinessCodes.AUTHZ_OPERATOR_DENIED, platformCode: BusinessCodes.AUTHZ_OPERATOR_DENIED, defaultMessage: 'Operation not permitted' },
  { custodyCode: BusinessCodes.AUTHZ_SUPER_ADMIN_REQUIRED, platformCode: BusinessCodes.AUTHZ_SUPER_ADMIN_REQUIRED, defaultMessage: 'Rate limit exceeded' },
  { custodyCode: BusinessCodes.AUTHZ_INSUFFICIENT_PERMISSIONS, platformCode: BusinessCodes.AUTHZ_INSUFFICIENT_PERMISSIONS, defaultMessage: 'Insufficient permissions' },
  { custodyCode: BusinessCodes.AUTHZ_PERMISSION_CONFIG_NOT_FOUND, platformCode: BusinessCodes.AUTHZ_PERMISSION_CONFIG_NOT_FOUND, defaultMessage: 'Permission configuration not found' },

  // 404 Not found errors
  { custodyCode: BusinessCodes.NOT_FOUND_RESOURCE, platformCode: BusinessCodes.NOT_FOUND_RESOURCE, defaultMessage: 'Resource not found' },
  { custodyCode: BusinessCodes.NOT_FOUND_ENDPOINT, platformCode: BusinessCodes.NOT_FOUND_ENDPOINT, defaultMessage: 'Endpoint not found' },

  // 409 Conflict errors
  { custodyCode: BusinessCodes.CONFLICT_DUPLICATE, platformCode: BusinessCodes.CONFLICT_DUPLICATE, defaultMessage: 'Resource conflict' },

  // 422 Validation errors
  { custodyCode: 42201, platformCode: BusinessCodes.PARAM_REQUIRED, defaultMessage: 'Validation error' },

  // 429 Rate limit errors
  { custodyCode: BusinessCodes.RATE_LIMIT_EXCEEDED, platformCode: BusinessCodes.RATE_LIMIT_EXCEEDED, defaultMessage: 'Too many requests' },

  // 500 Internal server errors
  { custodyCode: BusinessCodes.SERVER_INTERNAL, platformCode: BusinessCodes.SERVER_INTERNAL, defaultMessage: 'Internal server error' },
  { custodyCode: BusinessCodes.SERVER_UNAVAILABLE, platformCode: BusinessCodes.SERVER_UNAVAILABLE, defaultMessage: 'Service temporarily unavailable' },
  { custodyCode: BusinessCodes.SERVER_DATABASE, platformCode: BusinessCodes.SERVER_DATABASE, defaultMessage: 'Database error' },
  { custodyCode: BusinessCodes.SERVER_CACHE, platformCode: BusinessCodes.SERVER_CACHE, defaultMessage: 'Cache error' },

  // 502 Bad Gateway
  { custodyCode: BusinessCodes.BAD_GATEWAY, platformCode: BusinessCodes.GATEWAY_TIMEOUT, defaultMessage: 'Bad gateway' },

  // 503 Service unavailable
  { custodyCode: BusinessCodes.SERVICE_UNAVAILABLE, platformCode: BusinessCodes.UPSTREAM_TIMEOUT, defaultMessage: 'Service temporarily unavailable' },

  // 504 Gateway timeout
  { custodyCode: BusinessCodes.GATEWAY_TIMEOUT, platformCode: BusinessCodes.GATEWAY_TIMEOUT, defaultMessage: 'Gateway timeout' },
  { custodyCode: BusinessCodes.UPSTREAM_TIMEOUT, platformCode: BusinessCodes.UPSTREAM_TIMEOUT, defaultMessage: 'Upstream timeout' },
];

/**
 * Error Mapper class
 */
export class ErrorMapper {
  private mappings: Map<number, ErrorMappingConfig>;
  private defaultMappings: Map<number, number>;

  constructor(mappings: ErrorMappingConfig[] = DEFAULT_ERROR_MAPPINGS) {
    this.mappings = new Map();
    this.defaultMappings = new Map();

    for (const mapping of mappings) {
      this.mappings.set(mapping.custodyCode, mapping);
      this.defaultMappings.set(
        Math.floor(mapping.custodyCode / 10000) * 10000,
        mapping.platformCode
      );
    }
  }

  /**
   * Map a Custody error code to a platform error code
   */
  mapCode(custodyCode: number): number {
    // Direct mapping
    if (this.mappings.has(custodyCode)) {
      return this.mappings.get(custodyCode)!.platformCode;
    }

    // Category-based fallback (e.g., 403xx -> 40301)
    const categoryCode = Math.floor(custodyCode / 100) * 100;
    if (this.defaultMappings.has(categoryCode)) {
      return this.defaultMappings.get(categoryCode)!;
    }

    // Range-based fallback
    const rangeCode = Math.floor(custodyCode / 10000) * 10000;
    if (this.defaultMappings.has(rangeCode)) {
      return this.defaultMappings.get(rangeCode)!;
    }

    // Default fallback for unknown codes
    if (custodyCode >= 500) {
      return BusinessCodes.SERVER_INTERNAL;
    }
    if (custodyCode >= 400) {
      return BusinessCodes.PARAM_REQUIRED;
    }

    return BusinessCodes.SERVER_INTERNAL;
  }

  /**
   * Get default message for a Custody error code
   */
  getDefaultMessage(custodyCode: number): string {
    if (this.mappings.has(custodyCode)) {
      return this.mappings.get(custodyCode)!.defaultMessage;
    }

    // Return generic message based on code range
    if (custodyCode >= 500) {
      return 'Internal server error';
    }
    if (custodyCode >= 400) {
      return 'Client error';
    }

    return 'Unknown error';
  }

  /**
   * Map a complete error response
   */
  mapError(
    custodyError: {
      code?: number;
      message?: string;
      [key: string]: unknown;
    },
    traceId: string
  ): PlatformErrorResponse {
    const custodyCode = custodyError.code || 50001;
    const platformCode = this.mapCode(custodyCode);

    return {
      code: platformCode,
      message:
        custodyError.message ||
        this.getDefaultMessage(custodyCode),
      trace_id: traceId,
      original_code: custodyCode,
    };
  }

  /**
   * Create error response for network errors
   */
  createNetworkError(
    error: {
      code?: string;
      message?: string;
    },
    traceId: string
  ): PlatformErrorResponse {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return {
        code: BusinessCodes.GATEWAY_TIMEOUT,
        message: 'Gateway timeout',
        trace_id: traceId,
        details: {
          type: 'timeout',
          original_error: error.message,
        },
      };
    }

    if (error.code === 'ECONNREFUSED') {
      return {
        code: BusinessCodes.UPSTREAM_TIMEOUT,
        message: 'Service unavailable',
        trace_id: traceId,
        details: {
          type: 'connection_refused',
          original_error: error.message,
        },
      };
    }

    return {
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Internal server error',
      trace_id: traceId,
      details: {
        type: 'network_error',
        original_error: error.message,
      },
    };
  }
}

/**
 * Platform error response format
 */
export interface PlatformErrorResponse {
  code: number;
  message: string;
  trace_id: string;
  original_code?: number;
  details?: Record<string, unknown>;
}

/**
 * Default error mapper instance
 */
export const errorMapper = new ErrorMapper();

/**
 * Create error mapper with custom mappings
 */
export function createErrorMapper(
  mappings?: ErrorMappingConfig[]
): ErrorMapper {
  return new ErrorMapper(mappings);
}
