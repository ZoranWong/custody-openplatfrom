/**
 * Third-party Developer Controller
 * External APIs for third-party developers to integrate with the platform
 */

import { Request, Response, NextFunction } from 'express';
import { HttpCodes } from '../../enums/http-codes.enum';
import { BusinessCodes } from '../../enums/business-codes.enum';
import { signJWT, verifyJWT } from '../../utils/jwt.util';
import { ResourceValidationRequest } from '../../middleware/resource-validation.middleware';
import { getApplicationRepository, getOauthResourceRepository } from '../../repositories/repository.factory';
import { getApplicationCallbackService } from '../../services/application-callback.service';
import { createApiLog } from '../../services/api-log.service';
import { logger } from '../../utils/logger';
import { Application } from '@prisma/client';

/**
 * POST /api/thirdparty/oauth/token
 * Issue OAuth token with signature verification
 * Uses resourceValidationMiddleware for signature verification before this handler
 *
 * Request body (after middleware):
 * {
 *   basic: { appId, resourceKey, timestamp, nonce, signature },
 *   business: { oauthUserId }
 * }
 *
 * Response:
 * {
 *   code: 0,
 *   message: 'Success',
 *   data: {
 *     access_token: string,
 *     expires_in: number,
 *     token_type: 'Bearer'
 *   }
 * }
 */
export async function issueOauthToken(req: ResourceValidationRequest, res: Response): Promise<void> {
    const businessData = req.body.business as { oauthUserId?: string } | undefined;
    const oauthUserId = businessData?.oauthUserId;
    const appId = req.context?.application?.id;
    const resourceKey = req.authorizationId;

    // Validate oauthUserId is present
    if (!oauthUserId) {
        res.status(HttpCodes.BAD_REQUEST).json({
            code: BusinessCodes.PARAM_REQUIRED,
            message: 'Missing required parameter: oauthUserId',
        });
        return;
    }

    // Validate oauthUserId is not empty string
    if (typeof oauthUserId !== 'string' || oauthUserId.trim().length === 0) {
        res.status(HttpCodes.BAD_REQUEST).json({
            code: BusinessCodes.PARAM_INVALID_FORMAT,
            message: 'oauthUserId must be a non-empty string',
        });
        return;
    }

    if (!appId) {
        res.status(HttpCodes.UNAUTHORIZED).json({
            code: BusinessCodes.AUTH_MISSING_HEADERS,
            message: 'Invalid request: missing appId',
        });
        return;
    }

    // Issue JWT with oauthUserId and appId
    const expiresIn = 7200; // 2 hours
    const signed = signJWT(
        {
            oauthUserId: oauthUserId.trim(),
            appId,
            resourceKey: resourceKey || '',
        },
        { expiresIn }
    );

    res.json({
        code: 0,
        message: 'Success',
        data: {
            access_token: signed.token,
            expires_in: expiresIn,
            token_type: 'Bearer',
        },
    });
}

/**
 * POST /api/thirdparty/oauth/authorizeUrl
 * Build authorization URL with app configuration
 * Uses resourceValidationMiddleware for signature verification before this handler
 *
 * Request body (after middleware):
 * {
 *   basic: { appId, resourceKey, timestamp, nonce, signature },
 *   business: { permissions?, redirectUri?, state?, oauthToken? }
 * }
 *
 * Response:
 * {
 *   code: 0,
 *   message: 'Success',
 *   data: {
 *     authorizeUrl: string,
 *     expiresIn: number
 *   }
 * }
 */
export async function buildAuthorizeUrl(req: ResourceValidationRequest, res: Response): Promise<void> {
    const businessData = req.body.business as
      | {
          permissions?: string[];
          callback?: string;
          state?: string;
          token?: string; // Developer-generated token for user identity mapping
        }
      | undefined;
    const appId = req.context?.application?.id;

    if (!appId) {
        res.status(HttpCodes.UNAUTHORIZED).json({
            code: BusinessCodes.AUTH_MISSING_HEADERS,
            message: 'Invalid request: missing appId',
        });
        return;
    }

    const application = req.context?.application as unknown as Application;
    if (!application) {
        res.status(HttpCodes.NOT_FOUND).json({
            code: BusinessCodes.NOT_FOUND_RESOURCE,
            message: 'Application not found',
        });
        return;
    }

    if (application.status !== 'active') {
        res.status(HttpCodes.FORBIDDEN).json({
            code: BusinessCodes.AUTHZ_ACCESS_DENIED,
            message: 'Application is not active',
        });
        return;
    }

    // Generate appToken (JWT) with oauthUserId placeholder
    // Note: oauthUserId will be determined when user actually authenticates in the auth page
    const expiresIn = 7200; // 2 hours
    const developerToken = businessData?.token;
    const callback = businessData?.callback
    const signed = signJWT(
        {
            appId,
            callback,
            token: developerToken, // Include developer-provided token for user identity mapping if provided
            // oauthUserId will be set when user logs in on auth page
            // For now, we include a temporary token that will be exchanged
            type: 'authorize',
        },
        { expiresIn }
    );

    // Build authorization URL
    // Base URL from environment or default
    const baseUrl =
      process.env.OPENPLATFORM_AUTH_URL ||
      'https://custody.cregis.ae/openplatform/auth';
    const authPath = '';

    const params = new URLSearchParams();
    params.set('appId', appId);
    params.set('appToken', signed.token);
    params.set('appName', application.appName);

    // Add optional parameters if provided
    if (application.appLogoUrl) {
        params.set('appLogoUrl', application.appLogoUrl);
    }
    if (businessData?.permissions && businessData.permissions.length > 0) {
        params.set('permissions', JSON.stringify(businessData.permissions));
    }
    if (businessData?.state) {
        params.set('state', businessData.state);
    }

    const authorizeUrl = `${baseUrl}${authPath}?${params.toString()}`;

    res.json({
        code: 0,
        message: 'Success',
        data: {
            authorizeUrl,
            expiresIn,
        },
    });
}

/**
 * POST /api/thirdparty/oauth/verify
 * Verify OAuth token and save OauthResource
 * No authentication required - verifies the token itself
 *
 * Request body:
 * {
 *   resourceKey: string,
 *   oauthToken: string,
 *   callback?: string  // Optional: URL to receive async notification after verification
 * }
 *
 * Response:
 * {
 *   code: 0,
 *   message: 'Success',
 *   data: {
 *     authorizeId: string
 *   }
 * }
 *
 * If callback is provided, a POST request will be sent to the callback URL after verification:
 * {
 *   authorizeId: string,
 *   oauthToken: string
 * }
 */
export async function verifyOauthToken(req: Request, res: Response): Promise<void> {
    const { resourceKey, oauthToken } = req.body;

    // Verify and decode the JWT
    const payload = verifyJWT<{
        appId: string;
        token?: string;
        callback?: string
        iat: number;
        exp: number;
    }>(oauthToken);

    if (!payload) {
        res.status(HttpCodes.UNAUTHORIZED).json({
            code: BusinessCodes.AUTH_MISSING_HEADERS,
            message: 'Invalid or expired oauthToken',
        });
        return;
    }

    const { appId } = payload;

    if (!appId) {
        res.status(HttpCodes.UNAUTHORIZED).json({
            code: BusinessCodes.AUTH_MISSING_HEADERS,
            message: 'Invalid token payload: missing appId',
        });
        return;
    }

    try {
        const appRepo = getApplicationRepository();
        const oauthRepo = getOauthResourceRepository();

        const application = await appRepo.findByAppId(appId)
        if (!application) {
            res.status(HttpCodes.NOT_FOUND).json({
                code: BusinessCodes.NOT_FOUND_RESOURCE,
                message: 'Application not exist.'
            })
            return
        }

        // Upsert OauthResource - create or update if exists
        const oauthResource = await oauthRepo.upsert({
            appId,
            resourceKey,
            authorizedAt: new Date(),
        });

        const callbackService = getApplicationCallbackService()
        const eventData = {
            authorizeId: oauthResource.id,
            oauthToken: payload.token,
        }

        // 1. Authorization-specific callback (from payload) - with HMAC-SHA256 signature
        try {
            if (payload.callback) {
                callbackService.pushEvent({
                    application: {
                        id: application.id,
                        appSecret: application.appSecret,
                        callbackUrl: payload.callback,
                    },
                    data: eventData,
                }).catch((err) => logger.error('Authorization callback (payload) failed:', err))
            } else
                if (application.callbackUrl) {
                    callbackService.pushEvent({
                        application: {
                            id: application.id,
                            appSecret: application.appSecret,
                            callbackUrl: application.callbackUrl,
                        },
                        event: 'authorization.created',
                        data: eventData,
                    }).catch((err) => logger.error('Authorization callback (app) failed:', err))
                }
        } catch (err) {
            logger.error('Failed to push authorization callback:', err)
        }

        res.json({
            code: 0,
            message: 'Success',
            data: {
                authorizeId: oauthResource.id,
            },
        });
    } catch (error) {
        // Handle unique constraint violation
        if (error instanceof Error && error.message.includes('Unique constraint')) {
            res.status(HttpCodes.CONFLICT).json({
                code: BusinessCodes.CONFLICT_DUPLICATE,
                message: 'Authorization already exists for this appId, userId, and resourceKey',
            });
            return;
        }

        res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
            code: BusinessCodes.SERVER_INTERNAL,
            message: 'Internal server error',
        });
    }
}

/**
 * Middleware to log OAuth API calls
 */
export function logOAuthCall(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const context = (req as any).context;
    const appId = context?.application?.id || req.body?.basic?.appId || 'unknown';
    const developerId = context?.application?.isvDeveloperId || context?.developer?.id || undefined;

    const apiNameMap: Record<string, string> = {
        'oauth/authorizeUrl': 'Get Authorization URL',
        'oauth/verify': 'Verify OAuth Token',
        'oauth/token': 'Issue OAuth Token',
    };
    let apiName = '';
    for (const [path, name] of Object.entries(apiNameMap)) {
      if (req.path.includes(path)) { apiName = name; break; }
    }
    if (!apiName) apiName = req.path;
    //   const apiName = apiNameMap[req.path] || req.path;

    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
        const elapsed = Date.now() - startTime;
        const isSuccess = body?.code === 0;

        createApiLog({
            appId,
            developerId,
            apiName,
            endpoint: req.baseUrl + req.path,
            method: req.method,
            requestBody: req.body?.business,
            responseStatus: isSuccess ? 200 : (body?.code || 500),
            responseBody: body,
            responseTime: elapsed,
            ipAddress: req.ip || req.socket.remoteAddress,
            userAgent: req.headers['user-agent'] as string,
            isError: !isSuccess,
        }).catch(() => { });

        return originalJson(body);
    };

    next();
}