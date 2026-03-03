/**
 * Webhook Handlers Index
 * Export all webhook event handlers
 */

import { WebhookEvent, WebhookPayload, WebhookEventType } from '../../types/webhook.types';
import { registerPaymentHandlers } from './payment.handler';
import { registerTransferHandlers } from './transfer.handler';
import { registerPoolingHandlers } from './pooling.handler';
import { registerTaskHandlers } from './task.handler';
import { registerAccountHandlers } from './account.handler';

export * from './payment.handler';
export * from './transfer.handler';
export * from './pooling.handler';
export * from './task.handler';
export * from './account.handler';

/**
 * Register all webhook handlers
 */
export function registerAllHandlers(
  registerHandler: (type: WebhookEventType, handler: (event: WebhookEvent, payload: WebhookPayload) => Promise<void>) => void
): void {
  registerPaymentHandlers(registerHandler);
  registerTransferHandlers(registerHandler);
  registerPoolingHandlers(registerHandler);
  registerTaskHandlers(registerHandler);
  registerAccountHandlers(registerHandler);

  console.log('[WebhookHandlers] All handlers registered successfully');
}
