import { AppRouteRecord } from '@/types/router'

export const dashboardRoutes: AppRouteRecord = {
  path: '/',
  name: 'Dashboard',
  component: '/index/index',
  meta: {
    title: 'menus.dashboard.title',
    icon: 'ri:dashboard-3-line',
    roles: ['R_SUPER', 'R_ADMIN', 'R_OPERATOR']
  },
  children: [
    {
      path: '',
      name: 'DashboardConsole',
      component: '/dashboard/console',
      meta: {
        title: 'menus.dashboard.console',
        keepAlive: false,
        fixedTab: true,
        roles: ['R_SUPER', 'R_ADMIN', 'R_OPERATOR']
      }
    }
  ]
}
