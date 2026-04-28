---
title: 'Application Edit 页面字段优化'
slug: 'application-edit-fields'
created: '2026-04-22'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TypeScript', 'Vue 3', 'Element Plus', 'Express', 'Prisma', 'MySQL']
files_to_modify:
  - 'openplatform-web/developer-portal/src/views/applications/EditApplicationPage.vue'
  - 'openplatform-api-service/src/routes/v1/isv.routes.ts'
code_patterns:
  - 'EditApplicationPage.vue 表单组件 (reactive form, validation)'
  - 'applicationTypeConfig 应用类型配置 (api.ts)'
  - 'PUT /isv/applications/:id 更新路由'
  - 'Prisma schema: Application model (appName, appDescription, appType, callbackUrl)'
test_patterns: []
---

# Tech-Spec: Application Edit 页面字段优化

**Created:** 2026-04-22

## Overview

### Problem Statement

当前 Application 更新链路存在字段不一致问题：

1. **callbackUrl 无法保存**：前端提交 `callback_url`，后端 PUT 路由只解构 `{ name, description, status }`，callback_url 被丢弃
2. **后端手动映射**：`{ appName: name, appDescription: description }` 手动转换，增加维护成本
3. **前端缺少 appType 展示**：用户无法在编辑页面查看当前应用类型

### Solution

1. 后端接收字段改为与数据库一致：`appName`, `appDescription`, `callbackUrl`
2. 前端表单字段改为 `appName`, `appDescription`, `callbackUrl`
3. 编辑页面增加 appType 只读展示（3 卡片简化版）

### Scope

**In Scope:**
- 后端 PUT 路由接收 `appName`, `appDescription`, `callbackUrl`，直接传递到 service
- 前端表单使用 `appName`, `appDescription`, `appType`, `callbackUrl`
- appType 只读卡片展示（当前选中高亮，不可点击）

**Out of Scope:**
- appType 编辑（只读）
- ApplicationDetailPage.vue 修改
- 后端 service 层（已支持 Partial<Application>，无需修改）

## Context for Development

### Data Flow Analysis

**当前（有问题）：**
```
前端: { name, description, callback_url }
  ↓
后端: const { name, description, status } = req.body  // callback_url 丢失
  ↓
Service: { appName: name, appDescription: description, status }  // 手动映射
```

**修复后：**
```
前端: { appName, appDescription, callbackUrl }
  ↓
后端: const { appName, appDescription, callbackUrl } = req.body  // 完整接收
  ↓
Service: { appName, appDescription, callbackUrl }  // 直接传递
```

### Database Schema (Application)

| 数据库字段 | Prisma 字段 | 类型 |
|-----------|------------|------|
| app_name | appName | String |
| app_description | appDescription | String? |
| app_type | appType | String (corporate/payment/custody) |
| callback_url | callbackUrl | String? |
| status | status | String (active/suspended/deleted) |

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `openplatform-web/developer-portal/src/views/applications/EditApplicationPage.vue` | 编辑页面，需字段重命名 + appType 只读展示 |
| `openplatform-web/developer-portal/src/views/applications/CreateApplicationPage.vue` | 创建页面，有 appType 3 卡片 UI 可参考 |
| `openplatform-web/developer-portal/src/services/api.ts` | API 服务，`Application` 接口定义 |
| `openplatform-api-service/src/routes/v1/isv.routes.ts` | 后端路由，PUT `/isv/applications/:id` |
| `openplatform-api-service/src/services/isv-user.service.ts` | `updateApplication` 已支持 Partial<Application> |
| `openplatform-api-service/prisma/schema.prisma` | Application 模型定义 |

### Technical Decisions

1. **前后端字段名一致**：统一使用 `appName`/`appDescription`/`callbackUrl`，消除映射转换
2. **appType 只读**：编辑页面展示 3 卡片但不可点击，灰色样式
3. **后端直接传递**：解构后的字段直接传递给 service，无需映射
4. **camelCase 一致**：前端 `callbackUrl`，后端 `callbackUrl`（不再用 snake_case `callback_url`）

## Implementation Plan

### Tasks

- [ ] Task 1: 后端 PUT 路由接收字段修正
  - File: `openplatform-api-service/src/routes/v1/isv.routes.ts:328`
  - Action: 将 `const { name, description, status } = req.body` 改为 `const { appName, appDescription, callbackUrl } = req.body`
  - Action: 将 `updateApplication(id, { appName: name, appDescription: description, status })` 改为 `updateApplication(id, { appName, appDescription, callbackUrl })`
  - Notes: 移除 status 接收（前端编辑页不修改状态）

- [ ] Task 2: 前端表单字段重命名
  - File: `openplatform-web/developer-portal/src/views/applications/EditApplicationPage.vue`
  - Action: `ApplicationForm` interface 改为 `{ appName: string, appDescription: string, callbackUrl: string }`
  - Action: `form` reactive 对象字段改为 `appName`, `appDescription`, `callbackUrl`
  - Action: `errors` reactive 对象字段同步重命名
  - Action: `originalForm` reactive 对象字段同步重命名
  - Action: 所有验证函数重命名：`validateName` → `validateAppName`, `validateDescription` → `validateAppDescription`
  - Action: watch 依赖改为 `() => form.appName`, `() => form.appDescription`
  - Action: handleSubmit 中 params 改为 `{ appName: form.appName, appDescription: form.appDescription, callbackUrl: form.callbackUrl }`
  - Action: 错误处理中 field mapping 改为 `appName`, `appDescription`, `callbackUrl`

- [ ] Task 3: 表单模板字段更新
  - File: `openplatform-web/developer-portal/src/views/applications/EditApplicationPage.vue`
  - Action: `v-model="form.name"` → `v-model="form.appName"`
  - Action: `v-model="form.description"` → `v-model="form.appDescription"`
  - Action: label 文本更新：`应用名称` → `应用名称 (Application Name)`, `应用描述` → `应用描述 (Application Description)`
  - Action: error 绑定改为 `errors.appName`, `errors.appDescription`
  - Action: @input/@blur 事件处理函数名更新

- [ ] Task 4: 添加 appType 只读展示
  - File: `openplatform-web/developer-portal/src/views/applications/EditApplicationPage.vue`
  - Action: 在 form interface 中增加 `appType: '' as 'corporate' | 'payment' | 'custody' | ''`
  - Action: 在 fetchApplication 中设置 `form.appType = application.appType || ''`
  - Action: 在 originalForm 中增加 `appType: ''`
  - Action: 在描述字段下方添加 appType 3 卡片展示区域（参考 CreateApplicationPage 的卡片模板）
  - Action: 添加 `pointer-events: none` 和灰色样式使卡片不可点击
  - Action: 当前 appType 卡片使用 `border-brand bg-brand/5` 高亮，其他卡片使用 `border-gray-200 opacity-50`

- [ ] Task 5: 加载时设置 appType 值
  - File: `openplatform-web/developer-portal/src/views/applications/EditApplicationPage.vue`
  - Action: 在 `fetchApplication` 函数中，从 API 响应读取 `application.appType` 并赋值给 `form.appType`

### Acceptance Criteria

- [ ] AC1: Given 用户打开编辑页面，应用 appType = 'corporate', When 页面加载, Then corporate 卡片高亮显示，其他卡片灰色不可点击

- [ ] AC2: Given 用户修改 appName 并保存, When 后端处理完成, Then appName 更新到数据库，返回详情页显示新值

- [ ] AC3: Given 用户修改 callbackUrl 并保存, When 后端处理完成, Then callbackUrl 更新到数据库，详情页显示新值（之前 callbackUrl 无法保存）

- [ ] AC4: Given 用户提交 `{ appName, appDescription, callbackUrl }`, When 后端接收, Then 字段名与 Prisma schema 一致，无需手动映射

- [ ] AC5: Given 用户打开编辑页面, When 表单加载, Then appName, appDescription, appType, callbackUrl 均正确显示现有值

### Dependencies

- 无外部依赖
- 依赖现有 API 服务（`getISVApplication`, `updateISVApplication`）
- 依赖 Prisma `Application` 模型（已存在）

### Testing Strategy

**Manual Testing:**
1. 创建一个应用（选择 appType）
2. 打开编辑页面，确认 appType 正确显示
3. 修改 appName，保存，确认详情页更新
4. 修改 callbackUrl，保存，确认详情页更新
5. 确认 appType 卡片不可点击

### Notes

- **Risk:** 如果后端有其他调用方依赖旧的字段名（`name`/`description`），需要同步检查。但当前只有前端调用，无其他消费者。
- **Future:** 可考虑在 service 层添加字段验证（当前 Prisma 会自动验证类型）。
