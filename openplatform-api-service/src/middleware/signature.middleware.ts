import { Request, Response, NextFunction } from 'express';
import {
  verifySignature,
  isTimestampValid,
  buildSignString,
  SignatureErrorCode,
  NonceCache,
  InMemoryNonceCache,
} from '../utils/signature.util';
import {
  SignedRequest,
  SignatureMiddlewareConfig,
  SIGNATURE_HEADERS,
  SignatureVerificationResult,
} from '../types/signature.types';

/**
 * Default configuration for signature middleware
 */
const DEFAULT_CONFIG: Required<SignatureMiddlewareConfig> = {
  excludePaths: ['/health', '/ready', '/metrics'],
  timestampWindow: 300,
  nonceTtl: 300,
};

/**
 * Extend Request type to include rawBody for signature verification
 */
export interface RawBodyRequest extends Request {
  rawBody?: string;
}

/**
 * Creates raw body parser middleware for signature verification
 * IMPORTANT: Must be applied BEFORE signature middleware and body-parser
 */
export function createRawBodyMiddleware() {
  return async (
    req: RawBodyRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    let rawBody = '';

    req.on('data', (chunk: Buffer) => {
      rawBody += chunk.toString('utf8');
    });

    req.on('end', () => {
      req.rawBody = rawBody;
      next();
    });
  };
}

/**
 * Creates signature verification middleware
 *
 * @param getAppSecret - Function to retrieve app secret by appid
 * @param nonceCache - Nonce cache for replay prevention (default: in-memory)
 * @param config - Middleware configuration
 * @returns Express middleware function
 */
export function createSignatureMiddleware(
  getAppSecret: (appid: string) => Promise<string | null>,
  nonceCache?: NonceCache,
  config?: SignatureMiddlewareConfig
) {
  const nonceCacheInstance = nonceCache || new InMemoryNonceCache();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return async (
    req: RawBodyRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Generate trace_id at middleware entry - use header or generate new
    const traceId = (req.headers['x-trace-id'] as string) || generateTraceId();

    // Attach trace_id to response for consistent tracking
    res.setHeader('X-Trace-Id', traceId);

    // Log request start
    logRequest(req, traceId, 'start');

    // Skip verification for excluded paths
    if (finalConfig.excludePaths.some(path => req.path.startsWith(path))) {
      logRequest(req, traceId, 'skip', { reason: 'excluded_path' });
      return next();
    }

    // Extract signature headers (normalize to lowercase)
    const headers = {
      appid: req.headers[SIGNATURE_HEADERS.APPID] as string,
      nonce: req.headers[SIGNATURE_HEADERS.NONCE] as string,
      timestamp: req.headers[SIGNATURE_HEADERS.TIMESTAMP] as string,
      sign: req.headers[SIGNATURE_HEADERS.SIGN] as string,
    };

    // Validate required headers are present
    const missingHeaders = Object.entries(headers)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingHeaders.length > 0) {
      logRequest(req, traceId, 'reject', { code: SignatureErrorCode.MISSING_HEADERS, reason: 'missing_headers', missing: missingHeaders });
      res.status(401).json({
        code: SignatureErrorCode.MISSING_HEADERS,
        message: `Missing signature headers: ${missingHeaders.join(', ')}`,
        trace_id: traceId,
      });
      return;
    }

    // Parse and validate timestamp
    const timestamp = parseInt(headers.timestamp!, 10);
    if (isNaN(timestamp) || !isTimestampValid(timestamp, finalConfig.timestampWindow)) {
      logRequest(req, traceId, 'reject', { code: SignatureErrorCode.EXPIRED_TIMESTAMP, reason: 'expired_timestamp' });
      res.status(401).json({
        code: SignatureErrorCode.EXPIRED_TIMESTAMP,
        message: 'Request timestamp expired or invalid',
        trace_id: traceId,
      });
      return;
    }

    // Check for nonce replay
    const isDuplicate = await nonceCacheInstance.isDuplicate(headers.appid!, headers.nonce!);
    if (isDuplicate) {
      logRequest(req, traceId, 'reject', { code: SignatureErrorCode.DUPLICATE_NONCE, reason: 'duplicate_nonce' });
      res.status(401).json({
        code: SignatureErrorCode.DUPLICATE_NONCE,
        message: 'Duplicate nonce detected',
        trace_id: traceId,
      });
      return;
    }

    // Get app secret
    const secretKey = await getAppSecret(headers.appid!);
    if (!secretKey) {
      logRequest(req, traceId, 'reject', { code: SignatureErrorCode.INVALID_SIGNATURE, reason: 'invalid_appid' });
      res.status(401).json({
        code: SignatureErrorCode.INVALID_SIGNATURE,
        message: 'Invalid application ID',
        trace_id: traceId,
      });
      return;
    }

    // Use rawBody for signature verification (fallback to empty string if not available)
    // This ensures consistent signature verification regardless of JSON parsing
    const bodyString = req.rawBody !== undefined ? req.rawBody : '';

    // Verify signature using originalUrl to include query parameters
    const isValid = verifySignature(secretKey, headers.sign!, {
      appid: headers.appid!,
      nonce: headers.nonce!,
      timestamp,
      method: req.method,
      path: req.originalUrl, // Use originalUrl to include query parameters
      body: bodyString,
    });

    if (!isValid) {
      logRequest(req, traceId, 'reject', { code: SignatureErrorCode.INVALID_SIGNATURE, reason: 'invalid_signature' });
      res.status(401).json({
        code: SignatureErrorCode.INVALID_SIGNATURE,
        message: 'Invalid signature',
        trace_id: traceId,
      });
      return;
    }

    // Record nonce for replay prevention
    await nonceCacheInstance.record(headers.appid!, headers.nonce!, finalConfig.nonceTtl);

    // Attach appid and trace_id to request for downstream use
    (req as SignedRequest & RawBodyRequest).appid = headers.appid!;
    (req as SignedRequest).isSignatureValid = true;
    (req as SignedRequest & RawBodyRequest).rawBody = bodyString;

    logRequest(req, traceId, 'pass', { appid: headers.appid });
    next();
  };
}

/**
 * Generates a trace ID for request tracking
 */
export function generateTraceId(): string {
  return `sig_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Simple request logger - replace with actual logging framework in production
 */
interface LogEntry {
  timestamp: string;
  traceId: string;
  method: string;
  path: string;
  ip: string;
  stage: 'start' | 'pass' | 'reject' | 'skip';
  details?: Record<string, unknown>;
}

function logRequest(req: Request, traceId: string, stage: LogEntry['stage'], details?: Record<string, unknown>): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    traceId,
    method: req.method,
    path: req.path,
    ip: req.ip || req.socket?.remoteAddress || 'unknown',
    stage,
    details,
  };

  // In production, use a proper logger (e.g., winston, pino)
  console.log(JSON.stringify(entry));
}

/**
 * Verifies signature for a single request (utility function)
 *
 * @param appid - Application ID
 * @param nonce - Unique request identifier
 * @param timestamp - Unix timestamp
 * @param method - HTTP method
 * @param path - Request path (should include query parameters)
 * @param body - Request body (should be raw string)
 * @param providedSign - Provided signature
 * @param getAppSecret - Function to get app secret
 * @param nonceCache - Nonce cache instance
 * @param config - Configuration options
 * @returns Verification result
 */
export async function verifyRequestSignature(
  appid: string,
  nonce: string,
  timestamp: number,
  method: string,
  path: string,
  body: string,
  providedSign: string,
  getAppSecret: (appid: string) => Promise<string | null>,
  nonceCache: NonceCache,
  config: { timestampWindow?: number; nonceTtl?: number } = {}
): Promise<SignatureVerificationResult> {
  // Validate timestamp
  if (!isTimestampValid(timestamp, config.timestampWindow)) {
    return {
      valid: false,
      errorCode: SignatureErrorCode.EXPIRED_TIMESTAMP,
      errorMessage: 'Request timestamp expired or invalid',
    };
  }

  // Check nonce replay
  if (await nonceCache.isDuplicate(appid, nonce)) {
    return {
      valid: false,
      errorCode: SignatureErrorCode.DUPLICATE_NONCE,
      errorMessage: 'Duplicate nonce detected',
    };
  }

  // Get app secret
  const secretKey = await getAppSecret(appid);
  if (!secretKey) {
    return {
      valid: false,
      errorCode: SignatureErrorCode.INVALID_SIGNATURE,
      errorMessage: 'Invalid application ID',
    };
  }

  // Verify signature
  const isValid = verifySignature(secretKey, providedSign, {
    appid,
    nonce,
    timestamp,
    method,
    path, // Caller should provide full URL with query params
    body, // Caller should provide raw body string
  });

  if (!isValid) {
    return {
      valid: false,
      errorCode: SignatureErrorCode.INVALID_SIGNATURE,
      errorMessage: 'Invalid signature',
    };
  }

  // Record nonce
  await nonceCache.record(appid, nonce, config.nonceTtl || 300);

  return { valid: true };
}
