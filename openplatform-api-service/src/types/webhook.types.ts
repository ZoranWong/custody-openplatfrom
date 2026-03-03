/**
 * Webhook Types
 * Type definitions for webhook functionality
 */

/**
 * Supported webhook event types
 */
export type WebhookEventType =
  | 'payment.created'
  | 'payment.completed'
  | 'payment.failed'
  | 'transfer.created'
  | 'transfer.completed'
  | 'transfer.failed'
  | 'pooling.completed'
  | 'pooling.failed'
  | 'task.created'
  | 'task.signed'
  | 'task.rejected'
  | 'account.low_balance';

/**
 * All webhook event types
 */
export const WEBHOOK_EVENT_TYPES: WebhookEventType[] = [
  'payment.created',
  'payment.completed',
  'payment.failed',
  'transfer.created',
  'transfer.completed',
  'transfer.failed',
  'pooling.completed',
  'pooling.failed',
  'task.created',
  'task.signed',
  'task.rejected',
  'account.low_balance',
];

/**
 * Webhook registration
 */
export interface Webhook {
  id: string;
  enterpriseId: string;
  url: string;
  secret: string;
  eventTypes: WebhookEventType[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Webhook delivery status
 */
export type WebhookDeliveryStatus =
  | 'pending'
  | 'sending'
  | 'success'
  | 'failed';

/**
 * Webhook delivery record
 */
export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventId: string;
  eventType: WebhookEventType;
  payload: string;
  status: WebhookDeliveryStatus;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt: Date | null;
  nextRetryAt: Date | null;
  responseCode: number | null;
  responseBody: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Webhook event
 */
export interface WebhookEvent {
  id: string;
  enterpriseId: string;
  type: WebhookEventType;
  data: Record<string, unknown>;
  timestamp: number;
  metadata?: {
    source?: string;
    correlationId?: string;
    priority?: 'high' | 'normal' | 'low';
  };
}

/**
 * Webhook payload structure
 */
export interface WebhookPayload {
  id: string;
  type: WebhookEventType;
  timestamp: number;
  data: Record<string, unknown>;
  metadata?: {
    source?: string;
    correlationId?: string;
    eventName?: string;
    [key: string]: unknown; // Allow additional properties
  };
}

/**
 * Webhook signature headers
 */
export interface WebhookHeaders {
  'X-Webhook-Id': string;
  'X-Webhook-Type': WebhookEventType;
  'X-Webhook-Signature': string;
  'X-Webhook-Timestamp': string;
  'X-Webhook-Retry'?: string;
}

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  signatureAlgorithm: 'sha256' | 'sha384' | 'sha512';
  signatureHeader: string;
  timestampHeader: string;
  idHeader: string;
  retryHeader: string;
  maxRetries: number;
  retryDelays: number[]; // in milliseconds
  timeout: number; // in milliseconds
  batchSize: number;
  rateLimit: {
    enabled: boolean;
    requestsPerMinute: number;
  };
}

/**
 * Webhook delivery options
 */
export interface WebhookDeliveryOptions {
  synchronous?: boolean;
  priority?: 'high' | 'normal' | 'low';
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Webhook queue item
 */
export interface WebhookQueueItem {
  deliveryId: string;
  webhookId: string;
  url: string;
  secret: string;
  payload: WebhookPayload;
  attempt: number;
  maxAttempts: number;
  eventType: WebhookEventType;
}

/**
 * Webhook delivery result
 */
export interface WebhookDeliveryResult {
  success: boolean;
  statusCode: number | null;
  responseBody: string | null;
  duration: number;
  error?: string;
}

/**
 * Webhook registration input
 */
export interface CreateWebhookInput {
  enterpriseId: string;
  url: string;
  eventTypes: WebhookEventType[];
}

/**
 * Webhook update input
 */
export interface UpdateWebhookInput {
  url?: string;
  eventTypes?: WebhookEventType[];
  isActive?: boolean;
}

/**
 * Webhook filter for querying
 */
export interface WebhookFilter {
  enterpriseId?: string;
  eventType?: WebhookEventType;
  isActive?: boolean;
}

/**
 * Delivery filter for querying
 */
export interface DeliveryFilter {
  webhookId?: string;
  eventId?: string;
  eventType?: WebhookEventType;
  status?: WebhookDeliveryStatus;
  fromDate?: Date;
  toDate?: Date;
}

/**
 * Retry configuration for a webhook
 */
export interface WebhookRetryConfig {
  maxAttempts: number;
  delays: number[];
  backoffMultiplier: number;
  maxDelay: number;
}

/**
 * Default webhook configuration
 */
export const DEFAULT_WEBHOOK_CONFIG: WebhookConfig = {
  signatureAlgorithm: 'sha256',
  signatureHeader: 'X-Webhook-Signature',
  timestampHeader: 'X-Webhook-Timestamp',
  idHeader: 'X-Webhook-Id',
  retryHeader: 'X-Webhook-Retry',
  maxRetries: 7,
  retryDelays: [0, 60000, 300000, 1800000, 7200000, 21600000, 86400000], // 0s, 1m, 5m, 30m, 2h, 6h, 24h
  timeout: 30000, // 30 seconds
  batchSize: 10,
  rateLimit: {
    enabled: true,
    requestsPerMinute: 60,
  },
};

/**
 * High-priority event types
 */
export const HIGH_PRIORITY_EVENTS: WebhookEventType[] = [
  'payment.completed',
  'payment.failed',
  'transfer.completed',
  'transfer.failed',
  'account.low_balance',
];

/**
 * Event type to display name mapping
 */
export const EVENT_TYPE_NAMES: Record<WebhookEventType, string> = {
  'payment.created': 'Payment Created',
  'payment.completed': 'Payment Completed',
  'payment.failed': 'Payment Failed',
  'transfer.created': 'Transfer Created',
  'transfer.completed': 'Transfer Completed',
  'transfer.failed': 'Transfer Failed',
  'pooling.completed': 'Pooling Completed',
  'pooling.failed': 'Pooling Failed',
  'task.created': 'Task Created',
  'task.signed': 'Task Signed',
  'task.rejected': 'Task Rejected',
  'account.low_balance': 'Low Balance Alert',
};
