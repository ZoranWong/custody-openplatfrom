/**
 * Webhook Service
 * Core webhook delivery logic with retry and signature support
 */

import crypto from 'crypto';
import {
  Webhook,
  WebhookEvent,
  WebhookPayload,
  WebhookDelivery,
  WebhookConfig,
  WebhookDeliveryOptions,
  WebhookDeliveryResult,
  WebhookEventType,
  WebhookQueueItem,
  WebhookDeliveryStatus,
  CreateWebhookInput,
  UpdateWebhookInput,
  WebhookFilter,
  DeliveryFilter,
  HIGH_PRIORITY_EVENTS,
  DEFAULT_WEBHOOK_CONFIG,
  WEBHOOK_EVENT_TYPES,
} from '../types/webhook.types';
import { WebhookEventProcessor } from './webhook-event-processor.service';
import { getWebhookEventHandlerRegistry } from './webhook-event-handler.service';
import { registerAllHandlers } from './webhook-handlers';
import { getCurrentTraceId, propagateTrace, TRACE_HEADERS } from './trace.service';

/**
 * HTTP client interface (can be implemented with axios, fetch, etc.)
 */
export interface HttpClient {
  post(url: string, body: unknown, headers: Record<string, string>): Promise<{
    status: number;
    data: string;
  }>;
}

/**
 * Storage interface for webhook persistence
 */
export interface WebhookStorage {
  // Webhook operations
  createWebhook(input: CreateWebhookInput): Promise<Webhook>;
  updateWebhook(id: string, input: UpdateWebhookInput): Promise<Webhook | null>;
  deleteWebhook(id: string): Promise<boolean>;
  getWebhook(id: string): Promise<Webhook | null>;
  getWebhooks(filter: WebhookFilter): Promise<Webhook[]>;

  // Delivery operations
  createDelivery(delivery: Omit<WebhookDelivery, 'id' | 'createdAt' | 'updatedAt'>): Promise<WebhookDelivery>;
  updateDelivery(id: string, updates: Partial<WebhookDelivery>): Promise<WebhookDelivery | null>;
  getDelivery(id: string): Promise<WebhookDelivery | null>;
  getDeliveries(filter: DeliveryFilter): Promise<WebhookDelivery[]>;
  getPendingDeliveries(limit: number): Promise<WebhookDelivery[]>;

  // Event operations
  createEvent(event: Omit<WebhookEvent, 'id'>): Promise<WebhookEvent>;
  getEvent(id: string): Promise<WebhookEvent | null>;
}

/**
 * In-memory webhook storage (for single-instance deployment)
 */
class MemoryWebhookStorage implements WebhookStorage {
  private webhooks: Map<string, Webhook> = new Map();
  private deliveries: Map<string, WebhookDelivery> = new Map();
  private events: Map<string, WebhookEvent> = new Map();

  async createWebhook(input: CreateWebhookInput): Promise<Webhook> {
    const webhook: Webhook = {
      id: `wh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      enterpriseId: input.enterpriseId,
      url: input.url,
      secret: crypto.randomBytes(32).toString('hex'),
      eventTypes: input.eventTypes,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.webhooks.set(webhook.id, webhook);
    return webhook;
  }

  async updateWebhook(id: string, input: UpdateWebhookInput): Promise<Webhook | null> {
    const webhook = this.webhooks.get(id);
    if (!webhook) return null;

    const updated: Webhook = {
      ...webhook,
      ...input,
      updatedAt: new Date(),
    };
    this.webhooks.set(id, updated);
    return updated;
  }

  async deleteWebhook(id: string): Promise<boolean> {
    return this.webhooks.delete(id);
  }

  async getWebhook(id: string): Promise<Webhook | null> {
    return this.webhooks.get(id) || null;
  }

  async getWebhooks(filter: WebhookFilter): Promise<Webhook[]> {
    let results = Array.from(this.webhooks.values());

    if (filter.enterpriseId) {
      results = results.filter((w) => w.enterpriseId === filter.enterpriseId);
    }
    if (filter.eventType) {
      results = results.filter((w) => w.eventTypes.includes(filter.eventType!));
    }
    if (filter.isActive !== undefined) {
      results = results.filter((w) => w.isActive === filter.isActive);
    }

    return results;
  }

  async createDelivery(
    data: Omit<WebhookDelivery, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<WebhookDelivery> {
    const delivery: WebhookDelivery = {
      ...data,
      id: `wfd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.deliveries.set(delivery.id, delivery);
    return delivery;
  }

  async updateDelivery(
    id: string,
    updates: Partial<WebhookDelivery>
  ): Promise<WebhookDelivery | null> {
    const delivery = this.deliveries.get(id);
    if (!delivery) return null;

    const updated: WebhookDelivery = {
      ...delivery,
      ...updates,
      updatedAt: new Date(),
    };
    this.deliveries.set(id, updated);
    return updated;
  }

  async getDelivery(id: string): Promise<WebhookDelivery | null> {
    return this.deliveries.get(id) || null;
  }

  async getDeliveries(filter: DeliveryFilter): Promise<WebhookDelivery[]> {
    let results = Array.from(this.deliveries.values());

    if (filter.webhookId) {
      results = results.filter((d) => d.webhookId === filter.webhookId);
    }
    if (filter.eventId) {
      results = results.filter((d) => d.eventId === filter.eventId);
    }
    if (filter.eventType) {
      results = results.filter((d) => d.eventType === filter.eventType);
    }
    if (filter.status) {
      results = results.filter((d) => d.status === filter.status);
    }

    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getPendingDeliveries(limit: number): Promise<WebhookDelivery[]> {
    const now = new Date();
    return Array.from(this.deliveries.values())
      .filter((d) => d.status === 'pending' || (d.status === 'failed' && d.nextRetryAt && d.nextRetryAt <= now))
      .sort((a, b) => {
        // Prioritize by event type
        const aPriority = HIGH_PRIORITY_EVENTS.includes(a.eventType as WebhookEventType) ? 0 : 1;
        const bPriority = HIGH_PRIORITY_EVENTS.includes(b.eventType as WebhookEventType) ? 0 : 1;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return a.createdAt.getTime() - b.createdAt.getTime();
      })
      .slice(0, limit);
  }

  async createEvent(
    data: Omit<WebhookEvent, 'id'>
  ): Promise<WebhookEvent> {
    const event: WebhookEvent = {
      ...data,
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };
    this.events.set(event.id, event);
    return event;
  }

  async getEvent(id: string): Promise<WebhookEvent | null> {
    return this.events.get(id) || null;
  }
}

/**
 * Simple HTTP client using native fetch with rate limiting
 */
class FetchHttpClient implements HttpClient {
  private timeout: number;
  private rateLimitEnabled: boolean;
  private requestsPerMinute: number;
  private lastRequestTime: number = 0;
  private minRequestInterval: number;

  constructor(timeout: number = 30000, rateLimit?: { enabled: boolean; requestsPerMinute: number }) {
    this.timeout = timeout;
    this.rateLimitEnabled = rateLimit?.enabled ?? true;
    this.requestsPerMinute = rateLimit?.requestsPerMinute ?? 60;
    this.minRequestInterval = 60000 / this.requestsPerMinute;
  }

  async post(
    url: string,
    body: unknown,
    headers: Record<string, string>
  ): Promise<{ status: number; data: string }> {
    // Apply rate limiting
    if (this.rateLimitEnabled) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.minRequestInterval) {
        // Wait to respect rate limit
        await new Promise(resolve =>
          setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
        );
      }
      this.lastRequestTime = Date.now();
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.text();
      return {
        status: response.status,
        data,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }
}

/**
 * Webhook Service
 */
export class WebhookService {
  private storage: WebhookStorage;
  private httpClient: HttpClient;
  private config: WebhookConfig;
  private processingLock: Set<string> = new Set();
  private eventProcessor: WebhookEventProcessor;
  private handlersInitialized: boolean = false;

  constructor(
    storage?: WebhookStorage,
    httpClient?: HttpClient,
    config?: Partial<WebhookConfig>
  ) {
    this.storage = storage || new MemoryWebhookStorage();
    // Pass rate limit config to HTTP client
    this.httpClient = httpClient || new FetchHttpClient(
      config?.timeout || 30000,
      config?.rateLimit
    );
    this.config = { ...DEFAULT_WEBHOOK_CONFIG, ...config };

    // Initialize event processor
    this.eventProcessor = new WebhookEventProcessor(
      getWebhookEventHandlerRegistry()
    );

    // Initialize handlers (lazy initialization for backward compatibility)
    this.initializeHandlers();
  }

  /**
   * Initialize webhook event handlers
   * This is called automatically but can be called manually for explicit control
   */
  initializeHandlers(): void {
    if (this.handlersInitialized) {
      return;
    }

    const registry = getWebhookEventHandlerRegistry();
    registerAllHandlers((type, handler) => {
      registry.registerHandler(type, handler);
    });

    this.handlersInitialized = true;
    console.log('[WebhookService] Event handlers initialized');
  }

  /**
   * Get the event processor instance
   */
  getEventProcessor(): WebhookEventProcessor {
    return this.eventProcessor;
  }

  /**
   * Register a new webhook
   */
  async registerWebhook(input: CreateWebhookInput): Promise<Webhook> {
    // Validate URL
    if (!this.isValidUrl(input.url)) {
      throw new Error('Invalid webhook URL');
    }

    // Validate event types
    const validEventTypes = input.eventTypes.filter((type) =>
      WEBHOOK_EVENT_TYPES.includes(type)
    );

    if (validEventTypes.length === 0) {
      throw new Error('No valid event types provided');
    }

    return this.storage.createWebhook({
      ...input,
      eventTypes: validEventTypes,
    });
  }

  /**
   * Update an existing webhook
   */
  async updateWebhook(id: string, input: UpdateWebhookInput): Promise<Webhook | null> {
    if (input.url && !this.isValidUrl(input.url)) {
      throw new Error('Invalid webhook URL');
    }

    if (input.eventTypes) {
      const validEventTypes = input.eventTypes.filter((type) =>
        WEBHOOK_EVENT_TYPES.includes(type)
      );

      if (validEventTypes.length === 0) {
        throw new Error('No valid event types provided');
      }

      return this.storage.updateWebhook(id, { ...input, eventTypes: validEventTypes });
    }

    return this.storage.updateWebhook(id, input);
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(id: string): Promise<boolean> {
    return this.storage.deleteWebhook(id);
  }

  /**
   * Get webhook by ID
   */
  async getWebhook(id: string): Promise<Webhook | null> {
    return this.storage.getWebhook(id);
  }

  /**
   * List webhooks with filters
   */
  async listWebhooks(filter: WebhookFilter): Promise<Webhook[]> {
    return this.storage.getWebhooks(filter);
  }

  /**
   * Trigger an event and queue webhook deliveries
   */
  async triggerEvent(
    type: WebhookEventType,
    data: Record<string, unknown>,
    options?: {
      enterpriseId?: string;
      metadata?: Record<string, unknown>;
      correlationId?: string;
      priority?: 'high' | 'normal' | 'low';
    }
  ): Promise<WebhookEvent> {
    // Create event
    const event = await this.storage.createEvent({
      enterpriseId: options?.enterpriseId || 'global',
      type,
      data,
      timestamp: Date.now(),
      metadata: {
        source: 'api-gateway',
        correlationId: options?.correlationId,
        priority: options?.priority || (HIGH_PRIORITY_EVENTS.includes(type) ? 'high' : 'normal'),
      },
    });

    // Get matching webhooks
    const webhooks = await this.storage.getWebhooks({
      eventType: type,
      isActive: true,
    });

    // Filter by enterprise if specified
    const filteredWebhooks = options?.enterpriseId
      ? webhooks.filter((w) => w.enterpriseId === options.enterpriseId)
      : webhooks;

    // Queue deliveries
    for (const webhook of filteredWebhooks) {
      await this.queueDelivery(webhook, event);
    }

    // Process event through event processor (C-4-3: Webhook Event Types)
    // This handles the event routing and handler execution
    try {
      await this.eventProcessor.processEvent(event);
    } catch (error) {
      console.error(`[WebhookService] Error processing event ${event.id}:`, error);
      // Don't throw - event is still queued for delivery
    }

    return event;
  }

  /**
   * Queue a webhook delivery
   */
  private async queueDelivery(webhook: Webhook, event: WebhookEvent): Promise<WebhookDelivery> {
    const payload = this.buildPayload(webhook, event);

    return this.storage.createDelivery({
      webhookId: webhook.id,
      eventId: event.id,
      eventType: event.type,
      payload: JSON.stringify(payload),
      status: 'pending',
      attempts: 0,
      maxAttempts: this.config.maxRetries,
      lastAttemptAt: null,
      nextRetryAt: new Date(),
      responseCode: null,
      responseBody: null,
    });
  }

  /**
   * Process pending deliveries with concurrency control
   */
  async processDeliveries(limit?: number): Promise<number> {
    const pendingDeliveries = await this.storage.getPendingDeliveries(
      limit || this.config.batchSize
    );

    let processed = 0;

    for (const delivery of pendingDeliveries) {
      // Skip if already being processed (lock check)
      if (this.processingLock.has(delivery.id)) {
        continue;
      }

      // Acquire lock
      this.processingLock.add(delivery.id);

      try {
        const result = await this.deliverWebhook(delivery);

        if (result.success) {
          await this.storage.updateDelivery(delivery.id, {
            status: 'success',
            attempts: delivery.attempts + 1,
            lastAttemptAt: new Date(),
            responseCode: result.statusCode,
            responseBody: result.responseBody,
          });
        } else if (delivery.attempts + 1 >= delivery.maxAttempts) {
          await this.storage.updateDelivery(delivery.id, {
            status: 'failed',
            attempts: delivery.attempts + 1,
            lastAttemptAt: new Date(),
            responseCode: result.statusCode,
            responseBody: result.responseBody,
            nextRetryAt: null,
          });
        } else {
          const nextRetry = this.calculateNextRetry(delivery.attempts + 1);
          await this.storage.updateDelivery(delivery.id, {
            status: 'pending',
            attempts: delivery.attempts + 1,
            lastAttemptAt: new Date(),
            nextRetryAt: nextRetry,
            responseCode: result.statusCode,
            responseBody: result.responseBody,
          });
        }

        processed++;
      } catch (error) {
        console.error(`Delivery ${delivery.id} failed:`, error);
        // Mark as failed on unexpected error
        await this.storage.updateDelivery(delivery.id, {
          status: 'failed',
          attempts: delivery.attempts + 1,
          lastAttemptAt: new Date(),
          responseBody: error instanceof Error ? error.message : 'Unknown error',
          nextRetryAt: null,
        });
      } finally {
        // Release lock
        this.processingLock.delete(delivery.id);
      }
    }

    return processed;
  }

  /**
   * Deliver a single webhook
   */
  async deliverWebhook(delivery: WebhookDelivery): Promise<WebhookDeliveryResult> {
    const webhook = await this.storage.getWebhook(delivery.webhookId);
    if (!webhook || !webhook.isActive) {
      return {
        success: false,
        statusCode: null,
        responseBody: null,
        duration: 0,
        error: 'Webhook not found or inactive',
      };
    }

    const payload = JSON.parse(delivery.payload) as WebhookPayload;
    const headers = this.buildHeaders(webhook, payload, delivery.attempts);

    const startTime = Date.now();

    try {
      const result = await this.httpClient.post(webhook.url, payload, headers);

      return {
        success: result.status >= 200 && result.status < 300,
        statusCode: result.status,
        responseBody: result.data,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: null,
        responseBody: null,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get delivery by ID
   */
  async getDelivery(id: string): Promise<WebhookDelivery | null> {
    return this.storage.getDelivery(id);
  }

  /**
   * List deliveries with filters
   */
  async listDeliveries(filter: DeliveryFilter): Promise<WebhookDelivery[]> {
    return this.storage.getDeliveries(filter);
  }

  /**
   * Retry a failed delivery
   */
  async retryDelivery(id: string): Promise<WebhookDelivery | null> {
    const delivery = await this.storage.getDelivery(id);
    if (!delivery || delivery.status !== 'failed') {
      return null;
    }

    return this.storage.updateDelivery(id, {
      status: 'pending',
      nextRetryAt: new Date(),
    });
  }

  /**
   * Build webhook payload
   */
  private buildPayload(webhook: Webhook, event: WebhookEvent): WebhookPayload {
    return {
      id: event.id,
      type: event.type,
      timestamp: event.timestamp,
      data: event.data,
      metadata: event.metadata,
    };
  }

  /**
   * Build webhook headers with signature and trace context
   */
  private buildHeaders(
    webhook: Webhook,
    payload: WebhookPayload,
    attempt: number
  ): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payloadString = JSON.stringify(payload);

    // Create signature
    const signatureInput = `${timestamp}.${payloadString}`;
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(signatureInput)
      .digest('hex');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Id': payload.id,
      'X-Webhook-Type': payload.type,
      'X-Webhook-Signature': `sha256=${signature}`,
      'X-Webhook-Timestamp': timestamp,
      'X-Webhook-Retry': attempt.toString(),
    };

    // Add trace context headers for distributed tracing
    const traceId = getCurrentTraceId();
    if (traceId) {
      // Add X-Trace-Id header
      headers[TRACE_HEADERS.TRACE_ID] = traceId;

      // Generate traceparent for W3C compliance
      const traceHeaders = propagateTrace({ traceId, sampled: true });
      if (traceHeaders[TRACE_HEADERS.TRACEPARENT]) {
        headers[TRACE_HEADERS.TRACEPARENT] = traceHeaders[TRACE_HEADERS.TRACEPARENT];
      }
    }

    return headers;
  }

  /**
   * Verify webhook signature (for testing/receiving)
   */
  verifySignature(
    payload: string,
    signature: string,
    timestamp: string,
    secret: string
  ): boolean {
    const signatureInput = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signatureInput)
      .digest('hex');

    const providedSignature = signature.replace('sha256=', '');

    // Check timestamp to prevent replay attacks (2 minute window for financial security)
    const timestampNum = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestampNum) > 120) {
      return false;
    }

    // Use timing-safe comparison for same length buffers
    // For different lengths, fall back to constant-time comparison
    const expectedBuffer = Buffer.from(expectedSignature);
    const providedBuffer = Buffer.from(providedSignature);

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  }

  /**
   * Calculate next retry time
   */
  private calculateNextRetry(attempt: number): Date {
    const delayIndex = Math.min(attempt - 1, this.config.retryDelays.length - 1);
    const delay = this.config.retryDelays[delayIndex] || 86400000; // Default 24 hours
    return new Date(Date.now() + delay);
  }

  /**
   * Validate URL format (HTTPS-only for bank-grade security)
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      // Bank-grade security: HTTPS-only
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

/**
 * Create webhook service instance
 */
export function createWebhookService(
  storage?: WebhookStorage,
  httpClient?: HttpClient,
  config?: Partial<WebhookConfig>
): WebhookService {
  return new WebhookService(storage, httpClient, config);
}

// Export for testing
export { MemoryWebhookStorage, FetchHttpClient };
