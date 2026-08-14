/**
 * Admin Audit Identity Tests (Task 1.2)
 *
 * Verifies that admin identity is sourced from the request object's
 * adminId/adminEmail properties (set by auth middleware), NOT from
 * HTTP headers or other sources.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Request, Response } from 'express'

// ============================================
// Task 1.2: admin-audit-identity
// ============================================

// ---- Mock for kybReviewService (isv-status.controller.ts) ----
const mockChangeISVStatus = vi.fn()

const ISVStatus = { ACTIVE: 'active', SUSPENDED: 'suspended', BANNED: 'banned' }
const KYBStatus = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected', PENDING_INFO: 'pending_info' }

vi.mock('../../src/services/kyb-review.service', () => ({
  kybReviewService: {
    getISVById: vi.fn(),
    getISVStatusHistory: vi.fn(),
    changeISVStatus: mockChangeISVStatus,
  },
  ISVStatus,
  KYBStatus,
}))

// ---- Mock for repository factory (developer.controller.ts) ----
const mockIsvRepo = {
  findById: vi.fn(),
  findByEmail: vi.fn(),
  findByRegistrationNumber: vi.fn(),
  findByFilters: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

vi.mock('../../src/repositories/repository.factory', () => ({
  getIsvDeveloperRepository: vi.fn(() => mockIsvRepo),
  getISVUserRepository: vi.fn(() => ({})),
  getAdminRepository: vi.fn(() => ({})),
  getApplicationRepository: vi.fn(() => ({})),
}))

// ---- Helpers ----
function createMockReqRes(): { mockReq: Partial<Request>; mockRes: Partial<Response> } {
  const mockReq: Partial<Request> = {
    body: {},
    params: {},
    headers: {},
  }
  const mockRes: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }
  return { mockReq, mockRes }
}

describe('Admin Audit Identity (Task 1.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ====================================================
  // ISV Status Controller: (req as any).adminId
  // ====================================================

  describe('activateISV - uses (req as any).adminId', () => {
    it('should pass adminId from request object to changeISVStatus', async () => {
      const { mockReq, mockRes } = createMockReqRes()
      ;(mockReq as any).adminId = 'admin-42'
      mockReq.params = { id: 'isv-001' }
      mockReq.body = { reason: 'compliance review passed' }

      mockChangeISVStatus.mockReturnValue({ success: true })

      const { activateISV } = await import(
        '../../src/controllers/admin/isv-status.controller'
      )
      await activateISV(mockReq as Request, mockRes as Response)

      expect(mockChangeISVStatus).toHaveBeenCalledWith(
        'isv-001',
        'admin-42',
        expect.objectContaining({ status: 'active' }),
      )
    })

    it('should NOT use x-admin-id header for adminId', async () => {
      const { mockReq, mockRes } = createMockReqRes()
      // Set adminId on request object (the correct source)
      ;(mockReq as any).adminId = 'admin-42'
      // Set a different value in the header (should be ignored)
      mockReq.headers = { 'x-admin-id': 'header-admin-999' }
      mockReq.params = { id: 'isv-001' }
      mockReq.body = { reason: 'test' }

      mockChangeISVStatus.mockReturnValue({ success: true })

      const { activateISV } = await import(
        '../../src/controllers/admin/isv-status.controller'
      )
      await activateISV(mockReq as Request, mockRes as Response)

      // verify the header value was NOT used
      expect(mockChangeISVStatus).toHaveBeenCalledWith(
        'isv-001',
        'admin-42',
        expect.any(Object),
      )
      expect(mockChangeISVStatus).not.toHaveBeenCalledWith(
        'isv-001',
        'header-admin-999',
        expect.any(Object),
      )
    })
  })

  describe('suspendISV - uses (req as any).adminId', () => {
    it('should pass adminId from request object to changeISVStatus', async () => {
      const { mockReq, mockRes } = createMockReqRes()
      ;(mockReq as any).adminId = 'admin-77'
      mockReq.params = { id: 'isv-002' }
      mockReq.body = { reason: 'compliance investigation' }

      mockChangeISVStatus.mockReturnValue({ success: true })

      const { suspendISV } = await import(
        '../../src/controllers/admin/isv-status.controller'
      )
      await suspendISV(mockReq as Request, mockRes as Response)

      expect(mockChangeISVStatus).toHaveBeenCalledWith(
        'isv-002',
        'admin-77',
        expect.objectContaining({ status: 'suspended' }),
      )
    })
  })

  describe('banISV - uses (req as any).adminId', () => {
    it('should pass adminId from request object to changeISVStatus', async () => {
      const { mockReq, mockRes } = createMockReqRes()
      ;(mockReq as any).adminId = 'admin-99'
      mockReq.params = { id: 'isv-003' }
      mockReq.body = { reason: 'violation of terms' }

      mockChangeISVStatus.mockReturnValue({ success: true })

      const { banISV } = await import(
        '../../src/controllers/admin/isv-status.controller'
      )
      await banISV(mockReq as Request, mockRes as Response)

      expect(mockChangeISVStatus).toHaveBeenCalledWith(
        'isv-003',
        'admin-99',
        expect.objectContaining({ status: 'banned' }),
      )
    })
  })

  // ====================================================
  // Developer Controller: (req as any).adminEmail
  // ====================================================

  describe('approveDeveloper - uses (req as any).adminEmail', () => {
    it('should pass adminEmail from request object as kybReviewedBy', async () => {
      const { mockReq, mockRes } = createMockReqRes()
      ;(mockReq as any).adminEmail = 'reviewer@example.com'
      mockReq.params = { id: 'dev-001' }

      mockIsvRepo.findById.mockResolvedValue({
        id: 'dev-001',
        kybStatus: 'pending',
        status: 'pending',
      })
      mockIsvRepo.update.mockResolvedValue({
        id: 'dev-001',
        kybStatus: 'approved',
        kybReviewedAt: new Date(),
        kybReviewedBy: 'reviewer@example.com',
        status: 'active',
      })

      const { approveDeveloper } = await import(
        '../../src/controllers/admin/developer.controller'
      )
      await approveDeveloper(mockReq as Request, mockRes as Response)

      expect(mockIsvRepo.update).toHaveBeenCalledWith(
        'dev-001',
        expect.objectContaining({
          kybStatus: 'approved',
          kybReviewedBy: 'reviewer@example.com',
        }),
      )
    })

    it('should NOT use (req as any).user?.email for reviewer', async () => {
      const { mockReq, mockRes } = createMockReqRes()
      ;(mockReq as any).adminEmail = 'reviewer@example.com'
      // Set a different email on user (should be ignored)
      ;(mockReq as any).user = { email: 'wrong-user@example.com' }
      mockReq.params = { id: 'dev-001' }
      mockReq.body = {}

      mockIsvRepo.findById.mockResolvedValue({
        id: 'dev-001',
        kybStatus: 'pending',
        status: 'pending',
      })
      mockIsvRepo.update.mockResolvedValue({
        id: 'dev-001',
        kybStatus: 'approved',
        kybReviewedAt: new Date(),
        kybReviewedBy: 'reviewer@example.com',
        status: 'active',
      })

      const { approveDeveloper } = await import(
        '../../src/controllers/admin/developer.controller'
      )
      await approveDeveloper(mockReq as Request, mockRes as Response)

      expect(mockIsvRepo.update).toHaveBeenCalledWith(
        'dev-001',
        expect.objectContaining({
          kybReviewedBy: 'reviewer@example.com',
        }),
      )
      expect(mockIsvRepo.update).not.toHaveBeenCalledWith(
        'dev-001',
        expect.objectContaining({
          kybReviewedBy: 'wrong-user@example.com',
        }),
      )
    })
  })

  describe('rejectDeveloper - uses (req as any).adminEmail', () => {
    it('should pass adminEmail from request object as kybReviewedBy', async () => {
      const { mockReq, mockRes } = createMockReqRes()
      ;(mockReq as any).adminEmail = 'rejector@example.com'
      mockReq.params = { id: 'dev-002' }
      mockReq.body = { reason: 'documentation insufficient' }

      mockIsvRepo.findById.mockResolvedValue({
        id: 'dev-002',
        kybStatus: 'pending',
        status: 'pending',
      })
      mockIsvRepo.update.mockResolvedValue({
        id: 'dev-002',
        kybStatus: 'rejected',
        kybReviewedAt: new Date(),
        kybReviewedBy: 'rejector@example.com',
        status: 'suspended',
      })

      const { rejectDeveloper } = await import(
        '../../src/controllers/admin/developer.controller'
      )
      await rejectDeveloper(mockReq as Request, mockRes as Response)

      expect(mockIsvRepo.update).toHaveBeenCalledWith(
        'dev-002',
        expect.objectContaining({
          kybStatus: 'rejected',
          kybReviewedBy: 'rejector@example.com',
        }),
      )
    })
  })
})