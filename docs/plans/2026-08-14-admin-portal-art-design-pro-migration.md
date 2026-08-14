# Admin Portal — Art Design Pro 迁移实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 admin-portal 迁移到 Art Design Pro 脚手架，严格遵循其设计规范（模块名称、文件组织、路由组织、页面布局、组件）

**Architecture:** 基于 Art Design Pro 的 Vue 3 + Element Plus + Tailwind CSS + Pinia + Vue Router 体系，保留其登录页面、Layout、主题系统、HTTP 工具等全部脚手架组件，仅替换 API 调用和业务逻辑

**Tech Stack:** Vue 3.4 + Vite 5 + Element Plus 2.6 + Tailwind CSS 4 + Pinia 2 + Vue Router 4 + ECharts 6 + TypeScript

**关键约束:**
- 所有页面样式和组件使用 Art Design Pro 原版，不引入旧 admin-portal 的样式
- API 调用参考旧 `admin-portal/src/services/api.ts` 实现
- 路由/菜单/权限使用 Art Design Pro 的 RBAC 体系（`roles: ['R_SUPER', 'R_ADMIN']`）
- HTTP 请求使用 Art Design Pro 的 `src/utils/http/index.ts` 封装

---

## Art Design Pro 设计规范总结

### 目录结构规范

```
src/
├── api/              # API 接口层（按模块拆分）
│   ├── auth.ts       # 认证相关
│   └── system-manage.ts
├── views/            # 页面视图（按模块分目录）
│   ├── auth/         # 登录/注册/忘记密码
│   │   └── login/index.vue
│   ├── dashboard/    # 仪表盘
│   │   └── console/index.vue
│   ├── system/       # 系统管理
│   │   └── user/index.vue
│   └── exception/    # 异常页面
│       ├── 403/index.vue
│       ├── 404/index.vue
│       └── 500/index.vue
├── router/
│   ├── modules/      # 路由模块定义（每个模块一个文件）
│   │   ├── index.ts  # 汇总所有模块
│   │   ├── dashboard.ts
│   │   └── system.ts
│   ├── routes/       # 静态路由
│   │   └── staticRoutes.ts
│   └── guards/       # 路由守卫
├── store/modules/    # Pinia Store（每个模块一个文件）
│   ├── user.ts       # 用户状态（含 token、登录状态）
│   ├── setting.ts
│   ├── menu.ts
│   └── worktab.ts
├── components/core/  # 核心组件（不可修改）
│   ├── layouts/      # 布局组件
│   ├── cards/        # 卡片组件（StatsCard 等）
│   ├── charts/       # 图表组件
│   ├── tables/       # 表格组件（art-table）
│   ├── forms/        # 表单组件（art-form）
│   └── views/        # 视图组件（登录/异常/结果页）
├── hooks/core/       # 核心 Hooks
│   ├── useTable.ts   # 表格 Hook
│   ├── useAuth.ts    # 认证 Hook
│   └── useTheme.ts   # 主题 Hook
├── utils/http/       # HTTP 请求封装
├── locales/          # 国际化
├── config/           # 配置文件
├── types/            # 类型定义
└── directives/       # 自定义指令
```

### 路由模块规范

```typescript
// 每个模块导出 AppRouteRecord 对象
export const developerRoutes: AppRouteRecord = {
  path: '/developer',
  name: 'Developer',
  component: '/index/index',  // 使用 Art Design Pro 的 Layout
  meta: {
    title: 'menus.developer.title',
    icon: 'ri:user-3-line',
    roles: ['R_SUPER', 'R_ADMIN']
  },
  children: [
    {
      path: 'list',
      name: 'DeveloperList',
      component: '/developer/list',
      meta: {
        title: 'menus.developer.list',
        keepAlive: true,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    }
  ]
}
```

### 页面组件规范

```vue
<!-- 页面必须使用 defineOptions({ name: 'Xxx' }) -->
<script setup lang="ts">
defineOptions({ name: 'DeveloperList' })
</script>

<template>
  <!-- 使用 Art Design Pro 的布局组件 -->
  <ArtPageContent>
    <!-- 使用 art-table 或 useTable -->
  </ArtPageContent>
</template>
```

### 权限规范

- `roles: ['R_SUPER', 'R_ADMIN']` — 仅超级管理员和管理员
- `roles: ['R_SUPER']` — 仅超级管理员
- 不设置 roles — 所有已登录用户
- `authList` — 按钮级权限（新增/编辑/删除）

### API 调用规范

```typescript
import request from '@/utils/http'

export function fetchLogin(params: Api.Auth.LoginParams) {
  return request.post<Api.Auth.LoginResponse>({
    url: '/api/auth/login',
    params
  })
}
```

---

## 旧 Admin Portal 功能清单

| 功能 | 旧路径 | 旧组件 |
|------|--------|--------|
| 登录 | `/login` | LoginPage |
| 仪表盘 | `/` | DashboardPage |
| 修改密码 | `/settings/password` | ChangePasswordPage |
| 403 页面 | `/403` | ForbiddenPage |
| 开发者列表 | `/developer` | DeveloperListPage |
| 开发者详情 | `/developer/:id` | DeveloperDetailPage |
| 开发者审核 | `/developer/:id/review` | DeveloperReviewPage |
| KYB 待审核 | `/kyb/pending` | KYBPendingListPage |
| KYB 审核详情 | `/kyb/:id` | KYBReviewDetailPage |
| KYB 历史 | `/kyb/history` | KYBHistoryListPage |
| ISV 列表 | `/isv` | ISVListPage |
| ISV 状态详情 | `/isv/:id` | ISVStatusDetailPage |
| API 统计 | `/stats/api` | APIStatsPage |
| 收入分析 | `/stats/revenue` | RevenueAnalyticsPage |
| 系统健康 | `/stats/health` | SystemHealthPage |

### 旧 API Services

| Service | 端点 |
|---------|------|
| `api.ts` — AdminApiService | 登录/刷新/登出/改密/Profile/Dashboard/Developer |
| `kyb-api.ts` — KYBApiService | KYB 审核/历史/统计 |
| `isv-status-api.ts` — ISVStatusApiService | ISV 状态管理 |
| `api-stats-api.ts` | API 统计数据 |
| `revenue-stats-api.ts` | 收入统计数据 |
| `health-api.ts` | 系统健康数据 |

---

## 迁移任务

### Task 1: 项目配置

**Files:**
- Modify: `package.json` — name: `cregis-admin-portal`
- Modify: `vite.config.ts` — base: `/openplatform-admin/`, server port: 1002, proxy: `/api` → `http://localhost:1000`
- Modify: `.env.development` — `VITE_API_URL = /api`, `VITE_APP_TITLE = Cregis Admin Portal`

**Step 1: 更新 package.json**

```bash
cd openplatform-web/admin-portal-v2
# 修改 name 字段
```

**Step 2: 更新 vite.config.ts**

```typescript
// 修改 base 和 server
base: '/openplatform-admin/',
server: {
  port: 1002,
  proxy: {
    '/api': {
      target: 'http://localhost:1000',
      changeOrigin: true
    }
  }
}
```

**Step 3: 更新 .env**

```bash
VITE_API_URL = /api/v1
VITE_APP_TITLE = Cregis Admin Portal
```

**Step 4: 验证**

```bash
pnpm dev  # 确认启动正常，无报错
```

**Step 5: 提交**

```bash
git add openplatform-web/admin-portal-v2/
git commit -m "feat(admin): configure project for Cregis Admin Portal"
```

---

### Task 2: 复制 API 类型定义

**Files:**
- Create: `src/types/api/developer.d.ts` — 开发者相关类型
- Modify: `src/types/api/api.d.ts` — 扩展 API 类型（添加 Admin 相关）

**Step 1: 创建开发者类型定义**

从旧 `admin-portal/src/types/developer.ts` 复制并适配 Art Design Pro 的类型体系：

```typescript
// src/types/api/developer.d.ts
declare namespace Api {
  namespace Developer {
    interface DeveloperItem {
      id: string
      legalName: string
      registrationNumber: string
      jurisdiction: string
      contactEmail: string
      status: string
      kybStatus: string
      createdAt: string
    }
    interface DeveloperDetail extends DeveloperItem {
      email: string
      dateOfIncorporation: string
      registeredAddress: string
      website: string
      uboInfo: any
      kybReviewedAt: string
      kybReviewedBy: string
      updatedAt: string
    }
    interface ListResponse {
      list: DeveloperItem[]
      total: number
      page: number
      pageSize: number
    }
    interface StatsResponse {
      total: number
      active: number
      pending: number
      suspended: number
      banned: number
    }
  }
}
```

**Step 2: 提交**

```bash
git add src/types/
git commit -m "feat(admin): add developer type definitions"
```

---

### Task 3: 实现 API 接口层

**Files:**
- Modify: `src/api/auth.ts` — 替换为 admin 登录 API
- Create: `src/api/developer.ts` — 开发者管理 API
- Create: `src/api/dashboard.ts` — Dashboard API
- Create: `src/api/kyb.ts` — KYB 审核 API
- Create: `src/api/isv.ts` — ISV 状态 API
- Create: `src/api/stats.ts` — 统计 API

**Step 1: 修改 auth.ts — 对接 admin 登录**

```typescript
import request from '@/utils/http'

export function fetchLogin(params: { email: string; password: string }) {
  return request.post<any>({ url: '/api/v1/admin/auth/login', params })
}

export function fetchRefreshToken(params: { refreshToken: string }) {
  return request.post<any>({ url: '/api/v1/admin/auth/refresh', params })
}

export function fetchLogout() {
  return request.post<any>({ url: '/api/v1/admin/auth/logout' })
}

export function fetchGetUserInfo() {
  return request.get<any>({ url: '/api/v1/admin/profile' })
}

export function fetchChangePassword(params: { currentPassword: string; newPassword: string }) {
  return request.post<any>({ url: '/api/v1/admin/auth/change-password', params })
}
```

**Step 2: 创建 developer.ts**

```typescript
import request from '@/utils/http'

export function fetchDevelopers(params: { page?: number; pageSize?: number; status?: string; kybStatus?: string }) {
  return request.get<any>({ url: '/api/v1/admin/developers', params })
}

export function fetchDeveloperById(id: string) {
  return request.get<any>({ url: `/api/v1/admin/developers/${id}` })
}

export function fetchDeveloperStats() {
  return request.get<any>({ url: '/api/v1/admin/developers/stats' })
}

export function fetchApproveDeveloper(id: string) {
  return request.post<any>({ url: `/api/v1/admin/developers/${id}/approve` })
}

export function fetchRejectDeveloper(id: string, reason: string) {
  return request.post<any>({ url: `/api/v1/admin/developers/${id}/reject`, params: { reason } })
}

export function fetchBanDeveloper(id: string, reason: string) {
  return request.post<any>({ url: `/api/v1/admin/developers/${id}/ban`, params: { reason } })
}

export function fetchActivateDeveloper(id: string) {
  return request.post<any>({ url: `/api/v1/admin/developers/${id}/activate` })
}

export function fetchSuspendDeveloper(id: string) {
  return request.post<any>({ url: `/api/v1/admin/developers/${id}/suspend` })
}
```

**Step 3: 创建 dashboard.ts**

```typescript
import request from '@/utils/http'

export function fetchDashboardStats() {
  return request.get<any>({ url: '/api/v1/admin/dashboard/stats' })
}

export function fetchDashboardTrends() {
  return request.get<any>({ url: '/api/v1/admin/dashboard/trends' })
}

export function fetchDashboardDetails() {
  return request.get<any>({ url: '/api/v1/admin/dashboard/details' })
}

export function fetchDashboardHealth() {
  return request.get<any>({ url: '/api/v1/admin/dashboard/health' })
}
```

**Step 4: 创建 kyb.ts**

```typescript
import request from '@/utils/http'

export function fetchKYBPending() {
  return request.get<any>({ url: '/api/v1/admin/kyb/pending' })
}

export function fetchKYBList(params: { status?: string; page?: number; limit?: number }) {
  return request.get<any>({ url: '/api/v1/admin/kyb', params })
}

export function fetchKYBDetail(id: string) {
  return request.get<any>({ url: `/api/v1/admin/kyb/${id}` })
}

export function fetchApproveKYB(id: string) {
  return request.post<any>({ url: `/api/v1/admin/kyb/${id}/approve` })
}

export function fetchRejectKYB(id: string, comment: string) {
  return request.post<any>({ url: `/api/v1/admin/kyb/${id}/reject`, params: { comment } })
}

export function fetchRequestKYBInfo(id: string) {
  return request.post<any>({ url: `/api/v1/admin/kyb/${id}/request-info` })
}

export function fetchKYBStats() {
  return request.get<any>({ url: '/api/v1/admin/kyb/stats' })
}

export function fetchKYBHistory(params: any) {
  return request.get<any>({ url: '/api/v1/admin/kyb/history', params })
}
```

**Step 5: 创建 isv.ts**

```typescript
import request from '@/utils/http'

export function fetchISVStatus(id: string) {
  return request.get<any>({ url: `/api/v1/admin/isv/${id}/status` })
}

export function fetchActivateISV(id: string) {
  return request.post<any>({ url: `/api/v1/admin/isv/${id}/activate` })
}

export function fetchSuspendISV(id: string, reason?: string) {
  return request.post<any>({ url: `/api/v1/admin/isv/${id}/suspend`, params: { reason } })
}

export function fetchBanISV(id: string, reason: string) {
  return request.post<any>({ url: `/api/v1/admin/isv/${id}/ban`, params: { reason } })
}

export function fetchISVStatusHistory(id: string) {
  return request.get<any>({ url: `/api/v1/admin/isv/${id}/status/history` })
}
```

**Step 6: 创建 stats.ts**

```typescript
import request from '@/utils/http'

export function fetchAPIStatsSummary() {
  return request.get<any>({ url: '/api/v1/admin/stats/api/summary' })
}

export function fetchAPIStatsTopApps() {
  return request.get<any>({ url: '/api/v1/admin/stats/api/top-apps' })
}

export function fetchRevenueSummary() {
  return request.get<any>({ url: '/api/v1/admin/stats/revenue/summary' })
}

export function fetchRevenueTrends() {
  return request.get<any>({ url: '/api/v1/admin/stats/revenue/trends' })
}

export function fetchHealthStatus() {
  return request.get<any>({ url: '/api/v1/admin/health/status' })
}

export function fetchHealthServices() {
  return request.get<any>({ url: '/api/v1/admin/health/services' })
}
```

**Step 7: 提交**

```bash
git add src/api/
git commit -m "feat(admin): implement API layer for admin portal"
```

---

### Task 4: 适配登录页面

**Files:**
- Modify: `src/views/auth/login/index.vue` — 替换为 admin 登录 API

**Step 1: 修改登录逻辑**

Art Design Pro 的登录页面样式和布局完全保留。只修改 `<script setup>` 中的登录逻辑：

```typescript
// 替换 import
import { fetchLogin } from '@/api/auth'

// 替换 handleSubmit 中的登录调用
const { username, password } = formData
const response = await fetchLogin({ email: username, password })

// 后端返回格式: { code: 0, data: { accessToken, refreshToken } }
// 适配 Art Design Pro 的 token 存储
if (response) {
  // 从后端响应中提取 token — 需要根据实际返回格式适配
  userStore.setToken(response.accessToken || response.access_token, 
                     response.refreshToken || response.refresh_token)
  userStore.setLoginStatus(true)
  userStore.setUserInfo(response.user || { name: username })
}
```

删除 demo 账号选择器（`accounts` 和 `setupAccount`），因为这是 admin 直接登录，不需要选择预设账号。

**Step 2: 提交**

```bash
git add src/views/auth/login/index.vue
git commit -m "feat(admin): adapt login page to admin API"
```

---

### Task 5: 添加路由模块

**Files:**
- Create: `src/router/modules/developer.ts` — 开发者管理路由
- Create: `src/router/modules/kyb.ts` — KYB 审核路由
- Create: `src/router/modules/isv.ts` — ISV 管理路由
- Create: `src/router/modules/stats.ts` — 统计路由
- Modify: `src/router/modules/index.ts` — 注册新模块
- Modify: `src/locales/langs/zh.json` — 添加菜单中文
- Modify: `src/locales/langs/en.json` — 添加菜单英文

**Step 1: 创建 developer.ts**

```typescript
import { AppRouteRecord } from '@/types/router'

export const developerRoutes: AppRouteRecord = {
  path: '/developer',
  name: 'Developer',
  component: '/index/index',
  meta: {
    title: 'menus.developer.title',
    icon: 'ri:user-3-line',
    roles: ['R_SUPER', 'R_ADMIN']
  },
  children: [
    {
      path: 'list',
      name: 'DeveloperList',
      component: '/developer/list',
      meta: {
        title: 'menus.developer.list',
        keepAlive: true,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    },
    {
      path: ':id',
      name: 'DeveloperDetail',
      component: '/developer/detail',
      meta: {
        title: 'menus.developer.detail',
        isHide: true,
        isHideTab: true
      }
    },
    {
      path: ':id/review',
      name: 'DeveloperReview',
      component: '/developer/review',
      meta: {
        title: 'menus.developer.review',
        isHide: true,
        isHideTab: true
      }
    }
  ]
}
```

**Step 2: 创建 kyb.ts**

```typescript
import { AppRouteRecord } from '@/types/router'

export const kybRoutes: AppRouteRecord = {
  path: '/kyb',
  name: 'KYB',
  component: '/index/index',
  meta: {
    title: 'menus.kyb.title',
    icon: 'ri:file-list-3-line',
    roles: ['R_SUPER', 'R_ADMIN']
  },
  children: [
    {
      path: 'pending',
      name: 'KYBPending',
      component: '/kyb/pending',
      meta: {
        title: 'menus.kyb.pending',
        keepAlive: true,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    },
    {
      path: 'history',
      name: 'KYBHistory',
      component: '/kyb/history',
      meta: {
        title: 'menus.kyb.history',
        keepAlive: true,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    },
    {
      path: ':id',
      name: 'KYBDetail',
      component: '/kyb/detail',
      meta: {
        title: 'menus.kyb.detail',
        isHide: true,
        isHideTab: true
      }
    }
  ]
}
```

**Step 3: 创建 isv.ts 和 stats.ts**

类似结构，参考 Art Design Pro 的 `system.ts` 模式。

**Step 4: 更新 modules/index.ts**

```typescript
import { developerRoutes } from './developer'
import { kybRoutes } from './kyb'
import { isvRoutes } from './isv'
import { statsRoutes } from './stats'

export const routeModules: AppRouteRecord[] = [
  dashboardRoutes,
  developerRoutes,
  kybRoutes,
  isvRoutes,
  statsRoutes,
  systemRoutes,
  resultRoutes,
  exceptionRoutes
]
```

**Step 5: 更新语言文件**

在 `zh.json` 中添加：
```json
{
  "menus": {
    "developer": { "title": "开发者管理", "list": "开发者列表", "detail": "开发者详情", "review": "审核" },
    "kyb": { "title": "KYB审核", "pending": "待审核", "history": "历史记录", "detail": "审核详情" },
    "isv": { "title": "ISV管理", "list": "ISV列表", "detail": "状态详情" },
    "stats": { "title": "统计分析", "api": "API统计", "revenue": "收入分析", "health": "系统健康" }
  }
}
```

**Step 6: 提交**

```bash
git add src/router/modules/ src/locales/
git commit -m "feat(admin): add route modules for developer, KYB, ISV, stats"
```

---

### Task 6: 创建页面组件

**Step 1: Dashboard 页面**

使用 Art Design Pro 的 `art-stats-card`、`art-line-chart-card`、`art-bar-chart-card` 等组件，替换 demo 数据为真实 API 调用。

**Step 2: DeveloperList 页面**

使用 `useTable` Hook + `art-table` 组件，对接 `fetchDevelopers` API。

**Step 3: DeveloperDetail 页面**

使用 Art Design Pro 的详情布局，展示开发者信息 + KYB 审核信息。

**Step 4: DeveloperReview 页面**

使用 Art Design Pro 的 `art-form` 组件，对接审批/拒绝 API。

**Step 5: KYB 页面**

使用 `useTable` + `art-table` 展示待审核列表，对接 `fetchKYBPending` API。

**Step 6: ISV 页面**

使用 `useTable` 展示 ISV 列表，对接 `fetchISVStatus` API。

**Step 7: Stats 页面**

使用 `art-line-chart`、`art-bar-chart` 等图表组件，对接统计 API。

**Step 8: ChangePassword 页面**

使用 Art Design Pro 的 `art-form` 组件，对接 `fetchChangePassword` API。

**Step 9: 提交**

```bash
git add src/views/
git commit -m "feat(admin): implement all page components"
```

---

### Task 7: 清理 Demo 代码

**Files:**
- Delete: `src/router/modules/article.ts`, `examples.ts`, `help.ts`, `safeguard.ts`, `template.ts`, `widgets.ts`
- Delete: `src/views/article/`, `src/views/examples/`, `src/views/safeguard/`, `src/views/template/`, `src/views/widgets/`
- Delete: `src/views/dashboard/analysis/`, `src/views/dashboard/ecommerce/`（保留 console）
- Delete: `src/components/business/`, `src/mock/`

**Step 1: 删除不需要的模块**

清理所有 demo 路由、页面和组件。

**Step 2: 更新 modules/index.ts**

移除已删除的模块引用。

**Step 3: 提交**

```bash
git add -A
git commit -m "chore(admin): remove demo code"
```

---

### Task 8: 最终验证

**Step 1: 构建验证**

```bash
cd openplatform-web/admin-portal-v2
pnpm build
```

预期：构建成功，无 TypeScript 错误，无样式错误。

**Step 2: 开发服务器验证**

```bash
pnpm dev
```

打开 http://localhost:1002/openplatform-admin/，验证：
- 登录页面展示正常（Art Design Pro 样式）
- 登录后 Dashboard 正常
- 各菜单页面正常
- 主题切换正常

**Step 3: 提交**

```bash
git commit -m "chore(admin): final verification and cleanup"
```