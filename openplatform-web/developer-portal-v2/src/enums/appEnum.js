/**
 * 系统级别枚举定义模块
 *
 * ## 主要功能
 *
 * - 菜单类型枚举（左侧、顶部、混合、双栏）
 * - 主题类型枚举（亮色、暗色、自动）
 * - 菜单主题枚举（设计、亮色、暗色）
 * - 语言类型枚举（中文、英文）
 * - 容器宽度枚举（全屏、固定）
 * - 菜单宽度枚举（收起宽度）
 *
 * @module enums/appEnum
 * @author Art Design Pro Team
 */
/**
 * 菜单类型
 */
export var MenuTypeEnum;
(function (MenuTypeEnum) {
    /** 左侧菜单 */
    MenuTypeEnum["LEFT"] = "left";
    /** 顶部菜单 */
    MenuTypeEnum["TOP"] = "top";
    /** 顶部+左侧菜单 */
    MenuTypeEnum["TOP_LEFT"] = "top-left";
    /** 双栏菜单 */
    MenuTypeEnum["DUAL_MENU"] = "dual-menu";
})(MenuTypeEnum || (MenuTypeEnum = {}));
/**
 * 系统主题
 */
export var SystemThemeEnum;
(function (SystemThemeEnum) {
    /** 暗色主题 */
    SystemThemeEnum["DARK"] = "dark";
    /** 亮色主题 */
    SystemThemeEnum["LIGHT"] = "light";
    /** 自动主题（跟随系统） */
    SystemThemeEnum["AUTO"] = "auto";
})(SystemThemeEnum || (SystemThemeEnum = {}));
/**
 * 菜单主题
 */
export var MenuThemeEnum;
(function (MenuThemeEnum) {
    /** 暗色主题 */
    MenuThemeEnum["DARK"] = "dark";
    /** 亮色主题 */
    MenuThemeEnum["LIGHT"] = "light";
    /** 设计主题 */
    MenuThemeEnum["DESIGN"] = "design";
})(MenuThemeEnum || (MenuThemeEnum = {}));
/**
 * 菜单宽度
 */
export var MenuWidth;
(function (MenuWidth) {
    /** 收起宽度 */
    MenuWidth["CLOSE"] = "64px";
})(MenuWidth || (MenuWidth = {}));
/**
 * 语言类型
 */
export var LanguageEnum;
(function (LanguageEnum) {
    /** 中文 */
    LanguageEnum["ZH"] = "zh";
    /** 英文 */
    LanguageEnum["EN"] = "en";
})(LanguageEnum || (LanguageEnum = {}));
/**
 * 容器宽度
 */
export var ContainerWidthEnum;
(function (ContainerWidthEnum) {
    /** 全屏宽度 */
    ContainerWidthEnum["FULL"] = "100%";
    /** 固定宽度 */
    ContainerWidthEnum["BOXED"] = "1200px";
})(ContainerWidthEnum || (ContainerWidthEnum = {}));
//# sourceMappingURL=appEnum.js.map