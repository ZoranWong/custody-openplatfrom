/**
 * OAuth Controller Tests
 * Tests basic request validation and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
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

// Mock token service to avoid module initialization issues
const mockTokenService = {
  issueTokens: vi.fn(),
  refreshAccessToken: vi.fn(),
  revokeRefreshToken: vi.fn(),
  validateAppToken: vi.fn(),
};

vi.mock('../../src/services/token.service', () => ({
  tokenService: mockTokenService,
}));

describe('OAuth Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  // Helper function to generate hash-based token
  function generateHashToken(appId: string, appSecret: string): string {
    const timestamp = Date.now().toString();
    const nonce = 'testnonce123';
    const hashInput = appId + appSecret + timestamp + nonce;
    const hash = crypto.createHash('md5').update(hashInput).digest('hex');
    return `${hash}-${timestamp}-${nonce}`;
  }

  beforeEach(() => {
    // Reset mock state
    vi.clearAllMocks();
    mockApplicationRepo.findByAppId.mockResolvedValue({
      appId: 'app-123',
      appSecret: 'test-app-secret',
      status: 'active',
    });

    // Mock request
    mockReq = {
      body: {},
      query: {},
      ip: '127.0.0.1',
    };

    // Mock response
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('Parameter Validation', () => {
    it('should require grant_type parameter', async () => {
      // Import dynamically to avoid module caching issues
      const { oauthToken } = await import('../../src/controllers/oauth.controller');
      mockReq.body = { appid: 'test_app', appsecret: 'secret' };

      await oauthToken(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 40001,
        message: 'Missing required parameter: grant_type',
      });
    });

    it('should require both appid and appsecret for client_credentials', async () => {
      const { oauthToken } = await import('../../src/controllers/oauth.controller');
      mockReq.body = { grant_type: 'client_credentials' };

      await oauthToken(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 40001,
        message: 'Missing required parameters: appid and appsecret',
      });
    });

    it('should require both appid and refresh_token for refresh_token grant', async () => {
      const { oauthToken } = await import('../../src/controllers/oauth.controller');
      mockReq.body = { grant_type: 'refresh_token' };

      await oauthToken(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 40001,
        message: 'Missing required parameters: appid and refresh_token',
      });
    });

    it('should reject invalid grant_type', async () => {
      const { oauthToken } = await import('../../src/controllers/oauth.controller');
      mockReq.body = { grant_type: 'password' };

      await oauthToken(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 40002,
        message: expect.stringContaining('Invalid grant_type'),
      });
    });

    it('should require refresh_token for revoke endpoint', async () => {
      const { oauthRevoke } = await import('../../src/controllers/oauth.controller');
      mockReq.body = {};

      await oauthRevoke(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 40001,
        message: 'Missing required parameter: refresh_token',
      });
    });
  });

  describe('validateAppToken - Parameter Validation', () => {
    it('should require appId parameter', async () => {
      const { validateAppToken } = await import('../../src/controllers/oauth.controller');
      mockReq.body = { appToken: 'some-token' };

      await validateAppToken(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 40001,
        message: 'Missing required parameter: appId',
      });
    });

    it('should require appToken parameter', async () => {
      const { validateAppToken } = await import('../../src/controllers/oauth.controller');
      mockReq.body = { appId: 'app-123' };

      await validateAppToken(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 40001,
        message: 'Missing required parameter: appToken',
      });
    });

    it('should require both appId and appToken parameters', async () => {
      const { validateAppToken } = await import('../../src/controllers/oauth.controller');
      mockReq.body = {};

      await validateAppToken(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 40001,
        message: 'Missing required parameter: appId',
      });
    });
  });

  describe('validateAppToken - Hash-based Token', () => {
    it('should return error for invalid token format', async () => {
      const { validateAppToken } = await import('../../src/controllers/oauth.controller');
      mockReq.body = { appId: 'app-123', appToken: 'invalid-format' };

      mockTokenService.validateAppToken.mockResolvedValue({
        valid: false,
        error: {
          code: BusinessCodes.AUTH_TIMESTAMP_EXPIRED_OR_INVALID_TOKEN,
          message: 'Invalid token format',
        },
      });

      await validateAppToken(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 40103,
        message: 'Invalid token format',
      });
    });

    it('should return error for hash mismatch', async () => {
      const { validateAppToken } = await import('../../src/controllers/oauth.controller');
      // Generate token with wrong secret
      const wrongSecret = 'wrong-secret';
      const token = generateHashToken('app-123', wrongSecret);
      mockReq.body = { appId: 'app-123', appToken: token };

      mockTokenService.validateAppToken.mockResolvedValue({
        valid: false,
        error: {
          code: BusinessCodes.AUTH_TIMESTAMP_EXPIRED_OR_INVALID_TOKEN,
          message: 'Invalid token: hash mismatch',
        },
      });

      await validateAppToken(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 40103,
        message: 'Invalid token: hash mismatch',
      });
    });
  });
});
