import { AppRouteRecord } from '@/types/router'

export const isvRoutes: AppRouteRecord = {
  path: '/isv',
  name: 'ISV',
  component: '/index/index',
  meta: {
    title: 'menus.isv.title',
    icon: 'ri:shield-user-line',
    roles: ['R_SUPER', 'R_ADMIN']
  },
  children: [
    {
      path: 'list',
      name: 'ISVList',
      component: '/isv/list',
      meta: { title: 'menus.isv.list', keepAlive: true, roles: ['R_SUPER', 'R_ADMIN'] }
    },
    {
      path: ':id',
      name: 'ISVStatusDetail',
      component: '/isv/detail',
      meta: { title: 'menus.isv.detail', isHide: true, isHideTab: true }
    }
  ]
}