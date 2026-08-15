import { AppRouteRecord } from '@/types/router'

export const developerPortalRoutes: AppRouteRecord = {
  name: 'DeveloperPortal',
  path: '/',
  component: '/index/index',
  meta: {
    title: 'menus.developer.title',
    icon: 'ri:terminal-box-line',
    roles: ['R_SUPER', 'R_ADMIN']
  },
  children: [
    {
      path: 'dashboard',
      name: 'DeveloperDashboard',
      component: '/dashboard/console',
      meta: {
        title: 'menus.developer.dashboard',
        keepAlive: false,
        fixedTab: true
      }
    },
    {
      path: 'profile',
      name: 'DeveloperProfile',
      component: '/developer/profile',
      meta: {
        title: 'menus.developer.profile',
        keepAlive: false
      }
    },
    {
      path: 'applications',
      name: 'DeveloperApplications',
      component: '/developer/applications',
      meta: {
        title: 'menus.developer.applications',
        keepAlive: false
      },
      children: [
        {
          path: 'new',
          name: 'DeveloperApplicationCreate',
          component: '/developer/applications/create',
          meta: {
            title: 'menus.developer.applicationsCreate',
            isHide: true
          }
        },
        {
          path: ':id',
          name: 'DeveloperApplicationDetail',
          component: '/developer/applications/detail',
          meta: {
            title: 'menus.developer.applicationsDetail',
            isHide: true
          }
        },
        {
          path: ':id/edit',
          name: 'DeveloperApplicationEdit',
          component: '/developer/applications/edit',
          meta: {
            title: 'menus.developer.applicationsEdit',
            isHide: true
          }
        }
      ]
    },
    {
      path: 'usage-statistics',
      name: 'DeveloperUsageStatistics',
      component: '/developer/usage-statistics',
      meta: {
        title: 'menus.developer.usageStatistics',
        keepAlive: false
      }
    },
    {
      path: 'invoice-generation',
      name: 'DeveloperInvoiceGeneration',
      component: '/developer/invoice-generation',
      meta: {
        title: 'menus.developer.invoiceGeneration',
        keepAlive: false
      }
    },
    {
      path: 'payment-history',
      name: 'DeveloperPaymentHistory',
      component: '/developer/payment-history',
      meta: {
        title: 'menus.developer.paymentHistory',
        keepAlive: false
      }
    }
  ]
}