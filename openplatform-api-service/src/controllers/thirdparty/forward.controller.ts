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
import { getApplicationRepository, getOauthResourceRepository } from '../../repositories/repository.factory';

// Lazily initialized HTTP clients
let _httpClients: Map<string, any> | null = null;

function getHttpClients(): Map<string, any> {
  if (!_httpClients) {
    const { BACKEND_CLIENTS } = require('../../config/forward-routes');
    _httpClients = new Map();
    for (const cfg of BACKEND_CLIENTS) {
      _httpClients.set(cfg.name, createHttpClient(cfg));
    }
  }
  return _httpClients;
}

function extractAppId(req: Request): string {
  const context = (req as any).context;
  return context?.application?.appId || context?.basic?.appId || req.body?.basic?.appId || 'unknown';
}

async function getDeveloperId(appId: string): Promise<string | null> {
  if (appId === 'unknown') return null;
  const appRepo = getApplicationRepository();
  const app = await appRepo.findById(appId);
  return app?.isvDeveloperId || null;
}

/**
 * Forward a third-party API request to the configured backend service.
 * Includes quota check, request forwarding, and API logging.
 */
export async function forwardRequest(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const normalizedPath = normalizePath(req.baseUrl + req.path);
  const matched = findForwardRoute(normalizedPath);

  if (!matched) {
    res.status(HttpCodes.NOT_FOUND).json({
      code: BusinessCodes.NOT_FOUND_RESOURCE,
      message: `Route not found: ${req.method} ${req.path}`,
    });
    return;
  }

  const { config, urlParams } = matched;
  const client = getHttpClients().get(config.clientName);

  if (!client) {
    res.status(HttpCodes.SERVICE_UNAVAILABLE).json({
      code: BusinessCodes.SERVICE_UNAVAILABLE,
      message: `Backend service not available: ${config.clientName}`,
    });
    return;
  }

  const appId = extractAppId(req);

  try {
    const traceId = (req.headers['x-trace-id'] as string) || uuidv4();

    const resourceKey = validateResourceKey(req, config.route);
    if (!resourceKey) {
      res.status(HttpCodes.BAD_REQUEST).json({
        code: BusinessCodes.PARAM_REQUIRED,
        message: 'Missing resourceKey in request context',
      });
      return;
    }

    let backendPath = config.route.replace('{resourceKey}', resourceKey);
    for (const [key, value] of Object.entries(urlParams)) {
      if (!validateParamValue(value)) {
        res.status(HttpCodes.BAD_REQUEST).json({
          code: BusinessCodes.PARAM_REQUIRED,
          message: `Invalid parameter: ${key}`,
        });
        return;
      }
      backendPath = backendPath.replace(`{${key}}`, value);
    }

    // Quota check
    const developerId = await getDeveloperId(appId);
    let subscriptionId: string | undefined;
    if (developerId) {
      const quotaResult = await checkAndIncrement(developerId);
      subscriptionId = quotaResult.subscriptionId;
      if (!quotaResult.allowed) {
        res.status(HttpCodes.TOO_MANY_REQUESTS).json({
          code: 42901,
          message: `Daily API quota exceeded (${quotaResult.currentUsage}/${quotaResult.dailyLimit})`,
        });
        return;
      }
    }

    // Forward to backend
    const response = await client.request({
      method: config.method as any,
      url: backendPath,
      data: req.body?.business,
      params: req.query as Record<string, string>,
      headers: { 'x-trace-id': traceId },
    });

    const backendCode = response?.code ?? 0;
    const isSuccess = backendCode === 0;

    if (typeof response === 'object' && response !== null) {
      res.json(response);
    } else {
      res.send(response);
    }

    logApiCall(appId, developerId, subscriptionId, normalizedPath, req, isSuccess ? 200 : 502, Date.now() - startTime, response, false);
  } catch (error: any) {
    handleForwardError(error, res, appId, normalizedPath, req, startTime);
  }
}

function validateResourceKey(req: Request, backendPath: string): string | null {
  // resourceKey can come from OauthResource (via authorizationId) or directly from business
  const context = (req as any).context;
  let resourceKey = context?.resource?.resourceKey || req.body?.business?.resourceKey;

  // If not found, try to lookup from OauthResource via authorizationId
  if (!resourceKey) {
    const authorizationId = context?.resource?.authorizationId || req.body?.basic?.authorizationId;
    if (authorizationId && backendPath.includes('{resourceKey}')) {
      // resourceKey is the authorizationId itself (used as resource key in path)
      resourceKey = authorizationId;
    }
  }

  if (!resourceKey) return null;
  if (!backendPath.includes('{resourceKey}')) return null;
  if (!validateParamValue(resourceKey)) return null;
  return resourceKey;
}

function logApiCall(appId: string, developerId: string | null | undefined, subscriptionId: string | undefined, endpoint: string, req: Request, status: number, elapsed: number, responseBody?: any, isError?: boolean): void {
  createApiLog({
    appId,
    developerId: developerId || undefined,
    subscriptionId,
    endpoint,
    method: req.method,
    requestHeaders: { 'x-trace-id': req.headers['x-trace-id'] as string },
    requestBody: req.body?.business,
    responseStatus: status,
    responseBody: responseBody ? (typeof responseBody === 'object' ? responseBody : { data: responseBody }) : undefined,
    responseTime: elapsed,
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'] as string,
    isError: isError || false,
  }).catch(() => {});
}

function handleForwardError(error: any, res: Response, appId: string, normalizedPath: string, req: Request, startTime: number): void {
  console.error('[Forward] Error:', error.message || error);
  const elapsed = Date.now() - startTime;
  logApiCall(appId, undefined, undefined, normalizedPath, req, 500, elapsed, { error: error.message }, true);

  if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') {
    res.status(HttpCodes.SERVICE_UNAVAILABLE).json({ code: BusinessCodes.SERVICE_UNAVAILABLE, message: 'Backend service unavailable' });
    return;
  }
  if (error?.code === 'ETIMEDOUT' || error?.message?.includes('timeout')) {
    res.status(HttpCodes.GATEWAY_TIMEOUT).json({ code: BusinessCodes.GATEWAY_TIMEOUT, message: 'Backend service timeout' });
    return;
  }
  const code = error?.response?.status || HttpCodes.INTERNAL_SERVER_ERROR;
  const message = error?.response?.data?.message || error.message || 'Forwarding error';
  res.status(code).json({ code, message });
}