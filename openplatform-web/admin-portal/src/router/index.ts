import { createRouter, createWebHistory } from 'vue-router'
import { createAuthGuestGuard } from './auth-guard'
import { createPermissionGuard } from './permission-guard'
import { Resource } from '@/shared/admin-permissions'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginPage.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/403',
      name: 'forbidden',
      component: () => import('@/views/ForbiddenPage.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardPage.vue'),
      meta: {
        requiresAuth: true,
        permission: Resource.ANALYTICS_VIEW
      }
    },
    {
      path: '/stats/api',
      name: 'api-stats',
      component: () => import('@/views/stats/APIStatsPage.vue'),
      meta: {
        requiresAuth: true,
        permission: Resource.ANALYTICS_VIEW
      }
    },
    {
      path: '/stats/revenue',
      name: 'revenue-analytics',
      component: () => import('@/views/stats/RevenueAnalyticsPage.vue'),
      meta: {
        requiresAuth: true,
        permission: Resource.ANALYTICS_VIEW
      }
    },
    {
      path: '/stats/health',
      name: 'system-health',
      component: () => import('@/views/stats/SystemHealthPage.vue'),
      meta: {
        requiresAuth: true,
        permission: Resource.ANALYTICS_VIEW
      }
    },
    {
      path: '/developer',
      name: 'developer-list',
      component: () => import('@/views/developer/DeveloperListPage.vue'),
      meta: {
        requiresAuth: true,
        permission: Resource.ISV_KYB
      }
    },
    {
      path: '/developer/:id',
      name: 'developer-detail',
      component: () => import('@/views/developer/DeveloperDetailPage.vue'),
      meta: {
        requiresAuth: true,
        permission: Resource.ISV_KYB
      }
    },
    {
      path: '/developer/:id/review',
      name: 'developer-review',
      component: () => import('@/views/developer/DeveloperReviewPage.vue'),
      meta: {
        requiresAuth: true,
        permission: Resource.ISV_KYB
      }
    },
    {
      path: '/settings/password',
      name: 'change-password',
      component: () => import('@/views/ChangePasswordPage.vue'),
      meta: {
        requiresAuth: true
      }
    }
  ]
})

// Combined auth and guest guard
router.beforeEach(createAuthGuestGuard())

// Permission guard
router.beforeEach(createPermissionGuard())

export default router
