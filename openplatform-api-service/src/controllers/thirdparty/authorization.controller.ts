/**
 * Authorization Controller
 * Handles authorization storage requests from developer platforms
 */

import { Request, Response } from 'express';
import { HttpCodes } from '../../enums/http-codes.enum';
import { BusinessCodes } from '../../enums/business-codes.enum';
import { getApplicationRepository } from '../../repositories/repository.factory';
import { getAuthorizationRepository } from '../../repositories/repository.factory';
import { computeSignature, verifySignature } from '../../utils/signature.util';
import { OauthResource } from '../../repositories/repository.interfaces';
import { getApplicationCallbackService } from '../../services/application-callback.service';
import { logger } from '../../utils/logger';

/**
 * Sort object keys recursively for consistent JSON serialization
 */
function sortObjectKeys(obj: Record<string, unknown>): Record<string, unknown> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sortObjectKeys(item as Record<string, unknown>)) as unknown as Record<string, unknown>;
  }

  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj).sort();

  for (const key of keys) {
    sorted[key] = sortObjectKeys(obj[key] as Record<string, unknown>);
  }

  return sorted;
}

/**
 * Build signature base string
 */
function buildSignatureBaseString(
  appId: string,
  timestamp: number,
  nonce: string,
  businessData: Record<string, unknown>
): string {
  const sortedData = sortObjectKeys(businessData);
  const dataString = JSON.stringify(sortedData);
  return `${appId}${timestamp}${nonce}${dataString}`;
}

/**
 * POST /v1/authorizations
 * Store authorization from developer platform
 *
 * Request Body:
 * - Base info: appId, timestamp, nonce, signature
 * - Business data: resourceKey, permissions, expiresAt
 */
export async function createAuthorization(req: Request, res: Response): Promise<void> {
  const {
    // Base request info
    appId,
    timestamp,
    nonce,
    signature,
    // Business data
    resourceKey,
    permissions,
    expiresAt,
  } = req.body;

  // Validate required fields
  if (!appId) {
    res.status(HttpCodes.BAD_REQUEST).json({
      code: BusinessCodes.PARAM_REQUIRED,
      message: 'Missing required parameter: appId',
    });
    return;
  }

  if (!timestamp) {
    res.status(HttpCodes.BAD_REQUEST).json({
      code: BusinessCodes.PARAM_REQUIRED,
      message: 'Missing required parameter: timestamp',
    });
    return;
  }

  if (!nonce) {
    res.status(HttpCodes.BAD_REQUEST).json({
      code: BusinessCodes.PARAM_REQUIRED,
      message: 'Missing required parameter: nonce',
    });
    return;
  }

  if (!signature) {
    res.status(HttpCodes.BAD_REQUEST).json({
      code: BusinessCodes.AUTH_MISSING_HEADERS,
      message: 'Missing signature',
    });
    return;
  }

  if (!resourceKey) {
    res.status(HttpCodes.BAD_REQUEST).json({
      code: BusinessCodes.PARAM_REQUIRED,
      message: 'Missing required parameter: resourceKey',
    });
    return;
  }

  // Validate resourceKey format
  const resourceKeyPattern = /^[a-zA-Z0-9_-]+$/;
  if (!resourceKeyPattern.test(resourceKey)) {
    res.status(HttpCodes.BAD_REQUEST).json({
      code: BusinessCodes.PARAM_REQUIRED,
      message: 'Invalid resourceKey format',
    });
    return;
  }

  if (!permissions || !Array.isArray(permissions)) {
    res.status(HttpCodes.BAD_REQUEST).json({
      code: BusinessCodes.PARAM_REQUIRED,
      message: 'Missing required parameter: permissions',
    });
    return;
  }

  // Get application to retrieve appSecret
  const applicationRepo = getApplicationRepository();
  const application = await applicationRepo.findByAppId(appId);

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

  const appSecret = application.appSecret;
  if (!appSecret) {
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Application secret not configured',
    });
    return;
  }

  // Build business data for signature
  const businessData: Record<string, unknown> = {
    resourceKey,
    permissions,
  };

  if (expiresAt) {
    businessData.expiresAt = expiresAt;
  }

  // Build signature base string
  const baseString = buildSignatureBaseString(appId, timestamp, nonce, businessData);

  // Verify signature
  const isValid = verifySignature(appSecret, signature, {
    appid: appId,
    timestamp,
    nonce,
    body: baseString,
    method: 'POST',
    path: '/v1/authorizations',
  });

  if (!isValid) {
    res.status(HttpCodes.UNAUTHORIZED).json({
      code: BusinessCodes.AUTH_INVALID_SIGNATURE,
      message: 'Invalid signature',
    });
    return;
  }

  // Validate timestamp (within 5 minutes)
  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = Math.abs(currentTime - timestamp);
  if (timeDiff > 300) {
    res.status(HttpCodes.UNAUTHORIZED).json({
      code: BusinessCodes.AUTH_TIMESTAMP_EXPIRED_OR_INVALID_TOKEN,
      message: 'Timestamp expired',
    });
    return;
  }

  // Store authorization
  try {
    const authorizationRepo = getAuthorizationRepository();
    const authorization = await authorizationRepo.upsert({
      appId,
      resourceKey,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    res.status(HttpCodes.OK).json({
      code: 0,
      data: {
        authorizationId: authorization.id,
        createdAt: authorization.createdAt,
        updatedAt: authorization.updatedAt,
      },
    });

    // Push callback event (async, non-blocking)
    getApplicationCallbackService().pushEvent({
      application,
      event: 'authorization.created',
      data: {
        authorizationId: authorization.id,
        resourceKey,
        expiresAt: authorization.expiresAt,
      },
    }).catch((err) => logger.error('Callback push failed:', err));

  } catch (error) {
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to store authorization',
    });
  }
}

/**
 * GET /v1/authorizations/:id
 * Get authorization by ID
 *
 * Request Headers:
 * - X-App-Id: Application ID
 * - X-Timestamp: Unix timestamp
 * - X-Nonce: Random string
 * - X-Signature: HMAC-SHA256 signature
 */
export async function getAuthorization(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  // Get signature headers
  const appId = req.headers['x-app-id'] as string;
  const timestamp = parseInt(req.headers['x-timestamp'] as string, 10);
  const nonce = req.headers['x-nonce'] as string;
  const signature = req.headers['x-signature'] as string;

  // Validate required headers
  if (!appId) {
    res.status(HttpCodes.UNAUTHORIZED).json({
      code: BusinessCodes.AUTH_MISSING_HEADERS,
      message: 'Missing required header: X-App-Id',
    });
    return;
  }

  if (!timestamp) {
    res.status(HttpCodes.UNAUTHORIZED).json({
      code: BusinessCodes.AUTH_MISSING_HEADERS,
      message: 'Missing required header: X-Timestamp',
    });
    return;
  }

  if (!nonce) {
    res.status(HttpCodes.UNAUTHORIZED).json({
      code: BusinessCodes.AUTH_MISSING_HEADERS,
      message: 'Missing required header: X-Nonce',
    });
    return;
  }

  if (!signature) {
    res.status(HttpCodes.UNAUTHORIZED).json({
      code: BusinessCodes.AUTH_MISSING_HEADERS,
      message: 'Missing required header: X-Signature',
    });
    return;
  }

  // Validate timestamp (within 5 minutes)
  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = Math.abs(currentTime - timestamp);
  if (timeDiff > 300) {
    res.status(HttpCodes.UNAUTHORIZED).json({
      code: BusinessCodes.AUTH_TIMESTAMP_EXPIRED_OR_INVALID_TOKEN,
      message: 'Timestamp expired',
    });
    return;
  }

  // Get application to retrieve appSecret
  const applicationRepo = getApplicationRepository();
  const application = await applicationRepo.findByAppId(appId);

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

  const appSecret = application.appSecret;
  if (!appSecret) {
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Application secret not configured',
    });
    return;
  }

  // Build signature base string for GET (empty body)
  const baseString = `${appId}${timestamp}${nonce}`;

  // Verify signature
  const isValid = verifySignature(appSecret, signature, {
    appid: appId,
    timestamp,
    nonce,
    body: baseString,
    method: 'GET',
    path: `/v1/authorizations/${id}`,
  });

  if (!isValid) {
    res.status(HttpCodes.UNAUTHORIZED).json({
      code: BusinessCodes.AUTH_INVALID_SIGNATURE,
      message: 'Invalid signature',
    });
    return;
  }

  // Find authorization
  try {
    const authorizationRepo = getAuthorizationRepository();
    const authorization = await authorizationRepo.findById(id);

    if (!authorization) {
      res.status(HttpCodes.NOT_FOUND).json({
        code: BusinessCodes.NOT_FOUND_RESOURCE,
        message: 'Authorization not found',
      });
      return;
    }

    // Check if authorization has expired
    let effectiveStatus = authorization.status;
    if (authorization.expiresAt) {
      const expiresAtTime = new Date(authorization.expiresAt).getTime();
      if (Date.now() > expiresAtTime) {
        effectiveStatus = 'expired';
      }
    }

    // Return authorization details
    res.status(HttpCodes.OK).json({
      code: 0,
      data: {
        authorizationId: authorization.id,
        appId: authorization.appId,
        resourceKey: authorization.resourceKey,
        status: effectiveStatus,
        createdAt: authorization.createdAt,
        updatedAt: authorization.updatedAt,
        expiresAt: authorization.expiresAt,
      },
    });
  } catch (error) {
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to get authorization',
    });
  }
}
