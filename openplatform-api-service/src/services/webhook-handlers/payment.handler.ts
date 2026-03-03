/**
 * Payment Event Handler
 * Handles payment-related webhook events
 */

import {
  WebhookEvent,
  WebhookPayload,
  WebhookEventType,
} from '../../types/webhook.types';

/**
 * Payment event data structure
 */
interface PaymentEventData {
  paymentId: string;
  amount: number;
  currency: string;
  status: 'created' | 'completed' | 'failed';
  enterpriseId: string;
  accountId?: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Handle payment.created event
 */
export async function handlePaymentCreated(
  event: WebhookEvent,
  payload: WebhookPayload
): Promise<void> {
  const paymentData = event.data as unknown as PaymentEventData;

  console.log(
    `[PaymentHandler] Processing payment.created: ${paymentData.paymentId}, Amount: ${paymentData.amount} ${paymentData.currency}`
  );

  // Business logic for payment created
  // - Notify relevant systems
  // - Update payment status in database
  // - Send confirmation to user if needed

  // Example business logic:
  // await paymentService.updateStatus(paymentData.paymentId, 'created');
  // await notificationService.sendPaymentCreatedNotification(paymentData);
}

/**
 * Handle payment.completed event
 */
export async function handlePaymentCompleted(
  event: WebhookEvent,
  payload: WebhookPayload
): Promise<void> {
  const paymentData = event.data as unknown as PaymentEventData;

  console.log(
    `[PaymentHandler] Processing payment.completed: ${paymentData.paymentId}, Amount: ${paymentData.amount} ${paymentData.currency}`
  );

  // Business logic for payment completed
  // - Update payment status
  // - Update account balance
  // - Send receipt/confirmation
  // - Trigger downstream processes

  // Example business logic:
  // await paymentService.updateStatus(paymentData.paymentId, 'completed');
  // await accountService.updateBalance(paymentData.accountId, paymentData.amount);
  // await notificationService.sendPaymentCompletedNotification(paymentData);
}

/**
 * Handle payment.failed event
 */
export async function handlePaymentFailed(
  event: WebhookEvent,
  payload: WebhookPayload
): Promise<void> {
  const paymentData = event.data as unknown as PaymentEventData;

  console.log(
    `[PaymentHandler] Processing payment.failed: ${paymentData.paymentId}, Amount: ${paymentData.amount} ${paymentData.currency}`
  );

  // Business logic for payment failed
  // - Update payment status
  // - Handle refund if applicable
  // - Send failure notification

  // Example business logic:
  // await paymentService.updateStatus(paymentData.paymentId, 'failed');
  // await notificationService.sendPaymentFailedNotification(paymentData);
}

/**
 * Get payment handler for specific event type
 */
export function getPaymentHandler(eventType: WebhookEventType): ((event: WebhookEvent, payload: WebhookPayload) => Promise<void>) | null {
  switch (eventType) {
    case 'payment.created':
      return handlePaymentCreated;
    case 'payment.completed':
      return handlePaymentCompleted;
    case 'payment.failed':
      return handlePaymentFailed;
    default:
      return null;
  }
}

/**
 * Register all payment handlers
 */
export function registerPaymentHandlers(
  registerHandler: (type: WebhookEventType, handler: (event: WebhookEvent, payload: WebhookPayload) => Promise<void>) => void
): void {
  registerHandler('payment.created', handlePaymentCreated);
  registerHandler('payment.completed', handlePaymentCompleted);
  registerHandler('payment.failed', handlePaymentFailed);
}
