import { AppRouteRecord } from '@/types/router'

export const monitorRoutes: AppRouteRecord = {
  path: '/monitor',
  name: 'Monitor',
  component: '/index/index',
  meta: {
    title: 'menus.monitor.title',
    icon: 'ri:alert-line',
    roles: ['R_SUPER', 'R_ADMIN', 'R_OPERATOR']
  },
  children: [
    {
      path: 'api-error',
      name: 'MonitorApiError',
      component: '/monitor/api-error',
      meta: {
        title: 'menus.monitor.apiError',
        keepAlive: true,
        roles: ['R_SUPER', 'R_ADMIN', 'R_OPERATOR']
      }
    },
    {
      path: 'system-error',
      name: 'MonitorSystemError',
      component: '/monitor/system-error',
      meta: {
        title: 'menus.monitor.systemError',
        keepAlive: true,
        roles: ['R_SUPER', 'R_ADMIN', 'R_OPERATOR']
      }
    },
    {
      path: 'service-status',
      name: 'MonitorServiceStatus',
      component: '/monitor/service-status',
      meta: {
        title: 'menus.monitor.serviceStatus',
        keepAlive: true,
        roles: ['R_SUPER', 'R_ADMIN', 'R_OPERATOR']
      }
    }
  ]
}