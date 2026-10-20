/**
 * Admin Auth Integration Tests
 *
 * Hits the running API server.
 * Default: localhost:1000 (local dev)
 * Override: API_BASE_URL=https://custody.cregis.ae/openplatform
 *
 * Usage:
 *   # Against local dev server (port 1000)
 *   npx vitest run tests/integration/admin-auth.test.ts
 *
 *   # Against beta server
 *   API_BASE_URL=https://custody.cregis.ae/openplatform npx vitest run tests/integration/admin-auth.test.ts
 *
 * Note: When testing against remote servers, login endpoint has a 5 req/min
 * rate limit per IP. Add delays between login attempts.
 */

import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:1000'
const IS_REMOTE = BASE_URL.includes('custody.cregis.ae')

function api(path: string, method = 'GET', body?: Record<string, unknown>) {
  return fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json())
}

async function captchaFlow(): Promise<{ captchaId: string; captchaToken: string }> {
  const gen = await api('/api/v1/captcha/generate')
  const captchaId = gen.data.captchaId
  const verify = await api('/api/v1/captcha/verify', 'POST', {
    captchaId,
    x: 0.5,
    duration: 1200,
    trail: [{ x: 0, y: 0 }, { x: 0.5, y: 0 }],
  })
  return { captchaId, captchaToken: verify.data.captchaToken }
}

async function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

describe('Admin Auth (integration)', () => {
  beforeAll(() => {
    console.log(`Testing against: ${BASE_URL}`)
  })

  it('should generate a captcha', async () => {
    const resp = await api('/api/v1/captcha/generate')
    expect(resp.code).toBe(0)
    expect(resp.data.captchaId).toMatch(/^[0-9a-f-]+$/)
  })

  it('should verify a captcha and return captchaToken', async () => {
    const { captchaToken } = await captchaFlow()
    expect(captchaToken).toMatch(/^eyJ[A-Za-z0-9_-]+\./)
  })

  it('should login admin with valid credentials', async () => {
    if (IS_REMOTE) await delay(3000)
    const { captchaToken } = await captchaFlow()
    if (IS_REMOTE) await delay(2000)

    const login = await api('/api/v1/admin/auth/login', 'POST', {
      email: 'admin@cregis.com',
      password: 'Cregis@2026',
      captchaToken,
    })

    expect(login.code).toBe(0)
    expect(login.message).toBe('success')
    expect(login.data.accessToken).toMatch(/^eyJ[A-Za-z0-9_-]+\./)
    expect(login.data.refreshToken).toMatch(/^eyJ[A-Za-z0-9_-]+\./)
    expect(login.data.user.email).toBe('admin@cregis.com')
    expect(login.data.user.role).toBe('super_admin')
    expect(login.data.user.name).toBe('Super Admin')
    expect(login.data.user.status).toBe('active')
  }, IS_REMOTE ? 30000 : 10000)

  it('should reject login with wrong password', async () => {
    if (IS_REMOTE) await delay(3000)
    const { captchaToken } = await captchaFlow()
    if (IS_REMOTE) await delay(2000)

    const login = await api('/api/v1/admin/auth/login', 'POST', {
      email: 'admin@cregis.com',
      password: 'WrongPassword123!',
      captchaToken,
    })

    expect([40110, 42901]).toContain(login.code)
    if (login.code === 40110) {
      expect(login.message).toBe('Invalid credentials')
    }
  }, IS_REMOTE ? 30000 : 10000)

  it('should reject login without captchaToken', async () => {
    const login = await api('/api/v1/admin/auth/login', 'POST', {
      email: 'admin@cregis.com',
      password: 'Cregis@2026',
    })
    expect([40002, 42901]).toContain(login.code)
    expect(login.message).toMatch(/captcha|rate/i)
  })

  it('should access protected profile endpoint with access token', async () => {
    if (IS_REMOTE) await delay(3000)
    const { captchaToken } = await captchaFlow()
    if (IS_REMOTE) await delay(2000)

    const login = await api('/api/v1/admin/auth/login', 'POST', {
      email: 'admin@cregis.com',
      password: 'Cregis@2026',
      captchaToken,
    })

    if (login.code === 42901) {
      console.log('[Profile test] Rate limited, skipping')
      return
    }

    const accessToken = login.data.accessToken

    const profile = await fetch(`${BASE_URL}/api/v1/admin/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then(r => r.json())

    expect(profile.code).toBe(0)
    expect(profile.data.email).toBe('admin@cregis.com')
  }, IS_REMOTE ? 30000 : 10000)
})
