/**
 * Business Error Codes
 * Unified enumeration for all business error codes used in the API service.
 *
 * Code ranges:
 * - 400xx: Parameter errors
 * - 401xx: Authentication errors
 * - 403xx: Authorization errors
 * - 404xx: Not found errors
 * - 405xx: Method not allowed
 * - 409xx: Conflict errors
 * - 429xx: Rate limit errors
 * - 500xx: Server errors
 * - 501xx: Not implemented
 * - 502xx: Bad gateway
 * - 503xx: Service unavailable
 * - 504xx: Gateway timeout
 */
export enum BusinessCodes {
  // ========================
  // Parameter errors (400xx)
  // ========================
  PARAM_REQUIRED = 40001,
  PARAM_INVALID_FORMAT = 40002,
  PARAM_BUSINESS_RULE = 40003,
  PARAM_DUPLICATE = 40004,
  PARAM_INVALID_STATE = 40005,

  // ========================
  // Authentication errors (401xx)
  // ========================
  AUTH_MISSING_HEADERS = 40101,
  AUTH_INVALID_SIGNATURE = 40102,
  AUTH_TIMESTAMP_EXPIRED_OR_INVALID_TOKEN = 40103,
  AUTH_DUPLICATE_NONCE = 40104,
  AUTH_APP_NOT_ACTIVE = 40105,
  AUTH_INVALID_REFRESH_TOKEN = 40107,
  AUTH_INVALID_CREDENTIALS = 40110,

  // ========================
  // Authorization errors (403xx)
  // ========================
  AUTHZ_ACCESS_DENIED = 40301,
  AUTHZ_PERMISSION_DENIED = 40302,
  AUTHZ_OPERATOR_DENIED = 40303,
  AUTHZ_SUPER_ADMIN_REQUIRED = 40304,
  AUTHZ_INSUFFICIENT_PERMISSIONS = 40305,
  AUTHZ_PERMISSION_CONFIG_NOT_FOUND = 40306,

  // ========================
  // Not found errors (404xx)
  // ========================
  NOT_FOUND_RESOURCE = 40401,
  NOT_FOUND_ENDPOINT = 40402,

  // ========================
  // Token not found (alias 40401)
  // ========================
  AUTH_TOKEN_NOT_FOUND = 40401,

  // ========================
  // Conflict errors (409xx)
  // ========================
  CONFLICT_DUPLICATE = 40902,

  // ========================
  // Method not allowed (405xx)
  // ========================
  METHOD_NOT_ALLOWED = 40501,

  // ========================
  // Not implemented (501xx)
  // ========================
  NOT_IMPLEMENTED = 50101,

  // ========================
  // Rate limit errors (429xx)
  // ========================
  RATE_LIMIT_EXCEEDED = 42901,
  RATE_LIMIT_STRICT = 42902,
  RATE_LIMIT_LENIENT = 42903,

  // ========================
  // Server errors (500xx)
  // ========================
  SERVER_INTERNAL = 50001,
  SERVER_UNAVAILABLE = 50002,
  SERVER_DATABASE = 50003,
  SERVER_CACHE = 50004,

  // ========================
  // Bad gateway (502xx)
  // ========================
  BAD_GATEWAY = 50201,

  // ========================
  // Service unavailable (503xx)
  // ========================
  SERVICE_UNAVAILABLE = 50301,

  // ========================
  // Gateway timeout (504xx)
  // ========================
  GATEWAY_TIMEOUT = 50401,
  UPSTREAM_TIMEOUT = 50402,
}
