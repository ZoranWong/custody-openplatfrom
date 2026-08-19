import request from '@/utils/http';
// 获取用户列表
export function fetchGetUserList(params) {
    return request.get({
        url: '/api/user/list',
        params
    });
}
// 获取角色列表
export function fetchGetRoleList(params) {
    return request.get({
        url: '/api/role/list',
        params
    });
}
// 获取菜单列表
export function fetchGetMenuList() {
    return request.get({
        url: '/api/v3/system/menus/simple'
    });
}
//# sourceMappingURL=system-manage.js.map