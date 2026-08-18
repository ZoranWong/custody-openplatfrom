import request from '@/utils/http'

/**
 * 获取用量统计
 */
export function fetchUsageStats(period: string = '30days') {
  return request.get<any>({ url: '/billing/usage', params: { period } })
}

/**
 * 获取发票列表
 */
export function fetchInvoices(params?: any) {
  return request.get<any>({ url: '/billing/invoices', params })
}

/**
 * 获取支付记录
 */
export function fetchPaymentHistory(params?: any) {
  return request.get<any>({ url: '/billing/payments', params })
}

/**
 * 下载支付发票
 */
export function fetchDownloadPaymentInvoice(paymentId: string) {
  return request.get<any>({
    url: `/billing/payments/${paymentId}/invoice`,
    responseType: 'blob'
  })
}

/**
 * 生成发票
 */
export function fetchGenerateInvoice(params: any) {
  return request.post<any>({ url: '/billing/invoice/generate', data: params })
}

/**
 * 下载发票 PDF
 */
export function fetchDownloadInvoicePDF(invoiceId: string) {
  return request.get<any>({
    url: `/billing/invoice/${invoiceId}/download`,
    responseType: 'blob'
  })
}

/**
 * 获取发票历史
 */
export function fetchInvoiceHistory(params?: any) {
  return request.get<any>({ url: '/billing/invoice/history', params })
}

/**
 * 上传支付凭证文件
 */
export function fetchUploadProof(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post<any>({
    url: '/billing/upload-proof',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

/**
 * 提交支付凭证
 */
export function fetchSubmitPaymentProof(orderId: string, data: any) {
  return request.post<any>({ url: `/billing/payments/${orderId}/submit-proof`, data })
}

/**
 * 获取当前订阅信息
 */
export function fetchCurrentSubscription() {
  return request.get<any>({ url: '/isv/subscription/current' })
}

/**
 * 获取可用套餐列表
 */
export function fetchAvailablePackages() {
  return request.get<any>({ url: '/isv/packages' })
}

/**
 * 获取所有订阅记录（含历史）
 */
export function fetchSubscriptionHistory(params?: any) {
  return request.get<any>({ url: '/isv/subscriptions', params })
}

/**
 * 创建订单
 */
export function fetchCreateOrder(data: { packageId: string; period: string; paymentMethod: string }) {
  return request.post<any>({ url: '/isv/orders', data })
}

/**
 * 获取订单详情
 */
export function fetchOrderDetail(orderId: string) {
  return request.get<any>({ url: `/isv/orders/${orderId}` })
}

/**
 * 获取 API 调用日志列表
 */
export function fetchApiLogs(params?: {
  page?: number
  pageSize?: number
  isError?: string
  apiName?: string
  startDate?: string
  endDate?: string
}) {
  return request.get<any>({ url: '/api-logs', params })
}