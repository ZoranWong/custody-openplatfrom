/**
 * OAuth Routes
 * OAuth 2.0 token and revocation endpoints
 */

import { Router } from 'express';
import { oauthToken, oauthRevoke, validateAppToken } from '../controllers/oauth.controller';

const router = Router();

// POST /oauth/token - Token issuance and refresh
router.post('/appToken/refresh', oauthToken);

// POST /oauth/revoke - Token revocation
router.post('/revoke', oauthRevoke);

// POST /oauth/appToken/validate - Validate appToken from third-party developers
router.post('/appToken/validate', validateAppToken);

export default router;
