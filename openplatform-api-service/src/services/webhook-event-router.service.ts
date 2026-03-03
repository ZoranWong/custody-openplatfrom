/**
 * Webhook Event Router Service
 * Routes webhook events to appropriate handlers with priority support
 */

import {
  WebhookEvent,
  WebhookEventType,
  WebhookPayload,
  HIGH_PRIORITY_EVENTS,
  EVENT_TYPE_NAMES,
} from '../types/webhook.types';
import { WebhookEventHandlerRegistry } from './webhook-event-handler.service';

/**
 * Routing result
 */
export interface RoutingResult {
  success: boolean;
  handlerFound: boolean;
  eventType: WebhookEventType;
  eventName: string;
  isHighPriority: boolean;
  error?: string;
}

/**
 * Webhook Event Router
 * Routes events to handlers based on event type and priority
 */
export class WebhookEventRouter {
  private registry: WebhookEventHandlerRegistry;
  private logRoutingDecisions: boolean;

  constructor(registry?: WebhookEventHandlerRegistry, logRoutingDecisions?: boolean) {
    this.registry = registry || new WebhookEventHandlerRegistry();
    this.logRoutingDecisions = logRoutingDecisions ?? true;
  }

  /**
   * Route an event to the appropriate handler
   */
  async routeEvent(event: WebhookEvent): Promise<RoutingResult> {
    const eventType = event.type;
    const eventName = EVENT_TYPE_NAMES[eventType] || eventType;
    const isHighPriority = HIGH_PRIORITY_EVENTS.includes(eventType);

    // Log routing decision
    if (this.logRoutingDecisions) {
      console.log(
        `[WebhookEventRouter] Routing event: ${eventType} (${eventName}), High Priority: ${isHighPriority}`
      );
    }

    // Get handler from registry
    const handler = this.registry.getHandler(eventType);

    if (!handler) {
      // No handler found - use default or log warning
      const defaultHandler = this.registry.hasHandler(eventType);

      if (!defaultHandler) {
        console.warn(
          `[WebhookEventRouter] No handler found for event type: ${eventType}. Event will be skipped.`
        );

        return {
          success: false,
          handlerFound: false,
          eventType,
          eventName,
          isHighPriority,
          error: `No handler registered for event type: ${eventType}`,
        };
      }
    }

    // Build payload
    const payload: WebhookPayload = {
      id: event.id,
      type: event.type,
      timestamp: event.timestamp,
      data: event.data,
      metadata: event.metadata,
    };

    // Execute handler
    try {
      if (handler) {
        await handler(event, payload);

        if (this.logRoutingDecisions) {
          console.log(
            `[WebhookEventRouter] Successfully routed event: ${eventType}`
          );
        }

        return {
          success: true,
          handlerFound: true,
          eventType,
          eventName,
          isHighPriority,
        };
      }

      // No handler available
      return {
        success: false,
        handlerFound: false,
        eventType,
        eventName,
        isHighPriority,
        error: `Handler execution failed for event type: ${eventType}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error(
        `[WebhookEventRouter] Error routing event ${eventType}:`,
        errorMessage
      );

      return {
        success: false,
        handlerFound: true,
        eventType,
        eventName,
        isHighPriority,
        error: errorMessage,
      };
    }
  }

  /**
   * Route multiple events with priority sorting
   */
  async routeEvents(events: WebhookEvent[]): Promise<RoutingResult[]> {
    // Sort events by priority (high priority first)
    const sortedEvents = [...events].sort((a, b) => {
      const aIsHighPriority = HIGH_PRIORITY_EVENTS.includes(a.type);
      const bIsHighPriority = HIGH_PRIORITY_EVENTS.includes(b.type);

      if (aIsHighPriority && !bIsHighPriority) return -1;
      if (!aIsHighPriority && bIsHighPriority) return 1;

      // If same priority, sort by timestamp (older first)
      return a.timestamp - b.timestamp;
    });

    if (this.logRoutingDecisions) {
      console.log(
        `[WebhookEventRouter] Routing ${events.length} events (${sortedEvents.filter(e => HIGH_PRIORITY_EVENTS.includes(e.type)).length} high priority)`
      );
    }

    const results: RoutingResult[] = [];

    for (const event of sortedEvents) {
      const result = await this.routeEvent(event);
      results.push(result);
    }

    return results;
  }

  /**
   * Handle unknown event types gracefully
   */
  handleUnknownEventType(eventType: string): void {
    console.warn(
      `[WebhookEventRouter] Received unknown event type: ${eventType}`
    );
  }

  /**
   * Check if event type is supported
   */
  isEventTypeSupported(eventType: string): boolean {
    return this.registry.hasHandler(eventType as WebhookEventType);
  }

  /**
   * Get supported event types
   */
  getSupportedEventTypes(): WebhookEventType[] {
    return this.registry.getRegisteredEventTypes();
  }

  /**
   * Get router statistics
   */
  getStatistics(): {
    registeredHandlers: number;
    supportedEventTypes: WebhookEventType[];
    highPriorityEvents: number;
  } {
    const registeredHandlers = this.registry.getRegisteredEventTypes();
    const supportedEventTypes = registeredHandlers;
    const highPriorityEvents = supportedEventTypes.filter((type) =>
      HIGH_PRIORITY_EVENTS.includes(type)
    ).length;

    return {
      registeredHandlers: registeredHandlers.length,
      supportedEventTypes,
      highPriorityEvents,
    };
  }
}

/**
 * Create webhook event router instance
 */
export function createWebhookEventRouter(
  registry?: WebhookEventHandlerRegistry,
  logRoutingDecisions?: boolean
): WebhookEventRouter {
  return new WebhookEventRouter(registry, logRoutingDecisions);
}
