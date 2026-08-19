/**
 * 路由注册核心类
 *
 * 负责动态路由的注册、验证和管理
 *
 * @module router/core/RouteRegistry
 * @author Art Design Pro Team
 */
import { ComponentLoader } from './ComponentLoader';
import { RouteValidator } from './RouteValidator';
import { RouteTransformer } from './RouteTransformer';
export class RouteRegistry {
    router;
    componentLoader;
    validator;
    transformer;
    removeRouteFns = [];
    registered = false;
    constructor(router) {
        this.router = router;
        this.componentLoader = new ComponentLoader();
        this.validator = new RouteValidator();
        this.transformer = new RouteTransformer(this.componentLoader);
    }
    /**
     * 注册动态路由
     */
    register(menuList) {
        if (this.registered) {
            console.warn('[RouteRegistry] 路由已注册，跳过重复注册');
            return;
        }
        // 验证路由配置
        const validationResult = this.validator.validate(menuList);
        if (!validationResult.valid) {
            throw new Error(`路由配置验证失败: ${validationResult.errors.join(', ')}`);
        }
        // 转换并注册路由
        const removeRouteFns = [];
        menuList.forEach((route) => {
            if (route.name && !this.router.hasRoute(route.name)) {
                const routeConfig = this.transformer.transform(route);
                const removeRouteFn = this.router.addRoute(routeConfig);
                removeRouteFns.push(removeRouteFn);
            }
        });
        this.removeRouteFns = removeRouteFns;
        this.registered = true;
    }
    /**
     * 移除所有动态路由
     */
    unregister() {
        this.removeRouteFns.forEach((fn) => fn());
        this.removeRouteFns = [];
        this.registered = false;
    }
    /**
     * 检查是否已注册
     */
    isRegistered() {
        return this.registered;
    }
    /**
     * 获取移除函数列表（用于 store 管理）
     */
    getRemoveRouteFns() {
        return this.removeRouteFns;
    }
    /**
     * 标记为已注册（用于错误处理场景，避免重复请求）
     */
    markAsRegistered() {
        this.registered = true;
    }
}
//# sourceMappingURL=RouteRegistry.js.map