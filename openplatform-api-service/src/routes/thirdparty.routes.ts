/**
 * Third-party Developer Routes
 * External APIs for third-party developers to integrate with the platform
 *
 * Route structure:
 * - /oauth/token          - Issue OAuth token (BasicInfo validation)
 * - /oauth/authorizeUrl   - Build authorization URL (BasicInfo validation)
 * - /oauth/verify         - Verify OAuth token (no validation required)
 * - /third-party/*        - Resource operations (BasicInfoWithAuthorization validation)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { HttpCodes } from '../enums/http-codes.enum';
import { BusinessCodes } from '../enums/business-codes.enum';
import { issueOauthToken, verifyOauthToken, buildAuthorizeUrl } from '../controllers/thirdparty/thirdparty.controller';
import { createHttpClient, HttpClient } from '../services/http-client.service';
import {
    BACKEND_CLIENTS,
    findForwardRoute,
    normalizePath,
    validateParamValue,
} from '../config/forward-routes';
import { basicValidationMiddleware, resourceValidationMiddleware } from '../middleware/resource-validation.middleware';
import { AuthorizationResult } from '../services/resource-authorization.service';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
const router = Router();

// Basic validation middleware for OAuth endpoints (BasicInfo only)
// Resource validation middleware for third-party endpoints (BasicInfoWithAuthorization)

// Initialize HTTP clients for backend services
const httpClients: Map<string, HttpClient> = new Map();
for (const clientConfig of BACKEND_CLIENTS) {
    httpClients.set(clientConfig.name, createHttpClient(clientConfig));
}

/**
 * Forward request to configured backend service
 * Extracts resourceKey from req.context.resource and passes it to the backend
 * URL parameters are extracted from the inboundPath pattern
 */
async function forwardRequest(req: Request, res: Response): Promise<void> {
    // Normalize path for matching
    const normalizedPath = normalizePath(req.baseUrl + req.path);
    const matched = findForwardRoute(normalizedPath);

    if (!matched) {
        res.status(404).json({
            code: BusinessCodes.NOT_FOUND_RESOURCE,
            message: `Route not found: ${req.method} ${req.path}`,
        });
        return;
    }

    const { config, urlParams } = matched;
    const client = httpClients.get(config.clientName);

    if (!client) {
        res.status(503).json({
            code: BusinessCodes.SERVICE_UNAVAILABLE,
            message: `Backend service not available: ${config.clientName}`,
        });
        return;
    }

    try {
        const traceId = (req.headers['x-trace-id'] as string) || uuidv4();

        // Build the backend path with parameters
        let backendPath = config.route;

        // Detect parameter conflict: URL params shadowing context params
        const paramMapping = config.paramMapping || { resourceKey: 'context' };
        const contextParams = Object.keys(paramMapping).filter(
            k => paramMapping[k] === 'context'
        );
        const conflictParams = Object.keys(urlParams).filter(
            k => contextParams.includes(k)
        );
        if (conflictParams.length > 0) {
            res.status(400).json({
                code: BusinessCodes.PARAM_INVALID_FORMAT,
                message: `Parameter conflict: URL param shadows context param: ${conflictParams.join(', ')}`,
            });
            return;
        }
        const context = (req as any).context;
        const authResource = context?.resource as AuthorizationResult;
        // Get resourceKey from req.context.resource (set by resourceValidationMiddleware)
        const resourceKey = authResource?.resourceKey;

        if (!resourceKey) {
            res.status(400).json({
                code: BusinessCodes.PARAM_REQUIRED,
                message: 'Missing resourceKey in request context',
                context: context
            });
            return;
        }

        // Validate resourceKey exists in route configuration
        if (!backendPath.includes('{resourceKey}')) {
            res.status(500).json({
                code: BusinessCodes.SERVER_INTERNAL,
                message: 'Invalid route configuration: missing {resourceKey}',
            });
            return;
        }

        // Validate and replace resourceKey
        if (!validateParamValue(resourceKey || '')) {
            res.status(400).json({
                code: BusinessCodes.PARAM_REQUIRED,
                message: 'Invalid or missing resourceKey',
            });
            return;
        }
        backendPath = backendPath.replace('{resourceKey}', resourceKey);

        // Validate and replace URL parameters
        for (const [key, value] of Object.entries(urlParams)) {
            if (!validateParamValue(value)) {
                res.status(400).json({
                    code: BusinessCodes.PARAM_REQUIRED,
                    message: `Invalid parameter: ${key}`,
                });
                return;
            }
            backendPath = backendPath.replace(`{${key}}`, value);
        }
        console.log(backendPath, '---------- call -----', req.headers)
        const response = await client.request({
            method: config.method as any,
            url: backendPath,
            data: req.body.business,
            params: req.query as Record<string, string>,
            headers: {
                'x-trace-id': traceId,
            },
        });
        console.log('---------- response -------', response)

        if (typeof response === 'object' && response !== null) {
            res.json(response);
        } else {
            res.send(response);
        }
    } catch (error: any) {
        console.log(error)
        // Handle specific error cases
        if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') {
            res.status(503).json({
                code: BusinessCodes.SERVICE_UNAVAILABLE,
                message: 'Backend service unavailable',
            });
            return;
        }

        if (error?.code === 'ETIMEDOUT' || error?.message?.includes('timeout')) {
            res.status(504).json({
                code: BusinessCodes.GATEWAY_TIMEOUT,
                message: 'Backend service timeout',
            });
            return;
        }

        const code = error?.response?.status || error?.code || 500;
        const message = error?.response?.data?.message || error.message || 'Forwarding error';
        res.status(code).json({
            code: code,
            message: message,
        });
    }
}

// =============================================================================
// OAuth Endpoints - Use BasicValidator (BasicInfo only)
// =============================================================================

// POST /api/thirdparty/oauth/token - Issue OAuth token with basic validation
router.post('/oauth/token', basicValidationMiddleware, issueOauthToken);

// POST /api/thirdparty/oauth/authorizeUrl - Build authorization URL with basic validation
router.post('/oauth/authorizeUrl', basicValidationMiddleware, buildAuthorizeUrl);

// POST /api/thirdparty/oauth/verify - Verify OAuth token and save OauthResource (no validation)
router.post('/oauth/verify', verifyOauthToken);

// =============================================================================
// Third-party Resource Endpoints - Use ResourceValidator (BasicInfoWithAuthorization)
// =============================================================================

// Custody callback test endpoint
router.post('/custody/callback', (req: Request, res: Response) => {
  res.json({
    code: HttpCodes.OK,
    message: 'Test endpoint reached successfully',
    requestBody: req.body,
    requestQuery: req.query,
    requestContext: (req as any).context,
  });
});

// Catch-all: Forward matched routes to backend services (POST only)
// These routes require authorizationId in the request body
router.post('*', resourceValidationMiddleware, forwardRequest);

export default router;