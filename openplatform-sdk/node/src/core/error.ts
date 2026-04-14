/**
 * Cregis OpenPlatform SDK Errors
 */

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
}

/**
 * SDK Error class
 */
export class SDKError extends Error {
  public readonly code: SDKErrorCode | number;
  public readonly httpStatus?: number;
  public readonly details?: Record<string, unknown>;
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

    // Determine if error is retryable
    this.isRetryable = this.determineRetryable();

    Error.captureStackTrace(this, this.constructor);
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
    let sdkCode: SDKErrorCode | number = SDKErrorCode.API_ERROR;
    let errorMessage = message;

    switch (code) {
      case 40001:
        sdkCode = SDKErrorCode.VALIDATION_MISSING_REQUIRED;
        errorMessage = `Missing required parameter: ${message}`;
        break;
      case 40002:
        sdkCode = SDKErrorCode.VALIDATION_INVALID_FORMAT;
        errorMessage = `Invalid parameter format: ${message}`;
        break;
      case 40101:
      case 40102:
      case 40103:
      case 40104:
      case 40105:
      case 40106:
      case 40107:
        sdkCode = SDKErrorCode.API_UNAUTHORIZED;
        errorMessage = `Authentication failed: ${message}`;
        break;
      case 40301:
        sdkCode = SDKErrorCode.API_FORBIDDEN;
        errorMessage = `Access denied: ${message}`;
        break;
      case 40401:
        sdkCode = SDKErrorCode.API_NOT_FOUND;
        errorMessage = `Resource not found: ${message}`;
        break;
      case 40901:
      case 40902:
        sdkCode = SDKErrorCode.API_CONFLICT;
        errorMessage = `Conflict: ${message}`;
        break;
      case 42901:
        sdkCode = SDKErrorCode.API_RATE_LIMITED;
        errorMessage = `Rate limit exceeded: ${message}`;
        break;
      case 50001:
        sdkCode = SDKErrorCode.API_SERVER_ERROR;
        errorMessage = `Server error: ${message}`;
        break;
      case 50301:
        sdkCode = SDKErrorCode.API_SERVER_ERROR;
        errorMessage = `Service unavailable: ${message}`;
        break;
      default:
        if (code >= 40000 && code < 50000) {
          sdkCode = SDKErrorCode.API_ERROR;
          errorMessage = `API error [${code}]: ${message}`;
        }
    }

    return new SDKError(sdkCode, errorMessage, httpStatus, { traceId, apiCode: code });
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
      details: this.details,
      isRetryable: this.isRetryable,
      stack: this.stack,
    };
  }
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
};
