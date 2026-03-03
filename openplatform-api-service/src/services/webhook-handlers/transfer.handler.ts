/**
 * Transfer Event Handler
 * Handles transfer-related webhook events
 */

import {
  WebhookEvent,
  WebhookPayload,
  WebhookEventType,
} from '../../types/webhook.types';

/**
 * Transfer event data structure
 */
interface TransferEventData {
  transferId: string;
  amount: number;
  currency: string;
  fromAccountId: string;
  toAccountId: string;
  status: 'created' | 'completed' | 'failed';
  enterpriseId: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Handle transfer.created event
 */
export async function handleTransferCreated(
  event: WebhookEvent,
  payload: WebhookPayload
): Promise<void> {
  const transferData = event.data as unknown as TransferEventData;

  console.log(
    `[TransferHandler] Processing transfer.created: ${transferData.transferId}, Amount: ${transferData.amount} ${transferData.currency}`
  );

  // Business logic for transfer created
  // - Validate transfer
  // - Reserve funds
  // - Notify parties

  // Example business logic:
  // await transferService.updateStatus(transferData.transferId, 'created');
  // await accountService.reserveFunds(transferData.fromAccountId, transferData.amount);
}

/**
 * Handle transfer.completed event
 */
export async function handleTransferCompleted(
  event: WebhookEvent,
  payload: WebhookPayload
): Promise<void> {
  const transferData = event.data as unknown as TransferEventData;

  console.log(
    `[TransferHandler] Processing transfer.completed: ${transferData.transferId}, Amount: ${transferData.amount} ${transferData.currency}`
  );

  // Business logic for transfer completed
  // - Execute transfer
  // - Update account balances
  // - Send notifications
  // - Update ledger

  // Example business logic:
  // await transferService.updateStatus(transferData.transferId, 'completed');
  // await accountService.executeTransfer(
  //   transferData.fromAccountId,
  //   transferData.toAccountId,
  //   transferData.amount
  // );
  // await notificationService.sendTransferCompletedNotification(transferData);
}

/**
 * Handle transfer.failed event
 */
export async function handleTransferFailed(
  event: WebhookEvent,
  payload: WebhookPayload
): Promise<void> {
  const transferData = event.data as unknown as TransferEventData;

  console.log(
    `[TransferHandler] Processing transfer.failed: ${transferData.transferId}, Amount: ${transferData.amount} ${transferData.currency}`
  );

  // Business logic for transfer failed
  // - Release reserved funds
  // - Update transfer status
  // - Send failure notification
  // - Log failure reason

  // Example business logic:
  // await transferService.updateStatus(transferData.transferId, 'failed');
  // await accountService.releaseFunds(transferData.fromAccountId, transferData.amount);
  // await notificationService.sendTransferFailedNotification(transferData);
}

/**
 * Get transfer handler for specific event type
 */
export function getTransferHandler(eventType: WebhookEventType): ((event: WebhookEvent, payload: WebhookPayload) => Promise<void>) | null {
  switch (eventType) {
    case 'transfer.created':
      return handleTransferCreated;
    case 'transfer.completed':
      return handleTransferCompleted;
    case 'transfer.failed':
      return handleTransferFailed;
    default:
      return null;
  }
}

/**
 * Register all transfer handlers
 */
export function registerTransferHandlers(
  registerHandler: (type: WebhookEventType, handler: (event: WebhookEvent, payload: WebhookPayload) => Promise<void>) => void
): void {
  registerHandler('transfer.created', handleTransferCreated);
  registerHandler('transfer.completed', handleTransferCompleted);
  registerHandler('transfer.failed', handleTransferFailed);
}
