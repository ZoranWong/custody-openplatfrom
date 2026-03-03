/**
 * Account Event Handler
 * Handles account-related webhook events
 */

import {
  WebhookEvent,
  WebhookPayload,
  WebhookEventType,
} from '../../types/webhook.types';

/**
 * Account event data structure
 */
interface AccountEventData {
  accountId: string;
  enterpriseId: string;
  balance: number;
  threshold?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Handle account.low_balance event
 */
export async function handleAccountLowBalance(
  event: WebhookEvent,
  payload: WebhookPayload
): Promise<void> {
  const accountData = event.data as unknown as AccountEventData;

  console.log(
    `[AccountHandler] Processing account.low_balance: Account ${accountData.accountId}, Balance: ${accountData.balance}`
  );

  // Business logic for low balance alert
  // - Send alert to account owner
  // - Trigger top-up reminder
  // - Log for audit
  // - Escalate if below critical threshold

  // Example business logic:
  // await alertService.sendLowBalanceAlert(accountData.enterpriseId, accountData);
  // await notificationService.sendLowBalanceNotification(accountData.enterpriseId, accountData);

  // Check if below critical threshold
  const criticalThreshold = accountData.threshold || 1000;
  if (accountData.balance < criticalThreshold) {
    console.warn(
      `[AccountHandler] CRITICAL: Account ${accountData.accountId} below critical threshold!`
    );
    // await alertService.sendCriticalBalanceAlert(accountData);
  }
}

/**
 * Get account handler for specific event type
 */
export function getAccountHandler(eventType: WebhookEventType): ((event: WebhookEvent, payload: WebhookPayload) => Promise<void>) | null {
  switch (eventType) {
    case 'account.low_balance':
      return handleAccountLowBalance;
    default:
      return null;
  }
}

/**
 * Register all account handlers
 */
export function registerAccountHandlers(
  registerHandler: (type: WebhookEventType, handler: (event: WebhookEvent, payload: WebhookPayload) => Promise<void>) => void
): void {
  registerHandler('account.low_balance', handleAccountLowBalance);
}
