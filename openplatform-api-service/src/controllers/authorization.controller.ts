/**
 * Authorization Controller
 * Handles authorization storage requests from developer platforms
 */

import { Request, Response } from 'express';
import { getApplicationRepository } from '../repositories/repository.factory';
import { getAuthorizationRepository } from '../repositories/repository.factory';
import { computeSignature, verifySignature, SignatureErrorCode } from '../utils/signature.util';
import { Authorization } from '../types/authorization.types';

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
    res.status(400).json({
      code: 40001,
      message: 'Missing required parameter: appId',
    });
    return;
  }

  if (!timestamp) {
    res.status(400).json({
      code: 40001,
      message: 'Missing required parameter: timestamp',
    });
    return;
  }

  if (!nonce) {
    res.status(400).json({
      code: 40001,
      message: 'Missing required parameter: nonce',
    });
    return;
  }

  if (!signature) {
    res.status(400).json({
      code: 40101,
      message: 'Missing signature',
    });
    return;
  }

  if (!resourceKey) {
    res.status(400).json({
      code: 40001,
      message: 'Missing required parameter: resourceKey',
    });
    return;
  }

  // Validate resourceKey format
  const resourceKeyPattern = /^[a-zA-Z0-9_-]+$/;
  if (!resourceKeyPattern.test(resourceKey)) {
    res.status(400).json({
      code: 40001,
      message: 'Invalid resourceKey format',
    });
    return;
  }

  if (!permissions || !Array.isArray(permissions)) {
    res.status(400).json({
      code: 40001,
      message: 'Missing required parameter: permissions',
    });
    return;
  }

  // Get application to retrieve appSecret
  const applicationRepo = getApplicationRepository();
  const application = await applicationRepo.findByAppId(appId);

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

  const appSecret = application.appSecret;
  if (!appSecret) {
    res.status(500).json({
      code: 50001,
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
    res.status(401).json({
      code: SignatureErrorCode.INVALID_SIGNATURE,
      message: 'Invalid signature',
    });
    return;
  }

  // Validate timestamp (within 5 minutes)
  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = Math.abs(currentTime - timestamp);
  if (timeDiff > 300) {
    res.status(401).json({
      code: SignatureErrorCode.EXPIRED_TIMESTAMP,
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
      permissions,
      expiresAt,
      status: 'active',
    });

    res.status(200).json({
      code: 200,
      data: {
        authorizationId: authorization.id,
        createdAt: authorization.createdAt,
        updatedAt: authorization.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      code: 50001,
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
    res.status(401).json({
      code: SignatureErrorCode.MISSING_HEADERS,
      message: 'Missing required header: X-App-Id',
    });
    return;
  }

  if (!timestamp) {
    res.status(401).json({
      code: SignatureErrorCode.MISSING_HEADERS,
      message: 'Missing required header: X-Timestamp',
    });
    return;
  }

  if (!nonce) {
    res.status(401).json({
      code: SignatureErrorCode.MISSING_HEADERS,
      message: 'Missing required header: X-Nonce',
    });
    return;
  }

  if (!signature) {
    res.status(401).json({
      code: SignatureErrorCode.MISSING_HEADERS,
      message: 'Missing required header: X-Signature',
    });
    return;
  }

  // Validate timestamp (within 5 minutes)
  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = Math.abs(currentTime - timestamp);
  if (timeDiff > 300) {
    res.status(401).json({
      code: SignatureErrorCode.EXPIRED_TIMESTAMP,
      message: 'Timestamp expired',
    });
    return;
  }

  // Get application to retrieve appSecret
  const applicationRepo = getApplicationRepository();
  const application = await applicationRepo.findByAppId(appId);

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

  const appSecret = application.appSecret;
  if (!appSecret) {
    res.status(500).json({
      code: 50001,
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
    res.status(401).json({
      code: SignatureErrorCode.INVALID_SIGNATURE,
      message: 'Invalid signature',
    });
    return;
  }

  // Find authorization
  try {
    const authorizationRepo = getAuthorizationRepository();
    const authorization = await authorizationRepo.findById(id);

    if (!authorization) {
      res.status(404).json({
        code: 40401,
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
    res.status(200).json({
      code: 200,
      data: {
        authorizationId: authorization.id,
        appId: authorization.appId,
        resourceKey: authorization.resourceKey,
        permissions: authorization.permissions,
        status: effectiveStatus,
        createdAt: authorization.createdAt,
        updatedAt: authorization.updatedAt,
        expiresAt: authorization.expiresAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      code: 50001,
      message: 'Failed to get authorization',
    });
  }
}
