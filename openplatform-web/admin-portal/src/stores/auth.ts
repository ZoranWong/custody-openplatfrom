import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { apiService, type AdminUser, type AdminLoginParams, type AuthResponse } from '@/services/api'

export const useAuthStore = defineStore('admin-auth', () => {
  const router = useRouter()
  const user = ref<AdminUser | null>(null)
  const token = ref<string | null>(null)
  const tokenExpiry = ref<number | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  // Check if token is expired
  const isTokenExpired = computed(() => {
    if (!tokenExpiry.value) return true
    return Date.now() >= tokenExpiry.value
  })

  // Lazy import permission store to avoid circular dependency
  function getPermissionStore() {
    return import('./permission.store').then(m => m.usePermissionStore())
  }

  async function login(email: string, password: string) {
    loading.value = true
    error.value = null

    try {
      const params: AdminLoginParams = { email, password }
      const response: AuthResponse = await apiService.adminLogin(params)

      // api.ts returns response.data directly: { code, message, data: { accessToken, refreshToken, user } }
      token.value = response.data?.accessToken || null
      user.value = response.data?.user || null

      // If response structure is { code, message, data, trace_id }
      if (!token.value && response.data) {
        token.value = (response.data as any).accessToken || null
        user.value = (response.data as any).user || null
      }

      // Set token expiry (2 hours from now)
      tokenExpiry.value = Date.now() + 2 * 60 * 60 * 1000

      // Store token in localStorage
      if (token.value) {
        localStorage.setItem('adminAccessToken', token.value)
        localStorage.setItem('adminRole', user.value?.role || '')
      }

      // Load permissions based on user role
      const permStore = await getPermissionStore()
      permStore.loadPermissions(user.value?.role)

      return response
    } catch (e: any) {
      error.value = e.response?.data?.message || e.response?.data?.message || 'Login failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Refresh the access token
   */
  async function refreshToken() {
    if (!token.value) {
      throw new Error('No token to refresh')
    }

    loading.value = true
    error.value = null

    try {
      const response = await apiService.refreshAdminToken()

      if (response.data?.accessToken) {
        token.value = response.data.accessToken
        tokenExpiry.value = Date.now() + 2 * 60 * 60 * 1000
        localStorage.setItem('adminAccessToken', token.value)
        return response
      }

      throw new Error('No token in refresh response')
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Token refresh failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Restore session from stored token
   */
  async function restoreSession() {
    const storedToken = localStorage.getItem('adminAccessToken')
    if (!storedToken) {
      throw new Error('No stored token')
    }

    token.value = storedToken

    try {
      // Fetch user profile to validate token and get user info
      const response = await apiService.getAdminProfile()
      if (response.data) {
        user.value = response.data
        // Set expiry from token (JWT) or default
        tokenExpiry.value = Date.now() + 2 * 60 * 60 * 1000
        // Store role
        localStorage.setItem('adminRole', user.value?.role || '')
        // Load permissions
        const permStore = await getPermissionStore()
        permStore.loadPermissions(user.value?.role)
      }
    } catch {
      // Token is invalid, clear state
      token.value = null
      user.value = null
      tokenExpiry.value = null
      localStorage.removeItem('adminAccessToken')
      localStorage.removeItem('adminRole')
      throw new Error('Session restore failed')
    }
  }

  async function logout() {
    try {
      // Call server-side logout API
      await apiService.adminLogout()
    } catch (e) {
      // Ignore errors - we still want to clear local state
      console.warn('Server logout failed, clearing local state anyway')
    } finally {
      // Clear all authentication state
      user.value = null
      token.value = null
      tokenExpiry.value = null

      // Clear all localStorage items
      localStorage.removeItem('adminAccessToken')
      localStorage.removeItem('adminRefreshToken')
      localStorage.removeItem('adminRole')

      // Clear permissions
      const permStore = await getPermissionStore()
      permStore.clearPermissions()

      // Use router for navigation
      router.push('/login')
    }
  }

  function init() {
    const storedToken = localStorage.getItem('adminAccessToken')
    if (storedToken) {
      token.value = storedToken
      // Restore role from localStorage
      const storedRole = localStorage.getItem('adminRole')
      if (storedRole) {
        user.value = { id: '', email: '', name: '', role: storedRole as any, status: 'active', createdAt: '', updatedAt: '' }
      }
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    user,
    token,
    tokenExpiry,
    loading,
    error,
    isAuthenticated,
    isTokenExpired,
    login,
    logout,
    refreshToken,
    restoreSession,
    init,
    clearError
  }
})
