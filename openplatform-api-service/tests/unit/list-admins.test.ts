/**
 * listAdmins Controller Tests (Task 2.1)
 *
 * Tests for the admin listing endpoint that returns all admin users
 * without exposing sensitive fields like passwordHash.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Request, Response } from 'express'
import { BusinessCodes } from '../../src/enums/business-codes.enum'

// ---- Mock admin service ----
// The controller imports adminService from admin-auth.service,
// which internally uses getAdminRepository(). We mock the service
// module to avoid Prisma dependency.
const mockAdminService = {
  findAll: vi.fn(),
  findById: vi.fn(),
  findByEmail: vi.fn(),
  findByRole: vi.fn(),
  findActive: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  validatePassword: vi.fn(),
  validatePasswordStrength: vi.fn(),
}

vi.mock('../../src/services/admin-auth.service', () => ({
  adminService: mockAdminService,
  tokenBlacklistService: {
    isBlacklisted: vi.fn().mockResolvedValue(false),
    blacklist: vi.fn(),
    blacklistByAdmin: vi.fn(),
  },
}))

// ---- Helpers ----
function createMockReqRes(): { mockReq: Partial<Request>; mockRes: Partial<Response> } {
  const mockReq: Partial<Request> = {
    headers: {},
  }
  const mockRes: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }
  return { mockReq, mockRes }
}

function createAdmin(overrides: Record<string, any> = {}) {
  return {
    id: overrides.id || 'admin-1',
    email: overrides.email || 'admin@example.com',
    name: overrides.name || 'Test Admin',
    role: overrides.role || 'super_admin',
    status: overrides.status || 'active',
    lastLoginAt: overrides.lastLoginAt !== undefined ? overrides.lastLoginAt : new Date('2026-01-01'),
    createdAt: overrides.createdAt || new Date('2025-01-01'),
    updatedAt: overrides.updatedAt || new Date('2026-01-01'),
    passwordHash: overrides.passwordHash !== undefined ? overrides.passwordHash : '$2b$12$hashedPasswordValue',
  }
}

describe('listAdmins Controller (Task 2.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ====================================================
  // Test 1: listAdmins returns all admins (list + total)
  // ====================================================

  it('should return all admins with list and total', async () => {
    const { mockReq, mockRes } = createMockReqRes()
    const admins = [
      createAdmin({ id: 'admin-1', email: 'alice@example.com', name: 'Alice' }),
      createAdmin({ id: 'admin-2', email: 'bob@example.com', name: 'Bob' }),
      createAdmin({ id: 'admin-3', email: 'charlie@example.com', name: 'Charlie' }),
    ]
    mockAdminService.findAll.mockResolvedValue(admins)

    const { listAdmins } = await import(
      '../../src/controllers/admin-auth.controller'
    )
    await listAdmins(mockReq as Request, mockRes as Response)

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 0,
        message: 'success',
        data: expect.objectContaining({
          list: expect.any(Array),
          total: expect.any(Number),
        }),
      }),
    )

    const call = (mockRes.json as any).mock.calls[0][0]
    expect(call.data.list).toHaveLength(3)
    expect(call.data.total).toBe(3)
  })

  it('should return empty list when no admins exist', async () => {
    const { mockReq, mockRes } = createMockReqRes()
    mockAdminService.findAll.mockResolvedValue([])

    const { listAdmins } = await import(
      '../../src/controllers/admin-auth.controller'
    )
    await listAdmins(mockReq as Request, mockRes as Response)

    const call = (mockRes.json as any).mock.calls[0][0]
    expect(call.data.list).toHaveLength(0)
    expect(call.data.total).toBe(0)
  })

  // ====================================================
  // Test 2: listAdmins does NOT include passwordHash
  // ====================================================

  it('should NOT include passwordHash in the response', async () => {
    const { mockReq, mockRes } = createMockReqRes()
    const admin = createAdmin({
      id: 'admin-secret',
      email: 'secret@example.com',
      passwordHash: '$2b$12$secretHashValue1234567890',
    })
    mockAdminService.findAll.mockResolvedValue([admin])

    const { listAdmins } = await import(
      '../../src/controllers/admin-auth.controller'
    )
    await listAdmins(mockReq as Request, mockRes as Response)

    const call = (mockRes.json as any).mock.calls[0][0]
    const returnedAdmin = call.data.list[0]

    // Verify expected fields are present
    expect(returnedAdmin).toHaveProperty('id')
    expect(returnedAdmin).toHaveProperty('email')
    expect(returnedAdmin).toHaveProperty('name')
    expect(returnedAdmin).toHaveProperty('role')
    expect(returnedAdmin).toHaveProperty('status')
    expect(returnedAdmin).toHaveProperty('lastLoginAt')
    expect(returnedAdmin).toHaveProperty('createdAt')

    // Verify passwordHash is NOT present
    expect(returnedAdmin).not.toHaveProperty('passwordHash')

    // Verify the JSON string does not contain the word passwordHash
    const jsonStr = JSON.stringify(call)
    expect(jsonStr).not.toContain('passwordHash')
  })

  it('should NOT include passwordHash even when multiple admins returned', async () => {
    const { mockReq, mockRes } = createMockReqRes()
    const admins = [
      createAdmin({ id: 'a1', passwordHash: 'hash1' }),
      createAdmin({ id: 'a2', passwordHash: 'hash2' }),
      createAdmin({ id: 'a3', passwordHash: 'hash3' }),
    ]
    mockAdminService.findAll.mockResolvedValue(admins)

    const { listAdmins } = await import(
      '../../src/controllers/admin-auth.controller'
    )
    await listAdmins(mockReq as Request, mockRes as Response)

    const call = (mockRes.json as any).mock.calls[0][0]
    const jsonStr = JSON.stringify(call)

    expect(jsonStr).not.toContain('passwordHash')

    // Verify all three admins are in the response
    expect(call.data.list).toHaveLength(3)
    call.data.list.forEach((a: any) => {
      expect(a).not.toHaveProperty('passwordHash')
    })
  })

  // ====================================================
  // Test 3: listAdmins returns 500 on database error
  // ====================================================

  it('should return 500 on database error', async () => {
    const { mockReq, mockRes } = createMockReqRes()
    mockAdminService.findAll.mockRejectedValue(new Error('Database connection failed'))

    const { listAdmins } = await import(
      '../../src/controllers/admin-auth.controller'
    )
    await listAdmins(mockReq as Request, mockRes as Response)

    expect(mockRes.status).toHaveBeenCalledWith(500)
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: BusinessCodes.SERVER_INTERNAL,
        message: 'Internal server error',
      }),
    )
  })

  it('should return 500 with trace_id on database error', async () => {
    const { mockReq, mockRes } = createMockReqRes()
    mockReq.headers = { 'x-trace-id': 'trace-abc-123' }
    mockAdminService.findAll.mockRejectedValue(new Error('DB error'))

    const { listAdmins } = await import(
      '../../src/controllers/admin-auth.controller'
    )
    await listAdmins(mockReq as Request, mockRes as Response)

    expect(mockRes.status).toHaveBeenCalledWith(500)
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: BusinessCodes.SERVER_INTERNAL,
        message: 'Internal server error',
        trace_id: 'trace-abc-123',
      }),
    )
  })
})