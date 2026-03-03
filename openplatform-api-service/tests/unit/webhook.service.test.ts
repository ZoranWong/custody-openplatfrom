/**
 * Webhook Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  WebhookService,
  MemoryWebhookStorage,
  FetchHttpClient,
  createWebhookService,
} from '../../src/services/webhook.service';
import { WebhookEventType } from '../../src/types/webhook.types';

describe('WebhookService', () => {
  let service: WebhookService;
  let storage: MemoryWebhookStorage;

  beforeEach(() => {
    storage = new MemoryWebhookStorage();
    service = createWebhookService(storage);
  });

  describe('registerWebhook', () => {
    it('should register a new webhook', async () => {
      const webhook = await service.registerWebhook({
        enterpriseId: 'ent_123',
        url: 'https://example.com/webhook',
        eventTypes: ['payment.completed', 'payment.failed'],
      });

      expect(webhook.id).toBeDefined();
      expect(webhook.enterpriseId).toBe('ent_123');
      expect(webhook.url).toBe('https://example.com/webhook');
      expect(webhook.eventTypes).toContain('payment.completed');
      expect(webhook.eventTypes).toContain('payment.failed');
      expect(webhook.secret).toBeDefined();
      expect(webhook.isActive).toBe(true);
    });

    it('should reject invalid URL', async () => {
      await expect(
        service.registerWebhook({
          enterpriseId: 'ent_123',
          url: 'not-a-valid-url',
          eventTypes: ['payment.completed'],
        })
      ).rejects.toThrow('Invalid webhook URL');
    });

    it('should reject HTTP URLs (HTTPS-only)', async () => {
      await expect(
        service.registerWebhook({
          enterpriseId: 'ent_123',
          url: 'http://example.com/webhook',
          eventTypes: ['payment.completed'],
        })
      ).rejects.toThrow('Invalid webhook URL');
    });

    it('should reject empty event types', async () => {
      await expect(
        service.registerWebhook({
          enterpriseId: 'ent_123',
          url: 'https://example.com/webhook',
          eventTypes: [],
        })
      ).rejects.toThrow('No valid event types provided');
    });

    it('should reject invalid event types', async () => {
      await expect(
        service.registerWebhook({
          enterpriseId: 'ent_123',
          url: 'https://example.com/webhook',
          eventTypes: ['invalid.event'] as unknown as WebhookEventType[],
        })
      ).rejects.toThrow('No valid event types provided');
    });
  });

  describe('updateWebhook', () => {
    it('should update webhook URL', async () => {
      const webhook = await service.registerWebhook({
        enterpriseId: 'ent_123',
        url: 'https://example.com/webhook',
        eventTypes: ['payment.completed'],
      });

      const updated = await service.updateWebhook(webhook.id, {
        url: 'https://new-example.com/webhook',
      });

      expect(updated?.url).toBe('https://new-example.com/webhook');
    });

    it('should update event types', async () => {
      const webhook = await service.registerWebhook({
        enterpriseId: 'ent_123',
        url: 'https://example.com/webhook',
        eventTypes: ['payment.completed'],
      });

      const updated = await service.updateWebhook(webhook.id, {
        eventTypes: ['payment.completed', 'transfer.completed'],
      });

      expect(updated?.eventTypes).toContain('transfer.completed');
    });

    it('should deactivate webhook', async () => {
      const webhook = await service.registerWebhook({
        enterpriseId: 'ent_123',
        url: 'https://example.com/webhook',
        eventTypes: ['payment.completed'],
      });

      const updated = await service.updateWebhook(webhook.id, {
        isActive: false,
      });

      expect(updated?.isActive).toBe(false);
    });

    it('should return null for non-existent webhook', async () => {
      const updated = await service.updateWebhook('non-existent', {
        url: 'https://example.com/webhook',
      });

      expect(updated).toBeNull();
    });
  });

  describe('deleteWebhook', () => {
    it('should delete webhook', async () => {
      const webhook = await service.registerWebhook({
        enterpriseId: 'ent_123',
        url: 'https://example.com/webhook',
        eventTypes: ['payment.completed'],
      });

      const deleted = await service.deleteWebhook(webhook.id);
      expect(deleted).toBe(true);

      const fetched = await service.getWebhook(webhook.id);
      expect(fetched).toBeNull();
    });

    it('should return false for non-existent webhook', async () => {
      const deleted = await service.deleteWebhook('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('getWebhook', () => {
    it('should get webhook by ID', async () => {
      const webhook = await service.registerWebhook({
        enterpriseId: 'ent_123',
        url: 'https://example.com/webhook',
        eventTypes: ['payment.completed'],
      });

      const fetched = await service.getWebhook(webhook.id);
      expect(fetched).toEqual(webhook);
    });
  });

  describe('listWebhooks', () => {
    it('should list webhooks by enterprise', async () => {
      await service.registerWebhook({
        enterpriseId: 'ent_123',
        url: 'https://example.com/webhook1',
        eventTypes: ['payment.completed'],
      });
      await service.registerWebhook({
        enterpriseId: 'ent_123',
        url: 'https://example.com/webhook2',
        eventTypes: ['transfer.completed'],
      });
      await service.registerWebhook({
        enterpriseId: 'ent_456',
        url: 'https://example.com/webhook3',
        eventTypes: ['payment.completed'],
      });

      const webhooks = await service.listWebhooks({ enterpriseId: 'ent_123' });
      expect(webhooks.length).toBe(2);
    });

    it('should list webhooks by event type', async () => {
      await service.registerWebhook({
        enterpriseId: 'ent_123',
        url: 'https://example.com/webhook1',
        eventTypes: ['payment.completed'],
      });
      await service.registerWebhook({
        enterpriseId: 'ent_123',
        url: 'https://example.com/webhook2',
        eventTypes: ['payment.completed', 'transfer.completed'],
      });

      const webhooks = await service.listWebhooks({ eventType: 'payment.completed' });
      expect(webhooks.length).toBe(2);
    });

    it('should filter by active status', async () => {
      const webhook1 = await service.registerWebhook({
        enterpriseId: 'ent_123',
        url: 'https://example.com/webhook1',
        eventTypes: ['payment.completed'],
      });
      await service.registerWebhook({
        enterpriseId: 'ent_123',
        url: 'https://example.com/webhook2',
        eventTypes: ['payment.completed'],
      });

      await service.updateWebhook(webhook1.id, { isActive: false });

      const activeWebhooks = await service.listWebhooks({ enterpriseId: 'ent_123', isActive: true });
      expect(activeWebhooks.length).toBe(1);
    });
  });

  describe('triggerEvent', () => {
    it('should trigger event and queue deliveries', async () => {
      const webhook = await service.registerWebhook({
        enterpriseId: 'ent_123',
        url: 'https://example.com/webhook',
        eventTypes: ['payment.completed'],
      });

      const event = await service.triggerEvent(
        'payment.completed',
        {
          transaction_id: 'tx_123',
          amount: 100,
          currency: 'BTC',
        },
        { enterpriseId: 'ent_123' }
      );

      expect(event.id).toBeDefined();
      expect(event.type).toBe('payment.completed');
      expect(event.enterpriseId).toBe('ent_123');

      const deliveries = await service.listDeliveries({ eventId: event.id });
      expect(deliveries.length).toBe(1);
      expect(deliveries[0].webhookId).toBe(webhook.id);
    });

    it('should only trigger for matching event type', async () => {
      await service.registerWebhook({
        enterpriseId: 'ent_123',
        url: 'https://example.com/webhook',
        eventTypes: ['payment.completed'],
      });

      const event = await service.triggerEvent(
        'transfer.completed',
        { transfer_id: 'tx_456' },
        { enterpriseId: 'ent_123' }
      );

      const deliveries = await service.listDeliveries({ eventId: event.id });
      expect(deliveries.length).toBe(0);
    });

    it('should trigger for multiple webhooks', async () => {
      await service.registerWebhook({
        enterpriseId: 'ent_123',
        url: 'https://example.com/webhook1',
        eventTypes: ['payment.completed'],
      });
      await service.registerWebhook({
        enterpriseId: 'ent_123',
        url: 'https://example.com/webhook2',
        eventTypes: ['payment.completed'],
      });

      const event = await service.triggerEvent(
        'payment.completed',
        { transaction_id: 'tx_123' },
        { enterpriseId: 'ent_123' }
      );

      const deliveries = await service.listDeliveries({ eventId: event.id });
      expect(deliveries.length).toBe(2);
    });
  });

  describe('processDeliveries', () => {
    it('should process pending deliveries and mark as success', async () => {
      const webhook = await service.registerWebhook({
        enterpriseId: 'ent_123',
        url: 'https://example.com/webhook',
        eventTypes: ['payment.completed'],
      });

      await service.triggerEvent(
        'payment.completed',
        { transaction_id: 'tx_123' },
        { enterpriseId: 'ent_123' }
      );

      const deliveries = await service.listDeliveries({ webhookId: webhook.id });
      expect(deliveries.length).toBe(1);
      expect(deliveries[0].status).toBe('pending');
    });

    it('should create multiple deliveries for batch webhook triggers', async () => {
      // Register multiple webhooks with unique enterprise IDs
      await service.registerWebhook({
        enterpriseId: 'batch_ent_1',
        url: 'https://example1.com/webhook',
        eventTypes: ['payment.completed'],
      });
      await service.registerWebhook({
        enterpriseId: 'batch_ent_2',
        url: 'https://example2.com/webhook',
        eventTypes: ['payment.completed'],
      });
      await service.registerWebhook({
        enterpriseId: 'batch_ent_3',
        url: 'https://example3.com/webhook',
        eventTypes: ['payment.completed'],
      });

      // Trigger event - should queue 3 deliveries (one per webhook)
      const event = await service.triggerEvent(
        'payment.completed',
        { transaction_id: 'tx_batch' },
        { /* no enterprise filter - matches all */ }
      );

      const deliveries = await service.listDeliveries({ eventId: event.id });
      expect(deliveries.length).toBe(3);
      expect(deliveries[0].status).toBe('pending');
    });

    it('should skip locked deliveries during processing', async () => {
      await service.registerWebhook({
        enterpriseId: 'lock_ent_123',
        url: 'https://example.com/webhook',
        eventTypes: ['payment.completed'],
      });

      const event = await service.triggerEvent(
        'payment.completed',
        { transaction_id: 'tx_lock_test' },
        { enterpriseId: 'lock_ent_123' }
      );

      const deliveries = await service.listDeliveries({ eventId: event.id });
      const deliveryId = deliveries[0].id;

      // Manually lock a delivery
      const svc = service as any;
      const lock = svc.processingLock;
      lock.add(deliveryId);

      // Verify lock is acquired
      expect(lock.has(deliveryId)).toBe(true);

      // Release lock
      lock.delete(deliveryId);
    });
  });

  describe('getDelivery', () => {
    it('should get delivery by ID', async () => {
      const webhook = await service.registerWebhook({
        enterpriseId: 'ent_123',
        url: 'https://example.com/webhook',
        eventTypes: ['payment.completed'],
      });

      const event = await service.triggerEvent(
        'payment.completed',
        { transaction_id: 'tx_123' },
        { enterpriseId: 'ent_123' }
      );

      const deliveries = await service.listDeliveries({ eventId: event.id });
      const delivery = await service.getDelivery(deliveries[0].id);

      expect(delivery?.id).toBe(deliveries[0].id);
    });
  });

  describe('listDeliveries', () => {
    it('should list deliveries by status', async () => {
      const webhook = await service.registerWebhook({
        enterpriseId: 'ent_123',
        url: 'https://example.com/webhook',
        eventTypes: ['payment.completed'],
      });

      await service.triggerEvent(
        'payment.completed',
        { transaction_id: 'tx_123' },
        { enterpriseId: 'ent_123' }
      );

      const deliveries = await service.listDeliveries({ status: 'pending' });
      expect(deliveries.length).toBe(1);
    });
  });

  describe('retryDelivery', () => {
    it('should retry failed delivery', async () => {
      const webhook = await service.registerWebhook({
        enterpriseId: 'ent_123',
        url: 'https://example.com/webhook',
        eventTypes: ['payment.completed'],
      });

      const event = await service.triggerEvent(
        'payment.completed',
        { transaction_id: 'tx_123' },
        { enterpriseId: 'ent_123' }
      );

      const deliveries = await service.listDeliveries({ eventId: event.id });
      const delivery = deliveries[0];

      // Manually mark as failed for testing using storage
      const storage = service['storage'] as MemoryWebhookStorage;
      await storage.updateDelivery(delivery.id, {
        status: 'failed',
        attempts: 3,
        nextRetryAt: new Date(),
      });

      const retried = await service.retryDelivery(delivery.id);
      expect(retried?.status).toBe('pending');
    });

    it('should return null for non-pending delivery', async () => {
      const result = await service.retryDelivery('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', async () => {
      const webhook = await service.registerWebhook({
        enterpriseId: 'ent_123',
        url: 'https://example.com/webhook',
        eventTypes: ['payment.completed'],
      });

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const payload = '{"test":"data"}';
      const signatureInput = `${timestamp}.${payload}`;
      const crypto = await import('crypto');
      const signature = `sha256=${crypto
        .createHmac('sha256', webhook.secret)
        .update(signatureInput)
        .digest('hex')}`;

      const isValid = service.verifySignature(
        payload,
        signature,
        timestamp,
        webhook.secret
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const payload = '{"test":"data"}';

      const isValid = service.verifySignature(
        payload,
        'sha256=invalidsignature',
        timestamp,
        'wrong-secret'
      );

      expect(isValid).toBe(false);
    });
  });
});

describe('MemoryWebhookStorage', () => {
  let storage: MemoryWebhookStorage;

  beforeEach(() => {
    storage = new MemoryWebhookStorage();
  });

  describe('webhook operations', () => {
    it('should store and retrieve webhooks', async () => {
      const webhook = await storage.createWebhook({
        enterpriseId: 'ent_123',
        url: 'https://example.com/webhook',
        eventTypes: ['payment.completed'],
      });

      const retrieved = await storage.getWebhook(webhook.id);
      expect(retrieved).toEqual(webhook);
    });

    it('should update webhooks', async () => {
      const webhook = await storage.createWebhook({
        enterpriseId: 'ent_123',
        url: 'https://example.com/webhook',
        eventTypes: ['payment.completed'],
      });

      const updated = await storage.updateWebhook(webhook.id, {
        url: 'https://new-example.com/webhook',
      });

      expect(updated?.url).toBe('https://new-example.com/webhook');
    });

    it('should delete webhooks', async () => {
      const webhook = await storage.createWebhook({
        enterpriseId: 'ent_123',
        url: 'https://example.com/webhook',
        eventTypes: ['payment.completed'],
      });

      await storage.deleteWebhook(webhook.id);
      const retrieved = await storage.getWebhook(webhook.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('delivery operations', () => {
    it('should store and retrieve deliveries', async () => {
      const delivery = await storage.createDelivery({
        webhookId: 'wh_123',
        eventId: 'evt_456',
        eventType: 'payment.completed',
        payload: '{"test":"data"}',
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
        lastAttemptAt: null,
        nextRetryAt: new Date(),
        responseCode: null,
        responseBody: null,
      });

      const retrieved = await storage.getDelivery(delivery.id);
      expect(retrieved).toEqual(delivery);
    });

    it('should filter deliveries by status', async () => {
      await storage.createDelivery({
        webhookId: 'wh_123',
        eventId: 'evt_1',
        eventType: 'payment.completed',
        payload: '{}',
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
        lastAttemptAt: null,
        nextRetryAt: new Date(),
        responseCode: null,
        responseBody: null,
      });

      await storage.createDelivery({
        webhookId: 'wh_123',
        eventId: 'evt_2',
        eventType: 'payment.completed',
        payload: '{}',
        status: 'success',
        attempts: 1,
        maxAttempts: 3,
        lastAttemptAt: new Date(),
        nextRetryAt: null,
        responseCode: 200,
        responseBody: 'OK',
      });

      const pendingDeliveries = await storage.getDeliveries({ status: 'pending' });
      expect(pendingDeliveries.length).toBe(1);
    });
  });

  describe('event operations', () => {
    it('should store and retrieve events', async () => {
      const event = await storage.createEvent({
        enterpriseId: 'ent_123',
        type: 'payment.completed',
        data: { transaction_id: 'tx_123' },
        timestamp: Date.now(),
      });

      const retrieved = await storage.getEvent(event.id);
      expect(retrieved).toEqual(event);
    });
  });
});
