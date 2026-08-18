import { router } from '@/router';
import { isNavigableMenuItem } from './route';
// 打开外部链接
export const openExternalLink = (link) => {
    window.open(link, '_blank');
};
/**
 * 菜单跳转
 * @param item 菜单项
 * @param jumpToFirst 是否跳转到第一个子菜单
 * @returns
 */
export const handleMenuJump = (item, jumpToFirst = false) => {
    // 处理外部链接
    const { link, isIframe } = item.meta;
    if (link && !isIframe) {
        return openExternalLink(link);
    }
    // 如果不需要跳转到第一个子菜单，或者没有子菜单，直接跳转当前路径
    if (!jumpToFirst || !item.children?.length) {
        return router.push(item.path);
    }
    // 递归查找第一个可导航的叶子节点菜单
    const findFirstLeafMenu = (items) => {
        for (const child of items) {
            if (isNavigableMenuItem(child)) {
                return child.children?.length ? findFirstLeafMenu(child.children) || child : child;
            }
        }
        return undefined;
    };
    const firstChild = findFirstLeafMenu(item.children);
    // 如果子菜单都不可见，则回退到父级页面自身。
    if (!firstChild) {
        return router.push(item.path);
    }
    // 如果第一个子菜单是外部链接则打开新窗口
    if (firstChild.meta?.link) {
        return openExternalLink(firstChild.meta.link);
    }
    // 跳转到子菜单路径
    router.push(firstChild.path);
};
//# sourceMappingURL=jump.js.map