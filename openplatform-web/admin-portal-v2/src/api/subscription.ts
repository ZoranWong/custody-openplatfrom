import request from '@/utils/http'

/**
 * 套餐管理 API
 * 后端路径: /admin/packages
 */

export function fetchActivePackages() {
  return request.get<any>({ url: '/admin/packages/active' })
}

export function fetchPackageHistory(params: {
  page?: number
  pageSize?: number
  packageCode?: string
}) {
  return request.get<any>({ url: '/admin/packages/history', params })
}

export function fetchCreatePackage(data: {
  packageCode: string
  name: string
  region?: string
  description?: string
  features?: any
  monthlyPrice?: number
  yearlyPrice?: number
  yearlyDiscount?: number
  dailyApiLimit?: number
  maxApplications?: number
  isTrial?: boolean
}) {
  return request.post<any>({ url: '/admin/packages', data })
}

export function fetchUpdatePackage(id: string, data: Record<string, any>) {
  return request.put<any>({ url: `/admin/packages/${id}`, data })
}

export function fetchDeletePackage(id: string) {
  return request.del<any>({ url: `/admin/packages/${id}` })
}

/**
 * 订阅管理 API
 * 后端路径: /admin/subscriptions
 */

export function fetchSubscriptions(params: {
  page?: number
  pageSize?: number
  status?: string
  developerId?: string
}) {
  return request.get<any>({ url: '/admin/subscriptions', params })
}

export function fetchSubscriptionById(id: string) {
  return request.get<any>({ url: `/admin/subscriptions/${id}` })
}

export function fetchDeveloperSubscription(developerId: string) {
  return request.get<any>({ url: `/admin/developers/${developerId}/subscription` })
}

/**
 * 订单管理 API
 * 后端路径: /admin/orders
 */

export function fetchOrders(params: {
  page?: number
  pageSize?: number
  status?: string
  developerId?: string
}) {
  return request.get<any>({ url: '/admin/orders', params })
}

/**
 * 工单管理 API
 * 后端路径: /admin/tickets
 */

export function fetchTickets(params: {
  page?: number
  pageSize?: number
  status?: string
  type?: string
  priority?: string
  developerId?: string
}) {
  return request.get<any>({ url: '/admin/tickets', params })
}

export function fetchTicketById(id: string) {
  return request.get<any>({ url: `/admin/tickets/${id}` })
}

export function fetchAddTicketReply(ticketId: string, content: string) {
  return request.post<any>({ url: `/admin/tickets/${ticketId}/reply`, data: { content } })
}

export function fetchUpdateTicketStatus(ticketId: string, status: string) {
  return request.put<any>({ url: `/admin/tickets/${ticketId}/status`, data: { status } })
}