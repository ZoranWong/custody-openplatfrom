import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as crypto from 'crypto';
import { createAuthorization } from '../../src/controllers/authorization.controller';
import { Request, Response } from 'express';

// Mock repositories
vi.mock('../../src/repositories/repository.factory', () => ({
  getApplicationRepository: vi.fn(),
  getAuthorizationRepository: vi.fn(),
}));

import { getApplicationRepository, getAuthorizationRepository } from '../../src/repositories/repository.factory';

describe('Authorization Storage', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  const mockApplicationRepo = {
    findByAppId: vi.fn(),
  };

  const mockAuthorizationRepo = {
    upsert: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      body: {},
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    (getApplicationRepository as ReturnType<typeof vi.fn>).mockReturnValue(mockApplicationRepo);
    (getAuthorizationRepository as ReturnType<typeof vi.fn>).mockReturnValue(mockAuthorizationRepo);
  });

  // Helper to generate valid signature matching verifySignature format
  function generateSignature(appSecret: string, appId: string, timestamp: number, nonce: string, businessData: object): string {
    // Sort keys for consistent JSON
    const sortedData = Object.keys(businessData).sort().reduce((acc, key) => {
      acc[key] = (businessData as Record<string, unknown>)[key];
      return acc;
    }, {} as Record<string, unknown>);

    const dataString = JSON.stringify(sortedData);

    // Build baseString (business data part)
    const baseString = `${appId}${timestamp}${nonce}${dataString}`;

    // Build full sign string matching buildSignString format:
    // appid\nnonce\ntimestamp\nmethod\npath\nbody
    const signString = [
      appId,
      nonce,
      timestamp.toString(),
      'POST',
      '/v1/authorizations',
      baseString,
    ].join('\n');

    return crypto.createHmac('sha256', appSecret).update(signString).digest('hex');
  }

  describe('createAuthorization', () => {
    const appSecret = 'test-app-secret';

    it('should return 400 if appId is missing', async () => {
      mockRequest.body = {
        resourceKey: 'ent-789',
        permissions: ['read'],
        timestamp: Math.floor(Date.now() / 1000),
        nonce: 'test-nonce',
        signature: 'test',
      };

      await createAuthorization(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Missing required parameter: appId' })
      );
    });

    it('should return 400 if signature is missing', async () => {
      mockRequest.body = {
        appId: 'app-123',
        resourceKey: 'ent-789',
        permissions: ['read'],
        timestamp: Math.floor(Date.now() / 1000),
        nonce: 'test-nonce',
      };

      await createAuthorization(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Missing signature' })
      );
    });

    it('should return 404 if application not found', async () => {
      mockApplicationRepo.findByAppId.mockResolvedValue(null);

      mockRequest.body = {
        appId: 'app-123',
        resourceKey: 'ent-789',
        permissions: ['read'],
        timestamp: Math.floor(Date.now() / 1000),
        nonce: 'test-nonce',
        signature: 'test-signature',
      };

      await createAuthorization(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Application not found' })
      );
    });

    it('should return 400 if resourceKey has invalid format', async () => {
      mockApplicationRepo.findByAppId.mockResolvedValue({
        appId: 'app-123',
        appSecret: 'test-secret',
        status: 'active',
      });

      mockRequest.body = {
        appId: 'app-123',
        resourceKey: 'invalid resource!',  // Invalid: contains space and special char
        permissions: ['read'],
        timestamp: Math.floor(Date.now() / 1000),
        nonce: 'test-nonce',
        signature: 'test-signature',
      };

      await createAuthorization(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Invalid resourceKey format' })
      );
    });

    it('should return 403 if application is not active', async () => {
      mockApplicationRepo.findByAppId.mockResolvedValue({
        appId: 'app-123',
        appSecret: 'test-secret',
        status: 'inactive',
      });

      const timestamp = Math.floor(Date.now() / 1000);
      mockRequest.body = {
        appId: 'app-123',
        resourceKey: 'ent-789',
        permissions: ['read'],
        timestamp,
        nonce: 'test-nonce',
        signature: 'test-signature',
      };

      await createAuthorization(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Application is not active' })
      );
    });

    it('should store authorization successfully with valid signature', async () => {
      mockApplicationRepo.findByAppId.mockResolvedValue({
        appId: 'app-123',
        appSecret,
        status: 'active',
      });

      const timestamp = Math.floor(Date.now() / 1000);
      const businessData = { resourceKey: 'ent-789', permissions: ['read'] };
      const signature = generateSignature(appSecret, 'app-123', timestamp, 'test-nonce', businessData);

      mockAuthorizationRepo.upsert.mockResolvedValue({
        id: 'auth-123',
        appId: 'app-123',
        resourceKey: 'ent-789',
        permissions: ['read'],
        status: 'active',
        createdAt: '2026-02-27T10:00:00Z',
        updatedAt: '2026-02-27T10:00:00Z',
      });

      mockRequest.body = {
        appId: 'app-123',
        resourceKey: 'ent-789',
        permissions: ['read'],
        timestamp,
        nonce: 'test-nonce',
        signature,
      };

      await createAuthorization(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 200,
          data: expect.objectContaining({
            authorizationId: 'auth-123',
          }),
        })
      );
    });

    it('should update existing authorization on duplicate', async () => {
      mockApplicationRepo.findByAppId.mockResolvedValue({
        appId: 'app-123',
        appSecret,
        status: 'active',
      });

      const timestamp = Math.floor(Date.now() / 1000);
      const businessData = { resourceKey: 'ent-789', permissions: ['read', 'write'] };
      const signature = generateSignature(appSecret, 'app-123', timestamp, 'test-nonce-2', businessData);

      // Return existing, then update
      mockAuthorizationRepo.upsert.mockResolvedValue({
        id: 'auth-123',
        appId: 'app-123',
        resourceKey: 'ent-789',
        permissions: ['read', 'write'],
        status: 'active',
        createdAt: '2026-02-27T10:00:00Z',
        updatedAt: '2026-02-27T11:00:00Z',
      });

      mockRequest.body = {
        appId: 'app-123',
        resourceKey: 'ent-789',
        permissions: ['read', 'write'],
        timestamp,
        nonce: 'test-nonce-2',
        signature,
      };

      await createAuthorization(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(mockAuthorizationRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          appId: 'app-123',
          resourceKey: 'ent-789',
          permissions: ['read', 'write'],
        })
      );
    });
  });
});
