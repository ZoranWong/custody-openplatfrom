/**
 * Third-party Forward Controller
 * Handles forwarding authenticated requests to backend custody services
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { HttpCodes } from '../../enums/http-codes.enum';
import { BusinessCodes } from '../../enums/business-codes.enum';
import { findForwardRoute, normalizePath, validateParamValue } from '../../config/forward-routes';
import { createHttpClient } from '../../services/http-client.service';
import { createApiLog } from '../../services/api-log.service';
import { checkAndIncrement } from '../../services/quota.service';

let _httpClients: Map<string, any> | null = null;

function getHttpClients(): Map<string, any> {
  if (!_httpClients) {
    const { BACKEND_CLIENTS } = require('../../config/forward-routes');
    _httpClients = new Map();
    for (const cfg of BACKEND_CLIENTS) _httpClients.set(cfg.name, createHttpClient(cfg));
  }
  return _httpClients;
}

/** Log entry context, carried through the request lifecycle */
interface LogContext {
  appId: string;
  developerId?: string;
  subscriptionId?: string;
  apiName: string;
  endpoint: string;
}

function extractAppId(req: Request): string {
  return (req as any).context?.application?.id || req.body?.basic?.appId || 'unknown';
}

function extractDeveloperId(req: Request): string | undefined {
  return (req as any).context?.application?.isvDeveloperId || (req as any).context?.developer?.id || undefined;
}

function logApiCall(ctx: LogContext, req: Request, status: number, elapsed: number, responseBody?: any, isError?: boolean) {
  createApiLog({
    ...ctx,
    method: req.method,
    requestHeaders: { 'x-trace-id': req.headers['x-trace-id'] as string },
    requestBody: req.body?.business,
    responseStatus: status,
    responseBody: responseBody && typeof responseBody === 'object' ? responseBody : { data: responseBody },
    responseTime: elapsed,
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'] as string,
    isError: isError || false,
  }).catch(() => {});
}

/**
 * Sentinel returned by the custody backend for "resource not found" style errors.
 */
const CUSTODY_RESOURCE_NOT_FOUND = 400103;

/**
 * Whether a custody business code represents success (0 or 200).
 */
function isSuccessCode(code: unknown): boolean {
  return code === 0 || code === 200;
}

/**
 * Map a custody business error code to the HTTP status recorded in the API log.
 *
 * The gateway always replies HTTP 200 to forwardable requests (the business code
 * carries the outcome), so this value is log/analytics-only: the developer portal
 * tags `responseStatus >= 400` as an error and the dashboard/error-rate queries
 * filter on `isError`. Recording every failure as 502 conflates client-side
 * validation errors with genuine upstream failures.
 *
 * Custody code families:
 *   400xxx  request/parameter errors        → 400
 *   401xxx  authentication errors           → 401
 *   403xxx  authorization errors            → 403
 *   400103 resource not found               → 404
 *   409xxx  conflicts                        → 409
 *   429xxx  rate limiting                    → 429
 *   120xxx  business-rule rejections         → 400 (the request was well-formed
 *                                                  but not permitted in state)
 *   <500 or 5    upstream internal failure   → 500
 */
export function custodyCodeToHttpStatus(code: unknown): number {
  if (typeof code !== 'number' || !Number.isFinite(code)) return HttpCodes.INTERNAL_SERVER_ERROR;
  if (isSuccessCode(code)) return HttpCodes.OK;
  if (code === CUSTODY_RESOURCE_NOT_FOUND) return HttpCodes.NOT_FOUND;
  if (code === 502) return HttpCodes.BAD_GATEWAY;
  if (code === 503) return HttpCodes.SERVICE_UNAVAILABLE;
  if (code === 504) return HttpCodes.GATEWAY_TIMEOUT;
  // Bare HTTP-style codes (e.g. 500).
  if (code >= 400 && code < 1000) return code;

  // 4-digit codes (120xxx) use a 3-digit family; 5-digit codes (40102) a 3-digit
  // prefix too: 120042 / 1000 = 120, 40102 / 100 = 401.
  const family = code >= 100000 ? Math.floor(code / 1000) : Math.floor(code / 100);
  switch (family) {
    case 400:
    case 120:
      return HttpCodes.BAD_REQUEST;
    case 401:
      return HttpCodes.UNAUTHORIZED;
    case 403:
      return HttpCodes.FORBIDDEN;
    case 404:
      return HttpCodes.NOT_FOUND;
    case 409:
      return HttpCodes.CONFLICT;
    case 429:
      return HttpCodes.TOO_MANY_REQUESTS;
    case 500:
      return HttpCodes.INTERNAL_SERVER_ERROR;
    default:
      // Unknown business codes are client-side rejections; only the 5xx family
      // above denotes an upstream failure.
      return HttpCodes.BAD_REQUEST;
  }
}

/** Send error response + log, then return */
function fail(ctx: LogContext, req: Request, res: Response, status: number, code: number, message: string, startTime: number) {
  const elapsed = Date.now() - startTime;
  res.status(status).json({ code, message });
  logApiCall(ctx, req, status, elapsed, { code, message }, true);
}

function validateResourceKey(req: Request, backendPath: string): string | null {
  const ctx = (req as any).context;
  let key = ctx?.resource?.resourceKey || req.body?.business?.resourceKey;
  if (!key) {
    const authId = ctx?.resource?.authorizationId || req.body?.basic?.authorizationId;
    if (authId && backendPath.includes('{resourceKey}')) key = authId;
  }
  return (key && backendPath.includes('{resourceKey}') && validateParamValue(key)) ? key : null;
}

// ============ Main handler ============

export async function forwardRequest(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const endpoint = normalizePath(req.baseUrl + req.path);
  const matched = findForwardRoute(endpoint);
  const ctx: LogContext = { appId: extractAppId(req), apiName: matched?.config?.name || endpoint, endpoint };

  if (!matched) return fail(ctx, req, res, HttpCodes.NOT_FOUND, BusinessCodes.NOT_FOUND_RESOURCE, `Route not found: ${req.method} ${req.path}`, startTime);

  const { config, urlParams } = matched;
  const client = getHttpClients().get(config.clientName);
  ctx.apiName = config.name || endpoint;

  if (!client) return fail(ctx, req, res, HttpCodes.SERVICE_UNAVAILABLE, BusinessCodes.SERVICE_UNAVAILABLE, `Backend service not available: ${config.clientName}`, startTime);

  try {
    const traceId = (req.headers['x-trace-id'] as string) || uuidv4();

    const resourceKey = validateResourceKey(req, config.route);
    // Routes without a {resourceKey} placeholder (e.g. merchant/register) do not require a key.
    if (!config.route.includes('{resourceKey}')) {
      // no resourceKey needed; proceed without key
    } else if (!resourceKey) {
      return fail(ctx, req, res, HttpCodes.BAD_REQUEST, BusinessCodes.PARAM_REQUIRED, 'Missing resourceKey in request context', startTime);
    }

    let backendPath = config.route;
    if (config.route.includes('{resourceKey}')) {
      backendPath = backendPath.replace('{resourceKey}', resourceKey!);
    }
    for (const [key, value] of Object.entries(urlParams)) {
      if (!validateParamValue(value)) return fail(ctx, req, res, HttpCodes.BAD_REQUEST, BusinessCodes.PARAM_REQUIRED, `Invalid parameter: ${key}`, startTime);
      backendPath = backendPath.replace(`{${key}}`, value);
    }

    ctx.developerId = extractDeveloperId(req);
    if (ctx.developerId) {
      const quota = await checkAndIncrement(ctx.developerId);
      ctx.subscriptionId = quota.subscriptionId;
      if (!quota.allowed) return fail(ctx, req, res, HttpCodes.TOO_MANY_REQUESTS, 42901, `Daily API quota exceeded (${quota.currentUsage}/${quota.dailyLimit})`, startTime);
    }

    const response = await client.request({
      method: config.method as any, url: backendPath,
      data: req.body?.business, params: req.query as Record<string, string>,
      headers: { 'x-trace-id': traceId },
    });

    // The custody backend reports success as code 0 or 200; failures carry their
    // own code, which we map to the HTTP status recorded for this call.
    const isSuccess = isSuccessCode(response?.code);
    if (typeof response === 'object' && response !== null) res.json(response);
    else res.send(response);

    const logStatus = isSuccess ? HttpCodes.OK : custodyCodeToHttpStatus(response?.code);
    logApiCall(ctx, req, logStatus, Date.now() - startTime, response, !isSuccess);
  } catch (error: any) {
    console.error('[Forward] Error:', error.message || error);

    let status: number = HttpCodes.INTERNAL_SERVER_ERROR;
    let message = error.message || 'Forwarding error';
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') { status = HttpCodes.SERVICE_UNAVAILABLE; message = 'Backend service unavailable'; }
    else if (error?.code === 'ETIMEDOUT' || error?.message?.includes('timeout')) { status = HttpCodes.GATEWAY_TIMEOUT; message = 'Backend service timeout'; }

    res.status(status).json({ code: status, message });
    logApiCall(ctx, req, status, Date.now() - startTime, { code: status, message }, true);
  }
}