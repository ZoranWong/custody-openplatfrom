import { AppRouteRecord } from '@/types/router'

export const developerRoutes: AppRouteRecord = {
  path: '/developer',
  name: 'Developer',
  component: '/index/index',
  meta: {
    title: 'menus.developer.title',
    icon: 'ri:user-3-line',
    roles: ['R_SUPER', 'R_ADMIN']
  },
  children: [
    {
      path: 'list',
      name: 'DeveloperList',
      component: '/developer/list',
      meta: {
        title: 'menus.developer.list',
        keepAlive: true,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    },
    {
      path: ':id',
      name: 'DeveloperDetail',
      component: '/developer/detail',
      meta: {
        title: 'menus.developer.detail',
        isHide: true,
        isHideTab: true
      }
    },
    {
      path: ':id/review',
      name: 'DeveloperReview',
      component: '/developer/review',
      meta: {
        title: 'menus.developer.review',
        isHide: true,
        isHideTab: true
      }
    }
  ]
}