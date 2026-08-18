/**
 * useTableColumns - 表格列配置管理
 *
 * 提供动态的表格列配置管理能力，支持运行时灵活控制列的显示、隐藏、排序等操作。
 * 通常与 useTable 配合使用，为表格提供完整的列管理功能。
 *
 * ## 主要功能
 *
 * 1. 列显示控制 - 动态显示/隐藏列，支持批量操作
 * 2. 列排序 - 拖拽或编程方式重新排列列顺序
 * 3. 列配置管理 - 新增、删除、更新列配置
 * 4. 特殊列支持 - 自动处理 selection、expand、index 等特殊列
 * 5. 状态持久化 - 保持列的显示状态，支持重置到初始状态
 *
 * ## 使用示例
 *
 * ```typescript
 * const { columns, columnChecks, toggleColumn, reorderColumns } = useTableColumns(() => [
 *   { prop: 'name', label: '姓名', visible: true },
 *   { prop: 'email', label: '邮箱', visible: true },
 *   { prop: 'status', label: '状态', visible: false }
 * ])
 *
 * // 切换列显示
 * toggleColumn('email', false)
 *
 * // 重新排序
 * reorderColumns(0, 2)
 * ```
 *
 * @module useTableColumns
 * @author Art Design Pro Team
 */
import { ref, computed, watch } from 'vue';
import { $t } from '@/locales';
/**
 * 特殊列类型
 */
const SPECIAL_COLUMNS = {
    selection: { prop: '__selection__', label: $t('table.column.selection') },
    expand: { prop: '__expand__', label: $t('table.column.expand') },
    index: { prop: '__index__', label: $t('table.column.index') }
};
/**
 * 获取列的唯一标识
 */
export const getColumnKey = (col) => SPECIAL_COLUMNS[col.type]?.prop ?? col.prop;
/**
 * 获取列的显示状态
 * 优先使用 visible 字段，如果不存在则使用 checked 字段
 */
export const getColumnVisibility = (col) => {
    // visible 优先级高于 checked
    if (col.visible !== undefined) {
        return col.visible;
    }
    // 如果 visible 未定义，使用 checked，默认为 true
    return col.checked ?? true;
};
/**
 * 获取列的检查状态
 */
export const getColumnChecks = (columns) => columns.map((col) => {
    const special = col.type && SPECIAL_COLUMNS[col.type];
    const visibility = getColumnVisibility(col);
    if (special) {
        return { ...col, prop: special.prop, label: special.label, checked: true, visible: true };
    }
    return { ...col, checked: visibility, visible: visibility };
});
export function useTableColumns(columnsFactory) {
    const dynamicColumns = ref(columnsFactory());
    const columnChecks = ref(getColumnChecks(dynamicColumns.value));
    // 当 dynamicColumns 变动时，重新生成 columnChecks 且保留已存在的显示状态
    watch(dynamicColumns, (newCols) => {
        const visibilityMap = new Map(columnChecks.value.map((c) => [getColumnKey(c), getColumnVisibility(c)]));
        const newChecks = getColumnChecks(newCols).map((c) => {
            const key = getColumnKey(c);
            const visibility = visibilityMap.has(key) ? visibilityMap.get(key) : getColumnVisibility(c);
            return {
                ...c,
                checked: visibility,
                visible: visibility
            };
        });
        columnChecks.value = newChecks;
    }, { deep: true });
    // 当前显示列（基于 columnChecks 的 checked 或 visible）
    const columns = computed(() => {
        const colMap = new Map(dynamicColumns.value.map((c) => [getColumnKey(c), c]));
        return columnChecks.value
            .filter((c) => getColumnVisibility(c))
            .map((c) => colMap.get(getColumnKey(c)))
            .filter(Boolean);
    });
    // 支持 updater 返回新数组或直接在传入数组上 mutate
    const setDynamicColumns = (updater) => {
        const copy = [...dynamicColumns.value];
        const result = updater(copy);
        dynamicColumns.value = Array.isArray(result) ? result : copy;
    };
    return {
        columns,
        columnChecks,
        /**
         * 新增列（支持单个或批量）
         */
        addColumn: (column, index) => setDynamicColumns((cols) => {
            const next = [...cols];
            const columnsToAdd = Array.isArray(column) ? column : [column];
            const insertIndex = typeof index === 'number' && index >= 0 && index <= next.length ? index : next.length;
            // 批量插入
            next.splice(insertIndex, 0, ...columnsToAdd);
            return next;
        }),
        /**
         * 删除列（支持单个或批量）
         */
        removeColumn: (prop) => setDynamicColumns((cols) => {
            const propsToRemove = Array.isArray(prop) ? prop : [prop];
            return cols.filter((c) => !propsToRemove.includes(getColumnKey(c)));
        }),
        /**
         * 更新列（支持单个或批量）
         */
        updateColumn: (prop, updates) => {
            // 批量模式：prop 是数组
            if (Array.isArray(prop)) {
                setDynamicColumns((cols) => {
                    const map = new Map(prop.map((u) => [u.prop, u.updates]));
                    return cols.map((c) => {
                        const key = getColumnKey(c);
                        const upd = map.get(key);
                        return upd ? { ...c, ...upd } : c;
                    });
                });
            }
            // 单个模式：prop 是字符串
            else if (updates) {
                setDynamicColumns((cols) => cols.map((c) => (getColumnKey(c) === prop ? { ...c, ...updates } : c)));
            }
        },
        /**
         * 切换列显示状态（支持单个或批量）
         */
        toggleColumn: (prop, visible) => {
            const propsToToggle = Array.isArray(prop) ? prop : [prop];
            const next = [...columnChecks.value];
            propsToToggle.forEach((p) => {
                const i = next.findIndex((c) => getColumnKey(c) === p);
                if (i > -1) {
                    const currentVisibility = getColumnVisibility(next[i]);
                    const newVisibility = visible ?? !currentVisibility;
                    // 同时更新 checked 和 visible 以保持兼容性
                    next[i] = { ...next[i], checked: newVisibility, visible: newVisibility };
                }
            });
            columnChecks.value = next;
        },
        /**
         * 重置所有列
         */
        resetColumns: () => {
            dynamicColumns.value = columnsFactory();
        },
        /**
         * 批量更新列（兼容旧版本）
         * @deprecated 推荐使用 updateColumn 的数组模式
         */
        batchUpdateColumns: (updates) => setDynamicColumns((cols) => {
            const map = new Map(updates.map((u) => [u.prop, u.updates]));
            return cols.map((c) => {
                const key = getColumnKey(c);
                const upd = map.get(key);
                return upd ? { ...c, ...upd } : c;
            });
        }),
        /**
         * 重新排序列
         */
        reorderColumns: (fromIndex, toIndex) => setDynamicColumns((cols) => {
            if (fromIndex < 0 ||
                fromIndex >= cols.length ||
                toIndex < 0 ||
                toIndex >= cols.length ||
                fromIndex === toIndex) {
                return cols;
            }
            const next = [...cols];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            return next;
        }),
        /**
         * 获取列配置
         */
        getColumnConfig: (prop) => dynamicColumns.value.find((c) => getColumnKey(c) === prop),
        /**
         * 获取所有列配置
         */
        getAllColumns: () => [...dynamicColumns.value]
    };
}
//# sourceMappingURL=useTableColumns.js.map