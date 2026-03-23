import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiService, {
  type ISVUser,
  type ISVInfo,
  type RegisterParams,
  type LoginParams,
  type AuthResponse,
  type UBO
} from '@/services/api'

const BASE_PATH = import.meta.env.VITE_BASE || '/'

function getLoginUrl(): string {
  return `${BASE_PATH}login`
}

// ISV User type
export type User = ISVUser

export interface RegisterData {
  email: string
  password: string
  legalName: string
  registrationNumber: string
  jurisdiction: string
  dateOfIncorporation: string
  registeredAddress: string
  website?: string
  uboInfo: UBO[]
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isvInfo = ref<ISVInfo | null>(null)
  const token = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value)
  const isOwner = computed(() => user.value?.role === 'owner')
  const userStatus = computed(() => user.value?.status || null)

  // Token storage keys
  const ACCESS_TOKEN_KEY = 'accessToken'
  const REFRESH_TOKEN_KEY = 'refreshToken'

  async function register(data: RegisterData) {
    loading.value = true
    error.value = null

    try {
      const params: RegisterParams = {
        email: data.email,
        password: data.password,
        legalName: data.legalName,
        registrationNumber: data.registrationNumber,
        jurisdiction: data.jurisdiction,
        dateOfIncorporation: data.dateOfIncorporation,
        registeredAddress: data.registeredAddress,
        website: data.website,
        uboInfo: data.uboInfo
      }

      const response = await apiService.register(params)
      return response
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Registration failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function login(email: string, password: string) {
    loading.value = true
    error.value = null

    try {
      const params: LoginParams = { email, password }
      const response: AuthResponse = await apiService.login(params)

      // Save tokens to localStorage for persistence
      const accessToken = response.data?.accessToken
      const newRefreshToken = response.data?.refreshToken

      if (accessToken) {
        token.value = accessToken
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
      }
      if (newRefreshToken) {
        refreshToken.value = newRefreshToken
        localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken)
      }

      user.value = response.data?.user || null
      return response
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Login failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await apiService.logout()
    } finally {
      user.value = null
      isvInfo.value = null
      token.value = null
      refreshToken.value = null
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      window.location.href = getLoginUrl()
    }
  }

  async function fetchProfile() {
    if (!token.value) return

    try {
      const response = await apiService.getISVProfile()
      if (response.code === 0 && response.data?.user) {
        user.value = response.data.user
      }
    } catch (e) {
      throw e
    }
  }

  async function fetchISVInfo() {
    if (!token.value) return

    try {
      const response = await apiService.getISVInfo()
      if (response.code === 0 && response.data?.isv) {
        isvInfo.value = response.data.isv
      }
    } catch (e) {
      throw e
    }
  }

  async function updateProfile(data: Partial<ISVUser>) {
    loading.value = true
    try {
      const response = await apiService.updateISVProfile(data)
      if (response.code === 0 && response.data?.user) {
        user.value = response.data.user
      }
      return response
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Update failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  // Initialize from localStorage
  function init() {
    const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)

    if (storedToken) {
      token.value = storedToken
    }
    if (storedRefreshToken) {
      refreshToken.value = storedRefreshToken
    }

    if (token.value) {
      fetchProfile()
    }
  }

  return {
    user,
    isvInfo,
    token,
    refreshToken,
    loading,
    error,
    isAuthenticated,
    isOwner,
    userStatus,
    register,
    login,
    logout,
    fetchProfile,
    fetchISVInfo,
    updateProfile,
    clearError,
    init
  }
})
