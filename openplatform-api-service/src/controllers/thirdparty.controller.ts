/**
 * Third-party Developer Controller
 * External APIs for third-party developers to integrate with the platform
 */

import { Request, Response } from 'express';
import { signJWT, verifyJWT } from '../utils/jwt.util';
import { ResourceValidationRequest } from '../middleware/resource-validation.middleware';
import { getApplicationRepository, getOauthResourceRepository } from '../repositories/repository.factory';
import { getApplicationCallbackService } from '../services/application-callback.service';
import { logger } from '../utils/logger';
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
        res.status(400).json({
            code: 40001,
            message: 'Missing required parameter: oauthUserId',
        });
        return;
    }

    // Validate oauthUserId is not empty string
    if (typeof oauthUserId !== 'string' || oauthUserId.trim().length === 0) {
        res.status(400).json({
            code: 40002,
            message: 'oauthUserId must be a non-empty string',
        });
        return;
    }

    if (!appId) {
        res.status(401).json({
            code: 40101,
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
    const businessData = req.body.business as {
        permissions?: string[];
        callback?: string 
        state?: string;
        token?: string;  // Developer-generated token for user identity mapping
    } | undefined;
    const appId = req.context?.application?.id;

    if (!appId) {
        res.status(401).json({
            code: 40101,
            message: 'Invalid request: missing appId',
        });
        return;
    }

    const application = req.context?.application as unknown as Application;
    if (!application) {
        res.status(404).json({
            code: 40401,
            message: 'Application not found',
        });
        return;
    }

    if (application.status !== 'active') {
        res.status(403).json({
            code: 40301,
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
    const baseUrl = process.env.OPENPLATFORM_AUTH_URL || 'https://openplatform.cregis.com/openplatform';
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

    // Validate resourceKey
    if (!resourceKey) {
        res.status(400).json({
            code: 40001,
            message: 'Missing required parameter: resourceKey',
        });
        return;
    }

    // Validate oauthToken
    if (!oauthToken) {
        res.status(400).json({
            code: 40001,
            message: 'Missing required parameter: oauthToken',
        });
        return;
    }

    // Verify and decode the JWT
    const payload = verifyJWT<{
        appId: string;
        token?: string;
        callback?: string
        iat: number;
        exp: number;
    }>(oauthToken);

    if (!payload) {
        res.status(401).json({
            code: 40101,
            message: 'Invalid or expired oauthToken',
        });
        return;
    }

    const { appId } = payload;

    if (!appId) {
        res.status(401).json({
            code: 40101,
            message: 'Invalid token payload: missing appId',
        });
        return;
    }

    try {
        const appRepo = getApplicationRepository();
        const oauthRepo = getOauthResourceRepository();

        const application = await appRepo.findByAppId(appId)
        if (!application) {
            res.status(404).json({
                code: 40401,
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
            res.status(409).json({
                code: 40901,
                message: 'Authorization already exists for this appId, userId, and resourceKey',
            });
            return;
        }

        res.status(500).json({
            code: 50001,
            message: 'Internal server error',
        });
    }
}