/**
 * ISV Auth Controller Integration Tests
 * Tests the complete request flow: Express app -> route -> validate middleware -> controller
 * using supertest to send real HTTP requests through the full middleware chain.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { Router, Request, Response } from 'express';
import request from 'supertest';
import { generateToken, verifyToken } from '../../src/controllers/isv/isv-auth.controller';
import { isvService, isvUserService } from '../../src/services/isv-user.service';
import { validateRegister, validateISVLogin } from '../../src/validate/rules';

// Mock dependencies
vi.mock('../../src/services/isv-user.service', () => ({
  isvService: {
    createISV: vi.fn(),
    getISVById: vi.fn()
  },
  isvUserService: {
    getUserByEmail: vi.fn(),
    registerOwner: vi.fn(),
    login: vi.fn()
  }
}));

// Create a full Express app with ISV auth routes mounted
function createISVAuthApp() {
  const app = express();
  app.use(express.json());

  const router = Router();

  // POST /auth/register
  router.post('/auth/register', validateRegister, async (req: Request, res: Response) => {
    const { register } = await import('../../src/controllers/isv/isv-auth.controller');
    return register(req, res);
  });

  // POST /auth/login
  router.post('/auth/login', validateISVLogin, async (req: Request, res: Response) => {
    const { ownerLogin } = await import('../../src/controllers/isv/isv-auth.controller');
    return ownerLogin(req, res);
  });

  app.use('/isv', router);
  return app;
}

describe('ISV Auth Controller Integration', () => {
  let app: express.Application;

  const validPayload = {
    email: 'newuser@example.com',
    password: 'password123',
    legalName: 'Test Company',
    registrationNumber: '12345678',
    jurisdiction: 'CN',
    dateOfIncorporation: '2020-01-01',
    registeredAddress: 'Test Address',
    website: 'https://test.com',
    uboInfo: [{ name: 'John Doe', idType: 'passport', idNumber: 'AB123456', nationality: 'US', phone: '+1234567890' }]
  };

  const loginPayload = {
    email: 'test@example.com',
    password: 'password123'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    app = createISVAuthApp();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const payload = {
        userId: 'user-123',
        isvDeveloperId: 'isv-456',
        email: 'test@example.com',
        role: 'owner'
      };
      const token = generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT format
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const payload = {
        userId: 'user-123',
        isvDeveloperId: 'isv-456',
        email: 'test@example.com',
        role: 'owner'
      };
      const token = generateToken(payload);
      const decoded = verifyToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe('user-123');
      expect(decoded?.isvDeveloperId).toBe('isv-456');
      expect(decoded?.email).toBe('test@example.com');
      expect(decoded?.role).toBe('owner');
    });

    it('should return null for invalid token', () => {
      const result = verifyToken('invalid-token');
      expect(result).toBeNull();
    });
  });

  describe('POST /isv/auth/register', () => {
    describe('Validation (via validate middleware)', () => {
      it('should reject when email is missing', async () => {
        const res = await request(app)
          .post('/isv/auth/register')
          .send({ password: 'password123', legalName: 'Test Company' })
          .expect(400);

        expect(res.body.code).toBe(40001);
        expect(res.body.message).toBe('Validation failed');
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: 'email', message: 'Email is required' }),
          ])
        );
      });

      it('should reject when legalName is missing', async () => {
        const res = await request(app)
          .post('/isv/auth/register')
          .send({ email: 'test@example.com', password: 'password123' })
          .expect(400);

        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: 'legalName', message: 'Company name is required' }),
          ])
        );
      });

      it('should reject invalid email format', async () => {
        const res = await request(app)
          .post('/isv/auth/register')
          .send({ email: 'bad-email', password: 'password123', legalName: 'Test Company' })
          .expect(400);

        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: 'email', message: 'Invalid email format' }),
          ])
        );
      });

      it('should reject short password', async () => {
        const res = await request(app)
          .post('/isv/auth/register')
          .send({ email: 'test@example.com', password: '123', legalName: 'Test Company' })
          .expect(400);

        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: 'password', message: 'Password must be at least 6 characters' }),
          ])
        );
      });
    });

    describe('Business Logic', () => {
      it('should reject registration with missing UBO info', async () => {
        const res = await request(app)
          .post('/isv/auth/register')
          .send({ ...validPayload, uboInfo: [] })
          .expect(400);

        expect(res.body.code).toBe(40002);
      });

      it('should reject registration with existing email', async () => {
        vi.mocked(isvUserService.getUserByEmail).mockResolvedValue({
          id: 'existing-user',
          email: 'newuser@example.com',
          isvDeveloperId: 'existing-isv',
          name: 'Existing User',
          role: 'owner',
          status: 'active',
          allowedApplications: [],
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01'
        });

        const res = await request(app)
          .post('/isv/auth/register')
          .send(validPayload)
          .expect(409);

        expect(res.body.code).toBe(40902);
      });

      it('should successfully register new ISV', async () => {
        vi.mocked(isvUserService.getUserByEmail).mockResolvedValue(null);
        vi.mocked(isvService.createISV).mockResolvedValue({
          id: 'new-isv-123',
          legalName: 'Test Company',
          registrationNumber: '12345678',
          jurisdiction: 'CN',
          dateOfIncorporation: '2020-01-01',
          registeredAddress: 'Test Address',
          website: 'https://test.com',
          kybStatus: 'pending',
          status: 'active',
          uboInfo: validPayload.uboInfo,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01'
        });
        vi.mocked(isvUserService.registerOwner).mockResolvedValue({
          success: true,
          user: {
            id: 'new-user-123',
            isvDeveloperId: 'new-isv-123',
            email: 'newuser@example.com',
            name: 'Test Company',
            role: 'owner',
            status: 'active',
            allowedApplications: [],
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01'
          }
        });

        const res = await request(app)
          .post('/isv/auth/register')
          .send(validPayload)
          .expect(201);

        expect(res.body.code).toBe(0);
        expect(res.body.message).toBe('Registration successful');
        expect(res.body.data.accessToken).toBeDefined();
        expect(res.body.data.user).toBeDefined();
      });
    });
  });

  describe('POST /isv/auth/login', () => {
    describe('Validation (via validate middleware)', () => {
      it('should reject when email is missing', async () => {
        const res = await request(app)
          .post('/isv/auth/login')
          .send({ password: 'password123' })
          .expect(400);

        expect(res.body.code).toBe(40001);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: 'email', message: 'Email is required' }),
          ])
        );
      });

      it('should reject when password is missing', async () => {
        const res = await request(app)
          .post('/isv/auth/login')
          .send({ email: 'test@example.com' })
          .expect(400);

        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: 'password', message: 'Password is required' }),
          ])
        );
      });

      it('should reject invalid email format', async () => {
        const res = await request(app)
          .post('/isv/auth/login')
          .send({ email: 'not-an-email', password: 'password123' })
          .expect(400);

        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: 'email', message: 'Invalid email format' }),
          ])
        );
      });
    });

    describe('Business Logic', () => {
      it('should reject login with nonexistent email', async () => {
        vi.mocked(isvUserService.getUserByEmail).mockResolvedValue(null);

        const res = await request(app)
          .post('/isv/auth/login')
          .send(loginPayload)
          .expect(401);

        expect(res.body.code).toBe(40110);
      });

      it('should reject login with wrong password', async () => {
        vi.mocked(isvUserService.getUserByEmail).mockResolvedValue({
          id: 'user-123',
          isvDeveloperId: 'isv-456',
          email: 'test@example.com',
          name: 'Test User',
          role: 'owner',
          status: 'active',
          allowedApplications: [],
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01'
        });
        vi.mocked(isvUserService.login).mockResolvedValue({
          success: false,
          error: 'Invalid credentials'
        });

        const res = await request(app)
          .post('/isv/auth/login')
          .send(loginPayload)
          .expect(401);

        expect(res.body.code).toBe(40110);
      });

      it('should successfully login with valid credentials', async () => {
        vi.mocked(isvUserService.getUserByEmail).mockResolvedValue({
          id: 'user-123',
          isvDeveloperId: 'isv-456',
          email: 'test@example.com',
          name: 'Test User',
          role: 'owner',
          status: 'active',
          allowedApplications: [],
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01'
        });
        vi.mocked(isvUserService.login).mockResolvedValue({
          success: true,
          user: {
            id: 'user-123',
            isvDeveloperId: 'isv-456',
            email: 'test@example.com',
            name: 'Test User',
            role: 'owner',
            status: 'active',
            allowedApplications: [],
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01'
          }
        });

        const res = await request(app)
          .post('/isv/auth/login')
          .send(loginPayload)
          .expect(200);

        expect(res.body.code).toBe(0);
        expect(res.body.message).toBe('Login successful');
        expect(res.body.data.accessToken).toBeDefined();
      });
    });
  });
});