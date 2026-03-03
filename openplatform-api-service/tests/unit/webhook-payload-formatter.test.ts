/**
 * Webhook Payload Formatter Tests
 */

import { describe, it, expect, vi } from 'vitest';
import {
  WebhookPayloadFormatter,
  createWebhookPayloadFormatter,
  webhookPayloadFormatter,
} from '../../src/services/webhook-payload-formatter.service';
import { WebhookEvent, WebhookEventType } from '../../src/types/webhook.types';

describe('WebhookPayloadFormatter', () => {
  let formatter: WebhookPayloadFormatter;

  const createMockEvent = (overrides?: Partial<WebhookEvent>): WebhookEvent => ({
    id: 'evt_123',
    enterpriseId: 'ent_123',
    type: 'payment.completed',
    data: { paymentId: 'pay_123', amount: 100 },
    timestamp: Date.now(),
    metadata: { source: 'test' },
    ...overrides,
  });

  beforeEach(() => {
    formatter = createWebhookPayloadFormatter();
  });

  describe('formatPayload', () => {
    it('should format event into payload', () => {
      const event = createMockEvent();
      const payload = formatter.formatPayload(event);

      expect(payload.id).toBe(event.id);
      expect(payload.type).toBe(event.type);
      expect(payload.timestamp).toBe(event.timestamp);
      expect(payload.data).toBe(event.data);
    });

    it('should include metadata by default', () => {
      const event = createMockEvent();
      const payload = formatter.formatPayload(event);

      expect(payload.metadata).toBeDefined();
      expect(payload.metadata?.source).toBe('test');
    });

    it('should exclude metadata when disabled', () => {
      const event = createMockEvent();
      const payload = formatter.formatPayload(event, { includeMetadata: false });

      expect(payload.metadata).toBeUndefined();
    });

    it('should include event name when enabled', () => {
      const event = createMockEvent({ type: 'payment.completed' });
      const payload = formatter.formatPayload(event, { includeEventName: true });

      expect(payload.metadata?.eventName).toBe('Payment Completed');
    });

    it('should add custom metadata', () => {
      const event = createMockEvent();
      const payload = formatter.formatPayload(event, {
        customMetadata: { customField: 'customValue' },
      });

      expect(payload.metadata?.customField).toBe('customValue');
    });
  });

  describe('enrichPayload', () => {
    it('should add additional metadata to existing payload', () => {
      const event = createMockEvent();
      const payload = formatter.formatPayload(event);

      const enriched = formatter.enrichPayload(payload, { newField: 'newValue' });

      expect(enriched.metadata?.newField).toBe('newValue');
    });

    it('should not modify original payload', () => {
      const event = createMockEvent();
      const payload = formatter.formatPayload(event);

      formatter.enrichPayload(payload, { newField: 'newValue' });

      expect(payload.metadata?.newField).toBeUndefined();
    });
  });

  describe('validatePayload', () => {
    it('should validate valid payload', () => {
      const payload = {
        id: 'evt_123',
        type: 'payment.completed',
        timestamp: Date.now(),
        data: { test: 'data' },
      };

      const result = formatter.validatePayload(payload);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for missing id', () => {
      const payload = {
        type: 'payment.completed',
        timestamp: Date.now(),
        data: { test: 'data' },
      };

      const result = formatter.validatePayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid required field: id (string)');
    });

    it('should fail for missing type', () => {
      const payload = {
        id: 'evt_123',
        timestamp: Date.now(),
        data: { test: 'data' },
      };

      const result = formatter.validatePayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid required field: type (string)');
    });

    it('should fail for missing timestamp', () => {
      const payload = {
        id: 'evt_123',
        type: 'payment.completed',
        data: { test: 'data' },
      };

      const result = formatter.validatePayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid required field: timestamp (number)');
    });

    it('should fail for missing data', () => {
      const payload = {
        id: 'evt_123',
        type: 'payment.completed',
        timestamp: Date.now(),
      };

      const result = formatter.validatePayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid required field: data (object)');
    });

    it('should fail for invalid metadata', () => {
      const payload = {
        id: 'evt_123',
        type: 'payment.completed',
        timestamp: Date.now(),
        data: { test: 'data' },
        metadata: 'not an object',
      };

      const result = formatter.validatePayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid optional field: metadata (must be object)');
    });

    it('should fail for non-object payload', () => {
      const result = formatter.validatePayload('not an object');

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toBe('Payload must be an object');
    });
  });

  describe('validateEvent', () => {
    it('should validate valid event', () => {
      const event = createMockEvent();
      const result = formatter.validateEvent(event);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for invalid event structure', () => {
      const result = formatter.validateEvent({ id: 'test' });

      expect(result.valid).toBe(false);
    });
  });

  describe('getEventTypeName', () => {
    it('should return display name for event type', () => {
      expect(formatter.getEventTypeName('payment.completed')).toBe('Payment Completed');
      expect(formatter.getEventTypeName('transfer.failed')).toBe('Transfer Failed');
      expect(formatter.getEventTypeName('account.low_balance')).toBe('Low Balance Alert');
    });

    it('should return original type if name not found', () => {
      expect(formatter.getEventTypeName('unknown.event' as WebhookEventType)).toBe('unknown.event');
    });
  });

  describe('formatPayloads', () => {
    it('should format multiple events', () => {
      const events = [
        createMockEvent({ type: 'payment.completed' }),
        createMockEvent({ type: 'transfer.created' }),
      ];

      const payloads = formatter.formatPayloads(events);

      expect(payloads.length).toBe(2);
      expect(payloads[0].type).toBe('payment.completed');
      expect(payloads[1].type).toBe('transfer.created');
    });
  });
});

describe('Singleton Instance', () => {
  it('should export singleton instance', () => {
    expect(webhookPayloadFormatter).toBeDefined();
    expect(webhookPayloadFormatter).toBeInstanceOf(WebhookPayloadFormatter);
  });
});
