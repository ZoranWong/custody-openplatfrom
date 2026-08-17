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

import { Router, Request, Response } from 'express';
import { HttpCodes } from '../enums/http-codes.enum';
import { issueOauthToken, verifyOauthToken, buildAuthorizeUrl } from '../controllers/thirdparty/thirdparty.controller';
import { forwardRequest } from '../controllers/thirdparty/forward.controller';
import { basicValidationMiddleware, resourceValidationMiddleware } from '../middleware/resource-validation.middleware';
import { validateVerifyOAuthToken } from '../validate/rules';

const router = Router();

// =============================================================================
// OAuth Endpoints
// =============================================================================

router.post('/oauth/token', basicValidationMiddleware, issueOauthToken);
router.post('/oauth/authorizeUrl', basicValidationMiddleware, buildAuthorizeUrl);
router.post('/oauth/verify', validateVerifyOAuthToken, verifyOauthToken);

// =============================================================================
// Third-party Resource Endpoints
// =============================================================================

router.post('/custody/callback', (req: Request, res: Response) => {
  res.json({
    code: HttpCodes.OK,
    message: 'Test endpoint reached successfully',
    requestBody: req.body,
    requestQuery: req.query,
    requestContext: (req as any).context,
  });
});

// Catch-all: forward matched routes to backend services
router.post('*', resourceValidationMiddleware, forwardRequest);

export default router;