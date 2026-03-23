import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { isvService, isvUserService, isvApplicationService } from '../../src/services/isv-user.service'
import { getIsvDeveloperRepository, getISVUserRepository, getApplicationRepository } from '../../src/repositories/repository.factory'
import bcrypt from 'bcrypt'

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    hashSync: vi.fn(() => 'hashed_password'),
    compareSync: vi.fn((_: string, __: string) => true)
  }
}))

// Mock repositories
vi.mock('../../src/repositories/repository.factory', () => ({
  getIsvDeveloperRepository: vi.fn(),
  getISVUserRepository: vi.fn(),
  getApplicationRepository: vi.fn()
}))

describe('ISV User Service', () => {
  let mockIsvDeveloperRepo: any
  let mockIsvUserRepo: any
  let mockAppRepo: any

  beforeEach(() => {
    mockIsvDeveloperRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      findByEmail: vi.fn(),
      findByRegistrationNumber: vi.fn()
    }
    mockIsvUserRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findByIsvDeveloper: vi.fn(),
      findByIsvDeveloperAndEmail: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
    mockAppRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByAppId: vi.fn(),
      findByIsvDeveloper: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }

    vi.mocked(getIsvDeveloperRepository).mockReturnValue(mockIsvDeveloperRepo)
    vi.mocked(getISVUserRepository).mockReturnValue(mockIsvUserRepo)
    vi.mocked(getApplicationRepository).mockReturnValue(mockAppRepo)
    vi.clearAllMocks()
  })

  describe('isvService', () => {
    describe('createISV', () => {
      it('should create a new ISV developer', async () => {
        const params = {
          legalName: 'Test Company',
          registrationNumber: '12345678',
          jurisdiction: 'CN',
          dateOfIncorporation: '2020-01-01',
          registeredAddress: 'Test Address',
          website: 'https://test.com',
          uboInfo: [{ name: 'John Doe', idType: 'passport', idNumber: 'AB123456', nationality: 'US', phone: '+1234567890' }]
        }

        mockIsvDeveloperRepo.create.mockResolvedValue({
          id: 'isv-123',
          ...params,
          kybStatus: 'pending',
          status: 'active',
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01'
        })

        const result = await isvService.createISV(params)

        expect(result).toBeDefined()
        expect(result.id).toBe('isv-123')
        expect(result.legalName).toBe('Test Company')
        expect(result.kybStatus).toBe('pending')
        expect(mockIsvDeveloperRepo.create).toHaveBeenCalled()
      })
    })

    describe('getISVById', () => {
      it('should return ISV by ID', async () => {
        mockIsvDeveloperRepo.findById.mockResolvedValue({
          id: 'isv-123',
          legalName: 'Test Company'
        })

        const result = await isvService.getISVById('isv-123')

        expect(result).not.toBeNull()
        expect(result?.id).toBe('isv-123')
        expect(mockIsvDeveloperRepo.findById).toHaveBeenCalledWith('isv-123')
      })

      it('should return null for non-existent ISV', async () => {
        mockIsvDeveloperRepo.findById.mockResolvedValue(null)

        const result = await isvService.getISVById('non-existent')

        expect(result).toBeNull()
      })
    })

    describe('updateISV', () => {
      it('should update ISV fields', async () => {
        mockIsvDeveloperRepo.update.mockResolvedValue({
          id: 'isv-123',
          legalName: 'Updated Company',
          kybStatus: 'approved'
        })

        const result = await isvService.updateISV('isv-123', { kybStatus: 'approved' })

        expect(result).not.toBeNull()
        expect(result?.kybStatus).toBe('approved')
        expect(mockIsvDeveloperRepo.update).toHaveBeenCalled()
      })
    })
  })

  describe('isvUserService', () => {
    describe('registerOwner', () => {
      it('should register a new owner user', async () => {
        const params = {
          isvDeveloperId: 'isv-123',
          email: 'owner@test.com',
          password: 'password123',
          name: 'Test Owner'
        }

        mockIsvUserRepo.findByIsvDeveloperAndEmail.mockResolvedValue(null)
        mockIsvUserRepo.create.mockResolvedValue({
          id: 'user-123',
          ...params,
          role: 'owner',
          status: 'active',
          allowedApplications: [],
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01'
        })

        const result = await isvUserService.registerOwner(params)

        expect(result.success).toBe(true)
        expect(result.user).toBeDefined()
        expect(result.user?.email).toBe('owner@test.com')
      })

      it('should fail if email already exists', async () => {
        const params = {
          isvDeveloperId: 'isv-123',
          email: 'existing@test.com',
          password: 'password123',
          name: 'Test Owner'
        }

        mockIsvUserRepo.findByIsvDeveloperAndEmail.mockResolvedValue({
          id: 'existing-user',
          isvDeveloperId: 'isv-123',
          email: 'existing@test.com'
        })

        const result = await isvUserService.registerOwner(params)

        expect(result.success).toBe(false)
        expect(result.error).toContain('already registered')
      })
    })

    describe('login', () => {
      it('should login with correct credentials', async () => {
        const hashedPassword = '$2b$10$hashedpassword'
        mockIsvUserRepo.findByIsvDeveloperAndEmail.mockResolvedValue({
          id: 'user-123',
          isvDeveloperId: 'isv-123',
          email: 'test@test.com',
          password: hashedPassword,
          role: 'owner',
          status: 'active'
        })

        const result = await isvUserService.login('isv-123', 'test@test.com', 'password123')

        expect(result.success).toBe(true)
        expect(result.user).toBeDefined()
      })

      it('should fail with incorrect password', async () => {
        const hashedPassword = '$2b$10$hashedpassword'
        mockIsvUserRepo.findByIsvDeveloperAndEmail.mockResolvedValue({
          id: 'user-123',
          isvDeveloperId: 'isv-123',
          email: 'test@test.com',
          password: hashedPassword,
          role: 'owner',
          status: 'active'
        })
        // Mock bcrypt to return false for wrong password
        vi.mocked(bcrypt.compareSync).mockReturnValueOnce(false)

        const result = await isvUserService.login('isv-123', 'test@test.com', 'wrongpassword')

        expect(result.success).toBe(false)
      })
    })

    describe('getUsersByISV', () => {
      it('should return all users for an ISV', async () => {
        const users = [
          { id: 'user-1', isvDeveloperId: 'isv-123', email: 'user1@test.com', role: 'owner' },
          { id: 'user-2', isvDeveloperId: 'isv-123', email: 'user2@test.com', role: 'developer' }
        ]
        mockIsvUserRepo.findByIsvDeveloper.mockResolvedValue(users)

        const result = await isvUserService.getUsersByISV('isv-123')

        expect(result).toHaveLength(2)
        expect(result[0].password).toBeUndefined() // password should be excluded
      })
    })
  })

  describe('isvApplicationService', () => {
    describe('createApplication', () => {
      it('should create a new application', async () => {
        const params = {
          isvDeveloperId: 'isv-123',
          name: 'Test App',
          description: 'Test application',
          type: 'corporate' as const
        }

        mockAppRepo.create.mockResolvedValue({
          id: 'app-123',
          ...params,
          appId: 'ak_test123',
          status: 'pending_review',
          permittedUsers: [],
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01'
        })

        const result = await isvApplicationService.createApplication(params)

        expect(result).toBeDefined()
        expect(result.name).toBe('Test App')
        expect(result.appId).toBeDefined()
      })
    })

    describe('getApplicationsByISV', () => {
      it('should return applications for an ISV', async () => {
        const apps = [
          { id: 'app-1', isvDeveloperId: 'isv-123', name: 'App 1', appSecret: 'secret1' },
          { id: 'app-2', isvDeveloperId: 'isv-123', name: 'App 2', appSecret: 'secret2' }
        ]
        mockAppRepo.findByIsvDeveloper.mockResolvedValue(apps)

        const result = await isvApplicationService.getApplicationsByISV('isv-123')

        expect(result).toHaveLength(2)
        expect(result[0].appSecret).toBeUndefined() // appSecret should be excluded
      })
    })
  })
})
