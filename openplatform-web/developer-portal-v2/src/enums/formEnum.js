/**
 * 表单相关枚举定义模块
 *
 * ## 主要功能
 *
 * - 页面模式枚举（新增、编辑）
 * - 表格尺寸枚举（默认、紧凑、宽松）
 *
 * @module enums/formEnum
 * @author Art Design Pro Team
 */
// 页面类型
export var PageModeEnum;
(function (PageModeEnum) {
    PageModeEnum[PageModeEnum["Add"] = 0] = "Add";
    PageModeEnum[PageModeEnum["Edit"] = 1] = "Edit"; // 编辑
})(PageModeEnum || (PageModeEnum = {}));
// 表格大小
export var TableSizeEnum;
(function (TableSizeEnum) {
    TableSizeEnum["DEFAULT"] = "default";
    TableSizeEnum["SMALL"] = "small";
    TableSizeEnum["LARGE"] = "large";
})(TableSizeEnum || (TableSizeEnum = {}));
//# sourceMappingURL=formEnum.js.map