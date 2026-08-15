import { AppRouteRecord } from '@/types/router'

export const monitorRoutes: AppRouteRecord = {
  path: '/monitor',
  name: 'Monitor',
  component: '/index/index',
  meta: {
    title: 'menus.monitor.title',
    icon: 'ri:bar-chart-line',
    roles: ['R_SUPER', 'R_ADMIN']
  },
  children: [
    {
      path: 'api',
      name: 'MonitorAPI',
      component: '/monitor/api',
      meta: { title: 'menus.monitor.api', keepAlive: true, roles: ['R_SUPER', 'R_ADMIN'] }
    },
    {
      path: 'revenue',
      name: 'MonitorRevenue',
      component: '/monitor/revenue',
      meta: { title: 'menus.monitor.revenue', keepAlive: true, roles: ['R_SUPER', 'R_ADMIN'] }
    },
    {
      path: 'health',
      name: 'MonitorHealth',
      component: '/monitor/health',
      meta: { title: 'menus.monitor.health', keepAlive: true, roles: ['R_SUPER', 'R_ADMIN'] }
    }
  ]
}