/**
 * Pooling Event Handler
 * Handles pooling (fund sweep) related webhook events
 */

import {
  WebhookEvent,
  WebhookPayload,
  WebhookEventType,
} from '../../types/webhook.types';

/**
 * Pooling event data structure
 */
interface PoolingEventData {
  poolingId: string;
  amount: number;
  currency: string;
  sourceAccountId: string;
  destinationAccountId: string;
  status: 'completed' | 'failed';
  enterpriseId: string;
  pooledCount?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Handle pooling.completed event
 */
export async function handlePoolingCompleted(
  event: WebhookEvent,
  payload: WebhookPayload
): Promise<void> {
  const poolingData = event.data as unknown as PoolingEventData;

  console.log(
    `[PoolingHandler] Processing pooling.completed: ${poolingData.poolingId}, Amount: ${poolingData.amount} ${poolingData.currency}`
  );

  // Business logic for pooling completed
  // - Update pooling status
  // - Update account balances
  // - Reconcile accounts
  // - Send notifications

  // Example business logic:
  // await poolingService.updateStatus(poolingData.poolingId, 'completed');
  // await accountService.updateBalance(poolingData.destinationAccountId, poolingData.amount);
  // await reconciliationService.reconcileAccounts(poolingData.sourceAccountId, poolingData.destinationAccountId);
  // await notificationService.sendPoolingCompletedNotification(poolingData);
}

/**
 * Handle pooling.failed event
 */
export async function handlePoolingFailed(
  event: WebhookEvent,
  payload: WebhookPayload
): Promise<void> {
  const poolingData = event.data as unknown as PoolingEventData;

  console.log(
    `[PoolingHandler] Processing pooling.failed: ${poolingData.poolingId}, Amount: ${poolingData.amount} ${poolingData.currency}`
  );

  // Business logic for pooling failed
  // - Update pooling status
  // - Log failure reason
  // - Send alert
  // - Trigger manual review if needed

  // Example business logic:
  // await poolingService.updateStatus(poolingData.poolingId, 'failed');
  // await alertService.sendPoolingFailedAlert(poolingData);
  // if (poolingData.amount > THRESHOLD_AMOUNT) {
  //   await reviewService.createManualReviewTask(poolingData);
  // }
}

/**
 * Get pooling handler for specific event type
 */
export function getPoolingHandler(eventType: WebhookEventType): ((event: WebhookEvent, payload: WebhookPayload) => Promise<void>) | null {
  switch (eventType) {
    case 'pooling.completed':
      return handlePoolingCompleted;
    case 'pooling.failed':
      return handlePoolingFailed;
    default:
      return null;
  }
}

/**
 * Register all pooling handlers
 */
export function registerPoolingHandlers(
  registerHandler: (type: WebhookEventType, handler: (event: WebhookEvent, payload: WebhookPayload) => Promise<void>) => void
): void {
  registerHandler('pooling.completed', handlePoolingCompleted);
  registerHandler('pooling.failed', handlePoolingFailed);
}
