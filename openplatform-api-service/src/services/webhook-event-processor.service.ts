/**
 * Webhook Event Processor Service
 * Processes webhook events with priority queue and logging
 */

import {
  WebhookEvent,
  WebhookEventType,
  WebhookPayload,
  HIGH_PRIORITY_EVENTS,
  EVENT_TYPE_NAMES,
} from '../types/webhook.types';
import { WebhookEventHandlerRegistry } from './webhook-event-handler.service';
import { WebhookEventRouter, RoutingResult } from './webhook-event-router.service';
import { WebhookPayloadFormatter } from './webhook-payload-formatter.service';

/**
 * Processing status
 */
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Event processing result
 */
export interface EventProcessingResult {
  eventId: string;
  status: ProcessingStatus;
  routingResult?: RoutingResult;
  processedAt?: number;
  error?: string;
}

/**
 * Processor statistics
 */
export interface ProcessorStatistics {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  highPriorityProcessed: number;
  byEventType: Record<string, number>;
}

/**
 * Webhook Event Processor
 * Processes webhook events with priority queue support
 */
export class WebhookEventProcessor {
  private registry: WebhookEventHandlerRegistry;
  private router: WebhookEventRouter;
  private formatter: WebhookPayloadFormatter;
  private logProcessing: boolean;

  // Statistics
  private statistics: ProcessorStatistics = {
    totalProcessed: 0,
    successCount: 0,
    failureCount: 0,
    highPriorityProcessed: 0,
    byEventType: {},
  };

  constructor(
    registry?: WebhookEventHandlerRegistry,
    router?: WebhookEventRouter,
    formatter?: WebhookPayloadFormatter,
    logProcessing?: boolean
  ) {
    this.registry = registry || new WebhookEventHandlerRegistry();
    this.router = router || new WebhookEventRouter(this.registry, logProcessing);
    this.formatter = formatter || new WebhookPayloadFormatter();
    this.logProcessing = logProcessing ?? true;
  }

  /**
   * Process a single event
   */
  async processEvent(event: WebhookEvent): Promise<EventProcessingResult> {
    const eventId = event.id;
    const eventType = event.type;

    if (this.logProcessing) {
      console.log(
        `[WebhookEventProcessor] Processing event: ${eventType} (${EVENT_TYPE_NAMES[eventType] || eventType}), ID: ${eventId}`
      );
    }

    // Validate event structure before processing
    const validationResult = this.formatter.validateEvent(event);
    if (!validationResult.valid) {
      const errorMsg = `Event validation failed: ${validationResult.errors.join(', ')}`;

      console.error(
        `[WebhookEventProcessor] Validation failed for event ${eventId}:`,
        validationResult.errors
      );

      this.updateStatistics(eventType, false, true);

      return {
        eventId,
        status: 'failed',
        error: errorMsg,
      };
    }

    // Route event to handler
    const routingResult = await this.router.routeEvent(event);

    // Update statistics
    const isSuccess = routingResult.success;
    const isHighPriority = HIGH_PRIORITY_EVENTS.includes(eventType);
    this.updateStatistics(eventType, isSuccess, isHighPriority);

    // Log processing decision
    if (this.logProcessing) {
      if (isSuccess) {
        console.log(
          `[WebhookEventProcessor] Successfully processed event: ${eventType}, ID: ${eventId}`
        );
      } else {
        console.error(
          `[WebhookEventProcessor] Failed to process event: ${eventType}, ID: ${eventId}, Error: ${routingResult.error}`
        );
      }
    }

    return {
      eventId,
      status: isSuccess ? 'completed' : 'failed',
      routingResult,
      processedAt: Date.now(),
      error: routingResult.error,
    };
  }

  /**
   * Process multiple events with priority queue
   * High priority events are processed first
   */
  async processEvents(events: WebhookEvent[]): Promise<EventProcessingResult[]> {
    if (this.logProcessing) {
      console.log(
        `[WebhookEventProcessor] Processing ${events.length} events (Priority Queue)`
      );
    }

    // Sort events by priority (high priority first)
    const sortedEvents = this.sortByPriority(events);

    const results: EventProcessingResult[] = [];

    for (const event of sortedEvents) {
      const result = await this.processEvent(event);
      results.push(result);
    }

    if (this.logProcessing) {
      console.log(
        `[WebhookEventProcessor] Completed processing ${events.length} events. ` +
        `Success: ${this.statistics.successCount}, Failed: ${this.statistics.failureCount}`
      );
    }

    return results;
  }

  /**
   * Sort events by priority (high priority first)
   */
  private sortByPriority(events: WebhookEvent[]): WebhookEvent[] {
    return [...events].sort((a, b) => {
      const aIsHighPriority = HIGH_PRIORITY_EVENTS.includes(a.type);
      const bIsHighPriority = HIGH_PRIORITY_EVENTS.includes(b.type);

      // High priority first
      if (aIsHighPriority && !bIsHighPriority) return -1;
      if (!aIsHighPriority && bIsHighPriority) return 1;

      // Then by timestamp (older first)
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * Update processing statistics
   */
  private updateStatistics(
    eventType: WebhookEventType,
    success: boolean,
    isHighPriority: boolean
  ): void {
    this.statistics.totalProcessed++;

    if (success) {
      this.statistics.successCount++;
    } else {
      this.statistics.failureCount++;
    }

    if (isHighPriority) {
      this.statistics.highPriorityProcessed++;
    }

    // Track by event type
    if (!this.statistics.byEventType[eventType]) {
      this.statistics.byEventType[eventType] = 0;
    }
    this.statistics.byEventType[eventType]++;
  }

  /**
   * Log event processing decisions
   */
  logProcessingDecision(event: WebhookEvent, result: EventProcessingResult): void {
    const eventType = event.type;
    const eventName = EVENT_TYPE_NAMES[eventType] || eventType;

    console.log(
      `[WebhookEventProcessor] Decision: Event ${eventType} (${eventName}), ` +
      `Status: ${result.status}, Time: ${new Date().toISOString()}`
    );
  }

  /**
   * Get processor statistics
   */
  getStatistics(): ProcessorStatistics {
    return { ...this.statistics };
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.statistics = {
      totalProcessed: 0,
      successCount: 0,
      failureCount: 0,
      highPriorityProcessed: 0,
      byEventType: {},
    };
  }

  /**
   * Get router instance
   */
  getRouter(): WebhookEventRouter {
    return this.router;
  }

  /**
   * Get registry instance
   */
  getRegistry(): WebhookEventHandlerRegistry {
    return this.registry;
  }
}

/**
 * Create webhook event processor instance
 */
export function createWebhookEventProcessor(
  registry?: WebhookEventHandlerRegistry,
  router?: WebhookEventRouter,
  formatter?: WebhookPayloadFormatter,
  logProcessing?: boolean
): WebhookEventProcessor {
  return new WebhookEventProcessor(registry, router, formatter, logProcessing);
}
