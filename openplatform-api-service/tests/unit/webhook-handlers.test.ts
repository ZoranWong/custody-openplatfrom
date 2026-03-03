/**
 * Webhook Handlers Tests
 */

import { describe, it, expect, vi } from 'vitest';
import {
  handlePaymentCreated,
  handlePaymentCompleted,
  handlePaymentFailed,
  getPaymentHandler,
  registerPaymentHandlers,
} from '../../src/services/webhook-handlers/payment.handler';
import {
  handleTransferCreated,
  handleTransferCompleted,
  handleTransferFailed,
} from '../../src/services/webhook-handlers/transfer.handler';
import {
  handlePoolingCompleted,
  handlePoolingFailed,
} from '../../src/services/webhook-handlers/pooling.handler';
import {
  handleTaskCreated,
  handleTaskSigned,
  handleTaskRejected,
} from '../../src/services/webhook-handlers/task.handler';
import { handleAccountLowBalance } from '../../src/services/webhook-handlers/account.handler';
import { WebhookEvent, WebhookEventType } from '../../src/types/webhook.types';

describe('Webhook Handlers', () => {
  const createMockEvent = (type: WebhookEventType, data: Record<string, unknown> = {}): WebhookEvent => ({
    id: `evt_${Date.now()}`,
    enterpriseId: 'ent_123',
    type,
    data: { paymentId: 'pay_123', amount: 100, currency: 'USD', ...data },
    timestamp: Date.now(),
    metadata: { source: 'test' },
  });

  const createMockPayload = (type: WebhookEventType) => ({
    id: `evt_${Date.now()}`,
    type,
    timestamp: Date.now(),
    data: { paymentId: 'pay_123', amount: 100, currency: 'USD' },
  });

  describe('Payment Handlers', () => {
    it('should handle payment.created event', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const event = createMockEvent('payment.created');
      const payload = createMockPayload('payment.created');

      await handlePaymentCreated(event, payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('payment.created')
      );

      consoleSpy.mockRestore();
    });

    it('should handle payment.completed event', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const event = createMockEvent('payment.completed');
      const payload = createMockPayload('payment.completed');

      await handlePaymentCompleted(event, payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('payment.completed')
      );

      consoleSpy.mockRestore();
    });

    it('should handle payment.failed event', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const event = createMockEvent('payment.failed');
      const payload = createMockPayload('payment.failed');

      await handlePaymentFailed(event, payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('payment.failed')
      );

      consoleSpy.mockRestore();
    });

    it('should return correct handler for event type', () => {
      expect(getPaymentHandler('payment.created')).toBe(handlePaymentCreated);
      expect(getPaymentHandler('payment.completed')).toBe(handlePaymentCompleted);
      expect(getPaymentHandler('payment.failed')).toBe(handlePaymentFailed);
      expect(getPaymentHandler('unknown.event')).toBe(null);
    });

    it('should register all payment handlers', () => {
      const registerFn = vi.fn();
      registerPaymentHandlers(registerFn);

      expect(registerFn).toHaveBeenCalledTimes(3);
      expect(registerFn).toHaveBeenCalledWith('payment.created', handlePaymentCreated);
      expect(registerFn).toHaveBeenCalledWith('payment.completed', handlePaymentCompleted);
      expect(registerFn).toHaveBeenCalledWith('payment.failed', handlePaymentFailed);
    });
  });

  describe('Transfer Handlers', () => {
    it('should handle transfer.created event', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const event = createMockEvent('transfer.created');
      const payload = createMockPayload('transfer.created');

      await handleTransferCreated(event, payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('transfer.created')
      );

      consoleSpy.mockRestore();
    });

    it('should handle transfer.completed event', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const event = createMockEvent('transfer.completed');
      const payload = createMockPayload('transfer.completed');

      await handleTransferCompleted(event, payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('transfer.completed')
      );

      consoleSpy.mockRestore();
    });

    it('should handle transfer.failed event', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const event = createMockEvent('transfer.failed');
      const payload = createMockPayload('transfer.failed');

      await handleTransferFailed(event, payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('transfer.failed')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Pooling Handlers', () => {
    it('should handle pooling.completed event', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const event = createMockEvent('pooling.completed');
      const payload = createMockPayload('pooling.completed');

      await handlePoolingCompleted(event, payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('pooling.completed')
      );

      consoleSpy.mockRestore();
    });

    it('should handle pooling.failed event', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const event = createMockEvent('pooling.failed');
      const payload = createMockPayload('pooling.failed');

      await handlePoolingFailed(event, payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('pooling.failed')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Task Handlers', () => {
    it('should handle task.created event', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const event = createMockEvent('task.created');
      const payload = createMockPayload('task.created');

      await handleTaskCreated(event, payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('task.created')
      );

      consoleSpy.mockRestore();
    });

    it('should handle task.signed event', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const event = createMockEvent('task.signed');
      const payload = createMockPayload('task.signed');

      await handleTaskSigned(event, payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('task.signed')
      );

      consoleSpy.mockRestore();
    });

    it('should handle task.rejected event', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const event = createMockEvent('task.rejected');
      const payload = createMockPayload('task.rejected');

      await handleTaskRejected(event, payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('task.rejected')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Account Handlers', () => {
    it('should handle account.low_balance event', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const event = createMockEvent('account.low_balance', { balance: 100, threshold: 1000, accountId: 'acc_123' });
      const payload = createMockPayload('account.low_balance');

      await handleAccountLowBalance(event, payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('account.low_balance')
      );

      consoleSpy.mockRestore();
    });

    it('should log critical warning for balance below threshold', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const event = createMockEvent('account.low_balance', { balance: 50, threshold: 1000, accountId: 'acc_123' });
      const payload = createMockPayload('account.low_balance');

      await handleAccountLowBalance(event, payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL')
      );

      consoleSpy.mockRestore();
    });
  });
});
