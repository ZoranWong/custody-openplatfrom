/**
 * OAuth Routes
 * OAuth 2.0 token and revocation endpoints
 * Internal APIs for platform token management
 */

import { Router } from 'express';
import { oauthToken, oauthRevoke, validateAppToken } from '../controllers/oauth.controller';

const router = Router();

// POST /oauth/appToken/refresh - Token issuance and refresh (grant_type flow)
router.post('/appToken/refresh', oauthToken);

// POST /oauth/revoke - Token revocation
router.post('/revoke', oauthRevoke);

// POST /oauth/appToken/validate - Validate appToken from third-party developers
router.post('/appToken/validate', validateAppToken);

export default router;
