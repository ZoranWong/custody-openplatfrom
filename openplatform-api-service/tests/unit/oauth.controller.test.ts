/**
 * OAuth Controller Tests
 * Tests basic request validation and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { TokenErrorCode } from '../../src/services/token.service';
import * as crypto from 'crypto';

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
      mockReq.query = { appToken: 'some-token' };

      await validateAppToken(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 40001,
        message: 'Missing required parameter: appId',
      });
    });

    it('should require appToken parameter', async () => {
      const { validateAppToken } = await import('../../src/controllers/oauth.controller');
      mockReq.query = { appId: 'app-123' };

      await validateAppToken(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 40001,
        message: 'Missing required parameter: appToken',
      });
    });

    it('should require both appId and appToken parameters', async () => {
      const { validateAppToken } = await import('../../src/controllers/oauth.controller');
      mockReq.query = {};

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
      mockReq.query = { appId: 'app-123', appToken: 'invalid-format' };

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
      mockReq.query = { appId: 'app-123', appToken: token };

      await validateAppToken(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 40103,
        message: 'Invalid token: hash mismatch',
      });
    });
  });
});
