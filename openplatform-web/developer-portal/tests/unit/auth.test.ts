/**
 * Auth Store Unit Tests
 * Tests for authentication store with token persistence
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import apiService from '@/services/api'

// Mock the API service
vi.mock('@/services/api', () => ({
  default: {
    login: vi.fn(),
    logout: vi.fn(),
    getISVProfile: vi.fn().mockResolvedValue({ code: 0, data: { user: null } }),
    getISVInfo: vi.fn().mockResolvedValue({ code: 0, data: {} }),
    updateISVProfile: vi.fn().mockResolvedValue({ code: 0, data: { user: null } })
  }
}))

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => { localStorageMock.store[key] = value }),
  removeItem: vi.fn((key: string) => { delete localStorageMock.store[key] }),
  clear: vi.fn(() => { localStorageMock.store = {} })
}

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
})

// Mock window.location.href
const locationMock = {
  href: '',
  assign: vi.fn()
}

Object.defineProperty(global, 'window', {
  value: {
    ...global.window,
    location: locationMock
  },
  writable: true
})

// Import after mocking
const { useAuthStore } = await import('@/stores/auth')

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorageMock.store = {}
    localStorageMock.clear()
    locationMock.href = ''
  })

  describe('Initial State', () => {
    it('initializes with null values', () => {
      const store = useAuthStore()

      expect(store.user).toBeNull()
      expect(store.token).toBeNull()
      expect(store.refreshToken).toBeNull()
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('computes isAuthenticated as false when no token', () => {
      const store = useAuthStore()

      expect(store.isAuthenticated).toBe(false)
    })
  })

  describe('Token Persistence', () => {
    it('restores tokens from localStorage on init', () => {
      localStorageMock.store['accessToken'] = 'test-access-token'
      localStorageMock.store['refreshToken'] = 'test-refresh-token'

      const store = useAuthStore()
      store.init()

      expect(store.token).toBe('test-access-token')
      expect(store.refreshToken).toBe('test-refresh-token')
    })

    it('does not call fetchProfile when no token on init', () => {
      const store = useAuthStore()
      store.init()

      expect(apiService.getISVProfile).not.toHaveBeenCalled()
    })

    it('calls fetchProfile when token exists on init', () => {
      localStorageMock.store['accessToken'] = 'test-access-token'
      ;(apiService.getISVProfile as any).mockResolvedValue({
        code: 0,
        data: { user: { id: '1', email: 'test@test.com' } }
      })

      const store = useAuthStore()
      store.init()

      expect(apiService.getISVProfile).toHaveBeenCalled()
    })
  })

  describe('Login', () => {
    it('stores tokens in localStorage on successful login', async () => {
      const store = useAuthStore()
      ;(apiService.login as any).mockResolvedValue({
        code: 0,
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          user: { id: '1', email: 'test@test.com' }
        }
      })

      await store.login('test@test.com', 'password123')

      expect(localStorageMock.setItem).toHaveBeenCalledWith('accessToken', 'new-access-token')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'new-refresh-token')
      expect(store.token).toBe('new-access-token')
      expect(store.refreshToken).toBe('new-refresh-token')
    })

    it('sets user from login response', async () => {
      const store = useAuthStore()
      const mockUser = { id: '1', email: 'test@test.com', role: 'owner' as const }
      ;(apiService.login as any).mockResolvedValue({
        code: 0,
        data: {
          accessToken: 'token',
          refreshToken: 'refresh',
          user: mockUser
        }
      })

      await store.login('test@test.com', 'password123')

      expect(store.user).toEqual(mockUser)
    })

    it('sets error on login failure', async () => {
      const store = useAuthStore()
      ;(apiService.login as any).mockRejectedValue({
        response: { data: { message: 'Invalid credentials' } }
      })

      await expect(store.login('test@test.com', 'wrongpassword')).rejects.toThrow()
      expect(store.error).toBe('Invalid credentials')
    })

    it('sets loading state during login', async () => {
      const store = useAuthStore()
      ;(apiService.login as any).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ code: 0, data: {} }), 100)))

      const loginPromise = store.login('test@test.com', 'password123')

      expect(store.loading).toBe(true)
      await loginPromise
      expect(store.loading).toBe(false)
    })
  })

  describe('Logout', () => {
    it('clears tokens from localStorage', async () => {
      localStorageMock.store['accessToken'] = 'test-token'
      localStorageMock.store['refreshToken'] = 'test-refresh'

      const store = useAuthStore()
      store.init()
      await store.logout()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken')
    })

    it('resets store state on logout', async () => {
      localStorageMock.store['accessToken'] = 'test-token'
      ;(apiService.logout as any).mockResolvedValue(undefined)

      const store = useAuthStore()
      store.init()
      store.user = { id: '1', email: 'test@test.com' } as any
      await store.logout()

      expect(store.user).toBeNull()
      expect(store.token).toBeNull()
      expect(store.refreshToken).toBeNull()
      expect(store.isvInfo).toBeNull()
    })

    it('redirects to login page on logout', async () => {
      const store = useAuthStore()
      ;(apiService.logout as any).mockResolvedValue(undefined)

      await store.logout()

      expect(locationMock.href).toBe('/login')
    })

    it('clears localStorage even if API call fails', async () => {
      localStorageMock.store['accessToken'] = 'test-token'
      ;(apiService.logout as any).mockRejectedValue(new Error('Network error'))

      const store = useAuthStore()
      await store.logout()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken')
    })
  })

  describe('Fetch Profile', () => {
    it('fetches user profile when authenticated', async () => {
      localStorageMock.store['accessToken'] = 'test-token'
      const mockUser = { id: '1', email: 'test@test.com' }
      ;(apiService.getISVProfile as any).mockResolvedValue({
        code: 0,
        data: { user: mockUser }
      })

      const store = useAuthStore()
      store.init()
      await Promise.resolve() // Wait for async init

      expect(apiService.getISVProfile).toHaveBeenCalled()
      expect(store.user).toEqual(mockUser)
    })

    it('does not fetch profile when not authenticated', async () => {
      const store = useAuthStore()
      await store.fetchProfile()

      expect(apiService.getISVProfile).not.toHaveBeenCalled()
    })
  })

  describe('Fetch ISV Info', () => {
    it('fetches ISV info when authenticated', async () => {
      localStorageMock.store['accessToken'] = 'test-token'
      const mockISVInfo = { id: '1', companyName: 'Test Company' }
      ;(apiService.getISVInfo as any).mockResolvedValue({
        code: 0,
        data: { isv: mockISVInfo }
      })

      const store = useAuthStore()
      await store.fetchISVInfo()

      expect(apiService.getISVInfo).toHaveBeenCalled()
      expect(store.isvInfo).toEqual(mockISVInfo)
    })

    it('does not fetch ISV info when not authenticated', async () => {
      const store = useAuthStore()
      await store.fetchISVInfo()

      expect(apiService.getISVInfo).not.toHaveBeenCalled()
    })
  })

  describe('Update Profile', () => {
    it('updates user profile', async () => {
      const mockUser = { id: '1', email: 'test@test.com', name: 'New Name' }
      ;(apiService.updateISVProfile as any).mockResolvedValue({
        code: 0,
        data: { user: mockUser }
      })

      const store = useAuthStore()
      const result = await store.updateProfile({ name: 'New Name' })

      expect(apiService.updateISVProfile).toHaveBeenCalledWith({ name: 'New Name' })
      expect(store.user).toEqual(mockUser)
    })

    it('sets loading state during profile update', async () => {
      ;(apiService.updateISVProfile as any).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ code: 0, data: {} }), 100))
      )

      const store = useAuthStore()
      const updatePromise = store.updateProfile({ name: 'New Name' })

      expect(store.loading).toBe(true)
      await updatePromise
      expect(store.loading).toBe(false)
    })
  })

  describe('Computed Properties', () => {
    it('computes isOwner correctly', () => {
      const store = useAuthStore()

      store.user = { role: 'owner' } as any
      expect(store.isOwner).toBe(true)

      store.user = { role: 'developer' } as any
      expect(store.isOwner).toBe(false)
    })

    it('computes userStatus from user', () => {
      const store = useAuthStore()

      expect(store.userStatus).toBeNull()

      store.user = { status: 'active' } as any
      expect(store.userStatus).toBe('active')
    })
  })

  describe('Clear Error', () => {
    it('clears error message', async () => {
      const store = useAuthStore()
      ;(apiService.login as any).mockRejectedValue({
        response: { data: { message: 'Error' } }
      })

      try {
        await store.login('test@test.com', 'wrong')
      } catch {}

      expect(store.error).toBe('Error')

      store.clearError()
      expect(store.error).toBeNull()
    })
  })
})
