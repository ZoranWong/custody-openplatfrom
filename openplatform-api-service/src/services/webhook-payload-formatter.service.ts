/**
 * Webhook Payload Formatter Service
 * Formats webhook payloads according to the WebhookPayload interface
 */

import {
  WebhookEvent,
  WebhookPayload,
  WebhookEventType,
  EVENT_TYPE_NAMES,
} from '../types/webhook.types';

/**
 * Payload formatting options
 */
export interface PayloadFormattingOptions {
  includeMetadata?: boolean;
  includeEventName?: boolean;
  customMetadata?: Record<string, unknown>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Webhook Payload Formatter
 * Formats and validates webhook payloads
 */
export class WebhookPayloadFormatter {
  /**
   * Format an event into a WebhookPayload
   */
  formatPayload(
    event: WebhookEvent,
    options?: PayloadFormattingOptions
  ): WebhookPayload {
    const includeMetadata = options?.includeMetadata ?? true;
    const includeEventName = options?.includeEventName ?? false;

    const payload: WebhookPayload = {
      id: event.id,
      type: event.type,
      timestamp: event.timestamp,
      data: event.data,
    };

    // Include metadata if enabled
    if (includeMetadata) {
      payload.metadata = {
        ...event.metadata,
        ...options?.customMetadata,
      };

      // Add event name if requested
      if (includeEventName) {
        payload.metadata = {
          ...payload.metadata,
          eventName: EVENT_TYPE_NAMES[event.type] || event.type,
        };
      }
    }

    return payload;
  }

  /**
   * Enrich payload with additional metadata
   */
  enrichPayload(
    payload: WebhookPayload,
    additionalMetadata: Record<string, unknown>
  ): WebhookPayload {
    return {
      ...payload,
      metadata: {
        ...payload.metadata,
        ...additionalMetadata,
      },
    };
  }

  /**
   * Validate payload structure
   */
  validatePayload(payload: unknown): ValidationResult {
    const errors: string[] = [];

    // Check if payload is an object
    if (!payload || typeof payload !== 'object') {
      errors.push('Payload must be an object');
      return { valid: false, errors };
    }

    const p = payload as Record<string, unknown>;

    // Validate required fields
    if (!p.id || typeof p.id !== 'string') {
      errors.push('Missing or invalid required field: id (string)');
    }

    if (!p.type || typeof p.type !== 'string') {
      errors.push('Missing or invalid required field: type (string)');
    }

    if (p.timestamp === undefined || typeof p.timestamp !== 'number') {
      errors.push('Missing or invalid required field: timestamp (number)');
    }

    if (!p.data || typeof p.data !== 'object') {
      errors.push('Missing or invalid required field: data (object)');
    }

    // Validate metadata if present
    if (p.metadata && typeof p.metadata !== 'object') {
      errors.push('Invalid optional field: metadata (must be object)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate event structure before processing
   */
  validateEvent(event: unknown): ValidationResult {
    const errors: string[] = [];

    if (!event || typeof event !== 'object') {
      errors.push('Event must be an object');
      return { valid: false, errors };
    }

    const e = event as Record<string, unknown>;

    // Required fields
    if (!e.id || typeof e.id !== 'string') {
      errors.push('Missing or invalid required field: id (string)');
    }

    if (!e.type || typeof e.type !== 'string') {
      errors.push('Missing or invalid required field: type (string)');
    }

    if (!e.data || typeof e.data !== 'object') {
      errors.push('Missing or invalid required field: data (object)');
    }

    if (e.timestamp === undefined || typeof e.timestamp !== 'number') {
      errors.push('Missing or invalid required field: timestamp (number)');
    }

    // Optional fields validation
    if (e.metadata && typeof e.metadata !== 'object') {
      errors.push('Invalid optional field: metadata (must be object)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get event type display name
   */
  getEventTypeName(eventType: WebhookEventType): string {
    return EVENT_TYPE_NAMES[eventType] || eventType;
  }

  /**
   * Format multiple events into payloads
   */
  formatPayloads(events: WebhookEvent[]): WebhookPayload[] {
    return events.map((event) => this.formatPayload(event));
  }
}

/**
 * Create webhook payload formatter instance
 */
export function createWebhookPayloadFormatter(): WebhookPayloadFormatter {
  return new WebhookPayloadFormatter();
}

// Export singleton for convenience
export const webhookPayloadFormatter = new WebhookPayloadFormatter();
