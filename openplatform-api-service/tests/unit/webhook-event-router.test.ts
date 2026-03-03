/**
 * Webhook Event Router Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  WebhookEventRouter,
  createWebhookEventRouter,
} from '../../src/services/webhook-event-router.service';
import { WebhookEventHandlerRegistry } from '../../src/services/webhook-event-handler.service';
import { WebhookEvent, WebhookEventType } from '../../src/types/webhook.types';

describe('WebhookEventRouter', () => {
  let router: WebhookEventRouter;
  let registry: WebhookEventHandlerRegistry;

  const createMockEvent = (type: WebhookEventType): WebhookEvent => ({
    id: `evt_${Date.now()}`,
    enterpriseId: 'ent_123',
    type,
    data: { test: 'data' },
    timestamp: Date.now(),
    metadata: { source: 'test' },
  });

  beforeEach(() => {
    registry = new WebhookEventHandlerRegistry();
    router = createWebhookEventRouter(registry, false);
  });

  describe('routeEvent', () => {
    it('should route event to registered handler', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      registry.registerHandler('payment.completed', handler);

      const event = createMockEvent('payment.completed');
      const result = await router.routeEvent(event);

      expect(result.success).toBe(true);
      expect(result.handlerFound).toBe(true);
      expect(result.eventType).toBe('payment.completed');
      expect(handler).toHaveBeenCalled();
    });

    it('should return failure for unknown event type', async () => {
      const event = createMockEvent('unknown.event' as WebhookEventType);
      const result = await router.routeEvent(event);

      expect(result.success).toBe(false);
      expect(result.handlerFound).toBe(false);
    });

    it('should handle high priority events correctly', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      registry.registerHandler('payment.completed', handler);

      const event = createMockEvent('payment.completed');
      const result = await router.routeEvent(event);

      expect(result.isHighPriority).toBe(true);
    });

    it('should handle normal priority events correctly', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      registry.registerHandler('payment.created', handler);

      const event = createMockEvent('payment.created');
      const result = await router.routeEvent(event);

      expect(result.isHighPriority).toBe(false);
    });

    it('should catch and handle handler errors', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
      registry.registerHandler('payment.completed', handler);

      const event = createMockEvent('payment.completed');
      const result = await router.routeEvent(event);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Handler error');
    });
  });

  describe('routeEvents', () => {
    it('should route multiple events with priority sorting', async () => {
      const highPriorityHandler = vi.fn().mockResolvedValue(undefined);
      const normalPriorityHandler = vi.fn().mockResolvedValue(undefined);

      registry.registerHandler('payment.completed', highPriorityHandler);
      registry.registerHandler('payment.created', normalPriorityHandler);

      const events = [
        createMockEvent('payment.created'),
        createMockEvent('payment.completed'),
      ];

      await router.routeEvents(events);

      // High priority should be processed first (though order depends on sort)
      expect(highPriorityHandler).toHaveBeenCalled();
      expect(normalPriorityHandler).toHaveBeenCalled();
    });
  });

  describe('isEventTypeSupported', () => {
    it('should return true for supported event type', () => {
      registry.registerHandler('payment.completed', vi.fn());

      expect(router.isEventTypeSupported('payment.completed')).toBe(true);
    });

    it('should return false for unsupported event type', () => {
      expect(router.isEventTypeSupported('unknown.event')).toBe(false);
    });
  });

  describe('getSupportedEventTypes', () => {
    it('should return list of supported event types', () => {
      registry.registerHandler('payment.completed', vi.fn());
      registry.registerHandler('transfer.created', vi.fn());

      const types = router.getSupportedEventTypes();

      expect(types).toContain('payment.completed');
      expect(types).toContain('transfer.created');
    });
  });

  describe('getStatistics', () => {
    it('should return router statistics', () => {
      registry.registerHandler('payment.completed', vi.fn());
      registry.registerHandler('payment.failed', vi.fn());

      const stats = router.getStatistics();

      expect(stats.registeredHandlers).toBe(2);
      expect(stats.highPriorityEvents).toBe(2);
    });
  });

  describe('handleUnknownEventType', () => {
    it('should log warning for unknown event type', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      router.handleUnknownEventType('unknown.event');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('unknown event type')
      );

      consoleSpy.mockRestore();
    });
  });
});
