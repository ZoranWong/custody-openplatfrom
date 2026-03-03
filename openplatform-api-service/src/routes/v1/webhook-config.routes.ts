/**
 * Webhook Configuration Routes
 * Webhook CRUD API endpoints for ISV
 *
 * Base path: /api/v1/isv/webhooks
 */

import { Router } from 'express';
import { isvAuth, ISVAuthRequest } from '../../middleware/isv-auth.middleware';
import { webhookConfigController } from '../../controllers/webhook-config.controller';

const router = Router();

// ============================================
// Webhook CRUD Routes
// ============================================

/**
 * POST /webhooks
 * Create a new webhook configuration
 */
router.post('/webhooks', isvAuth, (req: any, res: any, next: any) => {
  webhookConfigController.createWebhook(req, res, next);
});

/**
 * GET /webhooks
 * List all webhooks for the authenticated ISV
 */
router.get('/webhooks', isvAuth, (req: any, res: any, next: any) => {
  webhookConfigController.getWebhooks(req, res, next);
});

/**
 * GET /webhooks/:id
 * Get a specific webhook by ID
 */
router.get('/webhooks/:id', isvAuth, (req: any, res: any, next: any) => {
  webhookConfigController.getWebhookById(req, res, next);
});

/**
 * PUT /webhooks/:id
 * Update a webhook configuration
 */
router.put('/webhooks/:id', isvAuth, (req: any, res: any, next: any) => {
  webhookConfigController.updateWebhook(req, res, next);
});

/**
 * DELETE /webhooks/:id
 * Delete a webhook configuration
 */
router.delete('/webhooks/:id', isvAuth, (req: any, res: any, next: any) => {
  webhookConfigController.deleteWebhook(req, res, next);
});

export default router;
