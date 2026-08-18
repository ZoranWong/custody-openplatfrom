import request from '@/utils/http';
/**
 * 获取开发者个人资料
 */
export function fetchDeveloperProfile() {
    return request.get({ url: '/isv/profile' });
}
/**
 * 更新开发者个人资料
 */
export function fetchUpdateDeveloperProfile(data) {
    return request.put({ url: '/isv/profile', data });
}
/**
 * 获取开发者 ISV 信息 (公司/KYB)
 */
export function fetchDeveloperInfo() {
    return request.get({ url: '/isv/info' });
}
//# sourceMappingURL=developer.js.map