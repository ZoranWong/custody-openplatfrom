import { AppRouteRecord } from '@/types/router'

export const kybRoutes: AppRouteRecord = {
  path: '/kyb',
  name: 'KYB',
  component: '/index/index',
  meta: {
    title: 'menus.kyb.title',
    icon: 'ri:file-list-3-line',
    roles: ['R_SUPER', 'R_ADMIN']
  },
  children: [
    {
      path: 'pending',
      name: 'KYBPending',
      component: '/kyb/pending',
      meta: {
        title: 'menus.kyb.pending',
        keepAlive: true,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    },
    {
      path: 'history',
      name: 'KYBHistory',
      component: '/kyb/history',
      meta: {
        title: 'menus.kyb.history',
        keepAlive: true,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    },
    {
      path: ':id',
      name: 'KYBDetail',
      component: '/kyb/detail',
      meta: {
        title: 'menus.kyb.detail',
        isHide: true,
        isHideTab: true
      }
    }
  ]
}