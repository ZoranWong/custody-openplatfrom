/**
 * Webhook Configuration Controller
 * Handles webhook CRUD API endpoints for ISV
 */

import { Request, Response, NextFunction } from 'express';
import { WebhookService, createWebhookService } from '../services/webhook.service';
import { ISVAuthRequest, isvAuth } from '../middleware/isv-auth.middleware';
import { errorMapper } from '../services/error-mapper.service';
import { WEBHOOK_EVENT_TYPES, WebhookEventType, UpdateWebhookInput, DeliveryFilter, WebhookDeliveryStatus } from '../types/webhook.types';

/**
 * Helper function to extract ISV context from request
 */
function extractIsvContext(req: Request): { traceId: string; isvUser: NonNullable<ISVAuthRequest['isvUser']> } | null {
  const traceId = (req as any).traceId || (req.headers['x-trace-id'] as string) || `wh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const isvUser = (req as ISVAuthRequest).isvUser;

  if (!isvUser) {
    return null;
  }

  return { traceId, isvUser: isvUser as NonNullable<ISVAuthRequest['isvUser']> };
}

/**
 * Helper to get traceId from request
 */
function getTraceId(req: Request): string {
  return (req as any).traceId || (req.headers['x-trace-id'] as string) || `wh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Validate event types array
 */
function validateEventTypes(eventTypes: unknown): { valid: boolean; typed: WebhookEventType[]; error?: string } {
  if (!Array.isArray(eventTypes) || eventTypes.length === 0) {
    return { valid: false, typed: [], error: 'event_types must be a non-empty array' };
  }

  const validTypes = eventTypes.filter((type): type is WebhookEventType =>
    typeof type === 'string' && WEBHOOK_EVENT_TYPES.includes(type as WebhookEventType)
  );

  if (validTypes.length !== eventTypes.length) {
    const invalidTypes = eventTypes.filter(t => typeof t === 'string' && !WEBHOOK_EVENT_TYPES.includes(t as WebhookEventType));
    return { valid: false, typed: [], error: `Invalid event types: ${invalidTypes.join(', ')}` };
  }

  return { valid: true, typed: validTypes };
}

/**
 * Create webhook config controller with service
 */
export function createWebhookConfigController(webhookService: WebhookService = createWebhookService()) {
  return {
    /**
     * POST /webhooks
     * Create a new webhook configuration
     */
    createWebhook: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const ctx = extractIsvContext(req);
        if (!ctx) {
          res.status(401).json(
            errorMapper.mapError({ code: 40101, message: 'Unauthorized' }, getTraceId(req))
          );
          return;
        }

        const { traceId, isvUser } = ctx;
        const { url, event_types } = req.body;

        if (!url) {
          res.status(400).json(
            errorMapper.mapError({ code: 40001, message: 'Missing required field: url' }, traceId)
          );
          return;
        }

        const eventTypeValidation = validateEventTypes(event_types);
        if (!eventTypeValidation.valid) {
          res.status(400).json(
            errorMapper.mapError({ code: 40001, message: eventTypeValidation.error }, traceId)
          );
          return;
        }

        const webhook = await webhookService.registerWebhook({
          enterpriseId: isvUser.isvId,
          url,
          eventTypes: eventTypeValidation.typed,
        });

        // Return webhook with secret only at creation
        res.status(201).json({
          code: 0,
          message: 'success',
          data: {
            id: webhook.id,
            url: webhook.url,
            event_types: webhook.eventTypes,
            is_active: webhook.isActive,
            created_at: webhook.createdAt,
            // Return secret only once at creation
            secret: webhook.secret,
          },
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'Invalid webhook URL') {
          res.status(400).json(
            errorMapper.mapError({ code: 40002, message: 'Invalid webhook URL. HTTPS is required.' }, (req as any).traceId || '')
          );
          return;
        }
        if (error instanceof Error && error.message === 'No valid event types provided') {
          res.status(400).json(
            errorMapper.mapError({ code: 40002, message: 'Invalid event types. Valid types: ' + WEBHOOK_EVENT_TYPES.join(', ') }, (req as any).traceId || '')
          );
          return;
        }
        next(error);
      }
    },

    /**
     * GET /webhooks
     * List all webhooks for the authenticated ISV with pagination
     */
    getWebhooks: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const ctx = extractIsvContext(req);
        if (!ctx) {
          res.status(401).json(
            errorMapper.mapError({ code: 40101, message: 'Unauthorized' }, getTraceId(req))
          );
          return;
        }

        const { traceId, isvUser } = ctx;

        // Pagination parameters
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(req.query.page_size as string) || 20));

        const allWebhooks = await webhookService.listWebhooks({
          enterpriseId: isvUser.isvId,
        });

        // Apply pagination
        const total = allWebhooks.length;
        const startIndex = (page - 1) * pageSize;
        const paginatedWebhooks = allWebhooks.slice(startIndex, startIndex + pageSize);

        res.json({
          code: 0,
          message: 'success',
          data: {
            list: paginatedWebhooks.map(w => ({
              id: w.id,
              url: w.url,
              event_types: w.eventTypes,
              is_active: w.isActive,
              created_at: w.createdAt,
              updated_at: w.updatedAt,
              // Don't expose secret in list
            })),
            total,
            page,
            page_size: pageSize,
            total_pages: Math.ceil(total / pageSize),
          },
        });
      } catch (error) {
        next(error);
      }
    },

    /**
     * GET /webhooks/:id
     * Get a specific webhook by ID
     */
    getWebhookById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const ctx = extractIsvContext(req);
        if (!ctx) {
          res.status(401).json(
            errorMapper.mapError({ code: 40101, message: 'Unauthorized' }, getTraceId(req))
          );
          return;
        }

        const { traceId, isvUser } = ctx;
        const { id } = req.params;
        const webhook = await webhookService.getWebhook(id);

        if (!webhook) {
          res.status(404).json(
            errorMapper.mapError({ code: 40401, message: 'Webhook not found' }, traceId)
          );
          return;
        }

        // Verify ownership
        if (webhook.enterpriseId !== isvUser.isvId) {
          res.status(403).json(
            errorMapper.mapError({ code: 40301, message: 'Access denied' }, traceId)
          );
          return;
        }

        res.json({
          code: 0,
          message: 'success',
          data: {
            id: webhook.id,
            url: webhook.url,
            event_types: webhook.eventTypes,
            is_active: webhook.isActive,
            created_at: webhook.createdAt,
            updated_at: webhook.updatedAt,
            // Don't expose secret
          },
        });
      } catch (error) {
        next(error);
      }
    },

    /**
     * PUT /webhooks/:id
     * Update a webhook configuration with optimistic locking
     */
    updateWebhook: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const ctx = extractIsvContext(req);
        if (!ctx) {
          res.status(401).json(
            errorMapper.mapError({ code: 40101, message: 'Unauthorized' }, getTraceId(req))
          );
          return;
        }

        const { traceId, isvUser } = ctx;
        const { id } = req.params;
        const { url, event_types, is_active, if_version } = req.body;

        // Fetch webhook with fresh data to prevent TOCTOU race condition
        const existingWebhook = await webhookService.getWebhook(id);
        if (!existingWebhook) {
          res.status(404).json(
            errorMapper.mapError({ code: 40401, message: 'Webhook not found' }, traceId)
          );
          return;
        }

        if (existingWebhook.enterpriseId !== isvUser.isvId) {
          res.status(403).json(
            errorMapper.mapError({ code: 40301, message: 'Access denied' }, traceId)
          );
          return;
        }

        // Optimistic locking check
        if (if_version !== undefined) {
          const expectedVersion = new Date(if_version).getTime();
          const actualVersion = existingWebhook.updatedAt.getTime();
          if (expectedVersion !== actualVersion) {
            res.status(409).json(
              errorMapper.mapError({
                code: 40902,
                message: 'Webhook has been modified. Please fetch the latest version and try again.',
                current_version: existingWebhook.updatedAt
              }, traceId)
            );
            return;
          }
        }

        // Build update input
        const updateInput: UpdateWebhookInput = {};
        if (url !== undefined) updateInput.url = url;

        if (event_types !== undefined) {
          const eventTypeValidation = validateEventTypes(event_types);
          if (!eventTypeValidation.valid) {
            res.status(400).json(
              errorMapper.mapError({ code: 40002, message: eventTypeValidation.error }, traceId)
            );
            return;
          }
          updateInput.eventTypes = eventTypeValidation.typed;
        }

        if (is_active !== undefined) updateInput.isActive = Boolean(is_active);

        // Re-fetch right before update to minimize race window
        const recheckedWebhook = await webhookService.getWebhook(id);
        if (!recheckedWebhook || recheckedWebhook.enterpriseId !== isvUser.isvId) {
          res.status(404).json(
            errorMapper.mapError({ code: 40401, message: 'Webhook not found or access denied' }, traceId)
          );
          return;
        }

        const updated = await webhookService.updateWebhook(id, updateInput);

        if (!updated) {
          res.status(404).json(
            errorMapper.mapError({ code: 40401, message: 'Webhook not found' }, traceId)
          );
          return;
        }

        res.json({
          code: 0,
          message: 'success',
          data: {
            id: updated.id,
            url: updated.url,
            event_types: updated.eventTypes,
            is_active: updated.isActive,
            created_at: updated.createdAt,
            updated_at: updated.updatedAt,
          },
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'Invalid webhook URL') {
          res.status(400).json(
            errorMapper.mapError({ code: 40002, message: 'Invalid webhook URL. HTTPS is required.' }, (req as any).traceId || '')
          );
          return;
        }
        if (error instanceof Error && error.message === 'No valid event types provided') {
          res.status(400).json(
            errorMapper.mapError({ code: 40002, message: 'Invalid event types' }, (req as any).traceId || '')
          );
          return;
        }
        next(error);
      }
    },

    /**
     * DELETE /webhooks/:id
     * Delete a webhook configuration with pending delivery check
     */
    deleteWebhook: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const ctx = extractIsvContext(req);
        if (!ctx) {
          res.status(401).json(
            errorMapper.mapError({ code: 40101, message: 'Unauthorized' }, getTraceId(req))
          );
          return;
        }

        const { traceId, isvUser } = ctx;
        const { id } = req.params;

        // First check if webhook exists and belongs to user
        const existingWebhook = await webhookService.getWebhook(id);
        if (!existingWebhook) {
          res.status(404).json(
            errorMapper.mapError({ code: 40401, message: 'Webhook not found' }, traceId)
          );
          return;
        }

        if (existingWebhook.enterpriseId !== isvUser.isvId) {
          res.status(403).json(
            errorMapper.mapError({ code: 40301, message: 'Access denied' }, traceId)
          );
          return;
        }

        // Check for pending deliveries - AC requirement
        const deliveryFilter: DeliveryFilter = {
          webhookId: id,
          status: 'pending' as WebhookDeliveryStatus,
        };
        const pendingDeliveries = await webhookService.listDeliveries(deliveryFilter);

        if (pendingDeliveries.length > 0) {
          res.status(409).json(
            errorMapper.mapError({
              code: 40901,
              message: 'Cannot delete webhook with pending deliveries',
              pending_count: pendingDeliveries.length
            }, traceId)
          );
          return;
        }

        const deleted = await webhookService.deleteWebhook(id);

        if (!deleted) {
          res.status(500).json(
            errorMapper.mapError({ code: 50001, message: 'Failed to delete webhook' }, traceId)
          );
          return;
        }

        res.json({
          code: 0,
          message: 'success',
          data: {
            id,
            deleted: true,
          },
        });
      } catch (error) {
        next(error);
      }
    },
  };
}

/**
 * Default webhook config controller instance
 */
export const webhookConfigController = createWebhookConfigController();
