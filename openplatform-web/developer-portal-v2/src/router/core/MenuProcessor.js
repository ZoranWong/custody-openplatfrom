/**
 * 菜单处理器
 *
 * 负责菜单数据的获取、过滤和处理
 *
 * @module router/core/MenuProcessor
 * @author Art Design Pro Team
 */
import { useUserStore } from '@/store/modules/user';
import { useAppMode } from '@/hooks/core/useAppMode';
import { fetchGetMenuList } from '@/api/system-manage';
import { asyncRoutes } from '../routes/asyncRoutes';
import { RoutesAlias } from '../routesAlias';
import { formatMenuTitle } from '@/utils';
export class MenuProcessor {
    /**
     * 获取菜单数据
     */
    async getMenuList() {
        const { isFrontendMode } = useAppMode();
        let menuList;
        if (isFrontendMode.value) {
            menuList = await this.processFrontendMenu();
        }
        else {
            menuList = await this.processBackendMenu();
        }
        // 在规范化路径之前，验证原始路径配置
        this.validateMenuPaths(menuList);
        // 规范化路径（将相对路径转换为完整路径）
        return this.normalizeMenuPaths(menuList);
    }
    /**
     * 处理前端控制模式的菜单
     */
    async processFrontendMenu() {
        const userStore = useUserStore();
        const roles = userStore.info?.roles;
        let menuList = [...asyncRoutes];
        // 根据角色过滤菜单
        if (roles && roles.length > 0) {
            menuList = this.filterMenuByRoles(menuList, roles);
        }
        return this.filterEmptyMenus(menuList);
    }
    /**
     * 处理后端控制模式的菜单
     */
    async processBackendMenu() {
        const list = await fetchGetMenuList();
        return this.filterEmptyMenus(list);
    }
    /**
     * 根据角色过滤菜单
     */
    filterMenuByRoles(menu, roles) {
        return menu.reduce((acc, item) => {
            const itemRoles = item.meta?.roles;
            const hasPermission = !itemRoles || itemRoles.some((role) => roles?.includes(role));
            if (hasPermission) {
                const filteredItem = { ...item };
                if (filteredItem.children?.length) {
                    filteredItem.children = this.filterMenuByRoles(filteredItem.children, roles);
                }
                acc.push(filteredItem);
            }
            return acc;
        }, []);
    }
    /**
     * 递归过滤空菜单项
     */
    filterEmptyMenus(menuList) {
        return menuList
            .map((item) => {
            // 如果有子菜单，先递归过滤子菜单
            if (item.children && item.children.length > 0) {
                const filteredChildren = this.filterEmptyMenus(item.children);
                return {
                    ...item,
                    children: filteredChildren
                };
            }
            return item;
        })
            .filter((item) => {
            // 如果定义了 children 属性（即使是空数组），说明这是一个目录菜单，应该保留
            if ('children' in item) {
                return true;
            }
            // 如果有外链或 iframe，保留
            if (item.meta?.isIframe === true || item.meta?.link) {
                return true;
            }
            // 如果有有效的 component，保留
            if (item.component && item.component !== '' && item.component !== RoutesAlias.Layout) {
                return true;
            }
            // 其他情况过滤掉
            return false;
        });
    }
    /**
     * 验证菜单列表是否有效
     */
    validateMenuList(menuList) {
        return Array.isArray(menuList) && menuList.length > 0;
    }
    /**
     * 规范化菜单路径
     * 将相对路径转换为完整路径，确保菜单跳转正确
     */
    normalizeMenuPaths(menuList, parentPath = '') {
        return menuList.map((item) => {
            // 构建完整路径
            const fullPath = this.buildFullPath(item.path || '', parentPath);
            // 递归处理子菜单
            const children = item.children?.length
                ? this.normalizeMenuPaths(item.children, fullPath)
                : item.children;
            const redirect = item.redirect || this.resolveDefaultRedirect(children);
            return {
                ...item,
                path: fullPath,
                redirect,
                children
            };
        });
    }
    /**
     * 为目录型菜单推导默认跳转地址
     */
    resolveDefaultRedirect(children) {
        if (!children?.length) {
            return undefined;
        }
        for (const child of children) {
            if (this.isNavigableRoute(child)) {
                return child.path;
            }
            const nestedRedirect = this.resolveDefaultRedirect(child.children);
            if (nestedRedirect) {
                return nestedRedirect;
            }
        }
        return undefined;
    }
    /**
     * 判断子路由是否可以作为默认落点
     */
    isNavigableRoute(route) {
        return Boolean(route.path &&
            route.path !== '/' &&
            !route.meta?.link &&
            route.meta?.isIframe !== true &&
            route.component &&
            route.component !== '');
    }
    /**
     * 验证菜单路径配置
     * 检测非一级菜单是否错误使用了 / 开头的路径
     */
    /**
     * 验证菜单路径配置
     * 检测非一级菜单是否错误使用了 / 开头的路径
     */
    validateMenuPaths(menuList, level = 1) {
        menuList.forEach((route) => {
            if (!route.children?.length)
                return;
            const parentName = String(route.name || route.path || '未知路由');
            route.children.forEach((child) => {
                const childPath = child.path || '';
                // 跳过合法的绝对路径：外部链接和 iframe 路由
                if (this.isValidAbsolutePath(childPath))
                    return;
                // 检测非法的绝对路径
                if (childPath.startsWith('/')) {
                    this.logPathError(child, childPath, parentName, level);
                }
            });
            // 递归检查更深层级的子路由
            this.validateMenuPaths(route.children, level + 1);
        });
    }
    /**
     * 判断是否为合法的绝对路径
     */
    isValidAbsolutePath(path) {
        return (path.startsWith('http://') ||
            path.startsWith('https://') ||
            path.startsWith('/outside/iframe/'));
    }
    /**
     * 输出路径配置错误日志
     */
    logPathError(route, path, parentName, level) {
        const routeName = String(route.name || path || '未知路由');
        const menuTitle = route.meta?.title || routeName;
        const suggestedPath = path.split('/').pop() || path.slice(1);
        console.error(`[路由配置错误] 菜单 "${formatMenuTitle(menuTitle)}" (name: ${routeName}, path: ${path}) 配置错误\n` +
            `  位置: ${parentName} > ${routeName}\n` +
            `  问题: ${level + 1}级菜单的 path 不能以 / 开头\n` +
            `  当前配置: path: '${path}'\n` +
            `  应该改为: path: '${suggestedPath}'`);
    }
    /**
     * 构建完整路径
     */
    buildFullPath(path, parentPath) {
        if (!path)
            return '';
        // 外部链接直接返回
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }
        // 如果已经是绝对路径，直接返回
        if (path.startsWith('/')) {
            return path;
        }
        // 拼接父路径和当前路径
        if (parentPath) {
            // 移除父路径末尾的斜杠，移除子路径开头的斜杠，然后拼接
            const cleanParent = parentPath.replace(/\/$/, '');
            const cleanChild = path.replace(/^\//, '');
            return `${cleanParent}/${cleanChild}`;
        }
        // 没有父路径，添加前导斜杠
        return `/${path}`;
    }
}
//# sourceMappingURL=MenuProcessor.js.map