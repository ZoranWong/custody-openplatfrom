/**
 * Webhook Event Processor Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  WebhookEventProcessor,
  createWebhookEventProcessor,
} from '../../src/services/webhook-event-processor.service';
import { WebhookEventHandlerRegistry } from '../../src/services/webhook-event-handler.service';
import { WebhookEvent, WebhookEventType } from '../../src/types/webhook.types';

describe('WebhookEventProcessor', () => {
  let processor: WebhookEventProcessor;
  let registry: WebhookEventHandlerRegistry;

  const createMockEvent = (type: WebhookEventType): WebhookEvent => ({
    id: `evt_${Date.now()}_${Math.random()}`,
    enterpriseId: 'ent_123',
    type,
    data: { test: 'data' },
    timestamp: Date.now(),
    metadata: { source: 'test' },
  });

  beforeEach(() => {
    registry = new WebhookEventHandlerRegistry();
    processor = createWebhookEventProcessor(registry, undefined, undefined, false);
  });

  describe('processEvent', () => {
    it('should process event successfully', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      registry.registerHandler('payment.completed', handler);

      const event = createMockEvent('payment.completed');
      const result = await processor.processEvent(event);

      expect(result.status).toBe('completed');
      expect(result.eventId).toBe(event.id);
      expect(handler).toHaveBeenCalled();
    });

    it('should fail for unknown event type', async () => {
      const event = createMockEvent('unknown.event' as WebhookEventType);
      const result = await processor.processEvent(event);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('No handler registered');
    });

    it('should fail for invalid event structure', async () => {
      // Event without required fields
      const invalidEvent = { id: 'test' } as unknown as WebhookEvent;
      const result = await processor.processEvent(invalidEvent);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('validation failed');
    });

    it('should catch handler errors', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Processing error'));
      registry.registerHandler('payment.completed', handler);

      const event = createMockEvent('payment.completed');
      const result = await processor.processEvent(event);

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Processing error');
    });
  });

  describe('processEvents', () => {
    it('should process multiple events', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      registry.registerHandler('payment.completed', handler);

      const events = [
        createMockEvent('payment.completed'),
        createMockEvent('payment.completed'),
      ];

      const results = await processor.processEvents(events);

      expect(results.length).toBe(2);
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should sort events by priority', async () => {
      const highPriorityHandler = vi.fn().mockResolvedValue(undefined);
      const normalPriorityHandler = vi.fn().mockResolvedValue(undefined);

      registry.registerHandler('payment.completed', highPriorityHandler);
      registry.registerHandler('payment.created', normalPriorityHandler);

      const events = [
        createMockEvent('payment.created'),
        createMockEvent('payment.completed'),
      ];

      await processor.processEvents(events);

      // Both handlers should be called
      expect(highPriorityHandler).toHaveBeenCalled();
      expect(normalPriorityHandler).toHaveBeenCalled();
    });
  });

  describe('getStatistics', () => {
    it('should track processed events', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      registry.registerHandler('payment.completed', handler);

      const event = createMockEvent('payment.completed');
      await processor.processEvent(event);

      const stats = processor.getStatistics();

      expect(stats.totalProcessed).toBe(1);
      expect(stats.successCount).toBe(1);
      expect(stats.failureCount).toBe(0);
    });

    it('should track failures', async () => {
      const event = createMockEvent('unknown.event' as WebhookEventType);
      await processor.processEvent(event);

      const stats = processor.getStatistics();

      expect(stats.totalProcessed).toBe(1);
      expect(stats.successCount).toBe(0);
      expect(stats.failureCount).toBe(1);
    });

    it('should track high priority events', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      registry.registerHandler('payment.completed', handler);

      const event = createMockEvent('payment.completed');
      await processor.processEvent(event);

      const stats = processor.getStatistics();

      expect(stats.highPriorityProcessed).toBe(1);
    });

    it('should track events by type', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      registry.registerHandler('payment.completed', handler);

      const event = createMockEvent('payment.completed');
      await processor.processEvent(event);

      const stats = processor.getStatistics();

      expect(stats.byEventType['payment.completed']).toBe(1);
    });
  });

  describe('resetStatistics', () => {
    it('should reset statistics', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      registry.registerHandler('payment.completed', handler);

      const event = createMockEvent('payment.completed');
      await processor.processEvent(event);

      processor.resetStatistics();
      const stats = processor.getStatistics();

      expect(stats.totalProcessed).toBe(0);
      expect(stats.successCount).toBe(0);
    });
  });
});
