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
import { issueOauthToken, verifyOauthToken, buildAuthorizeUrl } from '../controllers/thirdparty.controller';
import { createHttpClient, HttpClient } from '../services/http-client.service';
import { FORWARD_ROUTES, BACKEND_CLIENTS, findForwardRoute } from '../config/forward-routes';
import { basicValidationMiddleware, resourceValidationMiddleware } from '../middleware/resource-validation.middleware';

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
 * Extracts resourceAccessKey from URL path and passes it to the backend
 */
async function forwardRequest(req: Request, res: Response): Promise<void> {
    const matchedRoute = findForwardRoute(req.path, req.method);

    if (!matchedRoute) {
        res.status(404).json({
            code: 40401,
            message: `Route not found: ${req.method} ${req.path}`,
        });
        return;
    }

    const client = httpClients.get(matchedRoute.clientName);

    if (!client) {
        res.status(503).json({
            code: 50301,
            message: `Backend service not available: ${matchedRoute.clientName}`,
        });
        return;
    }

    try {
        const traceId = (req.headers['x-trace-id'] as string) ||
            `tp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        // Extract resourceAccessKey from URL path
        // Path format: /api/third-party/{action}/{resourceAccessKey}
        const pathParts = req.path.split('/');
        const resourceAccessKeyIndex = pathParts.findIndex(p => p === 'third-party') + 2;

        // Build the backend path with resourceAccessKey
        const backendPath = matchedRoute.route
            .replace('{resourceAccessKey}', pathParts[resourceAccessKeyIndex] || '')
            .replace('{taskId}', pathParts[resourceAccessKeyIndex + 1] || '');

        const response = await client.request({
            method: req.method as any,
            url: backendPath,
            data: req.body,
            params: req.query as Record<string, string>,
            headers: {
                ...req.headers as Record<string, string>,
                'X-Trace-Id': traceId,
            },
        });

        if (typeof response === 'object' && response !== null) {
            res.json(response);
        } else {
            res.send(response);
        }
    } catch (error: any) {
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

// Catch-all: Forward matched routes to backend services (POST only)
// These routes require authorizationId in the request body
router.post('*', resourceValidationMiddleware, forwardRequest);

export default router;