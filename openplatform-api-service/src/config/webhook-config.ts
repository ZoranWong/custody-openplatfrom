/**
 * Webhook Configuration
 * Configuration file for webhook push functionality
 */

import { WebhookConfig } from '../types/webhook.types';

/**
 * Production webhook configuration
 */
export const webhookConfig: WebhookConfig = {
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
 * Development webhook configuration (more permissive)
 */
export const webhookDevConfig: WebhookConfig = {
  ...webhookConfig,
  timeout: 60000, // 60 seconds
  rateLimit: {
    enabled: false,
    requestsPerMinute: 100,
  },
};

/**
 * High-throughput webhook configuration
 */
export const webhookHighThroughputConfig: WebhookConfig = {
  ...webhookConfig,
  batchSize: 50,
  timeout: 15000,
  rateLimit: {
    enabled: true,
    requestsPerMinute: 120,
  },
};

/**
 * Get webhook configuration by environment
 */
export function getWebhookConfig(isProduction: boolean = process.env.NODE_ENV === 'production'): WebhookConfig {
  if (!isProduction) {
    return webhookDevConfig;
  }
  return webhookConfig;
}
