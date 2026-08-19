import { developerPortalRoutes } from './developer';
/**
 * 导出所有模块化路由
 * 主菜单直接作为顶级菜单，无外层包装
 * resultRoutes 和 exceptionRoutes 已移除（开发者门户不需要）
 */
export const routeModules = [...developerPortalRoutes];
//# sourceMappingURL=index.js.map