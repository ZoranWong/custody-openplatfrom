/**
 * Third-party Developer Controller
 * External APIs for third-party developers to integrate with the platform
 */

import { Request, Response } from 'express';
import { getPrismaClient } from '../database/prisma-client';
import { signJWT, verifyJWT } from '../utils/jwt.util';
import { ResourceValidationRequest } from '../middleware/resource-validation.middleware';

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
 *   business: { permissions?, redirectUri?, state? }
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
        redirectUri?: string;
        state?: string;
    } | undefined;
    const appId = req.context?.application?.id;

    if (!appId) {
        res.status(401).json({
            code: 40101,
            message: 'Invalid request: missing appId',
        });
        return;
    }

    const application = req.context?.application;
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
    const signed = signJWT(
        {
            appId,
            // oauthUserId will be set when user logs in on auth page
            // For now, we include a temporary token that will be exchanged
            type: 'authorize',
        },
        { expiresIn }
    );

    // Build authorization URL
    // Base URL from environment or default
    const baseUrl = process.env.OPENPLATFORM_AUTH_URL || 'https://openplatform.cregis.com/openplatform';
    const authPath = '/auth/authorize';

    const params = new URLSearchParams();
    params.set('appId', appId);
    params.set('appToken', signed.token);
    params.set('appName', application.name);

    // Add optional parameters if provided
    if (application.appLogoUrl) {
        params.set('appLogoUrl', application.appLogoUrl);
    }
    if (businessData?.permissions && businessData.permissions.length > 0) {
        params.set('permissions', JSON.stringify(businessData.permissions));
    }
    if (businessData?.redirectUri) {
        params.set('redirectUri', businessData.redirectUri);
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
 *   oauthToken: string
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
        oauthUserId: string;
        appId: string;
        resourceKey?: string;
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

    const { oauthUserId, appId } = payload;

    if (!oauthUserId || !appId) {
        res.status(401).json({
            code: 40101,
            message: 'Invalid token payload: missing oauthUserId or appId',
        });
        return;
    }

    try {
        const prisma = getPrismaClient();

        // Upsert OauthResource - create or update if exists
        const oauthResource = await prisma.oauthResource.upsert({
            where: {
                appId_userId_resourceKey: {
                    appId,
                    userId: oauthUserId,
                    resourceKey,
                },
            },
            update: {
                status: 'active',
                authorizedAt: new Date(),
            },
            create: {
                appId,
                userId: oauthUserId,
                resourceKey,
                status: 'active',
            },
        });

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