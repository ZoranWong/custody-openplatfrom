import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as crypto from 'crypto';
import { getAuthorization } from '../../src/controllers/authorization.controller';
import { Request, Response } from 'express';

// Mock repositories
vi.mock('../../src/repositories/repository.factory', () => ({
  getApplicationRepository: vi.fn(),
  getAuthorizationRepository: vi.fn(),
}));

import { getApplicationRepository, getAuthorizationRepository } from '../../src/repositories/repository.factory';

describe('Authorization Query', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  const mockApplicationRepo = {
    findByAppId: vi.fn(),
  };

  const mockAuthorizationRepo = {
    findById: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      params: { id: 'auth-123' },
      headers: {},
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    (getApplicationRepository as ReturnType<typeof vi.fn>).mockReturnValue(mockApplicationRepo);
    (getAuthorizationRepository as ReturnType<typeof vi.fn>).mockReturnValue(mockAuthorizationRepo);
  });

  // Helper to generate valid signature
  function generateSignature(appSecret: string, appId: string, timestamp: number, nonce: string): string {
    const baseString = `${appId}${timestamp}${nonce}`;

    // Build full sign string matching buildSignString format
    const signString = [
      appId,
      nonce,
      timestamp.toString(),
      'GET',
      `/v1/authorizations/auth-123`,
      baseString,
    ].join('\n');

    return crypto.createHmac('sha256', appSecret).update(signString).digest('hex');
  }

  describe('getAuthorization', () => {
    const appSecret = 'test-app-secret';

    it('should return 401 if X-App-Id header is missing', async () => {
      mockRequest.headers = {
        'x-timestamp': Math.floor(Date.now() / 1000).toString(),
        'x-nonce': 'test-nonce',
        'x-signature': 'test-signature',
      };

      await getAuthorization(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Missing required header: X-App-Id' })
      );
    });

    it('should return 401 if X-Signature header is missing', async () => {
      mockRequest.headers = {
        'x-app-id': 'app-123',
        'x-timestamp': Math.floor(Date.now() / 1000).toString(),
        'x-nonce': 'test-nonce',
      };

      await getAuthorization(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Missing required header: X-Signature' })
      );
    });

    it('should return 404 if application not found', async () => {
      mockApplicationRepo.findByAppId.mockResolvedValue(null);

      mockRequest.headers = {
        'x-app-id': 'app-123',
        'x-timestamp': Math.floor(Date.now() / 1000).toString(),
        'x-nonce': 'test-nonce',
        'x-signature': 'test-signature',
      };

      await getAuthorization(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Application not found' })
      );
    });

    it('should return 403 if application is not active', async () => {
      mockApplicationRepo.findByAppId.mockResolvedValue({
        appId: 'app-123',
        appSecret: 'test-secret',
        status: 'inactive',
      });

      mockRequest.headers = {
        'x-app-id': 'app-123',
        'x-timestamp': Math.floor(Date.now() / 1000).toString(),
        'x-nonce': 'test-nonce',
        'x-signature': 'test-signature',
      };

      await getAuthorization(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Application is not active' })
      );
    });

    it('should return 404 if authorization not found', async () => {
      mockApplicationRepo.findByAppId.mockResolvedValue({
        appId: 'app-123',
        appSecret,
        status: 'active',
      });

      mockAuthorizationRepo.findById.mockResolvedValue(null);

      const timestamp = Math.floor(Date.now() / 1000);
      mockRequest.headers = {
        'x-app-id': 'app-123',
        'x-timestamp': timestamp.toString(),
        'x-nonce': 'test-nonce',
        'x-signature': generateSignature(appSecret, 'app-123', timestamp, 'test-nonce'),
      };

      await getAuthorization(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Authorization not found' })
      );
    });

    it('should return authorization details with valid signature', async () => {
      mockApplicationRepo.findByAppId.mockResolvedValue({
        appId: 'app-123',
        appSecret,
        status: 'active',
      });

      const timestamp = Math.floor(Date.now() / 1000);
      mockAuthorizationRepo.findById.mockResolvedValue({
        id: 'auth-123',
        appId: 'app-123',
        resourceKey: 'ent-789',
        permissions: ['read', 'write'],
        status: 'active',
        createdAt: '2026-02-27T10:00:00Z',
        updatedAt: '2026-02-27T10:00:00Z',
        expiresAt: '2027-12-31T23:59:59Z',
      });

      mockRequest.headers = {
        'x-app-id': 'app-123',
        'x-timestamp': timestamp.toString(),
        'x-nonce': 'test-nonce',
        'x-signature': generateSignature(appSecret, 'app-123', timestamp, 'test-nonce'),
      };

      await getAuthorization(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 200,
          data: expect.objectContaining({
            authorizationId: 'auth-123',
            appId: 'app-123',
            resourceKey: 'ent-789',
            permissions: ['read', 'write'],
            status: 'active',
          }),
        })
      );
    });

    it('should return authorization with revoked status', async () => {
      mockApplicationRepo.findByAppId.mockResolvedValue({
        appId: 'app-123',
        appSecret,
        status: 'active',
      });

      const timestamp = Math.floor(Date.now() / 1000);
      mockAuthorizationRepo.findById.mockResolvedValue({
        id: 'auth-123',
        appId: 'app-123',
        resourceKey: 'ent-789',
        permissions: ['read'],
        status: 'revoked',
        createdAt: '2026-02-27T10:00:00Z',
        updatedAt: '2026-02-28T10:00:00Z',
      });

      mockRequest.headers = {
        'x-app-id': 'app-123',
        'x-timestamp': timestamp.toString(),
        'x-nonce': 'test-nonce',
        'x-signature': generateSignature(appSecret, 'app-123', timestamp, 'test-nonce'),
      };

      await getAuthorization(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 200,
          data: expect.objectContaining({
            authorizationId: 'auth-123',
            status: 'revoked',
          }),
        })
      );
    });

    it('should return expired status when authorization is past expiresAt', async () => {
      mockApplicationRepo.findByAppId.mockResolvedValue({
        appId: 'app-123',
        appSecret,
        status: 'active',
      });

      const timestamp = Math.floor(Date.now() / 1000);
      // Authorization expired yesterday
      mockAuthorizationRepo.findById.mockResolvedValue({
        id: 'auth-123',
        appId: 'app-123',
        resourceKey: 'ent-789',
        permissions: ['read', 'write'],
        status: 'active',
        createdAt: '2026-02-27T10:00:00Z',
        updatedAt: '2026-02-27T10:00:00Z',
        expiresAt: '2026-02-26T23:59:59Z', // Expired yesterday
      });

      mockRequest.headers = {
        'x-app-id': 'app-123',
        'x-timestamp': timestamp.toString(),
        'x-nonce': 'test-nonce',
        'x-signature': generateSignature(appSecret, 'app-123', timestamp, 'test-nonce'),
      };

      await getAuthorization(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 200,
          data: expect.objectContaining({
            authorizationId: 'auth-123',
            status: 'expired',
          }),
        })
      );
    });

    it('should return 401 for invalid signature', async () => {
      mockApplicationRepo.findByAppId.mockResolvedValue({
        appId: 'app-123',
        appSecret,
        status: 'active',
      });

      mockRequest.headers = {
        'x-app-id': 'app-123',
        'x-timestamp': Math.floor(Date.now() / 1000).toString(),
        'x-nonce': 'test-nonce',
        'x-signature': 'invalid-signature',
      };

      await getAuthorization(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Invalid signature' })
      );
    });

    it('should return 401 for expired timestamp', async () => {
      mockApplicationRepo.findByAppId.mockResolvedValue({
        appId: 'app-123',
        appSecret,
        status: 'active',
      });

      // Timestamp older than 5 minutes
      const expiredTimestamp = Math.floor(Date.now() / 1000) - 600;
      mockRequest.headers = {
        'x-app-id': 'app-123',
        'x-timestamp': expiredTimestamp.toString(),
        'x-nonce': 'test-nonce',
        'x-signature': 'test-signature',
      };

      await getAuthorization(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Timestamp expired' })
      );
    });
  });
});
