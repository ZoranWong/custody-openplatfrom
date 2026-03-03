/**
 * Webhook Middleware
 * Express middleware for triggering webhook events
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/jwt.types';
import {
  WebhookService,
  createWebhookService,
} from '../services/webhook.service';
import {
  WebhookEventType,
  WEBHOOK_EVENT_TYPES,
} from '../types/webhook.types';

/**
 * Simple structured logger
 */
const logger = {
  info: (message: string, data?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level: 'info', message, ...data }));
  },
  warn: (message: string, data?: Record<string, unknown>) => {
    console.warn(JSON.stringify({ level: 'warn', message, ...data }));
  },
  error: (message: string, data?: Record<string, unknown>) => {
    console.error(JSON.stringify({ level: 'error', message, ...data }));
  },
};

/**
 * Webhook middleware configuration
 */
export interface WebhookMiddlewareConfig {
  service?: WebhookService;
  enabled?: boolean;
  eventMapping?: Record<string, WebhookEventType>;
  correlationIdHeader?: string;
}

/**
 * Create webhook event trigger middleware
 */
export function createWebhookMiddleware(
  config?: WebhookMiddlewareConfig
) {
  const webhookService = config?.service || createWebhookService();
  const enabled = config?.enabled ?? true;
  const eventMapping = config?.eventMapping || getDefaultEventMapping();
  const correlationIdHeader = config?.correlationIdHeader || 'x-correlation-id';

  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!enabled) {
      return next();
    }

    // Store webhook service on request for use in routes
    (req as any).webhookService = webhookService;

    // Wrap res.json to trigger webhook after response sent
    const originalJson = res.json.bind(res);

    res.json = (body: unknown) => {
      // Trigger webhook asynchronously
      triggerWebhookForResponse(req, res, body, {
        webhookService,
        eventMapping,
        correlationIdHeader,
      }).catch((error) => {
        logger.error('webhook_trigger_error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          path: req.path,
          method: req.method,
        });
      });

      return originalJson(body);
    };

    next();
  };
}

/**
 * Get default event mapping based on route and method
 */
function getDefaultEventMapping(): Record<string, WebhookEventType> {
  return {
    'POST /api/v1/payments': 'payment.created',
    'POST /api/v1/payments/:id/complete': 'payment.completed',
    'POST /api/v1/transfers': 'transfer.created',
    'POST /api/v1/transfers/:id/complete': 'transfer.completed',
    'POST /api/v1/pooling': 'pooling.completed',
    'POST /api/v1/signatures': 'task.created',
  };
}

/**
 * Trigger webhook for a response
 */
async function triggerWebhookForResponse(
  req: Request,
  res: Response,
  body: unknown,
  options: {
    webhookService: WebhookService;
    eventMapping: Record<string, WebhookEventType>;
    correlationIdHeader: string;
  }
): Promise<void> {
  const { webhookService, eventMapping, correlationIdHeader } = options;

  // Build route pattern
  const routePattern = buildRoutePattern(req);

  // Get event type from mapping
  const eventType = eventMapping[routePattern];

  if (!eventType) {
    return; // No webhook for this endpoint
  }

  // Extract correlation ID
  const correlationId =
    (req.headers[correlationIdHeader] as string) ||
    (req.headers['x-trace-id'] as string) ||
    res.getHeader('X-Trace-Id') as string;

  // Build event data from response body
  const eventData = extractEventData(req, body, eventType);

  if (!eventData) {
    logger.warn('webhook_no_data', { routePattern, eventType });
    return;
  }

  // Trigger event
  const event = await webhookService.triggerEvent(
    eventType,
    eventData,
    {
      enterpriseId: (req as any).enterprise_id,
      correlationId,
      metadata: {
        route: routePattern,
        method: req.method,
        statusCode: res.statusCode,
      },
    }
  );

  logger.info('webhook_triggered', {
    eventId: event.id,
    eventType,
    enterpriseId: (req as any).enterprise_id,
    routePattern,
  });
}

/**
 * Build route pattern from request
 */
function buildRoutePattern(req: Request): string {
  // Remove query string and trailing slashes
  const path = req.path.replace(/\/$/, '').split('?')[0] || req.path;
  return `${req.method} ${path}`;
}

/**
 * Extract event data from request and response
 */
function extractEventData(
  req: Request,
  body: unknown,
  eventType: WebhookEventType
): Record<string, unknown> | null {
  const data: Record<string, unknown> = {};

  // Extract common fields
  if (req.params.id || (body as any)?.id) {
    data.id = req.params.id || (body as any)?.id;
  }

  // Event-specific extraction
  switch (eventType) {
    case 'payment.created':
    case 'payment.completed':
    case 'payment.failed':
      if ((body as any)?.data?.transaction_id || (body as any)?.transaction_id) {
        data.transaction_id = (body as any)?.data?.transaction_id || (body as any)?.transaction_id;
      }
      if ((body as any)?.data?.amount || (body as any)?.amount) {
        data.amount = (body as any)?.data?.amount || (body as any)?.amount;
      }
      if ((body as any)?.data?.currency || (body as any)?.currency) {
        data.currency = (body as any)?.data?.currency || (body as any)?.currency;
      }
      if ((body as any)?.data?.unit_id || (body as any)?.unit_id) {
        data.unit_id = (body as any)?.data?.unit_id || (body as any)?.unit_id;
      }
      break;

    case 'transfer.created':
    case 'transfer.completed':
    case 'transfer.failed':
      if ((body as any)?.data?.transfer_id || (body as any)?.transfer_id) {
        data.transfer_id = (body as any)?.data?.transfer_id || (body as any)?.transfer_id;
      }
      if ((body as any)?.data?.amount || (body as any)?.amount) {
        data.amount = (body as any)?.data?.amount || (body as any)?.amount;
      }
      if ((body as any)?.data?.currency || (body as any)?.currency) {
        data.currency = (body as any)?.data?.currency || (body as any)?.currency;
      }
      break;

    case 'task.created':
    case 'task.signed':
    case 'task.rejected':
      if ((body as any)?.data?.task_id || (body as any)?.task_id) {
        data.task_id = (body as any)?.data?.task_id || (body as any)?.task_id;
      }
      if ((body as any)?.data?.status || (body as any)?.status) {
        data.status = (body as any)?.data?.status || (body as any)?.status;
      }
      break;

    case 'pooling.completed':
    case 'pooling.failed':
      if ((body as any)?.data?.pooling_id || (body as any)?.pooling_id) {
        data.pooling_id = (body as any)?.data?.pooling_id || (body as any)?.pooling_id;
      }
      if ((body as any)?.data?.accounts || (body as any)?.accounts) {
        data.accounts = (body as any)?.data?.accounts || (body as any)?.accounts;
      }
      break;
  }

  // Include request metadata
  data._metadata = {
    requestedAt: new Date().toISOString(),
    method: req.method,
    path: req.path,
  };

  // Return null if no meaningful data extracted
  if (Object.keys(data).length <= 1) {
    return null;
  }

  return data;
}

/**
 * Helper function to manually trigger a webhook event
 */
export async function triggerWebhookEvent(
  req: Request,
  eventType: WebhookEventType,
  eventData: Record<string, unknown>
): Promise<void> {
  const webhookService = (req as any).webhookService as WebhookService | undefined;

  if (!webhookService) {
    logger.warn('webhook_service_not_available', { eventType });
    return;
  }

  const correlationId =
    (req.headers['x-correlation-id'] as string) ||
    (req.headers['x-trace-id'] as string);

  await webhookService.triggerEvent(eventType, eventData, {
    enterpriseId: (req as any).enterprise_id,
    correlationId,
    metadata: {
      source: 'manual',
      route: req.path,
      method: req.method,
    },
  });
}

/**
 * Webhook configuration middleware factory
 */
export function configureWebhooks(
  mapping: Record<string, WebhookEventType>,
  options?: {
    enabled?: boolean;
    correlationIdHeader?: string;
  }
) {
  return createWebhookMiddleware({
    eventMapping: mapping,
    enabled: options?.enabled ?? true,
    correlationIdHeader: options?.correlationIdHeader,
  });
}

/**
 * Get webhook service from request
 */
export function getWebhookService(req: Request): WebhookService | null {
  return (req as any).webhookService || null;
}

/**
 * Default webhook middleware
 */
export const defaultWebhookMiddleware = createWebhookMiddleware();

/**
 * Payment webhook configuration
 */
export const paymentWebhookConfig = configureWebhooks({
  'POST /api/v1/payments': 'payment.created',
  'POST /api/v1/payments/:id/complete': 'payment.completed',
});

/**
 * Transfer webhook configuration
 */
export const transferWebhookConfig = configureWebhooks({
  'POST /api/v1/transfers': 'transfer.created',
  'POST /api/v1/transfers/:id/complete': 'transfer.completed',
});

/**
 * Task webhook configuration
 */
export const taskWebhookConfig = configureWebhooks({
  'POST /api/v1/signatures': 'task.created',
});
