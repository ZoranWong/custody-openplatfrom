/**
 * Third-party Developer Routes
 * External APIs for third-party developers to integrate with the platform
 */

import { Router, Request, Response } from 'express';
import { HttpCodes } from '../enums/http-codes.enum';
import { BusinessCodes } from '../enums/business-codes.enum';
import { issueOauthToken, verifyOauthToken, buildAuthorizeUrl, logOAuthCall } from '../controllers/thirdparty/thirdparty.controller';
import { forwardRequest } from '../controllers/thirdparty/forward.controller';
import { basicValidationMiddleware, resourceValidationMiddleware } from '../middleware/resource-validation.middleware';
import { validateVerifyOAuthToken } from '../validate/rules';
import {
  getApplicationRepository,
  getOauthResourceRepository,
} from '../repositories/repository.factory';
import { getApplicationCallbackService } from '../services/application-callback.service';

const router = Router();

// =============================================================================
// OAuth Endpoints
// =============================================================================

router.post('/oauth/token', basicValidationMiddleware, logOAuthCall, issueOauthToken);
router.post('/oauth/authorizeUrl', basicValidationMiddleware, logOAuthCall, buildAuthorizeUrl);
router.post('/oauth/verify', validateVerifyOAuthToken, logOAuthCall, verifyOauthToken);

// =============================================================================
// Third-party Resource Endpoints
// =============================================================================

// Register merchant (三方平台注册企业) — no authorizationId, uses basic validation
router.post('/merchant/register', basicValidationMiddleware, forwardRequest);

// Custody callback (收银/交易回调) — 由 Custody 服务调用，按 resourceKey 反查应用并推送事件
router.post('/custody/callback', async (req: Request, res: Response) => {
  const { resourceKey } = req.body;
  if (!resourceKey) {
    return res.json({
      code: BusinessCodes.PARAM_REQUIRED,
      message: 'Missing required parameter: resourceKey',
    });
  }

  try {
    const resource = await getOauthResourceRepository().findByResourceKey(resourceKey);
    if (!resource) {
      return res.json({
        code: BusinessCodes.NOT_FOUND_RESOURCE,
        message: `Resource not found for resourceKey: ${resourceKey}`,
      });
    }

    const app = await getApplicationRepository().findById(resource.appId || '');
    if (!app) {
      return res.json({
        code: BusinessCodes.NOT_FOUND_RESOURCE,
        message: `Application not found for appId: ${resource.appId}`,
      });
    }

    if (!app.callbackUrl) {
      return res.json({
        code: BusinessCodes.PARAM_REQUIRED,
        message: `Application callbackUrl not configured for appId: ${resource.appId}`,
      });
    }

    let payload: Record<string, unknown> = { ...req.body };
    const eventType: 'transaction.completed' | 'transaction.failed' | undefined =
      (payload['eventType'] as 'transaction.completed' | 'transaction.failed' | undefined)
      || (payload['status'] === 'SUCCEED' ? 'transaction.completed' : 'transaction.failed');
    if (!payload['payload']) {
      delete payload['status'];
      delete payload['resourceKey'];
      delete payload['ecode'];
    } else {
      payload = payload['payload'] as Record<string, unknown>;
    }

    const appCallbackService = getApplicationCallbackService();
    await appCallbackService.pushEvent({
      application: {
        id: app.id,
        appSecret: app.appSecret || '',
        callbackUrl: app.callbackUrl,
      },
      event: eventType,
      data: payload,
    });

    res.json({
      code: HttpCodes.OK,
      message: 'Callback received and processed successfully',
    });
  } catch (error) {
    console.error('Error processing custody callback:', error);
    res.json({
      code: BusinessCodes.NOT_FOUND_RESOURCE,
      message: `Failed to process callback: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

// Catch-all: forward matched routes to backend services
router.post('*', resourceValidationMiddleware, forwardRequest);

export default router;