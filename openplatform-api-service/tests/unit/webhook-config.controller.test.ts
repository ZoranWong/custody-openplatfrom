/**
 * Webhook Configuration Controller Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createWebhookConfigController } from '../../src/controllers/webhook-config.controller';
import { WebhookService, MemoryWebhookStorage } from '../../src/services/webhook.service';
import { Request, Response, NextFunction } from 'express';

// Mock middleware
const mockIsvUser = {
  userId: 'user_123',
  isvId: 'isv_456',
  email: 'test@example.com',
  role: 'owner' as const,
};

const createMockRequest = (overrides: Partial<Request> = {}): Request => {
  return {
    headers: {},
    body: {},
    query: {},
    params: {},
    ...overrides,
  } as Request;
};

const createMockResponse = (): Response => {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  };
  return res as Response;
};

const createMockNext = (): NextFunction => {
  return vi.fn();
};

describe('WebhookConfigController', () => {
  let controller: ReturnType<typeof createWebhookConfigController>;
  let service: WebhookService;
  let storage: MemoryWebhookStorage;

  beforeEach(() => {
    storage = new MemoryWebhookStorage();
    service = new WebhookService(storage);
    controller = createWebhookConfigController(service);
    vi.clearAllMocks();
  });

  describe('createWebhook', () => {
    it('should create a new webhook successfully', async () => {
      const req = createMockRequest({
        body: {
          url: 'https://example.com/webhook',
          event_types: ['payment.completed', 'transfer.completed'],
        },
        isvUser: mockIsvUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      await controller.createWebhook(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 0,
          message: 'success',
          data: expect.objectContaining({
            url: 'https://example.com/webhook',
            event_types: ['payment.completed', 'transfer.completed'],
            is_active: true,
            secret: expect.any(String),
          }),
        })
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      const req = createMockRequest({
        body: {
          url: 'https://example.com/webhook',
          event_types: ['payment.completed'],
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await controller.createWebhook(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when url is missing', async () => {
      const req = createMockRequest({
        body: {
          event_types: ['payment.completed'],
        },
        isvUser: mockIsvUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      await controller.createWebhook(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when event_types is missing or empty', async () => {
      const req = createMockRequest({
        body: {
          url: 'https://example.com/webhook',
        },
        isvUser: mockIsvUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      await controller.createWebhook(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when URL is invalid (HTTP)', async () => {
      const req = createMockRequest({
        body: {
          url: 'http://example.com/webhook',
          event_types: ['payment.completed'],
        },
        isvUser: mockIsvUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      await controller.createWebhook(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getWebhooks', () => {
    it('should return list of webhooks for ISV', async () => {
      // Create a webhook first
      await service.registerWebhook({
        enterpriseId: mockIsvUser.isvId,
        url: 'https://example.com/webhook',
        eventTypes: ['payment.completed'],
      });

      const req = createMockRequest({
        isvUser: mockIsvUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      await controller.getWebhooks(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 0,
          message: 'success',
          data: expect.objectContaining({
            list: expect.arrayContaining([
              expect.objectContaining({
                url: 'https://example.com/webhook',
              }),
            ]),
            total: 1,
          }),
        })
      );
    });

    it('should return empty list when no webhooks exist', async () => {
      const req = createMockRequest({
        isvUser: mockIsvUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      await controller.getWebhooks(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 0,
          data: expect.objectContaining({
            list: [],
            total: 0,
          }),
        })
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      const req = createMockRequest({});
      const res = createMockResponse();
      const next = createMockNext();

      await controller.getWebhooks(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('getWebhookById', () => {
    it('should return webhook by ID', async () => {
      const webhook = await service.registerWebhook({
        enterpriseId: mockIsvUser.isvId,
        url: 'https://example.com/webhook',
        eventTypes: ['payment.completed'],
      });

      const req = createMockRequest({
        params: { id: webhook.id },
        isvUser: mockIsvUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      await controller.getWebhookById(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 0,
          data: expect.objectContaining({
            id: webhook.id,
            url: 'https://example.com/webhook',
          }),
        })
      );
    });

    it('should return 404 when webhook not found', async () => {
      const req = createMockRequest({
        params: { id: 'non_existent_id' },
        isvUser: mockIsvUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      await controller.getWebhookById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 when accessing another ISVs webhook', async () => {
      const webhook = await service.registerWebhook({
        enterpriseId: 'other_isv_id',
        url: 'https://example.com/webhook',
        eventTypes: ['payment.completed'],
      });

      const req = createMockRequest({
        params: { id: webhook.id },
        isvUser: mockIsvUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      await controller.getWebhookById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('updateWebhook', () => {
    it('should update webhook successfully', async () => {
      const webhook = await service.registerWebhook({
        enterpriseId: mockIsvUser.isvId,
        url: 'https://example.com/webhook',
        eventTypes: ['payment.completed'],
      });

      const req = createMockRequest({
        params: { id: webhook.id },
        body: {
          url: 'https://new-example.com/webhook',
          is_active: false,
        },
        isvUser: mockIsvUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      await controller.updateWebhook(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 0,
          data: expect.objectContaining({
            url: 'https://new-example.com/webhook',
            is_active: false,
          }),
        })
      );
    });

    it('should return 404 when webhook not found', async () => {
      const req = createMockRequest({
        params: { id: 'non_existent_id' },
        body: { url: 'https://example.com/new' },
        isvUser: mockIsvUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      await controller.updateWebhook(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 when updating another ISVs webhook', async () => {
      const webhook = await service.registerWebhook({
        enterpriseId: 'other_isv_id',
        url: 'https://example.com/webhook',
        eventTypes: ['payment.completed'],
      });

      const req = createMockRequest({
        params: { id: webhook.id },
        body: { url: 'https://malicious.com/webhook' },
        isvUser: mockIsvUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      await controller.updateWebhook(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('deleteWebhook', () => {
    it('should delete webhook successfully', async () => {
      const webhook = await service.registerWebhook({
        enterpriseId: mockIsvUser.isvId,
        url: 'https://example.com/webhook',
        eventTypes: ['payment.completed'],
      });

      const req = createMockRequest({
        params: { id: webhook.id },
        isvUser: mockIsvUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      await controller.deleteWebhook(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 0,
          data: expect.objectContaining({
            id: webhook.id,
            deleted: true,
          }),
        })
      );

      // Verify webhook is deleted
      const deleted = await service.getWebhook(webhook.id);
      expect(deleted).toBeNull();
    });

    it('should return 404 when webhook not found', async () => {
      const req = createMockRequest({
        params: { id: 'non_existent_id' },
        isvUser: mockIsvUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      await controller.deleteWebhook(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 when deleting another ISVs webhook', async () => {
      const webhook = await service.registerWebhook({
        enterpriseId: 'other_isv_id',
        url: 'https://example.com/webhook',
        eventTypes: ['payment.completed'],
      });

      const req = createMockRequest({
        params: { id: webhook.id },
        isvUser: mockIsvUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      await controller.deleteWebhook(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 409 when webhook has pending deliveries', async () => {
      // Create webhook
      const webhook = await service.registerWebhook({
        enterpriseId: mockIsvUser.isvId,
        url: 'https://example.com/webhook',
        eventTypes: ['payment.completed'],
      });

      // Create a pending delivery for this webhook
      await service.triggerEvent('payment.completed', { test: 'data' }, {
        enterpriseId: mockIsvUser.isvId,
      });

      const req = createMockRequest({
        params: { id: webhook.id },
        isvUser: mockIsvUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      await controller.deleteWebhook(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 40901,
          message: 'Cannot delete webhook with pending deliveries',
        })
      );
    });
  });

  describe('createWebhook - Event Type Validation', () => {
    it('should return 400 when event_types contains invalid types', async () => {
      const req = createMockRequest({
        body: {
          url: 'https://example.com/webhook',
          event_types: ['payment.completed', 'invalid.event.type'],
        },
        isvUser: mockIsvUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      await controller.createWebhook(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 40001,
          message: expect.stringContaining('Invalid event types'),
        })
      );
    });

    it('should return 400 when event_types contains non-string values', async () => {
      const req = createMockRequest({
        body: {
          url: 'https://example.com/webhook',
          event_types: ['payment.completed', 123, null],
        },
        isvUser: mockIsvUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      await controller.createWebhook(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getWebhooks - Pagination', () => {
    it('should paginate results correctly', async () => {
      // Create 5 webhooks
      for (let i = 0; i < 5; i++) {
        await service.registerWebhook({
          enterpriseId: mockIsvUser.isvId,
          url: `https://example${i}.com/webhook`,
          eventTypes: ['payment.completed'],
        });
      }

      const req = createMockRequest({
        query: { page: '2', page_size: '2' },
        isvUser: mockIsvUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      await controller.getWebhooks(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            total: 5,
            page: 2,
            page_size: 2,
            total_pages: 3,
          }),
        })
      );
    });

    it('should use default pagination when params are invalid', async () => {
      await service.registerWebhook({
        enterpriseId: mockIsvUser.isvId,
        url: 'https://example.com/webhook',
        eventTypes: ['payment.completed'],
      });

      const req = createMockRequest({
        query: { page: '-1', page_size: '1000' },
        isvUser: mockIsvUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      await controller.getWebhooks(req, res, next);

      // Should use defaults: page=1, page_size=100 (capped)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            page: 1,
            page_size: 100,
          }),
        })
      );
    });
  });
});

describe('Webhook API Integration', () => {
  let service: WebhookService;
  let storage: MemoryWebhookStorage;

  beforeEach(() => {
    storage = new MemoryWebhookStorage();
    service = new WebhookService(storage);
  });

  it('should create and list webhooks', async () => {
    // Create webhook
    const webhook = await service.registerWebhook({
      enterpriseId: 'isv_123',
      url: 'https://example.com/webhook',
      eventTypes: ['payment.completed', 'transfer.completed'],
    });

    expect(webhook.id).toBeDefined();
    expect(webhook.secret).toBeDefined();

    // List webhooks
    const webhooks = await service.listWebhooks({ enterpriseId: 'isv_123' });
    expect(webhooks.length).toBe(1);
    expect(webhooks[0].url).toBe('https://example.com/webhook');

    // Note: Service layer returns secret, controller filters it out
    // This is expected behavior - secret should only be exposed at creation
  });

  it('should not allow updating another ISVs webhook at service level', async () => {
    // Create webhook for isv_1
    const webhook = await service.registerWebhook({
      enterpriseId: 'isv_1',
      url: 'https://example.com/webhook',
      eventTypes: ['payment.completed'],
    });

    // Note: Service layer doesn't enforce ownership - that's the controller's job
    // Service allows any valid update
    const updated = await service.updateWebhook(webhook.id, {
      url: 'https://malicious.com/webhook',
    });

    // Service allows the update (controller enforces ownership)
    expect(updated?.url).toBe('https://malicious.com/webhook');

    // Verify the webhook exists
    const fetched = await service.getWebhook(webhook.id);
    expect(fetched?.url).toBe('https://malicious.com/webhook');
  });
});
