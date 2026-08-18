/**
 * 路由转换器
 *
 * 负责将菜单数据转换为 Vue Router 路由配置
 *
 * @module router/core/RouteTransformer
 * @author Art Design Pro Team
 */
import { IframeRouteManager } from './IframeRouteManager';
export class RouteTransformer {
    componentLoader;
    iframeManager;
    constructor(componentLoader) {
        this.componentLoader = componentLoader;
        this.iframeManager = IframeRouteManager.getInstance();
    }
    /**
     * 转换路由配置
     */
    transform(route, depth = 0) {
        const { component, children, ...routeConfig } = route;
        // 基础路由配置
        const converted = {
            ...routeConfig,
            component: undefined
        };
        // 处理不同类型的路由
        if (route.meta.isIframe) {
            this.handleIframeRoute(converted, route, depth);
        }
        else if (this.isFirstLevelRoute(route, depth)) {
            this.handleFirstLevelRoute(converted, route, component);
        }
        else {
            this.handleNormalRoute(converted, component);
        }
        // 递归处理子路由
        if (children?.length) {
            converted.children = children.map((child) => this.transform(child, depth + 1));
        }
        return converted;
    }
    /**
     * 判断是否为一级路由（需要 Layout 包裹）
     */
    isFirstLevelRoute(route, depth) {
        return depth === 0 && (!route.children || route.children.length === 0);
    }
    /**
     * 处理 iframe 类型路由
     */
    handleIframeRoute(targetRoute, sourceRoute, depth) {
        if (depth === 0) {
            // 顶级 iframe：用 Layout 包裹
            targetRoute.component = this.componentLoader.loadLayout();
            targetRoute.path = this.extractFirstSegment(sourceRoute.path || '');
            targetRoute.name = '';
            targetRoute.children = [
                {
                    ...sourceRoute,
                    component: this.componentLoader.loadIframe()
                }
            ];
        }
        else {
            // 非顶级（嵌套）iframe：直接使用 Iframe.vue
            targetRoute.component = this.componentLoader.loadIframe();
        }
        // 记录 iframe 路由
        this.iframeManager.add(sourceRoute);
    }
    /**
     * 处理一级菜单路由
     */
    handleFirstLevelRoute(converted, route, component) {
        converted.component = this.componentLoader.loadLayout();
        converted.path = this.extractFirstSegment(route.path || '');
        converted.name = '';
        route.meta.isFirstLevel = true;
        converted.children = [
            {
                ...route,
                component: component ? this.componentLoader.load(component) : undefined
            }
        ];
    }
    /**
     * 处理普通路由
     */
    handleNormalRoute(converted, component) {
        if (component) {
            converted.component = this.componentLoader.load(component);
        }
    }
    /**
     * 提取路径的第一段
     */
    extractFirstSegment(path) {
        const segments = path.split('/').filter(Boolean);
        return segments.length > 0 ? `/${segments[0]}` : '/';
    }
}
//# sourceMappingURL=RouteTransformer.js.map