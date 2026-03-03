/**
 * Error Mapper Service
 * Maps Custody error codes to platform unified error codes
 */

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
  { custodyCode: 40001, platformCode: 40001, defaultMessage: 'Parameter error' },
  { custodyCode: 40002, platformCode: 40002, defaultMessage: 'Format error' },
  { custodyCode: 40003, platformCode: 40003, defaultMessage: 'Business rule error' },
  { custodyCode: 40004, platformCode: 40004, defaultMessage: 'Duplicate request' },
  { custodyCode: 40005, platformCode: 40005, defaultMessage: 'Invalid state' },

  // 401 Authentication errors
  { custodyCode: 40101, platformCode: 40101, defaultMessage: 'Authentication required' },
  { custodyCode: 40102, platformCode: 40102, defaultMessage: 'Token expired' },
  { custodyCode: 40103, platformCode: 40103, defaultMessage: 'Invalid signature' },

  // 403 Authorization errors
  { custodyCode: 40301, platformCode: 40301, defaultMessage: 'Access denied' },
  { custodyCode: 40302, platformCode: 40302, defaultMessage: 'Resource not found' },
  { custodyCode: 40303, platformCode: 40303, defaultMessage: 'Operation not permitted' },
  { custodyCode: 40304, platformCode: 40304, defaultMessage: 'Rate limit exceeded' },
  { custodyCode: 40305, platformCode: 40305, defaultMessage: 'Insufficient permissions' },
  { custodyCode: 40306, platformCode: 40306, defaultMessage: 'Permission configuration not found' },

  // 404 Not found errors
  { custodyCode: 40401, platformCode: 40401, defaultMessage: 'Resource not found' },
  { custodyCode: 40402, platformCode: 40402, defaultMessage: 'Endpoint not found' },

  // 409 Conflict errors
  { custodyCode: 40901, platformCode: 40901, defaultMessage: 'Resource conflict' },
  { custodyCode: 40902, platformCode: 40902, defaultMessage: 'Duplicate resource' },

  // 422 Validation errors
  { custodyCode: 42201, platformCode: 40001, defaultMessage: 'Validation error' },

  // 429 Rate limit errors
  { custodyCode: 42901, platformCode: 42901, defaultMessage: 'Too many requests' },

  // 500 Internal server errors
  { custodyCode: 50001, platformCode: 50001, defaultMessage: 'Internal server error' },
  { custodyCode: 50002, platformCode: 50002, defaultMessage: 'Service temporarily unavailable' },
  { custodyCode: 50003, platformCode: 50003, defaultMessage: 'Database error' },
  { custodyCode: 50004, platformCode: 50004, defaultMessage: 'Cache error' },

  // 502 Bad Gateway
  { custodyCode: 50201, platformCode: 50401, defaultMessage: 'Bad gateway' },

  // 503 Service unavailable
  { custodyCode: 50301, platformCode: 50402, defaultMessage: 'Service temporarily unavailable' },

  // 504 Gateway timeout
  { custodyCode: 50401, platformCode: 50401, defaultMessage: 'Gateway timeout' },
  { custodyCode: 50402, platformCode: 50402, defaultMessage: 'Upstream timeout' },
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
      return 50001; // Internal server error
    }
    if (custodyCode >= 400) {
      return 40001; // Parameter error
    }

    return 50001;
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
        code: 50401,
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
        code: 50402,
        message: 'Service unavailable',
        trace_id: traceId,
        details: {
          type: 'connection_refused',
          original_error: error.message,
        },
      };
    }

    return {
      code: 50001,
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
