import { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

/**
 * Check if route requires authentication
 */
function requiresAuth(route: { meta?: Record<string, unknown> }): boolean {
  // Check meta.requiresAuth directly
  if (route.meta?.requiresAuth !== undefined) {
    return route.meta.requiresAuth as boolean
  }
  return true // Default to requiring auth
}

/**
 * Authentication guard - ensures user is logged in
 */
export function createAuthGuard() {
  return async (
    to: RouteLocationNormalized,
    _from: RouteLocationNormalized,
    next: NavigationGuardNext
  ): Promise<void> => {
    const authStore = useAuthStore()

    // If route doesn't require auth, allow access
    if (!requiresAuth(to)) {
      next()
      return
    }

    // Check if already authenticated
    if (authStore.isAuthenticated) {
      // Validate token is still valid
      if (authStore.isTokenExpired) {
        // Try to refresh token
        try {
          await authStore.refreshToken()
          // If refresh succeeds, allow navigation
          next()
          return
        } catch {
          // Refresh failed, clear auth and redirect to login
          authStore.logout()
          next({ name: 'login', query: { redirect: to.fullPath } })
          return
        }
      }

      // Token is valid, allow navigation
      next()
      return
    }

    // Not authenticated, check for token in storage
    const token = localStorage.getItem('adminAccessToken')
    if (!token) {
      next({ name: 'login', query: { redirect: to.fullPath } })
      return
    }

    // Try to restore session from stored token
    try {
      await authStore.restoreSession()
      if (authStore.isAuthenticated && !authStore.isTokenExpired) {
        next()
        return
      }
    } catch {
      // Session restore failed
    }

    // No valid session
    next({ name: 'login', query: { redirect: to.fullPath } })
  }
}

/**
 * Guest guard - redirects authenticated users away from public pages
 */
export function createGuestGuard() {
  return (
    to: RouteLocationNormalized,
    _from: RouteLocationNormalized,
    next: NavigationGuardNext
  ): void => {
    const authStore = useAuthStore()

    // If user is authenticated, redirect away from login/register pages
    if (to.meta?.requiresAuth === false && authStore.isAuthenticated) {
      // Check if there's a redirect param
      const redirect = to.query.redirect as string
      if (redirect) {
        next(redirect)
        return
      }
      next({ name: 'dashboard' })
      return
    }

    next()
  }
}

/**
 * Combined auth and guest guard
 */
export function createAuthGuestGuard() {
  return async (
    to: RouteLocationNormalized,
    _from: RouteLocationNormalized,
    next: NavigationGuardNext
  ): Promise<void> => {
    const authStore = useAuthStore()

    // First check guest guard logic
    if (to.meta?.requiresAuth === false && authStore.isAuthenticated) {
      const redirect = to.query.redirect as string
      if (redirect) {
        next(redirect)
        return
      }
      next({ name: 'dashboard' })
      return
    }

    // Then check auth guard logic
    if (to.meta?.requiresAuth !== false && !authStore.isAuthenticated) {
      const token = localStorage.getItem('adminAccessToken')
      if (!token) {
        next({ name: 'login', query: { redirect: to.fullPath } })
        return
      }

      try {
        await authStore.restoreSession()
        if (!authStore.isAuthenticated || authStore.isTokenExpired) {
          next({ name: 'login', query: { redirect: to.fullPath } })
          return
        }
      } catch {
        next({ name: 'login', query: { redirect: to.fullPath } })
        return
      }
    }

    next()
  }
}
