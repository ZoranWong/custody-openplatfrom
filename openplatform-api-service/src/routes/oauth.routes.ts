/**
 * OAuth Routes
 * OAuth 2.0 token and revocation endpoints
 * Internal APIs for platform token management
 */

import { Router } from 'express';
import { oauthToken, oauthRevoke, validateAppToken } from '../controllers/thirdparty/oauth.controller';
import { validateOAuthToken, validateAppToken, validateOAuthRevoke } from '../validate/rules';

const router = Router();

// POST /oauth/appToken/refresh - Token issuance and refresh (grant_type flow)
router.post('/appToken/refresh', validateOAuthToken, oauthToken);

// POST /oauth/revoke - Token revocation
router.post('/revoke', validateOAuthRevoke, oauthRevoke);

// POST /oauth/appToken/validate - Validate appToken from third-party developers
router.post('/appToken/validate', validateAppToken, validateAppToken);

export default router;
