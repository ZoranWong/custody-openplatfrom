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
      path: 'pending',
      name: 'DeveloperPending',
      component: '/developer/pending',
      meta: {
        title: 'menus.developer.pending',
        keepAlive: true,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    },
    {
      path: 'history',
      name: 'DeveloperHistory',
      component: '/developer/history',
      meta: {
        title: 'menus.developer.history',
        keepAlive: true,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    },
    {
      path: 'detail/:id',
      name: 'DeveloperDetail',
      component: '/developer/detail',
      meta: {
        title: 'menus.developer.detail',
        isHide: true,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    },
    {
      path: 'review/:id',
      name: 'DeveloperReview',
      component: '/developer/review',
      meta: {
        title: 'menus.developer.review',
        isHide: true,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    },
    {
      path: 'applications/:developerId',
      name: 'DeveloperApplications',
      component: '/developer/applications',
      meta: {
        title: 'menus.developer.applications',
        isHide: true,
        isHideTab: true,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    },
    {
      path: 'subscription/:developerId',
      name: 'DeveloperSubscription',
      component: '/developer/subscription',
      meta: {
        title: 'menus.developer.subscription',
        isHide: true,
        isHideTab: true,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    }
  ]
}