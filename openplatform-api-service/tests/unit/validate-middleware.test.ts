/**
 * Validate Middleware Integration Tests
 * Tests the complete request flow: Express app -> route -> validate middleware -> controller
 * using supertest to send real HTTP requests through the full middleware chain.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import express, { Router, Request, Response } from 'express';
import request from 'supertest';
import { validate } from '../../src/validate';
import type { Rule } from '../../src/validate/types';

// Define rule objects inline since rules are no longer exported individually
const LoginRule: Rule = {
  body: {
    email: [
      { validator: 'required', message: 'Email is required' },
      { validator: 'email', message: 'Invalid email format' },
    ],
    password: [
      { validator: 'required', message: 'Password is required' },
      { validator: 'minLength', options: { min: 6 }, message: 'Password must be at least 6 characters' },
    ],
  },
};

const RefreshTokenRule: Rule = {
  body: {
    refreshToken: [
      { validator: 'required', message: 'Refresh token is required' },
    ],
  },
};

const ChangePasswordRule: Rule = {
  body: {
    currentPassword: [
      { validator: 'required', message: 'Current password is required' },
    ],
    newPassword: [
      { validator: 'required', message: 'New password is required' },
      { validator: 'minLength', options: { min: 6 }, message: 'New password must be at least 6 characters' },
    ],
  },
};

const OAuthTokenRule: Rule = {
  body: {
    grant_type: [
      { validator: 'required', message: 'grant_type is required' },
      { validator: 'isIn', options: { values: ['client_credentials', 'refresh_token'] }, message: 'Invalid grant_type' },
    ],
    appid: [
      { validator: 'required', message: 'appid is required' },
    ],
    appsecret: [
      { validator: 'required', message: 'appsecret is required', optional: true },
    ],
    refresh_token: [
      { validator: 'required', message: 'refresh_token is required', optional: true },
    ],
  },
};

const ISVLoginRule: Rule = {
  body: {
    email: [
      { validator: 'required', message: 'Email is required' },
      { validator: 'email', message: 'Invalid email format' },
    ],
    password: [
      { validator: 'required', message: 'Password is required' },
    ],
  },
};

const RegisterRule: Rule = {
  body: {
    email: [
      { validator: 'required', message: 'Email is required' },
      { validator: 'email', message: 'Invalid email format' },
    ],
    password: [
      { validator: 'required', message: 'Password is required' },
      { validator: 'minLength', options: { min: 6 }, message: 'Password must be at least 6 characters' },
    ],
    legalName: [
      { validator: 'required', message: 'Company name is required' },
    ],
  },
};

const VerifyOAuthTokenRule: Rule = {
  body: {
    resourceKey: [
      { validator: 'required', message: 'resourceKey is required' },
    ],
    oauthToken: [
      { validator: 'required', message: 'oauthToken is required' },
    ],
  },
};

const ValidateAppTokenRule: Rule = {
  body: {
    appId: [
      { validator: 'required', message: 'appId is required' },
    ],
    appToken: [
      { validator: 'required', message: 'appToken is required' },
    ],
  },
};

const CreateApplicationRule: Rule = {
  body: {
    appName: [
      { validator: 'required', message: 'Application name is required' },
    ],
  },
};

const BanDeveloperRule: Rule = {
  body: {
    reason: [
      { validator: 'required', message: 'Reason is required' },
    ],
  },
};

const RejectKYBRule: Rule = {
  body: {
    comment: [
      { validator: 'required', message: 'Rejection reason is required' },
    ],
  },
};

const OAuthRevokeRule: Rule = {
  body: {
    refresh_token: [
      { validator: 'required', message: 'refresh_token is required' },
    ],
  },
};

// Helper to create a test app with a route that uses validate middleware
function createTestApp(rule: Rule, handler: (req: Request, res: Response) => void) {
  const app = express();
  app.use(express.json());
  app.post('/test', validate(rule), handler);
  return app;
}

describe('Validate Middleware Integration', () => {
  describe('LoginRule', () => {
    it('should reject when email is missing', async () => {
      const app = createTestApp(LoginRule, (_req, res) => {
        res.json({ code: 0, message: 'success' });
      });

      const res = await request(app)
        .post('/test')
        .send({ password: 'password123' })
        .expect(400);

      expect(res.body.code).toBe(40001);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email', message: 'Email is required' }),
        ])
      );
    });

    it('should reject when password is missing', async () => {
      const app = createTestApp(LoginRule, (_req, res) => {
        res.json({ code: 0, message: 'success' });
      });

      const res = await request(app)
        .post('/test')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password', message: 'Password is required' }),
        ])
      );
    });

    it('should reject invalid email format', async () => {
      const app = createTestApp(LoginRule, (_req, res) => {
        res.json({ code: 0, message: 'success' });
      });

      const res = await request(app)
        .post('/test')
        .send({ email: 'invalid-email', password: 'password123' })
        .expect(400);

      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email', message: 'Invalid email format' }),
        ])
      );
    });

    it('should reject short password', async () => {
      const app = createTestApp(LoginRule, (_req, res) => {
        res.json({ code: 0, message: 'success' });
      });

      const res = await request(app)
        .post('/test')
        .send({ email: 'test@example.com', password: '12345' })
        .expect(400);

      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password', message: 'Password must be at least 6 characters' }),
        ])
      );
    });

    it('should pass valid request through to controller', async () => {
      const app = createTestApp(LoginRule, (req, res) => {
        // Verify the controller receives the validated data
        expect(req.body.email).toBe('test@example.com');
        expect(req.body.password).toBe('password123');
        res.json({ code: 0, message: 'success' });
      });

      const res = await request(app)
        .post('/test')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.message).toBe('success');
    });
  });

  describe('RefreshTokenRule', () => {
    it('should reject when refreshToken is missing', async () => {
      const app = createTestApp(RefreshTokenRule, (_req, res) => {
        res.json({ code: 0 });
      });

      const res = await request(app)
        .post('/test')
        .send({})
        .expect(400);

      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'refreshToken', message: 'Refresh token is required' }),
        ])
      );
    });

    it('should pass valid refreshToken to controller', async () => {
      const app = createTestApp(RefreshTokenRule, (req, res) => {
        expect(req.body.refreshToken).toBe('valid-refresh-token');
        res.json({ code: 0, message: 'success' });
      });

      const res = await request(app)
        .post('/test')
        .send({ refreshToken: 'valid-refresh-token' })
        .expect(200);

      expect(res.body.code).toBe(0);
    });
  });

  describe('ChangePasswordRule', () => {
    it('should reject when currentPassword is missing', async () => {
      const app = createTestApp(ChangePasswordRule, (_req, res) => {
        res.json({ code: 0 });
      });

      const res = await request(app)
        .post('/test')
        .send({ newPassword: 'newpass123' })
        .expect(400);

      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'currentPassword', message: 'Current password is required' }),
        ])
      );
    });

    it('should reject when newPassword is too short', async () => {
      const app = createTestApp(ChangePasswordRule, (_req, res) => {
        res.json({ code: 0 });
      });

      const res = await request(app)
        .post('/test')
        .send({ currentPassword: 'oldpass', newPassword: '12345' })
        .expect(400);

      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'newPassword', message: 'New password must be at least 6 characters' }),
        ])
      );
    });

    it('should pass valid request to controller', async () => {
      const app = createTestApp(ChangePasswordRule, (req, res) => {
        expect(req.body.currentPassword).toBe('oldpass');
        expect(req.body.newPassword).toBe('newpass123');
        res.json({ code: 0, message: 'success' });
      });

      const res = await request(app)
        .post('/test')
        .send({ currentPassword: 'oldpass', newPassword: 'newpass123' })
        .expect(200);

      expect(res.body.code).toBe(0);
    });
  });

  describe('OAuthTokenRule', () => {
    it('should reject missing grant_type', async () => {
      const app = createTestApp(OAuthTokenRule, (_req, res) => {
        res.json({ code: 0 });
      });

      const res = await request(app)
        .post('/test')
        .send({ appid: 'test_app', appsecret: 'secret' })
        .expect(400);

      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'grant_type', message: 'grant_type is required' }),
        ])
      );
    });

    it('should reject invalid grant_type', async () => {
      const app = createTestApp(OAuthTokenRule, (_req, res) => {
        res.json({ code: 0 });
      });

      const res = await request(app)
        .post('/test')
        .send({ grant_type: 'password', appid: 'test_app', appsecret: 'secret' })
        .expect(400);

      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'grant_type', message: 'Invalid grant_type' }),
        ])
      );
    });

    it('should reject missing appid', async () => {
      const app = createTestApp(OAuthTokenRule, (_req, res) => {
        res.json({ code: 0 });
      });

      const res = await request(app)
        .post('/test')
        .send({ grant_type: 'client_credentials', appsecret: 'secret' })
        .expect(400);

      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'appid', message: 'appid is required' }),
        ])
      );
    });

    it('should accept valid client_credentials request', async () => {
      const app = createTestApp(OAuthTokenRule, (req, res) => {
        expect(req.body.grant_type).toBe('client_credentials');
        expect(req.body.appid).toBe('test_app');
        expect(req.body.appsecret).toBe('secret');
        res.json({ code: 0, message: 'success' });
      });

      const res = await request(app)
        .post('/test')
        .send({ grant_type: 'client_credentials', appid: 'test_app', appsecret: 'secret' })
        .expect(200);

      expect(res.body.code).toBe(0);
    });

    it('should accept valid refresh_token request', async () => {
      const app = createTestApp(OAuthTokenRule, (req, res) => {
        expect(req.body.grant_type).toBe('refresh_token');
        expect(req.body.appid).toBe('test_app');
        expect(req.body.refresh_token).toBe('token123');
        res.json({ code: 0, message: 'success' });
      });

      const res = await request(app)
        .post('/test')
        .send({ grant_type: 'refresh_token', appid: 'test_app', refresh_token: 'token123' })
        .expect(200);

      expect(res.body.code).toBe(0);
    });
  });

  describe('OAuthRevokeRule', () => {
    it('should reject missing refresh_token', async () => {
      const app = createTestApp(OAuthRevokeRule, (_req, res) => {
        res.json({ code: 0 });
      });

      const res = await request(app)
        .post('/test')
        .send({})
        .expect(400);

      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'refresh_token', message: 'refresh_token is required' }),
        ])
      );
    });

    it('should accept valid revoke request', async () => {
      const app = createTestApp(OAuthRevokeRule, (req, res) => {
        expect(req.body.refresh_token).toBe('token-to-revoke');
        res.json({ code: 0 });
      });

      const res = await request(app)
        .post('/test')
        .send({ refresh_token: 'token-to-revoke' })
        .expect(200);

      expect(res.body.code).toBe(0);
    });
  });

  describe('ValidateAppTokenRule', () => {
    it('should reject missing appId', async () => {
      const app = createTestApp(ValidateAppTokenRule, (_req, res) => {
        res.json({ code: 0 });
      });

      const res = await request(app)
        .post('/test')
        .send({ appToken: 'some-token' })
        .expect(400);

      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'appId', message: 'appId is required' }),
        ])
      );
    });

    it('should reject missing appToken', async () => {
      const app = createTestApp(ValidateAppTokenRule, (_req, res) => {
        res.json({ code: 0 });
      });

      const res = await request(app)
        .post('/test')
        .send({ appId: 'app-123' })
        .expect(400);

      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'appToken', message: 'appToken is required' }),
        ])
      );
    });

    it('should reject both missing', async () => {
      const app = createTestApp(ValidateAppTokenRule, (_req, res) => {
        res.json({ code: 0 });
      });

      const res = await request(app)
        .post('/test')
        .send({})
        .expect(400);

      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'appId', message: 'appId is required' }),
          expect.objectContaining({ field: 'appToken', message: 'appToken is required' }),
        ])
      );
    });

    it('should accept valid request', async () => {
      const app = createTestApp(ValidateAppTokenRule, (req, res) => {
        expect(req.body.appId).toBe('app-123');
        expect(req.body.appToken).toBe('valid-token');
        res.json({ code: 0, message: 'success' });
      });

      const res = await request(app)
        .post('/test')
        .send({ appId: 'app-123', appToken: 'valid-token' })
        .expect(200);

      expect(res.body.code).toBe(0);
    });
  });

  describe('ISVLoginRule', () => {
    it('should reject when email is missing', async () => {
      const app = createTestApp(ISVLoginRule, (_req, res) => {
        res.json({ code: 0 });
      });

      const res = await request(app)
        .post('/test')
        .send({ password: 'password123' })
        .expect(400);

      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email', message: 'Email is required' }),
        ])
      );
    });

    it('should reject invalid email format', async () => {
      const app = createTestApp(ISVLoginRule, (_req, res) => {
        res.json({ code: 0 });
      });

      const res = await request(app)
        .post('/test')
        .send({ email: 'not-an-email', password: 'password123' })
        .expect(400);

      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email', message: 'Invalid email format' }),
        ])
      );
    });

    it('should pass valid login to controller', async () => {
      const app = createTestApp(ISVLoginRule, (req, res) => {
        expect(req.body.email).toBe('test@example.com');
        expect(req.body.password).toBe('password123');
        res.json({ code: 0, message: 'success' });
      });

      const res = await request(app)
        .post('/test')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(200);

      expect(res.body.code).toBe(0);
    });
  });

  describe('RegisterRule', () => {
    it('should reject when email is missing', async () => {
      const app = createTestApp(RegisterRule, (_req, res) => {
        res.json({ code: 0 });
      });

      const res = await request(app)
        .post('/test')
        .send({ password: 'password123', legalName: 'Test Company' })
        .expect(400);

      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email', message: 'Email is required' }),
        ])
      );
    });

    it('should reject when legalName is missing', async () => {
      const app = createTestApp(RegisterRule, (_req, res) => {
        res.json({ code: 0 });
      });

      const res = await request(app)
        .post('/test')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(400);

      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'legalName', message: 'Company name is required' }),
        ])
      );
    });

    it('should pass valid registration to controller', async () => {
      const app = createTestApp(RegisterRule, (req, res) => {
        expect(req.body.email).toBe('test@example.com');
        expect(req.body.password).toBe('password123');
        expect(req.body.legalName).toBe('Test Company');
        res.json({ code: 0, message: 'success' });
      });

      const res = await request(app)
        .post('/test')
        .send({ email: 'test@example.com', password: 'password123', legalName: 'Test Company' })
        .expect(200);

      expect(res.body.code).toBe(0);
    });
  });

  describe('VerifyOAuthTokenRule', () => {
    it('should reject when resourceKey is missing', async () => {
      const app = createTestApp(VerifyOAuthTokenRule, (_req, res) => {
        res.json({ code: 0 });
      });

      const res = await request(app)
        .post('/test')
        .send({ oauthToken: 'valid-token' })
        .expect(400);

      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'resourceKey', message: 'resourceKey is required' }),
        ])
      );
    });

    it('should reject when oauthToken is missing', async () => {
      const app = createTestApp(VerifyOAuthTokenRule, (_req, res) => {
        res.json({ code: 0 });
      });

      const res = await request(app)
        .post('/test')
        .send({ resourceKey: 'resource-123' })
        .expect(400);

      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'oauthToken', message: 'oauthToken is required' }),
        ])
      );
    });

    it('should pass valid request to controller', async () => {
      const app = createTestApp(VerifyOAuthTokenRule, (req, res) => {
        expect(req.body.resourceKey).toBe('resource-123');
        expect(req.body.oauthToken).toBe('valid-token');
        res.json({ code: 0, message: 'success' });
      });

      const res = await request(app)
        .post('/test')
        .send({ resourceKey: 'resource-123', oauthToken: 'valid-token' })
        .expect(200);

      expect(res.body.code).toBe(0);
    });
  });

  describe('CreateApplicationRule', () => {
    it('should reject when appName is missing', async () => {
      const app = createTestApp(CreateApplicationRule, (_req, res) => {
        res.json({ code: 0 });
      });

      const res = await request(app)
        .post('/test')
        .send({ appDescription: 'A test app' })
        .expect(400);

      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'appName', message: 'Application name is required' }),
        ])
      );
    });

    it('should pass valid request to controller', async () => {
      const app = createTestApp(CreateApplicationRule, (req, res) => {
        expect(req.body.appName).toBe('My Test App');
        res.json({ code: 0, message: 'success' });
      });

      const res = await request(app)
        .post('/test')
        .send({ appName: 'My Test App' })
        .expect(200);

      expect(res.body.code).toBe(0);
    });
  });

  describe('BanDeveloperRule', () => {
    it('should reject when reason is missing', async () => {
      const app = createTestApp(BanDeveloperRule, (_req, res) => {
        res.json({ code: 0 });
      });

      const res = await request(app)
        .post('/test')
        .send({})
        .expect(400);

      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'reason', message: 'Reason is required' }),
        ])
      );
    });

    it('should pass valid reason to controller', async () => {
      const app = createTestApp(BanDeveloperRule, (req, res) => {
        expect(req.body.reason).toBe('Violation of terms');
        res.json({ code: 0, message: 'success' });
      });

      const res = await request(app)
        .post('/test')
        .send({ reason: 'Violation of terms' })
        .expect(200);

      expect(res.body.code).toBe(0);
    });
  });

  describe('RejectKYBRule', () => {
    it('should reject when comment is missing', async () => {
      const app = createTestApp(RejectKYBRule, (_req, res) => {
        res.json({ code: 0 });
      });

      const res = await request(app)
        .post('/test')
        .send({})
        .expect(400);

      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'comment', message: 'Rejection reason is required' }),
        ])
      );
    });

    it('should pass valid comment to controller', async () => {
      const app = createTestApp(RejectKYBRule, (req, res) => {
        expect(req.body.comment).toBe('Incomplete documentation');
        res.json({ code: 0, message: 'success' });
      });

      const res = await request(app)
        .post('/test')
        .send({ comment: 'Incomplete documentation' })
        .expect(200);

      expect(res.body.code).toBe(0);
    });
  });

  describe('Multiple errors', () => {
    it('should return all validation errors at once', async () => {
      const app = createTestApp(LoginRule, (_req, res) => {
        res.json({ code: 0 });
      });

      const res = await request(app)
        .post('/test')
        .send({ email: 'bad-email', password: '123' })
        .expect(400);

      expect(res.body.code).toBe(40001);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors).toHaveLength(2); // email format + password minLength
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email', message: 'Invalid email format' }),
          expect.objectContaining({ field: 'password', message: 'Password must be at least 6 characters' }),
        ])
      );
    });
  });
});