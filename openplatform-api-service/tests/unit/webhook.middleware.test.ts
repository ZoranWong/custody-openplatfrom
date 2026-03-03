/**
 * Webhook Middleware Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../src/types/jwt.types';
import {
  createWebhookMiddleware,
  configureWebhooks,
  getWebhookService,
  triggerWebhookEvent,
} from '../../src/middleware/webhook.middleware';
import { WebhookService, MemoryWebhookStorage } from '../../src/services/webhook.service';

describe('WebhookMiddleware', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let webhookService: WebhookService;
  let storage: MemoryWebhookStorage;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      headers: {},
      path: '/api/v1/payments',
      method: 'POST',
      appid: 'app_123',
      enterprise_id: 'ent_456',
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      getHeader: vi.fn().mockReturnValue('test-trace-id'),
      send: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();

    storage = new MemoryWebhookStorage();
    webhookService = new WebhookService(storage);
  });

  describe('createWebhookMiddleware', () => {
    it('should attach webhook service to request', async () => {
      const middleware = createWebhookMiddleware({
        service: webhookService,
      });

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      const service = getWebhookService(mockReq as Request);
      expect(service).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip when disabled', async () => {
      const middleware = createWebhookMiddleware({
        service: webhookService,
        enabled: false,
      });

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip health endpoints', async () => {
      const middleware = createWebhookMiddleware({
        service: webhookService,
      });

      mockReq.path = '/health';
      mockReq.method = 'GET';

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('configureWebhooks', () => {
    it('should create middleware with custom mapping', async () => {
      const middleware = configureWebhooks({
        'POST /api/v1/custom': 'payment.completed',
      });

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('triggerWebhookEvent', () => {
    it('should trigger webhook event', async () => {
      // Register webhook
      await webhookService.registerWebhook({
        enterpriseId: 'ent_456',
        url: 'https://example.com/webhook',
        eventTypes: ['payment.completed'],
      });

      const middleware = createWebhookMiddleware({
        service: webhookService,
      });

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Manually trigger event
      await triggerWebhookEvent(
        mockReq as Request,
        'payment.completed',
        {
          transaction_id: 'tx_123',
          amount: 100,
        }
      );

      // Check that event was triggered
      const events = await webhookService.listDeliveries({});
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('webhook service access', () => {
    it('should make webhook service available on request', async () => {
      const middleware = createWebhookMiddleware({
        service: webhookService,
      });

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      const service = getWebhookService(mockReq as Request);
      expect(service).toBe(webhookService);
    });

    it('should return null if service not available', () => {
      const req = {} as Request;
      const service = getWebhookService(req);
      expect(service).toBeNull();
    });
  });
});

describe('Webhook Middleware Integration', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let webhookService: WebhookService;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      headers: {
        'x-correlation-id': 'corr_123',
        'content-type': 'application/json',
      },
      path: '/api/v1/payments',
      method: 'POST',
      appid: 'app_123',
      enterprise_id: 'ent_456',
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      getHeader: vi.fn().mockReturnValue('test-trace-id'),
      send: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();

    const storage = new MemoryWebhookStorage();
    webhookService = new WebhookService(storage);
  });

  it('should register webhook and list it', async () => {
    // Register webhook
    const webhook = await webhookService.registerWebhook({
      enterpriseId: 'ent_456',
      url: 'https://example.com/webhook',
      eventTypes: ['payment.created'],
    });

    expect(webhook.id).toBeDefined();
    expect(webhook.eventTypes).toContain('payment.created');
  });

  it('should list webhooks by enterprise', async () => {
    await webhookService.registerWebhook({
      enterpriseId: 'ent_456',
      url: 'https://example.com/webhook1',
      eventTypes: ['payment.created'],
    });

    await webhookService.registerWebhook({
      enterpriseId: 'ent_456',
      url: 'https://example.com/webhook2',
      eventTypes: ['transfer.created'],
    });

    const webhooks = await webhookService.listWebhooks({ enterpriseId: 'ent_456' });
    expect(webhooks.length).toBe(2);
  });

  it('should trigger event and create delivery', async () => {
    // Register webhook
    await webhookService.registerWebhook({
      enterpriseId: 'ent_456',
      url: 'https://example.com/webhook',
      eventTypes: ['payment.created'],
    });

    // Trigger event
    const event = await webhookService.triggerEvent(
      'payment.created',
      {
        transaction_id: 'tx_test_123',
        amount: 100.5,
        currency: 'BTC',
      },
      { enterpriseId: 'ent_456' }
    );

    expect(event.id).toBeDefined();
    expect(event.type).toBe('payment.created');

    // Verify delivery was created
    const deliveries = await webhookService.listDeliveries({});
    expect(deliveries.length).toBe(1);
    expect(deliveries[0].eventType).toBe('payment.created');
  });

  it('should not create delivery for unregistered event type', async () => {
    await webhookService.registerWebhook({
      enterpriseId: 'ent_456',
      url: 'https://example.com/webhook',
      eventTypes: ['payment.created'],
    });

    // Trigger different event type
    const event = await webhookService.triggerEvent(
      'transfer.created',
      { transfer_id: 'tx_test' },
      { enterpriseId: 'ent_456' }
    );

    const deliveries = await webhookService.listDeliveries({});
    expect(deliveries.length).toBe(0);
  });

  it('should include correlation ID in event metadata', async () => {
    await webhookService.registerWebhook({
      enterpriseId: 'ent_456',
      url: 'https://example.com/webhook',
      eventTypes: ['payment.created'],
    });

    const event = await webhookService.triggerEvent(
      'payment.created',
      { transaction_id: 'tx_corr_test' },
      {
        enterpriseId: 'ent_456',
        correlationId: 'corr_123',
      }
    );

    expect(event.metadata?.correlationId).toBe('corr_123');
  });

  it('should update webhook configuration', async () => {
    const webhook = await webhookService.registerWebhook({
      enterpriseId: 'ent_456',
      url: 'https://example.com/webhook',
      eventTypes: ['payment.created'],
    });

    // Update webhook
    const updated = await webhookService.updateWebhook(webhook.id, {
      url: 'https://new-example.com/webhook',
      isActive: false,
    });

    expect(updated?.url).toBe('https://new-example.com/webhook');
    expect(updated?.isActive).toBe(false);
  });

  it('should delete webhook', async () => {
    const webhook = await webhookService.registerWebhook({
      enterpriseId: 'ent_456',
      url: 'https://example.com/webhook',
      eventTypes: ['payment.created'],
    });

    const deleted = await webhookService.deleteWebhook(webhook.id);
    expect(deleted).toBe(true);

    const fetched = await webhookService.getWebhook(webhook.id);
    expect(fetched).toBeNull();
  });

  it('should list deliveries by status', async () => {
    await webhookService.registerWebhook({
      enterpriseId: 'ent_456',
      url: 'https://example.com/webhook',
      eventTypes: ['payment.created'],
    });

    await webhookService.triggerEvent(
      'payment.created',
      { transaction_id: 'tx_test' },
      { enterpriseId: 'ent_456' }
    );

    const pendingDeliveries = await webhookService.listDeliveries({
      status: 'pending',
    });
    expect(pendingDeliveries.length).toBe(1);
  });

  it('should get single delivery by ID', async () => {
    await webhookService.registerWebhook({
      enterpriseId: 'ent_456',
      url: 'https://example.com/webhook',
      eventTypes: ['payment.created'],
    });

    await webhookService.triggerEvent(
      'payment.created',
      { transaction_id: 'tx_test' },
      { enterpriseId: 'ent_456' }
    );

    const deliveries = await webhookService.listDeliveries({});
    const delivery = await webhookService.getDelivery(deliveries[0].id);

    expect(delivery?.id).toBe(deliveries[0].id);
    expect(delivery?.eventType).toBe('payment.created');
  });
});
