import { AppRouteRecord } from '@/types/router'

export const ticketRoutes: AppRouteRecord = {
  path: '/ticket',
  name: 'Ticket',
  component: '/index/index',
  meta: {
    title: 'menus.ticket.title',
    icon: 'ri:customer-service-2-line',
    roles: ['R_SUPER', 'R_ADMIN']
  },
  children: [
    {
      path: 'pending',
      name: 'TicketPending',
      component: '/ticket/pending',
      meta: {
        title: 'menus.ticket.pending',
        keepAlive: true,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    },
    {
      path: 'history',
      name: 'TicketHistory',
      component: '/ticket/history',
      meta: {
        title: 'menus.ticket.history',
        keepAlive: true,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    }
  ]
}