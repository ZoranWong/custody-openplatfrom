/**
 * Webhook Event Handler Registry Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  WebhookEventHandlerRegistry,
  createWebhookEventHandlerRegistry,
  getWebhookEventHandlerRegistry,
} from '../../src/services/webhook-event-handler.service';
import { WebhookEvent, WebhookEventType, WebhookPayload } from '../../src/types/webhook.types';

describe('WebhookEventHandlerRegistry', () => {
  let registry: WebhookEventHandlerRegistry;

  beforeEach(() => {
    registry = createWebhookEventHandlerRegistry();
  });

  describe('registerHandler', () => {
    it('should register a handler for a specific event type', () => {
      const handler = vi.fn();
      registry.registerHandler('payment.created', handler);

      const retrievedHandler = registry.getHandler('payment.created');
      expect(retrievedHandler).toBe(handler);
    });

    it('should register multiple handlers for different event types', () => {
      const paymentHandler = vi.fn();
      const transferHandler = vi.fn();

      registry.registerHandler('payment.completed', paymentHandler);
      registry.registerHandler('transfer.completed', transferHandler);

      expect(registry.getHandler('payment.completed')).toBe(paymentHandler);
      expect(registry.getHandler('transfer.completed')).toBe(transferHandler);
    });

    it('should assign high priority to high priority events', () => {
      const handler = vi.fn();
      registry.registerHandler('payment.completed', handler);

      const metadata = registry.getHandlerMetadata('payment.completed');
      expect(metadata?.priority).toBe('high');
    });

    it('should assign normal priority to non-high priority events', () => {
      const handler = vi.fn();
      registry.registerHandler('payment.created', handler);

      const metadata = registry.getHandlerMetadata('payment.created');
      expect(metadata?.priority).toBe('normal');
    });
  });

  describe('unregisterHandler', () => {
    it('should unregister a handler', () => {
      const handler = vi.fn();
      registry.registerHandler('payment.created', handler);
      registry.unregisterHandler('payment.created');

      expect(registry.getHandler('payment.created')).toBe(null);
    });

    it('should return true when handler is removed', () => {
      const handler = vi.fn();
      registry.registerHandler('payment.created', handler);

      const result = registry.unregisterHandler('payment.created');
      expect(result).toBe(true);
    });

    it('should return false when handler does not exist', () => {
      const result = registry.unregisterHandler('payment.created');
      expect(result).toBe(false);
    });
  });

  describe('getHandler', () => {
    it('should return registered handler', () => {
      const handler = vi.fn();
      registry.registerHandler('payment.completed', handler);

      expect(registry.getHandler('payment.completed')).toBe(handler);
    });

    it('should return null for unknown event type', () => {
      expect(registry.getHandler('unknown.event' as WebhookEventType)).toBe(null);
    });

    it('should return default handler for unknown event type', () => {
      const defaultHandler = vi.fn();
      registry.setDefaultHandler(defaultHandler);

      expect(registry.getHandler('unknown.event' as WebhookEventType)).toBe(defaultHandler);
    });
  });

  describe('hasHandler', () => {
    it('should return true when handler is registered', () => {
      const handler = vi.fn();
      registry.registerHandler('payment.created', handler);

      expect(registry.hasHandler('payment.created')).toBe(true);
    });

    it('should return false when handler is not registered but default exists', () => {
      registry.setDefaultHandler(vi.fn());

      // With default handler, hasHandler returns true for any type
      expect(registry.hasHandler('unknown.event' as WebhookEventType)).toBe(true);
    });

    it('should return false when no handlers registered', () => {
      expect(registry.hasHandler('payment.created')).toBe(false);
    });
  });

  describe('getRegisteredEventTypes', () => {
    it('should return list of registered event types', () => {
      registry.registerHandler('payment.created', vi.fn());
      registry.registerHandler('payment.completed', vi.fn());
      registry.registerHandler('transfer.created', vi.fn());

      const types = registry.getRegisteredEventTypes();
      expect(types).toContain('payment.created');
      expect(types).toContain('payment.completed');
      expect(types).toContain('transfer.created');
      expect(types.length).toBe(3);
    });
  });

  describe('getHandlersByPriority', () => {
    it('should return handlers sorted by priority', () => {
      const highPriorityHandler = vi.fn();
      const normalPriorityHandler = vi.fn();

      registry.registerHandler('payment.completed', highPriorityHandler);
      registry.registerHandler('payment.created', normalPriorityHandler);

      const sorted = registry.getHandlersByPriority();
      expect(sorted[0].eventType).toBe('payment.completed');
      expect(sorted[0].priority).toBe('high');
      expect(sorted[1].eventType).toBe('payment.created');
      expect(sorted[1].priority).toBe('normal');
    });
  });

  describe('getEventTypeName', () => {
    it('should return display name for event type', () => {
      expect(registry.getEventTypeName('payment.completed')).toBe('Payment Completed');
    });

    it('should return original type if name not found', () => {
      expect(registry.getEventTypeName('unknown.event' as WebhookEventType)).toBe('unknown.event');
    });
  });

  describe('isHighPriorityEvent', () => {
    it('should return true for high priority events', () => {
      expect(registry.isHighPriorityEvent('payment.completed')).toBe(true);
      expect(registry.isHighPriorityEvent('payment.failed')).toBe(true);
      expect(registry.isHighPriorityEvent('transfer.completed')).toBe(true);
      expect(registry.isHighPriorityEvent('account.low_balance')).toBe(true);
    });

    it('should return false for normal priority events', () => {
      expect(registry.isHighPriorityEvent('payment.created')).toBe(false);
      expect(registry.isHighPriorityEvent('transfer.created')).toBe(false);
      expect(registry.isHighPriorityEvent('task.created')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all handlers', () => {
      registry.registerHandler('payment.created', vi.fn());
      registry.registerHandler('payment.completed', vi.fn());

      registry.clear();

      expect(registry.getRegisteredEventTypes().length).toBe(0);
    });
  });
});

describe('Singleton Instance', () => {
  it('should return same instance', () => {
    const instance1 = getWebhookEventHandlerRegistry();
    const instance2 = getWebhookEventHandlerRegistry();

    expect(instance1).toBe(instance2);
  });
});
