import request from '@/utils/http';
/**
 * 获取用量统计
 */
export function fetchUsageStats(period = '30days') {
    return request.get({ url: '/billing/usage', params: { period } });
}
/**
 * 获取发票列表
 */
export function fetchInvoices(params) {
    return request.get({ url: '/billing/invoices', params });
}
/**
 * 获取支付记录
 */
export function fetchPaymentHistory(params) {
    return request.get({ url: '/billing/payments', params });
}
/**
 * 下载支付发票
 */
export function fetchDownloadPaymentInvoice(paymentId) {
    return request.get({
        url: `/billing/payments/${paymentId}/invoice`,
        responseType: 'blob'
    });
}
/**
 * 生成发票
 */
export function fetchGenerateInvoice(params) {
    return request.post({ url: '/billing/invoice/generate', data: params });
}
/**
 * 下载发票 PDF
 */
export function fetchDownloadInvoicePDF(invoiceId) {
    return request.get({
        url: `/billing/invoice/${invoiceId}/download`,
        responseType: 'blob'
    });
}
/**
 * 获取发票历史
 */
export function fetchInvoiceHistory(params) {
    return request.get({ url: '/billing/invoice/history', params });
}
/**
 * 上传支付凭证文件
 */
export function fetchUploadProof(file) {
    const formData = new FormData();
    formData.append('file', file);
    return request.post({
        url: '/billing/upload-proof',
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' }
    });
}
/**
 * 提交支付凭证
 */
export function fetchSubmitPaymentProof(orderId, data) {
    return request.post({ url: `/billing/payments/${orderId}/submit-proof`, data });
}
/**
 * 获取当前订阅信息
 */
export function fetchCurrentSubscription() {
    return request.get({ url: '/isv/subscription/current' });
}
/**
 * 获取可用套餐列表
 */
export function fetchAvailablePackages() {
    return request.get({ url: '/isv/packages' });
}
/**
 * 获取所有订阅记录（含历史）
 */
export function fetchSubscriptionHistory(params) {
    return request.get({ url: '/isv/subscriptions', params });
}
/**
 * 创建订单
 */
export function fetchCreateOrder(data) {
    return request.post({ url: '/isv/orders', data });
}
/**
 * 获取订单详情
 */
export function fetchOrderDetail(orderId) {
    return request.get({ url: `/isv/orders/${orderId}` });
}
/**
 * 获取 API 调用日志列表
 */
export function fetchApiLogs(params) {
    return request.get({ url: '/api-logs', params });
}
//# sourceMappingURL=billing.js.map