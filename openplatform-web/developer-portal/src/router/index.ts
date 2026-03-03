import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // Public routes
    {
      path: '/',
      name: 'landing',
      component: () => import('@/views/LandingPage.vue')
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginPage.vue')
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterPage.vue')
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/views/ForgotPasswordPage.vue')
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/views/ResetPasswordPage.vue')
    },

    // Protected routes with layout
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          redirect: '/applications'
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/views/ProfilePage.vue')
        },
        {
          path: 'applications/new',
          name: 'create-application',
          component: () => import('@/views/applications/CreateApplicationPage.vue')
        },
        {
          path: 'applications',
          name: 'applications',
          component: () => import('@/views/applications/ApplicationListPage.vue')
        },
        {
          path: 'applications/:id',
          name: 'application-detail',
          component: () => import('@/views/applications/ApplicationDetailPage.vue')
        },
        {
          path: 'applications/:id/edit',
          name: 'edit-application',
          component: () => import('@/views/applications/EditApplicationPage.vue')
        },
        {
          path: 'usage-statistics',
          name: 'usage-statistics',
          component: () => import('@/views/billing/UsageStatisticsPage.vue')
        },
        {
          path: 'invoice-generation',
          name: 'invoice-generation',
          component: () => import('@/views/billing/InvoiceGenerationPage.vue')
        },
        {
          path: 'payment-history',
          name: 'payment-history',
          component: () => import('@/views/billing/PaymentHistoryPage.vue')
        }
      ]
    }
  ]
})

// Navigation guard
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  // Initialize auth state if not already done
  if (!authStore.token) {
    const storedToken = localStorage.getItem('accessToken')
    if (storedToken) {
      authStore.init()
    }
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})

export default router
