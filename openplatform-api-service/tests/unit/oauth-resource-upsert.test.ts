/**
 * OauthResource upsert — idempotency contract.
 *
 * (appId, resourceKey) must resolve to exactly one row, because that row's id
 * is what the gateway hands back as `authorizedId` / `authorizeId`. A null or
 * empty resourceKey falls outside the unique index (MySQL allows duplicate
 * NULLs), so concurrent authorizations would create distinct rows and return
 * inconsistent ids. The repository therefore rejects it outright.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockUpsert = vi.fn()
const mockFindFirst = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()

vi.mock('../../src/repositories/db-client', () => ({
  getClient: vi.fn(() => ({
    oauthResource: {
      upsert: mockUpsert,
      findFirst: mockFindFirst,
      create: mockCreate,
      update: mockUpdate,
    },
  })),
}))

import { OauthResourceRepositoryImpl } from '../../src/repositories/implementations/authorization.repository'

describe('OauthResource upsert', () => {
  let repo: OauthResourceRepositoryImpl

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new OauthResourceRepositoryImpl()
  })

  it('rejects a null resourceKey', async () => {
    await expect(
      repo.upsert({ appId: 'app-1', resourceKey: null as unknown as string }),
    ).rejects.toThrow(/resourceKey is required/)
  })

  it('rejects an empty resourceKey', async () => {
    await expect(repo.upsert({ appId: 'app-1', resourceKey: '' })).rejects.toThrow(
      /resourceKey is required/,
    )
  })

  it('never touches the database when the key is missing', async () => {
    await expect(
      repo.upsert({ appId: 'app-1', resourceKey: null as unknown as string }),
    ).rejects.toThrow()
    expect(mockUpsert).not.toHaveBeenCalled()
    expect(mockFindFirst).not.toHaveBeenCalled()
    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('issues a single atomic upsert keyed on (appId, resourceKey)', async () => {
    mockUpsert.mockResolvedValue({
      id: 'auth-1',
      appId: 'app-1',
      resourceKey: 'key-abc',
    })

    const result = await repo.upsert({ appId: 'app-1', resourceKey: 'key-abc' })

    expect(result.id).toBe('auth-1')
    expect(mockUpsert).toHaveBeenCalledTimes(1)
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          appId_resourceKey: { appId: 'app-1', resourceKey: 'key-abc' },
        },
      }),
    )
    // No read-then-write fallback: that path is what broke idempotency.
    expect(mockFindFirst).not.toHaveBeenCalled()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('refreshes authorizedAt and reactivates on repeat calls', async () => {
    mockUpsert.mockResolvedValue({ id: 'auth-1', appId: 'app-1', resourceKey: 'key-abc' })

    await repo.upsert({ appId: 'app-1', resourceKey: 'key-abc' })

    const args = mockUpsert.mock.calls[0][0]
    expect(args.update.status).toBe('active')
    expect(args.update.authorizedAt).toBeInstanceOf(Date)
    expect(args.create.status).toBe('active')
  })
})
