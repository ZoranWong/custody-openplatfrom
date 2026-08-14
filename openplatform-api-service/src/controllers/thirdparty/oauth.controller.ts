/**
 * OAuth Token Controller
 * Handles OAuth 2.0 token issuance, refresh, revocation, and appToken validation endpoints
 * Internal APIs for platform token management
 */

import { Request, Response } from 'express';
import { tokenService } from '../../services/token.service';
import { getApplicationRepository } from '../../repositories/repository.factory';
import { HttpCodes } from '../../enums/http-codes.enum';
import { BusinessCodes } from '../../enums/business-codes.enum';

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
    res.status(HttpCodes.BAD_REQUEST).json({
      code: BusinessCodes.PARAM_REQUIRED,
      message: 'Missing required parameter: grant_type',
    });
    return;
  }

  // Handle client_credentials grant
  if (grant_type === 'client_credentials') {
    if (!appid || !appsecret) {
      res.status(HttpCodes.BAD_REQUEST).json({
        code: BusinessCodes.PARAM_REQUIRED,
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
      res.status(HttpCodes.BAD_REQUEST).json({
        code: BusinessCodes.PARAM_REQUIRED,
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
  res.status(HttpCodes.BAD_REQUEST).json({
    code: BusinessCodes.PARAM_INVALID_FORMAT,
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
    res.status(HttpCodes.BAD_REQUEST).json({
      code: BusinessCodes.PARAM_REQUIRED,
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
  let httpStatus = HttpCodes.UNAUTHORIZED;
  const { code: errorCode } = error;

  switch (errorCode) {
    case BusinessCodes.RATE_LIMIT_EXCEEDED: // RATE_LIMIT_EXCEEDED
      httpStatus = HttpCodes.TOO_MANY_REQUESTS;
      break;
    case BusinessCodes.AUTH_INVALID_CREDENTIALS: // INVALID_CREDENTIALS
    case BusinessCodes.AUTH_INVALID_REFRESH_TOKEN: // INVALID_REFRESH_TOKEN
      httpStatus = HttpCodes.UNAUTHORIZED;
      break;
    case BusinessCodes.NOT_FOUND_RESOURCE: // TOKEN_NOT_FOUND
      httpStatus = HttpCodes.NOT_FOUND;
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
    res.status(HttpCodes.BAD_REQUEST).json({
      code: BusinessCodes.PARAM_REQUIRED,
      message: 'Missing required parameter: appId',
    });
    return;
  }

  if (!appToken) {
    res.status(HttpCodes.BAD_REQUEST).json({
      code: BusinessCodes.PARAM_REQUIRED,
      message: 'Missing required parameter: appToken',
    });
    return;
  }

  // Look up appSecret from database using appId
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

  const result = await tokenService.validateAppToken(appToken, appSecret, appId);

  if (!result.valid) {
    const errorCode = result.error?.code || BusinessCodes.AUTH_TIMESTAMP_EXPIRED_OR_INVALID_TOKEN;
    let httpStatus = HttpCodes.UNAUTHORIZED;

    if (errorCode === BusinessCodes.AUTH_INVALID_SIGNATURE) {
      httpStatus = HttpCodes.UNAUTHORIZED;
    }

    res.status(httpStatus).json({
      code: errorCode,
      message: result.error?.message || 'Invalid token',
    });
    return;
  }

  // Verify that the appId in the token matches the appId in the request
  if (result.claims?.appId !== appId) {
    res.status(HttpCodes.UNAUTHORIZED).json({
      code: BusinessCodes.AUTH_TIMESTAMP_EXPIRED_OR_INVALID_TOKEN,
      message: 'Invalid token: appId mismatch',
    });
    return;
  }

  // Return validation success with claims
  res.json({
    code: HttpCodes.OK,
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
