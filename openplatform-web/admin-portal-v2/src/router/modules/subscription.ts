import { AppRouteRecord } from '@/types/router'

export const subscriptionRoutes: AppRouteRecord = {
  path: '/subscription',
  name: 'Subscription',
  component: '/index/index',
  meta: {
    title: 'menus.subscription.title',
    icon: 'ri:money-dollar-circle-line',
    roles: ['R_SUPER', 'R_ADMIN']
  },
  children: [
    {
      path: 'plans',
      name: 'SubscriptionPlans',
      component: '/subscription/plans',
      meta: {
        title: 'menus.subscription.plans',
        keepAlive: true,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    },
    {
      path: 'list',
      name: 'SubscriptionList',
      component: '/subscription/list',
      meta: {
        title: 'menus.subscription.list',
        keepAlive: true,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    },
    {
      path: 'orders',
      name: 'SubscriptionOrders',
      component: '/subscription/orders',
      meta: {
        title: 'menus.subscription.orders',
        keepAlive: true,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    }
  ]
}