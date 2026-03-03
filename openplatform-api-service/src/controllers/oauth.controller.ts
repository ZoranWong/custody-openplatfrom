/**
 * OAuth Token Controller
 * Handles OAuth 2.0 token issuance, refresh, revocation, and appToken validation endpoints
 */

import { Request, Response } from 'express';
import { tokenService } from '../services/token.service';
import { getApplicationRepository } from '../repositories/repository.factory';

/**
 * POST /oauth/token
 * Handle token issuance and refresh
 *
 * Request body:
 * {
 *   grant_type: 'client_credentials' | 'refresh_token',
 *   appid: string,
 *   appsecret?: string,        // Required for client_credentials
 *   refresh_token?: string     // Required for refresh_token
 * }
 */
export async function oauthToken(req: Request, res: Response): Promise<void> {
  const { grant_type, appid, appsecret, refresh_token } = req.body;
  const clientIp = req.ip || 'unknown';

  // Validate grant_type is present
  if (!grant_type) {
    res.status(400).json({
      code: 40001,
      message: 'Missing required parameter: grant_type',
    });
    return;
  }

  // Handle client_credentials grant
  if (grant_type === 'client_credentials') {
    if (!appid || !appsecret) {
      res.status(400).json({
        code: 40001,
        message: 'Missing required parameters: appid and appsecret',
      });
      return;
    }

    const result = await tokenService.issueTokens(
      appid,
      appsecret,
      '', // userId - not required for client_credentials
      undefined, // enterpriseId - will be fetched from credential validation
      undefined, // permissions - will be fetched from credential validation
      clientIp
    );

    if ('error' in result) {
      handleTokenError(res, result.error);
      return;
    }

    res.json(result.tokens);
    return;
  }

  // Handle refresh_token grant
  if (grant_type === 'refresh_token') {
    if (!appid || !refresh_token) {
      res.status(400).json({
        code: 40001,
        message: 'Missing required parameters: appid and refresh_token',
      });
      return;
    }

    const result = await tokenService.refreshAccessToken(
      refresh_token,
      appid,
      clientIp
    );

    if ('error' in result) {
      handleTokenError(res, result.error);
      return;
    }

    res.json(result.tokens);
    return;
  }

  // Invalid grant_type
  res.status(400).json({
    code: 40002,
    message: `Invalid grant_type: ${grant_type}. Supported values: client_credentials, refresh_token`,
  });
}

/**
 * POST /oauth/revoke
 * Handle token revocation
 *
 * Request body:
 * {
 *   refresh_token: string
 * }
 */
export async function oauthRevoke(req: Request, res: Response): Promise<void> {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    res.status(400).json({
      code: 40001,
      message: 'Missing required parameter: refresh_token',
    });
    return;
  }

  const result = await tokenService.revokeRefreshToken(refresh_token);

  if ('error' in result) {
    handleTokenError(res, result.error);
    return;
  }

  res.json({ success: true });
}

/**
 * Handle error responses from TokenService
 */
function handleTokenError(
  res: Response,
  error: { code: number; message: string }
): void {
  // Map error codes to appropriate HTTP status codes
  let httpStatus = 401;
  const { code: errorCode } = error;

  switch (errorCode) {
    case 42901: // RATE_LIMIT_EXCEEDED
      httpStatus = 429;
      break;
    case 40110: // INVALID_CREDENTIALS
    case 40107: // INVALID_REFRESH_TOKEN
      httpStatus = 401;
      break;
    case 40401: // TOKEN_NOT_FOUND
      httpStatus = 404;
      break;
  }

  res.status(httpStatus).json({
    code: errorCode,
    message: error.message,
  });
}

/**
 * POST /v1/appToken/validate
 * Validate appToken from third-party developers
 *
 * Request Body:
 * {
 *   "appId": "app-123",
 *   "appToken": "eyJhbGciOiJIUzI1NiIs..."
 * }
 *
 * The appSecret is retrieved from the database using the appId to verify the signature.
 */
export async function validateAppToken(req: Request, res: Response): Promise<void> {
  // Extract appId and appToken from request body
  const appId = req.body.appId as string;
  const appToken = req.body.appToken as string;

  if (!appId) {
    res.status(400).json({
      code: 40001,
      message: 'Missing required parameter: appId',
    });
    return;
  }

  if (!appToken) {
    res.status(400).json({
      code: 40001,
      message: 'Missing required parameter: appToken',
    });
    return;
  }

  // Look up appSecret from database using appId
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

  const result = await tokenService.validateAppToken(appToken, appSecret, appId);

  if (!result.valid) {
    const errorCode = result.error?.code || 40103;
    let httpStatus = 401;

    if (errorCode === 40102) {
      httpStatus = 401;
    }

    res.status(httpStatus).json({
      code: errorCode,
      message: result.error?.message || 'Invalid token',
    });
    return;
  }

  // Verify that the appId in the token matches the appId in the request
  if (result.claims?.appId !== appId) {
    res.status(401).json({
      code: 40103,
      message: 'Invalid token: appId mismatch',
    });
    return;
  }

  // Return validation success with claims
  res.json({
    code: 200,
    data: {
      valid: true,
      claims: {
        appId: result.claims?.appId,
        timestamp: result.claims?.timestamp,
        nonce: result.claims?.nonce,
      },
    },
  });
}
