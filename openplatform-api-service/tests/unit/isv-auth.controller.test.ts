import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Request, Response } from 'express'
import { register, ownerLogin, generateToken, verifyToken } from '../../src/controllers/isv-auth.controller'
import { isvService, isvUserService } from '../../src/services/isv-user.service'

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
}))

describe('ISV Auth Controller', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>

  beforeEach(() => {
    mockReq = {
      body: {}
    }
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    }
    vi.clearAllMocks()
  })

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const payload = {
        userId: 'user-123',
        isvDeveloperId: 'isv-456',
        email: 'test@example.com',
        role: 'owner'
      }
      const token = generateToken(payload)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3) // JWT format
    })
  })

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const payload = {
        userId: 'user-123',
        isvDeveloperId: 'isv-456',
        email: 'test@example.com',
        role: 'owner'
      }
      const token = generateToken(payload)
      const decoded = verifyToken(token)

      expect(decoded).not.toBeNull()
      expect(decoded?.userId).toBe('user-123')
      expect(decoded?.isvDeveloperId).toBe('isv-456')
      expect(decoded?.email).toBe('test@example.com')
      expect(decoded?.role).toBe('owner')
    })

    it('should return null for invalid token', () => {
      const result = verifyToken('invalid-token')
      expect(result).toBeNull()
    })
  })

  describe('register', () => {
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
    }

    it('should reject registration with missing required fields', async () => {
      mockReq.body = { email: 'test@example.com' }

      await register(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 40001 })
      )
    })

    it('should reject registration with missing UBO info', async () => {
      mockReq.body = { ...validPayload, uboInfo: [] }

      await register(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 40002 })
      )
    })

    it('should reject registration with existing email', async () => {
      mockReq.body = validPayload
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
      })

      await register(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(409)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 40901 })
      )
    })

    it('should successfully register new ISV', async () => {
      mockReq.body = validPayload
      vi.mocked(isvUserService.getUserByEmail).mockResolvedValue(null)
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
      })
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
      })

      await register(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(201)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 0,
          message: 'Registration successful'
        })
      )
    })
  })

  describe('ownerLogin', () => {
    const loginPayload = {
      email: 'test@example.com',
      password: 'password123'
    }

    it('should reject login with missing credentials', async () => {
      mockReq.body = { email: 'test@example.com' }

      await ownerLogin(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(400)
    })

    it('should reject login with invalid email', async () => {
      mockReq.body = loginPayload
      vi.mocked(isvUserService.getUserByEmail).mockResolvedValue(null)

      await ownerLogin(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 40101 })
      )
    })

    it('should successfully login with valid credentials', async () => {
      mockReq.body = loginPayload
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
      })
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
      })

      await ownerLogin(mockReq as Request, mockRes as Response)

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 0,
          message: 'Login successful'
        })
      )
    })
  })
})
