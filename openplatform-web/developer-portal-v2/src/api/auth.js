import request from '@/utils/http';
/**
 * 登录
 * @param params 登录参数
 * @returns 登录响应
 */
export function fetchLogin(params) {
    return request.post({
        url: '/api/auth/login',
        params
    });
}
/**
 * 获取用户信息（ISV profile）
 * @returns 用户信息
 */
export function fetchGetUserInfo() {
    return request.get({
        url: '/isv/profile'
    });
}
/**
 * ISV 登录
 */
export function fetchISVLogin(params) {
    return request.post({ url: '/isv/auth/login', data: params });
}
/**
 * 获取 ISV 用户信息
 */
export function fetchISVUserInfo() {
    return request.get({ url: '/isv/profile' });
}
/**
 * 获取 ISV 信息
 */
export function fetchISVInfo() {
    return request.get({ url: '/isv/info' });
}
/**
 * ISV 注册
 */
export function fetchISVRegister(params) {
    return request.post({ url: '/isv/auth/register', data: params });
}
/**
 * ISV 忘记密码
 */
export function fetchISVForgotPassword(params) {
    return request.post({ url: '/isv/auth/forgot-password', data: params });
}
/**
 * ISV 重置密码
 */
export function fetchISVResetPassword(params) {
    return request.post({ url: '/isv/auth/reset-password', data: params });
}
//# sourceMappingURL=auth.js.map