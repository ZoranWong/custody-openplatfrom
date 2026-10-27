/**
 * merchant/register route behaviour.
 *
 * - custody requires an owner user; without one it returns an opaque 500, which
 *   the gateway now turns into a 400 before forwarding.
 * - the access key custody returns is stored and replaced by the gateway-side
 *   authorizedId; on idempotent re-registration custody omits the key, so the
 *   response carries no authorizedId.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockUpsert = vi.fn()

vi.mock('../../src/repositories/repository.factory', () => ({
  getOauthResourceRepository: () => ({ upsert: mockUpsert }),
}))

import { FORWARD_ROUTES } from '../../src/config/forward-routes'

const route = FORWARD_ROUTES.find((r) => r.routeId === 'merchant-register')!

const APP_ID = 'd81a6f17-fd1c-4679-a488-6e380898503c'
const req = { context: { application: { id: APP_ID } }, body: {} } as any

function envelope(data: any) {
  return { code: 200, message: 'SUCCESS', data }
}

describe('merchant/register validateBusiness', () => {
  const validate = route.validateBusiness!

  it('rejects a request without an owner', () => {
    expect(validate({ legalName: 'Acme', appId: APP_ID })).toMatch(/owner\.email/)
    expect(validate({ legalName: 'Acme', owner: {} })).toMatch(/owner\.email/)
    expect(validate({ legalName: 'Acme', owner: { email: 'a@b.c' } })).toMatch(/owner\.password/)
  })

  it('accepts a request with owner email + password', () => {
    expect(
      validate({ legalName: 'Acme', owner: { email: 'a@b.c', password: 'Str0ng!Passw0rd' } }),
    ).toBeNull()
  })
})

describe('merchant/register responseHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('stores the access key and returns authorizedId instead of the key', async () => {
    mockUpsert.mockResolvedValue({ id: 'auth-new' })

    const body = await route.responseHandler!(
      envelope({
        ecode: '1021',
        vaultCode: 'v1x',
        alreadyExists: false,
        resourceAccessKey: 'access-key-abc',
        merchant: { code: '1021' },
      }),
      req,
    )

    expect(mockUpsert).toHaveBeenCalledTimes(1)
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ appId: APP_ID, resourceKey: 'access-key-abc' }),
    )
    expect(body.data.authorizedId).toBe('auth-new')
    expect(body.data).not.toHaveProperty('resourceAccessKey')
  })

  it('passes already-existing merchants through without a lookup or write', async () => {
    const body = await route.responseHandler!(
      envelope({ ecode: '991', alreadyExists: true, merchant: { code: '991' } }),
      req,
    )

    expect(mockUpsert).not.toHaveBeenCalled()
    expect(body.data).not.toHaveProperty('authorizedId')
    expect(body.data).not.toHaveProperty('authorizedIdLookup')
    expect(body.data.alreadyExists).toBe(true)
  })

  it('passes upstream error envelopes through untouched', async () => {
    const upstream = { code: 500, message: 'UNKNOWN_ERROR' }
    expect(await route.responseHandler!(upstream, req)).toBe(upstream)
    expect(mockUpsert).not.toHaveBeenCalled()
  })
})
