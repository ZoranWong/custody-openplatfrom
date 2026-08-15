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
      name: 'StatsApi',
      component: '/stats/api',
      meta: {
        title: 'menus.stats.api',
        keepAlive: true,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    },
    {
      path: 'subscription',
      name: 'StatsSubscription',
      component: '/stats/subscription',
      meta: {
        title: 'menus.stats.subscription',
        keepAlive: true,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    }
  ]
}