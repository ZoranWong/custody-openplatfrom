# Developer Portal Dashboard 优化设计

**日期:** 2026-08-16
**状态:** 已确认

## 目标

重新设计 Developer Portal Dashboard，从 ISV 开发者视角出发，展示他们最关心的核心业务数据。

## 当前问题

1. KYB 状态卡片用 `count: 0` 展示数字，应该是文字状态
2. 订阅和 API 调用量卡片没有实际数据，硬编码 `0` + `Coming Soon`
3. 缺少趋势图表，Dashboard 只有 4 张卡片，内容单薄
4. 没有利用 `fetchUsageStats` API 获取真实用量数据

## 设计方案

### 统计卡片 (4张)

| 卡片 | 图标 | 数据来源 | 说明 |
|------|------|---------|------|
| 应用数量 | `ri:apps-line` | `fetchApplications()` | 显示已创建应用总数 |
| 今日 API 调用量 | `ri:bar-chart-line` | `fetchUsageStats('30days')` → `dailyBreakdown` 最后一项 | 今日调用次数，带千分位格式 |
| API 成功率 | `ri:check-double-line` | `fetchUsageStats('30days')` → `successRate` | 百分比，小数点后1位 |
| 当前套餐 | `ri:vip-crown-line` | `fetchDeveloperInfo()` → 套餐信息 | 套餐名称 |

### 图表区域 (2个)

| 图表 | 类型 | 数据来源 | 说明 |
|------|------|---------|------|
| API 调用趋势 | `ArtLineChart` | `fetchUsageStats('30days')` → `dailyBreakdown` | 近30天调用量折线图，双线（总调用/成功） |
| 接口调用分布 | `ArtBarChart` | `fetchUsageStats('30days')` → `endpointBreakdown` | Top 5 接口调用量柱状图 |

### 布局

```
art-card (统计卡片行)
  ElRow 4列 → ArtStatsCard × 4

art-card (图表行)
  ElRow 2列 → ArtLineChart + ArtBarChart
```

### 空状态处理

- 如果 `fetchUsageStats` 返回空/失败：卡片显示 `0`，图表显示 `ElEmpty`
- 如果 `fetchApplications` 返回空：卡片显示 `0`
- 如果 `fetchDeveloperInfo` 返回空：套餐显示 `-`

### 加载状态

整个 Dashboard 用 `v-loading` 包裹，数据通过 `Promise.all` 并行加载。

## 技术细节

- 使用 `ArtStatsCard`、`ArtLineChart`、`ArtBarChart`（同 admin-portal-v2）
- `div.art-card > div.art-card-header` 图表容器
- 所有文本使用 `$t()` i18n
- 数字格式化：>1000 使用 `toLocaleString` 千分位