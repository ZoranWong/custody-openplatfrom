# Admin Portal 页面功能开发计划

> **Goal:** 实现 admin-portal-v2 中开发者管理、KYB审核、ISV管理、统计分析四个模块的完整功能

**Architecture:** 基于 Art Design Pro 的 useTable/ArtForm 组件，对接后端已有的 40+ admin API 接口

**关键约束:** 后端 API 接口已全部实现，前端只需对接。但 KYB 和 ISV 的 controller 使用内存 kybReviewService（非 Prisma），返回的是模拟数据。

---

## 模块一：开发者管理

### 后端已实现接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/developers` | 分页列表，支持 status/kybStatus 过滤 |
| GET | `/admin/developers/stats` | 统计：active/suspended/deleted/banned |
| GET | `/admin/developers/:id` | 详情（含 UBO 信息） |
| POST | `/admin/developers/:id/approve` | 审批通过 |
| POST | `/admin/developers/:id/reject` | 审批拒绝（需 reason） |
| POST | `/admin/developers/:id/ban` | 封禁（需 reason） |
| POST | `/admin/developers/:id/activate` | 激活 |
| POST | `/admin/developers/:id/suspend` | 冻结 |

### 页面设计

**开发者列表页 (`/developer/list`)**
- Art Design Pro 的 `useTable` + `ArtTable`
- 列：企业名称、信用代码、邮箱、注册地、KYB 状态、账号状态、创建时间
- 筛选：KYB 状态（pending/approved/rejected）、账号状态（active/suspended/banned）
- 点击行跳转详情页

**开发者详情页 (`/developer/:id`)**
- ElCard 展示企业信息（legalName、registrationNumber、jurisdiction、website 等）
- UBO 信息展示（JSON 渲染）
- 操作按钮：审批通过、审批拒绝、封禁、激活、冻结（根据当前状态显示可用操作）

**开发者审核页 (`/developer/:id/review`)**
- 与详情页类似，但焦点在审核操作
- 拒绝时需填写原因

### API 文件

创建 `src/api/developer.ts`：

```typescript
import request from '@/utils/http'

export function fetchDevelopers(params: { page?: number; pageSize?: number; status?: string; kybStatus?: string }) {
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

---

## 模块二：KYB 审核

### 后端已实现接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/kyb/pending` | 待审核列表 |
| GET | `/admin/kyb` | 全部 KYB 列表（分页、状态过滤） |
| GET | `/admin/kyb/:id` | 审核详情 |
| POST | `/admin/kyb/:id/approve` | 审批通过 |
| POST | `/admin/kyb/:id/reject` | 审批拒绝 |
| POST | `/admin/kyb/:id/request-info` | 补充材料 |
| GET | `/admin/kyb/stats` | 统计 |
| GET | `/admin/kyb/history` | 历史记录（分页、过滤） |
| GET | `/admin/kyb/history/:id` | 历史详情 |

**注意：** KYB 接口使用内存 kybReviewService，返回的是 3 条硬编码模拟数据。但 API 接口格式是完整的，前端对接方式不变。

### 页面设计

**KYB 待审核列表 (`/kyb/pending`)**
- useTable + ArtTable
- 列：公司名称、信用代码、提交时间、状态
- 操作：点击行进入审核详情

**KYB 审核详情 (`/kyb/:id`)**
- 企业信息展示
- UBO 信息展示
- 审核操作：审批通过、审批拒绝（需填写原因）、补充材料

**KYB 历史 (`/kyb/history`)**
- useTable
- 筛选：状态、时间范围
- 点击行查看详情

### API 文件

创建 `src/api/kyb.ts`：

```typescript
import request from '@/utils/http'

export function fetchKYBPending() {
  return request.get<any>({ url: '/admin/kyb/pending' })
}

export function fetchKYBList(params: { status?: string; page?: number; limit?: number }) {
  return request.get<any>({ url: '/admin/kyb', params })
}

export function fetchKYBDetail(id: string) {
  return request.get<any>({ url: `/admin/kyb/${id}` })
}

export function fetchApproveKYB(id: string) {
  return request.post<any>({ url: `/admin/kyb/${id}/approve` })
}

export function fetchRejectKYB(id: string, comment: string) {
  return request.post<any>({ url: `/admin/kyb/${id}/reject`, params: { comment } })
}

export function fetchRequestKYBInfo(id: string) {
  return request.post<any>({ url: `/admin/kyb/${id}/request-info` })
}

export function fetchKYBStats() {
  return request.get<any>({ url: '/admin/kyb/stats' })
}

export function fetchKYBHistory(params: any) {
  return request.get<any>({ url: '/admin/kyb/history', params })
}
```

---

## 模块三：ISV 管理

### 后端已实现接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/isv/:id/status` | ISV 状态详情 |
| POST | `/admin/isv/:id/activate` | 激活 |
| POST | `/admin/isv/:id/suspend` | 冻结 |
| POST | `/admin/isv/:id/ban` | 封禁 |
| GET | `/admin/isv/:id/status/history` | 状态变更历史 |

**注意：** ISV 接口使用内存 kybReviewService.isvAccounts，返回的是模拟数据。

### 页面设计

**ISV 列表 (`/isv/list`)**
- useTable + ArtTable
- 列：公司名称、邮箱、状态、KYB 状态
- 操作：激活/冻结/封禁

**ISV 状态详情 (`/isv/:id`)**
- 企业信息展示
- 状态变更历史（时间线）
- 操作按钮

### API 文件

创建 `src/api/isv.ts`：

```typescript
import request from '@/utils/http'

export function fetchISVStatus(id: string) {
  return request.get<any>({ url: `/admin/isv/${id}/status` })
}

export function fetchActivateISV(id: string) {
  return request.post<any>({ url: `/admin/isv/${id}/activate` })
}

export function fetchSuspendISV(id: string, reason?: string) {
  return request.post<any>({ url: `/admin/isv/${id}/suspend`, params: { reason } })
}

export function fetchBanISV(id: string, reason: string) {
  return request.post<any>({ url: `/admin/isv/${id}/ban`, params: { reason } })
}

export function fetchISVStatusHistory(id: string) {
  return request.get<any>({ url: `/admin/isv/${id}/status/history` })
}
```

---

## 模块四：统计分析

### 后端已实现接口

**Dashboard：**
| GET | `/admin/dashboard/stats` | 统计概览 |
| GET | `/admin/dashboard/trends` | 趋势数据 |
| GET | `/admin/dashboard/details` | 详细数据 |
| GET | `/admin/dashboard/health` | 健康状态 |

**API 统计：**
| GET | `/admin/stats/api/summary` | API 统计概要 |
| GET | `/admin/stats/api/top-apps` | Top 应用 |
| GET | `/admin/stats/api/response-times` | 响应时间趋势 |
| GET | `/admin/stats/api/errors` | 错误趋势 |
| GET | `/admin/stats/api/app/:appId` | 应用详情 |

**收入统计：**
| GET | `/admin/stats/revenue/summary` | 收入概要 |
| GET | `/admin/stats/revenue/trends` | 收入趋势 |
| GET | `/admin/stats/revenue/by-developer` | 按开发者 |

**系统健康：**
| GET | `/admin/health/status` | 系统状态 |
| GET | `/admin/health/services` | 服务列表 |
| GET | `/admin/health/resources` | 资源使用 |
| GET | `/admin/health/history` | 健康历史 |

**注意：** Dashboard/统计/健康接口使用 mock 随机数据（dashboardStatsService），但 API 格式完整。

### 页面设计

**Dashboard 仪表盘 (`/`)**
- Art Design Pro 的 StatsCard 组件
- 统计卡片：开发者总数、应用总数、待审核 KYB、API 调用量
- 趋势图：API 调用趋势、错误率趋势

**API 统计 (`/stats/api`)**
- 概要卡片：总调用量、错误率、平均延迟
- Top 应用排名
- 响应时间/错误率趋势图

**收入分析 (`/stats/revenue`)**
- 收入概览卡片
- 按开发者收入排行
- 收入趋势图

**系统健康 (`/stats/health`)**
- 系统状态卡片
- 服务列表
- 资源使用展示

### API 文件

创建 `src/api/dashboard.ts` 和 `src/api/stats.ts`。

---

## 执行计划

### 阶段一：API 层（3 个文件）

| 任务 | 文件 | 内容 |
|------|------|------|
| 1.1 | `src/api/developer.ts` | 开发者管理 API |
| 1.2 | `src/api/kyb.ts` | KYB 审核 API |
| 1.3 | `src/api/isv.ts` | ISV 管理 API |
| 1.4 | `src/api/dashboard.ts` | Dashboard API |
| 1.5 | `src/api/stats.ts` | 统计 API |

### 阶段二：页面组件（11 个页面）

| 任务 | 文件 | 内容 |
|------|------|------|
| 2.1 | `src/views/developer/list/index.vue` | 开发者列表（useTable） |
| 2.2 | `src/views/developer/detail/index.vue` | 开发者详情 |
| 2.3 | `src/views/developer/review/index.vue` | 开发者审核 |
| 2.4 | `src/views/kyb/pending/index.vue` | KYB 待审核列表 |
| 2.5 | `src/views/kyb/detail/index.vue` | KYB 审核详情 |
| 2.6 | `src/views/kyb/history/index.vue` | KYB 历史 |
| 2.7 | `src/views/isv/list/index.vue` | ISV 列表 |
| 2.8 | `src/views/isv/detail/index.vue` | ISV 状态详情 |
| 2.9 | `src/views/stats/api/index.vue` | API 统计 |
| 2.10 | `src/views/stats/revenue/index.vue` | 收入分析 |
| 2.11 | `src/views/stats/health/index.vue` | 系统健康 |

### 阶段三：Dashboard 仪表盘

| 任务 | 文件 | 内容 |
|------|------|------|
| 3.1 | `src/views/dashboard/console/index.vue` | 仪表盘首页 |

### 阶段四：验证

| 任务 | 内容 |
|------|------|
| 4.1 | `pnpm build` | 构建验证 |
| 4.2 | 手动测试 | 检查所有页面功能 |

---

## 后端返回格式

所有接口统一返回：
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