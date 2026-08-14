import { AppRouteRecord } from '@/types/router'

export const statsRoutes: AppRouteRecord = {
  path: '/stats',
  name: 'Stats',
  component: '/index/index',
  meta: {
    title: 'menus.stats.title',
    icon: 'ri:bar-chart-line',
    roles: ['R_SUPER', 'R_ADMIN']
  },
  children: [
    {
      path: 'api',
      name: 'APIStats',
      component: '/stats/api',
      meta: {
        title: 'menus.stats.api',
        keepAlive: true,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    },
    {
      path: 'revenue',
      name: 'RevenueStats',
      component: '/stats/revenue',
      meta: {
        title: 'menus.stats.revenue',
        keepAlive: true,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    },
    {
      path: 'health',
      name: 'SystemHealth',
      component: '/stats/health',
      meta: {
        title: 'menus.stats.health',
        keepAlive: true,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    }
  ]
}