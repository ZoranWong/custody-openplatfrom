# Admin Portal 页面功能完整开发计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现 admin-portal-v2 中仪表盘、开发者管理、统计分析、系统监控、系统设置五个模块的完整功能

**Architecture:** 基于 Art Design Pro 的 Vue 3 + Element Plus + Tailwind CSS，使用 useTable/ArtForm 组件，通过 Ar Design Pro 的 HTTP 工具（`@/utils/http`）对接后端 API

**Tech Stack:** Vue 3.5 + Vite 7 + Element Plus 2.11 + Tailwind CSS 4 + Pinia 3 + TypeScript 5.6

**后端 API 实现状态（来自代码审核）：**
- 开发者管理：✅ Prisma 真实数据库
- 管理员列表：✅ Prisma 真实数据库
- Dashboard：❌ Math.random() mock
- KYB 审核：❌ 内存 Map（3 条硬编码样本）
- ISV 状态：❌ 内存 Map（3 条硬编码样本）
- API 统计：❌ 硬编码 + Math.random()
- 收入统计：❌ Math.random()
- 系统健康：❌ Math.random()

---

## 模块一：开发者管理

### 后端 API（全部 Prisma 真实数据 ✅）

| 前端方法 | 接口路径 | 说明 |
|---------|---------|------|
| fetchDevelopers | GET /admin/developers?page&pageSize&status&kybStatus | 分页列表 |
| fetchDeveloperStats | GET /admin/developers/stats | 统计数据 |
| fetchDeveloperById | GET /admin/developers/:id | 详情 |
| fetchApproveDeveloper | POST /admin/developers/:id/approve | 审批通过 |
| fetchRejectDeveloper | POST /admin/developers/:id/reject | 审批拒绝 |
| fetchBanDeveloper | POST /admin/developers/:id/ban | 封禁 |
| fetchActivateDeveloper | POST /admin/developers/:id/activate | 激活 |
| fetchSuspendDeveloper | POST /admin/developers/:id/suspend | 冻结 |

### 任务 1.1: 创建 API 文件

**文件:** `src/api/developer.ts`

```typescript
import request from '@/utils/http'

export function fetchDevelopers(params: {
  page?: number
  pageSize?: number
  status?: string
  kybStatus?: string
}) {
  return request.get<any>({ url: '/admin/developers', params })
}

export function fetchDeveloperStats() {
  return request.get<any>({ url: '/admin/developers/stats' })
}

export function fetchDeveloperById(id: string) {
  return request.get<any>({ url: `/admin/developers/${id}` })
}

export function fetchApproveDeveloper(id: string) {
  return request.post<any>({ url: `/admin/developers/${id}/approve` })
}

export function fetchRejectDeveloper(id: string, reason: string) {
  return request.post<any>({ url: `/admin/developers/${id}/reject`, params: { reason } })
}

export function fetchBanDeveloper(id: string, reason: string) {
  return request.post<any>({ url: `/admin/developers/${id}/ban`, params: { reason } })
}

export function fetchActivateDeveloper(id: string) {
  return request.post<any>({ url: `/admin/developers/${id}/activate` })
}

export function fetchSuspendDeveloper(id: string) {
  return request.post<any>({ url: `/admin/developers/${id}/suspend` })
}
```

### 任务 1.2: 开发者列表页

**文件:** `src/views/developer/list/index.vue`

使用 Art Design Pro 的 `useTable` + `ArtTable`：
- 列：企业名称、邮箱、KYB状态、账号状态、注册地、创建时间
- 筛选：KYB 状态（pending/approved/rejected）、账号状态（active/suspended/banned/deleted）
- 操作：点击行跳转详情页
- 分页：使用 `pagination` 配置

### 任务 1.3: 开发者详情页

**文件:** `src/views/developer/detail/index.vue`

使用 `ElCard` + `ElDescriptions`：
- 企业信息卡片：legalName, registrationNumber, jurisdiction, dateOfIncorporation, registeredAddress, website
- KYB 信息卡片：kybStatus, kybReviewedAt, kybReviewedBy
- 联系人信息卡片：email
- UBO 信息卡片：uboInfo 数组渲染
- 操作按钮：审批通过、拒绝（需填写原因）、封禁、激活、冻结

### 任务 1.4: 注册申请页（待审核 + 历史记录 tabs）

**文件:** `src/views/developer/registration/index.vue`

使用 `ElTabs` 切换两个 tab：
- **待审核 tab：** `useTable` + `fetchDevelopers({ kybStatus: 'pending' })`
- **历史记录 tab：** `useTable` + `fetchDevelopers({ kybStatus: 'approved,rejected' })`
- 点击行跳转审核详情页

### 任务 1.5: 审核详情页

**文件:** `src/views/developer/review/index.vue`

与详情页类似，顶部增加审核操作按钮：
- 审批通过（确认对话框）
- 审批拒绝（填写原因）
- 返回按钮

---

## 模块二：仪表盘

### 后端 API（Mock ⚠️）

| 前端方法 | 接口路径 | 说明 |
|---------|---------|------|
| fetchDashboardStats | GET /admin/dashboard/stats | 概览统计 |
| fetchDashboardTrends | GET /admin/dashboard/trends | 趋势数据 |
| fetchDashboardDetails | GET /admin/dashboard/details | 详细数据 |
| fetchDashboardHealth | GET /admin/dashboard/health | 健康状态 |

### 任务 2.1: 创建 API 文件

**文件:** `src/api/dashboard.ts`

### 任务 2.2: 仪表盘页面

**文件:** `src/views/dashboard/console/index.vue`

使用 Art Design Pro 的 StatsCard 组件 + 图表组件：
- 统计卡片行：开发者总数、应用总数、待审核数、API 调用量
- 趋势图：API 调用趋势（折线图）、错误率趋势（折线图）
- 自动刷新：每 60 秒刷新一次

---

## 模块三：统计分析

### 后端 API

| 前端方法 | 接口路径 | 说明 |
|---------|---------|------|
| fetchAPIStatsSummary | GET /admin/stats/api/summary | API 统计 |
| fetchAPITopApps | GET /admin/stats/api/top-apps | Top 应用 |
| fetchAPIResponseTimeTrend | GET /admin/stats/api/response-times | 响应时间 |
| fetchAPIErrorTrend | GET /admin/stats/api/errors | 错误趋势 |
| fetchRevenueSummary | GET /admin/stats/revenue/summary | 收入概要 |
| fetchRevenueTrends | GET /admin/stats/revenue/trends | 收入趋势 |

### 任务 3.1: 创建 API 文件

**文件:** `src/api/stats.ts`

### 任务 3.2: API 统计页

**文件:** `src/views/stats/api/index.vue`

- 概要卡片：总调用量、错误率、平均延迟
- Top 应用表格
- 响应时间趋势图
- 错误率趋势图

### 任务 3.3: 订阅统计页

**文件:** `src/views/stats/subscription/index.vue`

- 占位页面，显示"订阅统计功能将在计费系统完成后启用"

---

## 模块四：系统监控

### 后端 API

| 前端方法 | 接口路径 | 说明 |
|---------|---------|------|
| fetchHealthStatus | GET /admin/health/status | 系统状态 |
| fetchServicesHealth | GET /admin/health/services | 服务列表 |
| fetchResourceUsage | GET /admin/health/resources | 资源使用 |
| fetchHealthHistory | GET /admin/health/history | 健康历史 |

### 任务 4.1: 创建 API 文件

**文件:** `src/api/monitor.ts`

### 任务 4.2: API 异常页

**文件:** `src/views/monitor/api-error/index.vue`

- 最近 API 错误列表（从 API 统计的错误趋势中提取）
- 错误率告警阈值显示

### 任务 4.3: 系统异常页

**文件:** `src/views/monitor/system-error/index.vue`

- 系统异常事件列表（占位，后续对接告警系统）

### 任务 4.4: 服务状态页

**文件:** `src/views/monitor/service-status/index.vue`

- 服务健康状态卡片（API Gateway, Auth Service, KYB Service...）
- 资源使用率：CPU、内存、磁盘

---

## 模块五：系统设置

### 后端 API

| 前端方法 | 接口路径 | 说明 |
|---------|---------|------|
| fetchAdmins | GET /admin/admins | 管理员列表（已有） |
| fetchAdminProfile | GET /admin/profile | 当前用户信息（已有） |

角色/菜单/系统配置/操作日志后端暂未实现，前端占位。

### 任务 5.1: 创建 API 文件

**文件:** `src/api/settings.ts`

### 任务 5.2: 管理员管理页

**文件:** `src/views/settings/admin/index.vue`

- useTable + ArtTable
- 列：姓名、邮箱、角色、状态、最后登录时间、创建时间
- 操作：新增管理员、编辑角色、启用/禁用

### 任务 5.3: 角色管理页

**文件:** `src/views/settings/role/index.vue`

- 占位页面，Art Design Pro 已有角色管理页面，保留

### 任务 5.4: 菜单管理页

**文件:** `src/views/settings/menu/index.vue`

- 占位页面，Art Design Pro 已有菜单管理页面，保留

### 任务 5.5: 系统配置页

**文件:** `src/views/settings/config/index.vue`

- 占位页面，显示"系统配置功能即将上线"

### 任务 5.6: 操作日志页

**文件:** `src/views/settings/audit-log/index.vue`

- 占位页面，显示"操作日志功能即将上线"

---

## 模块六：订阅管理（全部占位）

### 任务 6.1~6.3: 占位页面

**文件:**
- `src/views/subscription/plans/index.vue`
- `src/views/subscription/list/index.vue`
- `src/views/subscription/orders/index.vue`

全部显示"功能将在计费系统完成后启用"

---

## 模块七：工单管理（全部占位）

### 任务 7.1~7.2: 占位页面

**文件:**
- `src/views/ticket/pending/index.vue`
- `src/views/ticket/history/index.vue`

全部显示"功能即将上线"

---

## 执行清单

### 阶段一：API 层（5 个文件）

- [ ] Task 1.1: `src/api/developer.ts` — 开发者管理 API
- [ ] Task 2.1: `src/api/dashboard.ts` — Dashboard API
- [ ] Task 3.1: `src/api/stats.ts` — 统计 API
- [ ] Task 4.1: `src/api/monitor.ts` — 监控 API
- [ ] Task 5.1: `src/api/settings.ts` — 系统设置 API

### 阶段二：开发者管理（4 个页面）

- [ ] Task 1.2: 开发者列表页
- [ ] Task 1.3: 开发者详情页
- [ ] Task 1.4: 注册申请页（tabs）
- [ ] Task 1.5: 审核详情页

### 阶段三：仪表盘 + 统计分析（3 个页面）

- [ ] Task 2.2: 仪表盘工作台
- [ ] Task 3.2: API 统计页
- [ ] Task 3.3: 订阅统计页（占位）

### 阶段四：系统监控（3 个页面）

- [ ] Task 4.2: API 异常页
- [ ] Task 4.3: 系统异常页
- [ ] Task 4.4: 服务状态页

### 阶段五：系统设置（5 个页面）

- [ ] Task 5.2: 管理员管理页
- [ ] Task 5.3: 角色管理页
- [ ] Task 5.4: 菜单管理页
- [ ] Task 5.5: 系统配置页（占位）
- [ ] Task 5.6: 操作日志页（占位）

### 阶段六：占位页面（5 个页面）

- [ ] Task 6.1~6.3: 订阅管理 3 个页面
- [ ] Task 7.1~7.2: 工单管理 2 个页面

### 阶段七：验证

- [ ] `pnpm build` 构建验证
- [ ] 所有页面路由可访问
- [ ] 开发者管理功能正常（真实数据）
- [ ] 仪表盘/统计/监控展示 mock 数据

---

## 后端返回格式

```json
{
  "code": 0,
  "data": { ... },
  "message": "success",
  "trace_id": "..."
}
```

列表接口返回：
```json
{
  "code": 0,
  "data": {
    "list": [...],
    "total": 100,
    "page": 1,
    "pageSize": 10
  }
}
```

**注意：开发者管理接口不返回 `trace_id`（与其他模块不一致），前端需兼容处理。**