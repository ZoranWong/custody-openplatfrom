/**
 * Webhook Event Handler Service
 * Registry pattern for managing webhook event handlers
 */

import {
  WebhookEvent,
  WebhookEventType,
  WebhookPayload,
  HIGH_PRIORITY_EVENTS,
  EVENT_TYPE_NAMES,
} from '../types/webhook.types';

/**
 * Handler function type for processing webhook events
 */
export type WebhookEventHandler = (
  event: WebhookEvent,
  payload: WebhookPayload
) => Promise<void> | void;

/**
 * Handler metadata
 */
interface HandlerMetadata {
  handler: WebhookEventHandler;
  eventType: WebhookEventType;
  priority: 'high' | 'normal' | 'low';
  registeredAt: Date;
}

/**
 * Webhook Event Handler Registry
 * Manages registration and retrieval of event handlers
 */
export class WebhookEventHandlerRegistry {
  private handlers: Map<WebhookEventType, HandlerMetadata> = new Map();
  private defaultHandler: WebhookEventHandler | null = null;

  /**
   * Register a handler for a specific event type
   */
  registerHandler(
    eventType: WebhookEventType,
    handler: WebhookEventHandler,
    priority?: 'high' | 'normal' | 'low'
  ): void {
    const isHighPriority = HIGH_PRIORITY_EVENTS.includes(eventType);

    this.handlers.set(eventType, {
      handler,
      eventType,
      priority: priority || (isHighPriority ? 'high' : 'normal'),
      registeredAt: new Date(),
    });

    console.log(
      `[WebhookHandlerRegistry] Registered handler for event type: ${eventType} (${EVENT_TYPE_NAMES[eventType] || eventType})`
    );
  }

  /**
   * Unregister a handler for a specific event type
   */
  unregisterHandler(eventType: WebhookEventType): boolean {
    const removed = this.handlers.delete(eventType);

    if (removed) {
      console.log(
        `[WebhookHandlerRegistry] Unregistered handler for event type: ${eventType}`
      );
    }

    return removed;
  }

  /**
   * Get handler for a specific event type
   */
  getHandler(eventType: WebhookEventType): WebhookEventHandler | null {
    const metadata = this.handlers.get(eventType);

    if (metadata) {
      return metadata.handler;
    }

    // Return default handler if registered
    if (this.defaultHandler) {
      return this.defaultHandler;
    }

    console.warn(
      `[WebhookHandlerRegistry] No handler found for event type: ${eventType}`
    );

    return null;
  }

  /**
   * Set default handler for unknown event types
   */
  setDefaultHandler(handler: WebhookEventHandler): void {
    this.defaultHandler = handler;
    console.log(`[WebhookHandlerRegistry] Default handler registered`);
  }

  /**
   * Check if a handler exists for an event type
   */
  hasHandler(eventType: WebhookEventType): boolean {
    return this.handlers.has(eventType) || this.defaultHandler !== null;
  }

  /**
   * Get all registered event types
   */
  getRegisteredEventTypes(): WebhookEventType[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get handler metadata for an event type
   */
  getHandlerMetadata(eventType: WebhookEventType): HandlerMetadata | null {
    return this.handlers.get(eventType) || null;
  }

  /**
   * Get all handlers with their metadata
   */
  getAllHandlers(): Map<WebhookEventType, HandlerMetadata> {
    return new Map(this.handlers);
  }

  /**
   * Get handlers sorted by priority (high priority first)
   */
  getHandlersByPriority(): HandlerMetadata[] {
    return Array.from(this.handlers.values()).sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
    this.defaultHandler = null;
    console.log(`[WebhookHandlerRegistry] All handlers cleared`);
  }

  /**
   * Get event type display name
   */
  getEventTypeName(eventType: WebhookEventType): string {
    return EVENT_TYPE_NAMES[eventType] || eventType;
  }

  /**
   * Check if an event type is high priority
   */
  isHighPriorityEvent(eventType: WebhookEventType): boolean {
    return HIGH_PRIORITY_EVENTS.includes(eventType);
  }
}

/**
 * Singleton instance for global use
 */
let registryInstance: WebhookEventHandlerRegistry | null = null;

/**
 * Get the global webhook event handler registry instance
 */
export function getWebhookEventHandlerRegistry(): WebhookEventHandlerRegistry {
  if (!registryInstance) {
    registryInstance = new WebhookEventHandlerRegistry();
  }
  return registryInstance;
}

/**
 * Create a new webhook event handler registry instance
 */
export function createWebhookEventHandlerRegistry(): WebhookEventHandlerRegistry {
  return new WebhookEventHandlerRegistry();
}
