import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  createJWTAuthMiddleware,
  jwtAuthMiddleware,
  requireAuth,
  optionalAuth,
  getAppId,
  getEnterpriseId,
  getPermissions,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  JWTErrorCode,
} from '../../src/middleware/jwt-auth.middleware';
import {
  signAccessToken,
  signRefreshToken,
  generateKeyPair,
} from '../../src/utils/jwt.util';
import { TokenBlacklist } from '../../src/types/jwt.types';

describe('JWT Auth Middleware', () => {
  describe('createJWTAuthMiddleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let mockBlacklist: TokenBlacklist;

    beforeEach(() => {
      mockNext = vi.fn();
      mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        getHeader: vi.fn().mockReturnValue('test-trace-id'),
        setHeader: vi.fn(),
      };
      mockBlacklist = {
        blacklist: vi.fn().mockResolvedValue(undefined),
        isBlacklisted: vi.fn().mockResolvedValue(false),
        remove: vi.fn().mockResolvedValue(undefined),
      };
    });

    describe('authentication flow', () => {
      it('should accept valid access token', async () => {
        const { privateKey, publicKey } = generateKeyPair();

        const { token } = signAccessToken(
          {
            appid: 'test_app',
            enterprise_id: 'test_enterprise',
            permissions: ['read', 'write'],
          },
          { privateKey, expiresIn: 7200 }
        );

        const middleware = createJWTAuthMiddleware(mockBlacklist, {
          getPublicKey: () => publicKey,
        });

        mockReq = {
          headers: {
            authorization: `Bearer ${token}`,
            'x-trace-id': 'test-trace-id',
          },
          path: '/api/protected',
        };

        await middleware(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('should reject request without Authorization header', async () => {
        const middleware = createJWTAuthMiddleware(mockBlacklist);

        mockReq = {
          headers: {},
          path: '/api/protected',
        };

        await middleware(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            code: JWTErrorCode.MISSING_TOKEN,
          })
        );
      });

      it('should reject request with invalid Bearer format', async () => {
        const middleware = createJWTAuthMiddleware(mockBlacklist);

        mockReq = {
          headers: {
            authorization: 'Basic sometoken',
          },
          path: '/api/protected',
        };

        await middleware(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
      });

      it('should reject refresh token used as access token', async () => {
        const { privateKey, publicKey } = generateKeyPair();

        const { token } = signRefreshToken('test_app', 'user123', {
          privateKey,
        });

        const middleware = createJWTAuthMiddleware(mockBlacklist, {
          getPublicKey: () => publicKey,
        });

        mockReq = {
          headers: {
            authorization: `Bearer ${token}`,
          },
          path: '/api/protected',
        };

        await middleware(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('access_token'),
          })
        );
      });

      it('should reject expired access token', async () => {
        const { privateKey, publicKey } = generateKeyPair();

        // Create token that expires in 0 seconds (already expired)
        const jwt = await import('jsonwebtoken');
        const now = Math.floor(Date.now() / 1000);

        const token = jwt.sign(
          {
            appid: 'test_app',
            permissions: ['read'],
            iat: now - 7200,
            exp: now - 3600, // Expired 1 hour ago
            jti: 'test-jti',
            type: 'access',
          },
          privateKey,
          { algorithm: 'RS256' }
        );

        const middleware = createJWTAuthMiddleware(mockBlacklist, {
          getPublicKey: () => publicKey,
        });

        mockReq = {
          headers: {
            authorization: `Bearer ${token}`,
          },
          path: '/api/protected',
        };

        await middleware(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            code: JWTErrorCode.EXPIRED_TOKEN,
          })
        );
      });

      it('should reject blacklisted token', async () => {
        const { privateKey, publicKey } = generateKeyPair();

        const { token } = signAccessToken(
          { appid: 'test_app', permissions: ['read'] },
          { privateKey }
        );

        // Mock blacklist to return true
        mockBlacklist.isBlacklisted = vi.fn().mockResolvedValue(true);

        const middleware = createJWTAuthMiddleware(mockBlacklist, {
          getPublicKey: () => publicKey,
        });

        mockReq = {
          headers: {
            authorization: `Bearer ${token}`,
          },
          path: '/api/protected',
        };

        await middleware(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            code: JWTErrorCode.REVOKED_TOKEN,
          })
        );
      });

      it('should reject token with invalid signature', async () => {
        const { privateKey } = generateKeyPair();
        const { publicKey: wrongKey } = generateKeyPair();

        const { token } = signAccessToken(
          { appid: 'test_app', permissions: ['read'] },
          { privateKey }
        );

        const middleware = createJWTAuthMiddleware(mockBlacklist, {
          getPublicKey: () => wrongKey,
        });

        mockReq = {
          headers: {
            authorization: `Bearer ${token}`,
          },
          path: '/api/protected',
        };

        await middleware(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
      });
    });

    describe('path exclusion', () => {
      it('should skip authentication for excluded paths', async () => {
        const middleware = createJWTAuthMiddleware(mockBlacklist);

        mockReq = {
          headers: {},
          path: '/health',
        };

        await middleware(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('should skip authentication for /ready', async () => {
        const middleware = createJWTAuthMiddleware(mockBlacklist);

        mockReq = {
          headers: {},
          path: '/ready',
        };

        await middleware(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalled();
      });

      it('should skip authentication for /metrics', async () => {
        const middleware = createJWTAuthMiddleware(mockBlacklist);

        mockReq = {
          headers: {},
          path: '/metrics',
        };

        await middleware(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalled();
      });

      it('should skip authentication for oauth endpoints', async () => {
        const middleware = createJWTAuthMiddleware(mockBlacklist);

        mockReq = {
          headers: {},
          path: '/oauth/token',
        };

        await middleware(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('trace_id generation', () => {
      it('should use provided x-trace-id header', async () => {
        const { privateKey, publicKey } = generateKeyPair();

        const { token } = signAccessToken(
          { appid: 'test_app', permissions: ['read'] },
          { privateKey }
        );

        const middleware = createJWTAuthMiddleware(mockBlacklist, {
          getPublicKey: () => publicKey,
        });

        mockReq = {
          headers: {
            authorization: `Bearer ${token}`,
            'x-trace-id': 'custom-trace-id',
          },
          path: '/api/protected',
        };

        await middleware(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(mockRes.setHeader).toHaveBeenCalledWith(
          'X-Trace-Id',
          'custom-trace-id'
        );
      });

      it('should generate trace_id if not provided', async () => {
        const { privateKey, publicKey } = generateKeyPair();

        const { token } = signAccessToken(
          { appid: 'test_app', permissions: ['read'] },
          { privateKey }
        );

        const middleware = createJWTAuthMiddleware(mockBlacklist, {
          getPublicKey: () => publicKey,
        });

        mockReq = {
          headers: {
            authorization: `Bearer ${token}`,
          },
          path: '/api/protected',
        };

        await middleware(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(mockRes.setHeader).toHaveBeenCalled();
        const traceId = (mockRes.setHeader as vi.Mock).mock.calls.find(
          (call) => call[0] === 'X-Trace-Id'
        )[1];
        expect(traceId).toMatch(/^jwt_\d+_[a-z0-9]+$/);
      });
    });

    describe('request attachment', () => {
      it('should attach appid to request', async () => {
        const { privateKey, publicKey } = generateKeyPair();

        const { token } = signAccessToken(
          { appid: 'my_app_id', permissions: ['read'] },
          { privateKey }
        );

        const middleware = createJWTAuthMiddleware(mockBlacklist, {
          getPublicKey: () => publicKey,
        });

        mockReq = {
          headers: {
            authorization: `Bearer ${token}`,
          },
          path: '/api/protected',
        };

        await middleware(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalled();
        expect((mockReq as any).appid).toBe('my_app_id');
      });

      it('should attach enterprise_id to request', async () => {
        const { privateKey, publicKey } = generateKeyPair();

        const { token } = signAccessToken(
          { appid: 'my_app_id', enterprise_id: 'my_enterprise_id' },
          { privateKey }
        );

        const middleware = createJWTAuthMiddleware(mockBlacklist, {
          getPublicKey: () => publicKey,
        });

        mockReq = {
          headers: {
            authorization: `Bearer ${token}`,
          },
          path: '/api/protected',
        };

        await middleware(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect((mockReq as any).enterprise_id).toBe('my_enterprise_id');
      });

      it('should attach permissions to request', async () => {
        const { privateKey, publicKey } = generateKeyPair();

        const { token } = signAccessToken({
          appid: 'my_app_id',
          permissions: ['read', 'write', 'delete'],
        }, { privateKey });

        const middleware = createJWTAuthMiddleware(mockBlacklist, {
          getPublicKey: () => publicKey,
        });

        mockReq = {
          headers: {
            authorization: `Bearer ${token}`,
          },
          path: '/api/protected',
        };

        await middleware(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect((mockReq as any).permissions).toEqual(['read', 'write', 'delete']);
      });

      it('should attach jti to request', async () => {
        const { privateKey, publicKey } = generateKeyPair();

        const { token } = signAccessToken(
          { appid: 'my_app_id', permissions: [] },
          { privateKey }
        );

        const middleware = createJWTAuthMiddleware(mockBlacklist, {
          getPublicKey: () => publicKey,
        });

        mockReq = {
          headers: {
            authorization: `Bearer ${token}`,
          },
          path: '/api/protected',
        };

        await middleware(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect((mockReq as any).jti).toBeTruthy();
      });
    });
  });

  describe('jwtAuthMiddleware', () => {
    it('should be exported as default instance', () => {
      expect(jwtAuthMiddleware).toBeDefined();
      expect(typeof jwtAuthMiddleware).toBe('function');
    });
  });

  describe('requireAuth', () => {
    it('should pass authenticated request', () => {
      const mockReq = {
        isAuthenticated: true,
      } as any;
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const mockNext = vi.fn();

      requireAuth(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated request', () => {
      const mockReq = {
        isAuthenticated: false,
      } as any;
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        getHeader: vi.fn().mockReturnValue('test-trace-id'),
      };
      const mockNext = vi.fn();

      requireAuth(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('helper functions', () => {
    describe('getAppId', () => {
      it('should return appid from request', () => {
        const mockReq = {
          appid: 'test_app',
        } as any;

        expect(getAppId(mockReq)).toBe('test_app');
      });

      it('should return undefined if not set', () => {
        const mockReq = {} as any;

        expect(getAppId(mockReq)).toBeUndefined();
      });
    });

    describe('getEnterpriseId', () => {
      it('should return enterprise_id from request', () => {
        const mockReq = {
          enterprise_id: 'test_enterprise',
        } as any;

        expect(getEnterpriseId(mockReq)).toBe('test_enterprise');
      });
    });

    describe('getPermissions', () => {
      it('should return permissions from request', () => {
        const mockReq = {
          permissions: ['read', 'write'],
        } as any;

        expect(getPermissions(mockReq)).toEqual(['read', 'write']);
      });
    });

    describe('hasPermission', () => {
      it('should return true if permission exists', () => {
        const mockReq = {
          permissions: ['read', 'write'],
        } as any;

        expect(hasPermission(mockReq, 'read')).toBe(true);
        expect(hasPermission(mockReq, 'write')).toBe(true);
      });

      it('should return false if permission does not exist', () => {
        const mockReq = {
          permissions: ['read'],
        } as any;

        expect(hasPermission(mockReq, 'delete')).toBe(false);
      });

      it('should return false if permissions not set', () => {
        const mockReq = {} as any;

        expect(hasPermission(mockReq, 'read')).toBe(false);
      });
    });

    describe('hasAllPermissions', () => {
      it('should return true if all permissions exist', () => {
        const mockReq = {
          permissions: ['read', 'write', 'delete'],
        } as any;

        expect(hasAllPermissions(mockReq, ['read', 'write'])).toBe(true);
      });

      it('should return false if any permission missing', () => {
        const mockReq = {
          permissions: ['read'],
        } as any;

        expect(hasAllPermissions(mockReq, ['read', 'write'])).toBe(false);
      });
    });

    describe('hasAnyPermission', () => {
      it('should return true if any permission exists', () => {
        const mockReq = {
          permissions: ['read'],
        } as any;

        expect(hasAnyPermission(mockReq, ['read', 'write'])).toBe(true);
      });

      it('should return false if no permissions match', () => {
        const mockReq = {
          permissions: ['read'],
        } as any;

        expect(hasAnyPermission(mockReq, ['write', 'delete'])).toBe(false);
      });
    });
  });
});
