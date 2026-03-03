/**
 * Authorization Routes
 * Routes for authorization management
 */

import { Router } from 'express';
import { createAuthorization, getAuthorization } from '../../controllers/authorization.controller';

const router = Router();

// POST /v1/authorizations - Create authorization
router.post('/', createAuthorization);

// GET /v1/authorizations/:id - Get authorization by ID
router.get('/:id', getAuthorization);

export default router;
