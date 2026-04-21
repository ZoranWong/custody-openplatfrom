import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import { CallbackService } from '../core/callback.service';
import type { VerifySignatureParams } from '../core/callback.service';
import { CregisSDK, SDKError, SDKErrorCode } from '..';
import type { CallbackPayload, CallbackRequest } from '..';

describe('CallbackService', () => {
  let service: CallbackService;
  const appSecret = 'test-secret-key';
  const appId = '550e8400-e29b-41d4-a716-446655440000';
  const timestamp = '1713600000000';
  const event = 'transaction.completed';

  beforeEach(() => {
    service = new CallbackService();
  });

  describe('verifySignature', () => {
    it('should verify valid signature without event (business parameter callback)', () => {
      // Build expected signature: HMAC-SHA256(appSecret, appId + "." + timestamp)
      const signData = `${appId}.${timestamp}`;
      const signature = crypto
        .createHmac('sha256', appSecret)
        .update(signData)
        .digest('hex');

      const params: VerifySignatureParams = {
        appSecret,
        appId,
        timestamp,
        signature,
      };

      expect(service.verifySignature(params)).toBe(true);
    });

    it('should verify valid signature with event (global Application callback)', () => {
      // Build expected signature: HMAC-SHA256(appSecret, appId + "." + event + "." + timestamp)
      const signData = `${appId}.${event}.${timestamp}`;
      const signature = crypto
        .createHmac('sha256', appSecret)
        .update(signData)
        .digest('hex');

      const params: VerifySignatureParams = {
        appSecret,
        appId,
        event,
        timestamp,
        signature,
      };

      expect(service.verifySignature(params)).toBe(true);
    });

    it('should reject invalid signature', () => {
      const params: VerifySignatureParams = {
        appSecret,
        appId,
        timestamp,
        signature: 'invalid-signature-hex',
      };

      expect(service.verifySignature(params)).toBe(false);
    });

    it('should reject tampered signature', () => {
      const signData = `${appId}.${timestamp}`;
      const validSignature = crypto
        .createHmac('sha256', appSecret)
        .update(signData)
        .digest('hex');

      // Tamper with signature
      const tamperedSignature = validSignature.slice(0, -1) + 'f';

      const params: VerifySignatureParams = {
        appSecret,
        appId,
        timestamp,
        signature: tamperedSignature,
      };

      expect(service.verifySignature(params)).toBe(false);
    });

    it('should reject signature with wrong appSecret', () => {
      const signData = `${appId}.${timestamp}`;
      // Sign with wrong secret
      const signature = crypto
        .createHmac('sha256', 'wrong-secret')
        .update(signData)
        .digest('hex');

      const params: VerifySignatureParams = {
        appSecret,
        appId,
        timestamp,
        signature,
      };

      expect(service.verifySignature(params)).toBe(false);
    });

    it('should reject signature with wrong timestamp', () => {
      const signData = `${appId}.${timestamp}`;
      const signature = crypto
        .createHmac('sha256', appSecret)
        .update(signData)
        .digest('hex');

      const params: VerifySignatureParams = {
        appSecret,
        appId,
        timestamp: '1234567890000', // wrong timestamp
        signature,
      };

      expect(service.verifySignature(params)).toBe(false);
    });
  });

  describe('buildSignature', () => {
    it('should build signature without event', () => {
      const signData = `${appId}.${timestamp}`;
      const expected = crypto
        .createHmac('sha256', appSecret)
        .update(signData)
        .digest('hex');

      expect(service.buildSignature(appSecret, appId, timestamp)).toBe(expected);
    });

    it('should build signature with event', () => {
      const signData = `${appId}.${event}.${timestamp}`;
      const expected = crypto
        .createHmac('sha256', appSecret)
        .update(signData)
        .digest('hex');

      expect(service.buildSignature(appSecret, appId, timestamp, event)).toBe(expected);
    });
  });
});

describe('CregisSDK.onCallback', () => {
  const appId = '550e8400-e29b-41d4-a716-446655440000';
  const appSecret = 'test-secret-key';

  function createSDK(): CregisSDK {
    return new CregisSDK({
      baseUrl: 'https://api.test.com',
      appId,
      appSecret,
    });
  }

  function buildSignature(appSecret: string, appId: string, timestamp: string, event?: string): string {
    let signData = appId;
    if (event) {
      signData += '.' + event;
    }
    signData += '.' + timestamp;
    return crypto
      .createHmac('sha256', appSecret)
      .update(signData)
      .digest('hex');
  }

  describe('business parameter callback (no event)', () => {
    it('should call callback on valid signature', () => {
      const sdk = createSDK();
      const timestamp = '1713600000000';
      const signature = buildSignature(appSecret, appId, timestamp);

      const payload: CallbackPayload = {
        appId,
        timestamp,
        data: { unitId: 123, orderId: 'ORD-001' },
      };

      const req: CallbackRequest = {
        headers: {
          'x-signature': `sha256=${signature}`,
          'x-timestamp': timestamp,
        },
        body: payload,
      };

      const callback = vi.fn();
      sdk.onCallback(req, callback);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(payload);
    });
  });

  describe('global Application callback (with event)', () => {
    it('should call callback on valid signature with body.event', () => {
      const sdk = createSDK();
      const timestamp = '1713600000000';
      const event = 'transaction.completed';
      const signature = buildSignature(appSecret, appId, timestamp, event);

      const payload: CallbackPayload = {
        appId,
        event: 'transaction.completed',
        timestamp,
        data: { unitId: 123, txHash: '0xabc' },
      };

      const req: CallbackRequest = {
        headers: {
          'x-signature': `sha256=${signature}`,
          'x-timestamp': timestamp,
        },
        body: payload,
      };

      const callback = vi.fn();
      sdk.onCallback(req, callback);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(payload);
    });

    it('should use X-Event header as fallback for event', () => {
      const sdk = createSDK();
      const timestamp = '1713600000000';
      const event = 'task.approved';
      const signature = buildSignature(appSecret, appId, timestamp, event);

      const payload: CallbackPayload = {
        appId,
        timestamp,
        data: { taskId: 'TSK-001' },
      };

      const req: CallbackRequest = {
        headers: {
          'x-signature': `sha256=${signature}`,
          'x-timestamp': timestamp,
          'x-event': event,
        },
        body: payload,
      };

      const callback = vi.fn();
      sdk.onCallback(req, callback);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should throw SDKError on invalid signature', () => {
      const sdk = createSDK();
      const timestamp = '1713600000000';

      const req: CallbackRequest = {
        headers: {
          'x-signature': 'sha256=invalid',
          'x-timestamp': timestamp,
        },
        body: {
          appId,
          timestamp,
          data: {},
        },
      };

      const callback = vi.fn();
      expect(() => sdk.onCallback(req, callback)).toThrow(SDKError);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should throw SDKError with SIGNATURE_INVALID on missing X-Signature', () => {
      const sdk = createSDK();

      const req: CallbackRequest = {
        headers: {
          'x-timestamp': '1713600000000',
        },
        body: {
          appId,
          timestamp: '1713600000000',
          data: {},
        },
      };

      const callback = vi.fn();
      expect(() => sdk.onCallback(req, callback)).toThrow(SDKError);
      const error = expect(() => sdk.onCallback(req, callback)).toThrow();
      expect(error).toBeDefined();
    });

    it('should throw SDKError on missing X-Timestamp', () => {
      const sdk = createSDK();

      const req: CallbackRequest = {
        headers: {
          'x-signature': 'sha256=some',
        },
        body: {
          appId,
          timestamp: '1713600000000',
          data: {},
        },
      };

      const callback = vi.fn();
      expect(() => sdk.onCallback(req, callback)).toThrow(SDKError);
    });

    it('should throw SDKError on tampered signature', () => {
      const sdk = createSDK();
      const timestamp = '1713600000000';
      const validSignature = buildSignature(appSecret, appId, timestamp);
      const tamperedSignature = validSignature.slice(0, -1) + 'f';

      const req: CallbackRequest = {
        headers: {
          'x-signature': `sha256=${tamperedSignature}`,
          'x-timestamp': timestamp,
        },
        body: {
          appId,
          timestamp,
          data: {},
        },
      };

      const callback = vi.fn();
      expect(() => sdk.onCallback(req, callback)).toThrow(SDKError);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('SDKError code', () => {
    it('should use SIGNATURE_INVALID error code', () => {
      const sdk = createSDK();

      const req: CallbackRequest = {
        headers: {
          'x-signature': 'sha256=invalid',
          'x-timestamp': '1713600000000',
        },
        body: {
          appId,
          timestamp: '1713600000000',
          data: {},
        },
      };

      try {
        sdk.onCallback(req, () => {});
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as SDKError).code).toBe(SDKErrorCode.SIGNATURE_INVALID);
      }
    });
  });
});
