import request from '@/utils/http';
/**
 * 获取应用列表
 */
export function fetchApplications() {
    return request.get({ url: '/isv/applications' });
}
/**
 * 获取单个应用
 */
export function fetchApplicationById(id) {
    return request.get({ url: `/isv/applications/${id}` });
}
/**
 * 创建应用
 */
export function fetchCreateApplication(data) {
    return request.post({ url: '/isv/applications', data });
}
/**
 * 更新应用
 */
export function fetchUpdateApplication(id, data) {
    return request.put({ url: `/isv/applications/${id}`, data });
}
/**
 * 删除应用
 */
export function fetchDeleteApplication(id) {
    return request.del({ url: `/isv/applications/${id}` });
}
/**
 * 重新生成应用密钥
 */
export function fetchRegenerateAppSecret(id) {
    return request.post({ url: `/isv/applications/${id}/regenerate-secret` });
}
//# sourceMappingURL=application.js.map