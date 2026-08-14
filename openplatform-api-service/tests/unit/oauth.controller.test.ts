/**
 * OAuth Controller Integration Tests
 * Tests the complete request flow: Express app -> route -> validate middleware -> controller
 * using supertest to send real HTTP requests through the full middleware chain.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { Router, Request, Response } from 'express';
import request from 'supertest';
import { BusinessCodes } from '../../src/enums/business-codes.enum';
import * as crypto from 'crypto';

// Mock application repository for validateAppToken tests
const mockApplicationRepo = {
  findByAppId: vi.fn().mockResolvedValue({
    appId: 'app-123',
    appSecret: 'test-app-secret',
    status: 'active',
  }),
};

vi.mock('../../src/repositories/repository.factory', () => ({
  getApplicationRepository: vi.fn(() => mockApplicationRepo),
}));

// Mock token service
const mockTokenService = {
  issueTokens: vi.fn(),
  refreshAccessToken: vi.fn(),
  revokeRefreshToken: vi.fn(),
  validateAppToken: vi.fn(),
};

vi.mock('../../src/services/token.service', () => ({
  tokenService: mockTokenService,
}));

// Import validate middleware
import { validateOAuthToken, validateOAuthRevoke, validateAppToken } from '../../src/validate/rules';

// Helper to generate hash-based token
function generateHashToken(appId: string, appSecret: string): string {
  const timestamp = Date.now().toString();
  const nonce = 'testnonce123';
  const hashInput = appId + appSecret + timestamp + nonce;
  const hash = crypto.createHash('md5').update(hashInput).digest('hex');
  return `${hash}-${timestamp}-${nonce}`;
}

// Create a full Express app with the oauth routes mounted
function createOAuthApp() {
  const app = express();
  app.use(express.json());

  const router = Router();

  // POST /appToken/refresh - Token issuance and refresh
  router.post('/appToken/refresh', validateOAuthToken, async (req: Request, res: Response) => {
    const { oauthToken } = await import('../../src/controllers/thirdparty/oauth.controller');
    return oauthToken(req, res);
  });

  // POST /revoke - Token revocation
  router.post('/revoke', validateOAuthRevoke, async (req: Request, res: Response) => {
    const { oauthRevoke } = await import('../../src/controllers/thirdparty/oauth.controller');
    return oauthRevoke(req, res);
  });

  // POST /appToken/validate - Validate appToken
  router.post('/appToken/validate', validateAppToken, async (req: Request, res: Response) => {
    const { validateAppToken } = await import('../../src/controllers/thirdparty/oauth.controller');
    return validateAppToken(req, res);
  });

  app.use('/oauth', router);
  return app;
}

describe('OAuth Controller Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApplicationRepo.findByAppId.mockResolvedValue({
      appId: 'app-123',
      appSecret: 'test-app-secret',
      status: 'active',
    });
    app = createOAuthApp();
  });

  describe('POST /oauth/appToken/refresh', () => {
    describe('Validation', () => {
      it('should reject when grant_type is missing', async () => {
        const res = await request(app)
          .post('/oauth/appToken/refresh')
          .send({ appid: 'test_app', appsecret: 'secret' })
          .expect(400);

        expect(res.body.code).toBe(40001);
        expect(res.body.message).toBe('Validation failed');
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: 'grant_type', message: 'grant_type is required' }),
          ])
        );
      });

      it('should reject invalid grant_type', async () => {
        const res = await request(app)
          .post('/oauth/appToken/refresh')
          .send({ grant_type: 'password', appid: 'test_app', appsecret: 'secret' })
          .expect(400);

        expect(res.body.code).toBe(40001);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: 'grant_type', message: 'Invalid grant_type' }),
          ])
        );
      });

      it('should reject when appid is missing', async () => {
        const res = await request(app)
          .post('/oauth/appToken/refresh')
          .send({ grant_type: 'client_credentials', appsecret: 'secret' })
          .expect(400);

        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: 'appid', message: 'appid is required' }),
          ])
        );
      });
    });

    describe('Business Logic', () => {
      it('should reject invalid grant_type in controller', async () => {
        const res = await request(app)
          .post('/oauth/appToken/refresh')
          .send({ grant_type: 'password', appid: 'test_app', appsecret: 'secret' })
          .expect(400);

        expect(res.body.code).toBe(40001);
        expect(res.body.message).toBe('Validation failed');
      });

      it('should handle token service returning error for client_credentials', async () => {
        mockTokenService.issueTokens.mockResolvedValue({
          error: { code: 40110, message: 'Invalid credentials' },
        });

        const res = await request(app)
          .post('/oauth/appToken/refresh')
          .send({ grant_type: 'client_credentials', appid: 'test_app', appsecret: 'secret' })
          .expect(401);

        expect(res.body.code).toBe(40110);
        expect(res.body.message).toBe('Invalid credentials');
      });

      it('should handle token service returning error for refresh_token', async () => {
        mockTokenService.refreshAccessToken.mockResolvedValue({
          error: { code: 40113, message: 'Invalid refresh token' },
        });

        const res = await request(app)
          .post('/oauth/appToken/refresh')
          .send({ grant_type: 'refresh_token', appid: 'test_app', refresh_token: 'token123' })
          .expect(401);

        expect(res.body.code).toBe(40113);
        expect(res.body.message).toBe('Invalid refresh token');
      });

      it('should issue tokens successfully for client_credentials', async () => {
        mockTokenService.issueTokens.mockResolvedValue({
          tokens: {
            code: 0,
            message: 'Success',
            data: {
              access_token: 'new-access-token',
              expires_in: 7200,
              token_type: 'Bearer',
              refresh_token: 'new-refresh-token',
            },
          },
        });

        const res = await request(app)
          .post('/oauth/appToken/refresh')
          .send({ grant_type: 'client_credentials', appid: 'test_app', appsecret: 'secret' })
          .expect(200);

        expect(res.body.code).toBe(0);
        expect(res.body.data.access_token).toBe('new-access-token');
      });
    });
  });

  describe('POST /oauth/revoke', () => {
    it('should reject when refresh_token is missing', async () => {
      const res = await request(app)
        .post('/oauth/revoke')
        .send({})
        .expect(400);

      expect(res.body.code).toBe(40001);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'refresh_token', message: 'refresh_token is required' }),
        ])
      );
    });

    it('should revoke token successfully', async () => {
      mockTokenService.revokeRefreshToken.mockResolvedValue({
        success: true,
      });

      const res = await request(app)
        .post('/oauth/revoke')
        .send({ refresh_token: 'token-to-revoke' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should handle token service error', async () => {
      mockTokenService.revokeRefreshToken.mockResolvedValue({
        error: { code: 40113, message: 'Invalid refresh token' },
      });

      const res = await request(app)
        .post('/oauth/revoke')
        .send({ refresh_token: 'invalid-token' })
        .expect(401);

      expect(res.body.code).toBe(40113);
      expect(res.body.message).toBe('Invalid refresh token');
    });
  });

  describe('POST /oauth/appToken/validate', () => {
    describe('Validation', () => {
      it('should reject when appId is missing', async () => {
        const res = await request(app)
          .post('/oauth/appToken/validate')
          .send({ appToken: 'some-token' })
          .expect(400);

        expect(res.body.code).toBe(40001);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: 'appId', message: 'appId is required' }),
          ])
        );
      });

      it('should reject when appToken is missing', async () => {
        const res = await request(app)
          .post('/oauth/appToken/validate')
          .send({ appId: 'app-123' })
          .expect(400);

        expect(res.body.code).toBe(40001);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: 'appToken', message: 'appToken is required' }),
          ])
        );
      });
    });

    describe('Business Logic', () => {
      it('should return error for invalid token format', async () => {
        mockTokenService.validateAppToken.mockResolvedValue({
          valid: false,
          error: {
            code: BusinessCodes.AUTH_TIMESTAMP_EXPIRED_OR_INVALID_TOKEN,
            message: 'Invalid token format',
          },
        });

        const res = await request(app)
          .post('/oauth/appToken/validate')
          .send({ appId: 'app-123', appToken: 'invalid-format' })
          .expect(401);

        expect(res.body.code).toBe(40103);
        expect(res.body.message).toBe('Invalid token format');
      });

      it('should return error for hash mismatch', async () => {
        const wrongSecret = 'wrong-secret';
        const token = generateHashToken('app-123', wrongSecret);

        mockTokenService.validateAppToken.mockResolvedValue({
          valid: false,
          error: {
            code: BusinessCodes.AUTH_TIMESTAMP_EXPIRED_OR_INVALID_TOKEN,
            message: 'Invalid token: hash mismatch',
          },
        });

        const res = await request(app)
          .post('/oauth/appToken/validate')
          .send({ appId: 'app-123', appToken: token })
          .expect(401);

        expect(res.body.code).toBe(40103);
        expect(res.body.message).toBe('Invalid token: hash mismatch');
      });

      it('should validate token successfully', async () => {
        mockTokenService.validateAppToken.mockResolvedValue({
          valid: true,
          claims: {
            appId: 'app-123',
            timestamp: Date.now().toString(),
            nonce: 'test-nonce',
          },
        });

        const res = await request(app)
          .post('/oauth/appToken/validate')
          .send({ appId: 'app-123', appToken: 'valid-token' })
          .expect(200);

        expect(res.body.code).toBe(200);
        expect(res.body.data.valid).toBe(true);
        expect(res.body.data.claims.appId).toBe('app-123');
      });

      it('should return error when application not found', async () => {
        mockApplicationRepo.findByAppId.mockResolvedValue(null);

        const res = await request(app)
          .post('/oauth/appToken/validate')
          .send({ appId: 'nonexistent-app', appToken: 'some-token' })
          .expect(404);

        expect(res.body.code).toBe(40401);
        expect(res.body.message).toBe('Application not found');
      });
    });
  });
});