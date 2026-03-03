import { Request, Response } from 'express';
import { createSignatureMiddleware, verifyRequestSignature } from '../../src/middleware/signature.middleware';
import { InMemoryNonceCache, SignatureErrorCode } from '../../src/utils/signature.util';

describe('Signature Middleware', () => {
  describe('createSignatureMiddleware', () => {
    let mockGetAppSecret: ReturnType<typeof vi.fn>;
    let nonceCache: InMemoryNonceCache;
    let middleware: ReturnType<typeof createSignatureMiddleware>;
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockGetAppSecret = vi.fn();
      nonceCache = new InMemoryNonceCache();
      middleware = createSignatureMiddleware(mockGetAppSecret, nonceCache);
      mockNext = vi.fn();
      mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis(),
      };
    });

    describe('excluded paths', () => {
      it('should skip verification for /health endpoint', async () => {
        mockReq = {
          path: '/health',
          headers: {},
        };

        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('should skip verification for /ready endpoint', async () => {
        mockReq = {
          path: '/ready',
          headers: {},
        };

        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should skip verification for /metrics endpoint', async () => {
        mockReq = {
          path: '/metrics',
          headers: {},
        };

        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('missing headers', () => {
      it('should reject request with missing all signature headers', async () => {
        mockReq = {
          path: '/api/test',
          headers: {},
        };

        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            code: SignatureErrorCode.MISSING_HEADERS,
          })
        );
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject request with missing some headers', async () => {
        mockReq = {
          path: '/api/test',
          headers: {
            'x-appid': 'app123',
            // Missing nonce, timestamp, sign
          },
        };

        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            code: SignatureErrorCode.MISSING_HEADERS,
          })
        );
      });
    });

    describe('expired timestamp', () => {
      it('should reject expired timestamp', async () => {
        const expiredTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago

        mockReq = {
          path: '/api/test',
          method: 'POST',
          headers: {
            'x-appid': 'app123',
            'x-nonce': 'unique_nonce',
            'x-timestamp': expiredTimestamp.toString(),
            'x-sign': 'some_sign',
          },
          body: {},
        };

        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            code: SignatureErrorCode.EXPIRED_TIMESTAMP,
          })
        );
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('duplicate nonce', () => {
      it('should reject duplicate nonce', async () => {
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const nonce = 'unique_nonce_' + Date.now();
        const secretKey = 'secret_key';

        // Pre-compute valid signature
        const cryptoModule = await import('crypto');
        const bodyStr = '{}';
        const signString = `app123\n${nonce}\n${currentTimestamp}\nPOST\n/api/test\n${bodyStr}`;
        const hmac = cryptoModule.createHmac('sha256', secretKey);
        hmac.update(signString, 'utf8');
        const validSignature = hmac.digest('hex');

        mockGetAppSecret.mockResolvedValue(secretKey);

        // First request
        mockReq = {
          path: '/api/test',
          originalUrl: '/api/test',
          method: 'POST',
          headers: {
            'x-appid': 'app123',
            'x-nonce': nonce,
            'x-timestamp': currentTimestamp.toString(),
            'x-sign': validSignature,
          },
          body: {},
          rawBody: bodyStr,
        };

        await middleware(mockReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();

        // Reset mock
        mockNext.mockClear();

        // Second request with same nonce (should be rejected for duplicate)
        mockReq = {
          path: '/api/test',
          originalUrl: '/api/test',
          method: 'POST',
          headers: {
            'x-appid': 'app123',
            'x-nonce': nonce,
            'x-timestamp': currentTimestamp.toString(),
            'x-sign': validSignature,
          },
          body: {},
          rawBody: bodyStr,
        };

        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            code: SignatureErrorCode.DUPLICATE_NONCE,
          })
        );
      });
    });

    describe('invalid appid', () => {
      it('should reject request with unknown appid', async () => {
        const currentTimestamp = Math.floor(Date.now() / 1000);

        mockGetAppSecret.mockResolvedValue(null); // App not found

        mockReq = {
          path: '/api/test',
          method: 'POST',
          headers: {
            'x-appid': 'unknown_app',
            'x-nonce': 'unique_nonce_' + Date.now(),
            'x-timestamp': currentTimestamp.toString(),
            'x-sign': 'some_sign',
          },
          body: {},
        };

        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            code: SignatureErrorCode.INVALID_SIGNATURE,
          })
        );
      });
    });

    describe('invalid signature', () => {
      it('should reject request with invalid signature', async () => {
        const currentTimestamp = Math.floor(Date.now() / 1000);

        mockGetAppSecret.mockResolvedValue('correct_secret');

        mockReq = {
          path: '/api/test',
          method: 'POST',
          headers: {
            'x-appid': 'app123',
            'x-nonce': 'unique_nonce_' + Date.now(),
            'x-timestamp': currentTimestamp.toString(),
            'x-sign': 'invalid_signature_that_will_not_match',
          },
          body: {},
        };

        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            code: SignatureErrorCode.INVALID_SIGNATURE,
          })
        );
      });
    });

    describe('valid request', () => {
      it('should accept request with valid signature', async () => {
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const nonce = 'valid_nonce_' + Date.now();
        const secretKey = 'app_secret_key';

        // Pre-compute the valid signature
        const crypto = await import('crypto');
        const bodyStr = '{}';
        const signString = `app123\n${nonce}\n${currentTimestamp}\nPOST\n/api/test\n${bodyStr}`;
        const hmac = crypto.createHmac('sha256', secretKey);
        hmac.update(signString, 'utf8');
        const validSignature = hmac.digest('hex');

        mockGetAppSecret.mockResolvedValue(secretKey);

        mockReq = {
          path: '/api/test',
          originalUrl: '/api/test',
          method: 'POST',
          headers: {
            'x-appid': 'app123',
            'x-nonce': nonce,
            'x-timestamp': currentTimestamp.toString(),
            'x-sign': validSignature,
          },
          body: {},
          rawBody: bodyStr,
        };

        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });
    });
  });

  describe('verifyRequestSignature', () => {
    let mockGetAppSecret: ReturnType<typeof vi.fn>;
    let nonceCache: InMemoryNonceCache;

    beforeEach(() => {
      mockGetAppSecret = vi.fn();
      nonceCache = new InMemoryNonceCache();
    });

    it('should return valid for correct signature', async () => {
      const secretKey = 'app_secret';
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const nonce = 'nonce_' + Date.now();

      const crypto = await import('crypto');
      const bodyStr = '{"test":true}';
      const signString = `app123\n${nonce}\n${currentTimestamp}\nPOST\n/api/test\n${bodyStr}`;
      const hmac = crypto.createHmac('sha256', secretKey);
      hmac.update(signString, 'utf8');
      const signature = hmac.digest('hex');

      mockGetAppSecret.mockResolvedValue(secretKey);

      const result = await verifyRequestSignature(
        'app123',
        nonce,
        currentTimestamp,
        'POST',
        '/api/test',
        bodyStr,
        signature,
        mockGetAppSecret,
        nonceCache
      );

      expect(result.valid).toBe(true);
      expect(result.errorCode).toBeUndefined();
    });

    it('should reject expired timestamp', async () => {
      const expiredTimestamp = Math.floor(Date.now() / 1000) - 400;

      const result = await verifyRequestSignature(
        'app123',
        'nonce123',
        expiredTimestamp,
        'GET',
        '/api/test',
        '',
        'somesign',
        mockGetAppSecret,
        nonceCache
      );

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(SignatureErrorCode.EXPIRED_TIMESTAMP);
    });

    it('should reject duplicate nonce', async () => {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const nonce = 'dup_nonce_' + Date.now();

      // Record nonce first
      await nonceCache.record('app123', nonce, 300);

      const result = await verifyRequestSignature(
        'app123',
        nonce,
        currentTimestamp,
        'GET',
        '/api/test',
        '',
        'somesign',
        mockGetAppSecret,
        nonceCache
      );

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(SignatureErrorCode.DUPLICATE_NONCE);
    });

    it('should reject unknown appid', async () => {
      const currentTimestamp = Math.floor(Date.now() / 1000);

      mockGetAppSecret.mockResolvedValue(null);

      const result = await verifyRequestSignature(
        'unknown_app',
        'nonce123',
        currentTimestamp,
        'GET',
        '/api/test',
        '',
        'somesign',
        mockGetAppSecret,
        nonceCache
      );

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(SignatureErrorCode.INVALID_SIGNATURE);
    });
  });
});
