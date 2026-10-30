/**
 * Cregis OpenPlatform SDK Errors
 */

import { CustodyErrorCode, CustodyErrorInfo, CustodyErrorCategory } from './custody-errors';

/**
 * SDK Error Codes
 */
export enum SDKErrorCode {
  // Configuration errors
  CONFIG_MISSING_BASE_URL = 'CONFIG_MISSING_BASE_URL',
  CONFIG_MISSING_APP_ID = 'CONFIG_MISSING_APP_ID',
  CONFIG_MISSING_APP_SECRET = 'CONFIG_MISSING_APP_SECRET',
  CONFIG_INVALID_APP_ID = 'CONFIG_INVALID_APP_ID',

  // Token errors
  TOKEN_NOT_FOUND = 'TOKEN_NOT_FOUND',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',

  // Signature errors
  SIGNATURE_INVALID = 'SIGNATURE_INVALID',
  SIGNATURE_TIMESTAMP_INVALID = 'SIGNATURE_TIMESTAMP_INVALID',
  SIGNATURE_NONCE_MISSING = 'SIGNATURE_NONCE_MISSING',

  // HTTP errors
  HTTP_REQUEST_FAILED = 'HTTP_REQUEST_FAILED',
  HTTP_TIMEOUT = 'HTTP_TIMEOUT',
  HTTP_NETWORK_ERROR = 'HTTP_NETWORK_ERROR',

  // API errors
  API_ERROR = 'API_ERROR',
  API_UNAUTHORIZED = 'API_UNAUTHORIZED',
  API_FORBIDDEN = 'API_FORBIDDEN',
  API_NOT_FOUND = 'API_NOT_FOUND',
  API_CONFLICT = 'API_CONFLICT',
  API_RATE_LIMITED = 'API_RATE_LIMITED',
  API_SERVER_ERROR = 'API_SERVER_ERROR',

  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  VALIDATION_MISSING_REQUIRED = 'VALIDATION_MISSING_REQUIRED',
  VALIDATION_INVALID_FORMAT = 'VALIDATION_INVALID_FORMAT',

  // Custody business errors (4xxxx / 300004 / 120042 after the gateway)
  CUSTODY_VALIDATION_ERROR = 'CUSTODY_VALIDATION_ERROR',
  CUSTODY_STATE_ERROR = 'CUSTODY_STATE_ERROR',
  CUSTODY_RESOURCE_NOT_EXISTS = 'CUSTODY_RESOURCE_NOT_EXISTS',
  CUSTODY_INSUFFICIENT_FUNDS = 'CUSTODY_INSUFFICIENT_FUNDS',
  CUSTODY_BUSINESS_ERROR = 'CUSTODY_BUSINESS_ERROR',
}

/**
 * SDK Error class
 */
export class SDKError extends Error {
  public readonly code: SDKErrorCode | number;
  public readonly httpStatus?: number;
  public readonly details?: Record<string, unknown>;
  /** Raw business code from the gateway/custody response (`null` for transport errors). */
  public readonly apiCode: number | null;
  public readonly apiConstant: string | null;
  public readonly apiMeaning: string | null;
  public readonly category: SDKErrorCode | CustodyErrorCategory | null;
  public readonly isRetryable: boolean;

  constructor(
    code: SDKErrorCode | number,
    message: string,
    httpStatus?: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SDKError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;

    const apiCode = details?.apiCode;
    this.apiCode = typeof apiCode === 'number' ? apiCode : null;
    const info = this.apiCode != null ? CustodyErrorInfo[this.apiCode] : undefined;
    this.apiConstant = info?.constant ?? null;
    this.apiMeaning = info?.meaning ?? null;
    this.category = info?.category ?? null;

    // Business errors are sticky unless the registry flags them as transient.
    this.isRetryable = info ? info.retryable : this.determineRetryable();

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * The symbolic custody constant (`'BOARD_NOT_EXIST'`) when the API responded
   * with one, otherwise `null`. Convenience alias for `error.apiConstant`.
   */
  get constant(): string | null {
    return this.apiConstant;
  }

  private determineRetryable(): boolean {
    // Retry on network errors, timeouts, and 5xx server errors
    if (this.httpStatus) {
      return this.httpStatus >= 500 || this.httpStatus === 0;
    }

    // Retry on specific error codes
    const retryableCodes = [
      SDKErrorCode.HTTP_TIMEOUT,
      SDKErrorCode.HTTP_NETWORK_ERROR,
      SDKErrorCode.API_RATE_LIMITED,
      SDKErrorCode.API_SERVER_ERROR,
      429, // HTTP 429 Too Many Requests
      500, // HTTP 500 Internal Server Error
      502, // HTTP 502 Bad Gateway
      503, // HTTP 503 Service Unavailable
      504, // HTTP 504 Gateway Timeout
    ];

    return retryableCodes.includes(this.code as SDKErrorCode | number);
  }

  /**
   * Create error from API response
   */
  static fromApiResponse(
    code: number,
    message: string,
    httpStatus: number,
    traceId?: string
  ): SDKError {
    const mapped = mapApiError(code, message);
    return new SDKError(mapped.code, mapped.message, httpStatus, {
      traceId,
      apiCode: code,
    });
  }

  /**
   * Create configuration error
   */
  static configError(code: SDKErrorCode, message: string): SDKError {
    return new SDKError(code, message);
  }

  /**
   * Create network error
   */
  static networkError(error: Error): SDKError {
    if (error.message.includes('timeout')) {
      return new SDKError(SDKErrorCode.HTTP_TIMEOUT, 'Request timeout', 0);
    }
    return new SDKError(SDKErrorCode.HTTP_NETWORK_ERROR, `Network error: ${error.message}`, 0);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      httpStatus: this.httpStatus,
      apiCode: this.apiCode,
      apiConstant: this.apiConstant,
      apiMeaning: this.apiMeaning,
      category: this.category,
      details: this.details,
      isRetryable: this.isRetryable,
      stack: this.stack,
    };
  }
}

/**
 * Map a gateway/custody business code to an SDK error code + human message.
 *
 * Gateway codes (4xxxx / 5xxxx) keep their original semantics; custody business
 * codes (see `custody-errors.ts`, e.g. `400030 BOARD_NOT_EXIST`) map to
 * category-specific SDK codes so callers can branch on `error.code` without
 * hard-coding numbers. `error.apiCode` / `error.apiConstant` keep the exact
 * code and symbol name for precise handling.
 */
function mapApiError(code: number, message: string): { code: SDKErrorCode | number; message: string } {
  // ---- gateway codes (openplatform-api-service) ----
  switch (code) {
    case 40001:
      return { code: SDKErrorCode.VALIDATION_MISSING_REQUIRED, message: `Missing required parameter: ${message}` };
    case 40002:
      return { code: SDKErrorCode.VALIDATION_INVALID_FORMAT, message: `Invalid parameter format: ${message}` };
    case 40101:
    case 40102:
    case 40103:
    case 40104:
    case 40105:
    case 40106:
    case 40107:
      return { code: SDKErrorCode.API_UNAUTHORIZED, message: `Authentication failed: ${message}` };
    case 40301:
      return { code: SDKErrorCode.API_FORBIDDEN, message: `Access denied: ${message}` };
    case 40401:
      return { code: SDKErrorCode.API_NOT_FOUND, message: `Resource not found: ${message}` };
    case 40901:
    case 40902:
      return { code: SDKErrorCode.API_CONFLICT, message: `Conflict: ${message}` };
    case 42901:
      return { code: SDKErrorCode.API_RATE_LIMITED, message: `Rate limit exceeded: ${message}` };
    case 500:
      return { code: SDKErrorCode.API_SERVER_ERROR, message: `Upstream failure (gateway dropped custody body): ${message}` };
    case 50001:
      return { code: SDKErrorCode.API_SERVER_ERROR, message: `Server error: ${message}` };
    case 50301:
      return { code: SDKErrorCode.API_SERVER_ERROR, message: `Service unavailable: ${message}` };
    default:
      break;
  }

  // ---- custody business codes (docs/third-party-api-error-codes.md) ----
  const info = CustodyErrorInfo[code];
  if (info) {
    const prefix = `Custody error [${code}] ${info.constant}`;
    const text = message && message !== info.constant ? `${prefix}: ${message}` : `${prefix}: ${info.meaning}`;
    switch (code) {
      case CustodyErrorCode.THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS:
        return { code: SDKErrorCode.CUSTODY_RESOURCE_NOT_EXISTS, message: text };
      case CustodyErrorCode.ACCOUNT_BALANCE_NOT_ENOUGH:
      case CustodyErrorCode.ADDRESS_BALANCE_NOT_ENOUGH:
        return { code: SDKErrorCode.CUSTODY_INSUFFICIENT_FUNDS, message: text };
      default:
        switch (info.category) {
          case 'VALIDATION':
            return { code: SDKErrorCode.CUSTODY_VALIDATION_ERROR, message: text };
          case 'STATE':
            return { code: SDKErrorCode.CUSTODY_STATE_ERROR, message: text };
          default:
            return { code: SDKErrorCode.CUSTODY_BUSINESS_ERROR, message: text };
        }
    }
  }

  if (code >= 40000 && code < 50000) {
    return { code: SDKErrorCode.API_ERROR, message: `API error [${code}]: ${message}` };
  }
  return { code: SDKErrorCode.API_ERROR, message };
}

/** True when the error carries a custody business code (`4xxxx`, `300004`, `120042`). */
export function isCustodyError(error: unknown): error is SDKError {
  return error instanceof SDKError && error.apiCode != null && CustodyErrorInfo[error.apiCode] !== undefined;
}

/** True when the error is safe to retry from a transport standpoint. */
export function isRetryableError(error: unknown): boolean {
  return error instanceof SDKError && error.isRetryable;
}

/** Registry entry for a custody error code, or `undefined`. */
export function getCustodyErrorInfo(code: number) {
  return CustodyErrorInfo[code];
}

/**
 * Error codes mapping for display
 */
export const ErrorCodeMessages: Record<string, string> = {
  [SDKErrorCode.CONFIG_MISSING_BASE_URL]: 'Configuration missing: baseUrl is required',
  [SDKErrorCode.CONFIG_MISSING_APP_ID]: 'Configuration missing: appId is required',
  [SDKErrorCode.CONFIG_MISSING_APP_SECRET]: 'Configuration missing: appSecret is required',
  [SDKErrorCode.CONFIG_INVALID_APP_ID]: 'Configuration invalid: appId must be a valid UUID',
  [SDKErrorCode.TOKEN_NOT_FOUND]: 'Token not found in response',
  [SDKErrorCode.TOKEN_EXPIRED]: 'Access token has expired',
  [SDKErrorCode.TOKEN_REFRESH_FAILED]: 'Failed to refresh access token',
  [SDKErrorCode.SIGNATURE_INVALID]: 'Invalid request signature',
  [SDKErrorCode.SIGNATURE_TIMESTAMP_INVALID]: 'Request timestamp is invalid or expired',
  [SDKErrorCode.SIGNATURE_NONCE_MISSING]: 'Request nonce is missing',
  [SDKErrorCode.HTTP_REQUEST_FAILED]: 'HTTP request failed',
  [SDKErrorCode.HTTP_TIMEOUT]: 'Request timed out',
  [SDKErrorCode.HTTP_NETWORK_ERROR]: 'Network connection error',
  [SDKErrorCode.API_ERROR]: 'API request failed',
  [SDKErrorCode.API_UNAUTHORIZED]: 'Authentication failed',
  [SDKErrorCode.API_FORBIDDEN]: 'Access forbidden',
  [SDKErrorCode.API_NOT_FOUND]: 'Resource not found',
  [SDKErrorCode.API_CONFLICT]: 'Resource conflict',
  [SDKErrorCode.API_RATE_LIMITED]: 'Rate limit exceeded',
  [SDKErrorCode.API_SERVER_ERROR]: 'Server error',
  [SDKErrorCode.VALIDATION_ERROR]: 'Validation error',
  [SDKErrorCode.VALIDATION_MISSING_REQUIRED]: 'Missing required field',
  [SDKErrorCode.VALIDATION_INVALID_FORMAT]: 'Invalid field format',
  [SDKErrorCode.CUSTODY_VALIDATION_ERROR]: 'Custody rejected the request (invalid parameters or business rule)',
  [SDKErrorCode.CUSTODY_STATE_ERROR]: 'Custody rejected the request because of the current state (missing/duplicate/pending)',
  [SDKErrorCode.CUSTODY_RESOURCE_NOT_EXISTS]: 'resourceKey does not exist or is not active in custody (400103)',
  [SDKErrorCode.CUSTODY_INSUFFICIENT_FUNDS]: 'Insufficient balance or poolable amount in custody',
  [SDKErrorCode.CUSTODY_BUSINESS_ERROR]: 'Other custody business error (see apiCode/apiConstant)',
};
