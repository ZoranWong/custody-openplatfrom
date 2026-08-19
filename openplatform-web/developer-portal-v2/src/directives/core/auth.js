/**
 * v-auth 权限指令
 *
 * 适用于后端权限控制模式，基于权限标识控制 DOM 元素的显示和隐藏。
 * 如果用户没有对应权限，元素将从 DOM 中移除。
 *
 * ## 主要功能
 *
 * - 权限验证 - 根据路由 meta 中的权限列表验证用户权限
 * - DOM 控制 - 无权限时自动移除元素，而非隐藏
 * - 响应式更新 - 权限变化时自动更新元素状态
 *
 * ## 使用示例
 *
 * ```vue
 * <!-- 只有拥有 'add' 权限的用户才能看到新增按钮 -->
 * <el-button v-auth="'add'">新增</el-button>
 *
 * <!-- 只有拥有 'edit' 权限的用户才能看到编辑按钮 -->
 * <el-button v-auth="'edit'">编辑</el-button>
 *
 * <!-- 只有拥有 'delete' 权限的用户才能看到删除按钮 -->
 * <el-button v-auth="'delete'">删除</el-button>
 * ```
 *
 * ## 注意事项
 *
 * - 该指令会直接移除 DOM 元素，而不是使用 v-if 隐藏
 * - 权限列表从当前路由的 meta.authList 中获取
 *
 * @module directives/auth
 * @author Art Design Pro Team
 */
import { router } from '@/router';
function checkAuthPermission(el, binding) {
    // 获取当前路由的权限列表
    const authList = router.currentRoute.value.meta.authList || [];
    // 检查是否有对应的权限标识
    const hasPermission = authList.some((item) => item.authMark === binding.value);
    // 如果没有权限，移除元素
    if (!hasPermission) {
        removeElement(el);
    }
}
function removeElement(el) {
    if (el.parentNode) {
        el.parentNode.removeChild(el);
    }
}
const authDirective = {
    mounted: checkAuthPermission,
    updated: checkAuthPermission
};
export function setupAuthDirective(app) {
    app.directive('auth', authDirective);
}
//# sourceMappingURL=auth.js.map