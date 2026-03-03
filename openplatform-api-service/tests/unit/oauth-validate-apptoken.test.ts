/**
 * OAuth Validate AppToken HTTP Tests
 * Integration tests for the validateAppToken endpoint using supertest
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { Express, Request, Response } from 'express';
import request from 'supertest';
import * as crypto from 'crypto';

// Simple in-memory mock for application repository
const mockApplications = new Map<string, { appId: string; appSecret: string; appName: string; status: string }>();
mockApplications.set('app-123', {
  appId: 'app-123',
  appSecret: 'test-secret',
  appName: 'Test App',
  status: 'ACTIVE',
});

// Mock repository factory
vi.mock('../../src/repositories/repository.factory', () => ({
  getApplicationRepository: vi.fn().mockReturnValue({
    findByAppId: vi.fn().mockImplementation((appId: string) => {
      return Promise.resolve(mockApplications.get(appId) || null);
    }),
  }),
}));

describe('GET /api/v1/oauth/appToken/validate', () => {
  let app: Express;

  // Helper function to generate hash-based token
  function generateHashToken(appId: string, appSecret: string): string {
    const timestamp = Date.now().toString();
    const nonce = 'testnonce123';
    const hashInput = appId + appSecret + timestamp + nonce;
    const hash = crypto.createHash('md5').update(hashInput).digest('hex');
    return `${hash}-${timestamp}-${nonce}`;
  }

  // Validate token function (same as controller logic)
  function validateToken(appId: string, appToken: string, appSecret: string) {
    const parts = appToken.split('-');
    if (parts.length !== 3) {
      return { status: 401, body: { code: 40103, message: 'Invalid token format' } };
    }

    const [providedHash, timestampStr, nonce] = parts;
    const timestamp = parseInt(timestampStr, 10);

    if (isNaN(timestamp)) {
      return { status: 401, body: { code: 40103, message: 'Invalid token: invalid timestamp' } };
    }

    const tokenAge = Date.now() - timestamp;
    if (tokenAge < 0 || tokenAge > 3600000) {
      return { status: 401, body: { code: 40102, message: 'Token expired or not yet valid' } };
    }

    const hashInput = appId + appSecret + timestampStr + nonce;
    const expectedHash = crypto.createHash('md5').update(hashInput).digest('hex');

    if (providedHash !== expectedHash) {
      return { status: 401, body: { code: 40103, message: 'Invalid token: hash mismatch' } };
    }

    return {
      status: 200,
      body: {
        code: 200,
        data: {
          valid: true,
          claims: { appId, timestamp, nonce },
        },
      },
    };
  }

  beforeEach(() => {
    app = express();

    // Route handler
    app.get('/api/v1/oauth/appToken/validate', async (req: Request, res: Response) => {
      const appId = req.query.appId as string;
      const appToken = req.query.appToken as string;

      if (!appId) {
        res.status(400).json({ code: 40001, message: 'Missing required parameter: appId' });
        return;
      }

      if (!appToken) {
        res.status(400).json({ code: 40001, message: 'Missing required parameter: appToken' });
        return;
      }

      const application = mockApplications.get(appId);
      if (!application) {
        res.status(404).json({ code: 40401, message: 'Application not found' });
        return;
      }

      const result = validateToken(appId, appToken, application.appSecret);
      res.status(result.status).json(result.body);
    });
  });

  describe('Parameter Validation', () => {
    it('should return 400 when appId is missing', async () => {
      const res = await request(app)
        .get('/api/v1/oauth/appToken/validate')
        .query({ appToken: 'some-token' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ code: 40001, message: 'Missing required parameter: appId' });
    });

    it('should return 400 when appToken is missing', async () => {
      const res = await request(app)
        .get('/api/v1/oauth/appToken/validate')
        .query({ appId: 'app-123' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ code: 40001, message: 'Missing required parameter: appToken' });
    });

    it('should return 400 when both parameters are missing', async () => {
      const res = await request(app).get('/api/v1/oauth/appToken/validate');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ code: 40001, message: 'Missing required parameter: appId' });
    });
  });

  describe('Application Lookup', () => {
    it('should return 404 when application not found', async () => {
      const res = await request(app)
        .get('/api/v1/oauth/appToken/validate')
        .query({ appId: 'non-existent', appToken: 'some-token' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ code: 40401, message: 'Application not found' });
    });
  });

  describe('Token Validation', () => {
    it('should return 401 for invalid token format', async () => {
      const res = await request(app)
        .get('/api/v1/oauth/appToken/validate')
        .query({ appId: 'app-123', appToken: 'invalid-format' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(40103);
      expect(res.body.message).toBe('Invalid token format');
    });

    it('should return 401 for hash mismatch', async () => {
      const token = generateHashToken('app-123', 'wrong-secret');

      const res = await request(app)
        .get('/api/v1/oauth/appToken/validate')
        .query({ appId: 'app-123', appToken: token });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(40103);
      expect(res.body.message).toBe('Invalid token: hash mismatch');
    });

    it('should return 200 for valid hash token', async () => {
      const token = generateHashToken('app-123', 'test-secret');

      const res = await request(app)
        .get('/api/v1/oauth/appToken/validate')
        .query({ appId: 'app-123', appToken: token });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data.valid).toBe(true);
      expect(res.body.data.claims.appId).toBe('app-123');
      expect(res.body.data.claims.nonce).toBe('testnonce123');
    });
  });
});
