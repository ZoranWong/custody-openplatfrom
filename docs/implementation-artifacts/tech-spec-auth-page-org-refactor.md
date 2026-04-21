---
title: '授权页面重构 - 企业改组织并优化流程'
slug: 'auth-page-org-refactor'
created: '2026-04-19'
status: 'Implementation Complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Vue 3', 'TypeScript', 'Element Plus', 'Vite']
files_to_modify: [
  'openplatform-web/auth-page/src/types/index.ts',
  'openplatform-web/auth-page/src/components/EnterpriseSelector.vue',
  'openplatform-web/auth-page/src/components/OrganizationSelector.vue',
  'openplatform-web/auth-page/src/App.vue',
  'openplatform-web/auth-page/src/services/auth.ts'
]
code_patterns: ['Vue 3 Composition API with <script setup>', 'TypeScript interfaces for API contracts', 'Element Plus UI components']
test_patterns: ['Vitest unit tests in tests/unit/']
---

# Tech-Spec: 授权页面重构 - 企业改组织并优化流程

**Created:** 2026-04-19

## Overview

### Problem Statement

授权页面使用"企业"(Enterprise)作为术语，但业务层统一使用"组织"(Organization)。需要将所有前端相关命名从 Enterprise 改为 Organization，同时保持后端 API 兼容性。当前流程需要 2 步完成授权（选择组织 + 确认授权），可优化为单页。

### Solution

1. **前端命名重构**: Enterprise → Organization（仅重命名，不合并视图）
2. **按钮优化**: authorize 页按钮顺序改为 [Back] [Authorize]
3. **保留两步流程**: 选择组织页 + 授权确认页保持不变（最小改动策略）

### Scope

**In Scope (仅前端):**
- `types/index.ts` — Enterprise → Organization
- `EnterpriseSelector.vue` → 重命名为 `OrganizationSelector.vue`（仅改命名和文案）
- `App.vue` — 状态和变量命名更新，按钮位置交换
- `services/auth.ts` — API 函数命名更新

**Out of Scope:**
- 后端修改 — 后端保持 enterpriseId/ecode 不变
- 数据库表结构变更
- 新的业务逻辑
- 样式大改

## Context for Development

### 根本事实

1. **后端不改** — enterpriseId/ecode 保持不变
2. 前端内部使用 organization 命名，与后端交互时仍用 ecode
3. `/merchant/member/list` 是内部转发到 custody 后端（当前是 mock）
4. **保留两步流程**: 选择组织页 + 授权确认页，不合并（最小改动策略）

### 核心架构变更

**Before:**
```
Login → TOTP → [Select Enterprise] → [Authorize Access] → 成功
```

**After (仅改命名和按钮):**
```
Login → TOTP → [Select Organization] → [Authorize Access] → 成功
```

### 改动范围

```
前端 (auth-page):
├── types/index.ts
│   ├── interface Enterprise → Organization
│   └── EnterpriseListResponse → OrganizationListResponse
├── components/
│   ├── EnterpriseSelector.vue → 删除
│   └── OrganizationSelector.vue → 新建（重命名）
│       ├── 标题 "Select Enterprise" → "Select Organization"
│       ├── subtitle "Choose an enterprise..." → "Choose an organization..."
│       ├── loading "Loading enterprises..." → "Loading organizations..."
│       └── CSS 类名 .enterprise-* → .organization-*
├── App.vue
│   ├── import EnterpriseSelector → import OrganizationSelector
│   ├── currentView === 'enterprise' → 'organization'
│   ├── selectedEnterprise → selectedOrganization
│   ├── handleEnterpriseSelect → handleOrganizationSelect
│   ├── goBackToEnterprise → goBackToOrganization
│   ├── authorize 页按钮顺序: [Authorize] [Back] → [Back] [Authorize]
│   └── 文案: "Enterprise" → "Organization"
└── services/auth.ts
    ├── getEnterpriseList() → getOrganizationList()
    ├── mockGetEnterpriseList() → mockGetOrganizationList()
    └── 注释/日志文案更新
```

### Codebase Patterns

- Vue 3 Composition API with `<script setup>`
- TypeScript strict mode
- Element Plus UI components
- 嵌入式 iframe 授权页面

### Files to Reference

| File | Purpose | Enterprise 引用数量 |
| ---- | ------- | ------------------- |
| `openplatform-web/auth-page/src/types/index.ts` | 类型定义 | 3 处 |
| `openplatform-web/auth-page/src/components/EnterpriseSelector.vue` | 组织选择组件 | ~30 处 |
| `openplatform-web/auth-page/src/App.vue` | 主应用状态管理 | ~20 处 |
| `openplatform-web/auth-page/src/services/auth.ts` | API 服务层 | ~15 处 |

**总计**: ~68 处 Enterprise 引用需要改为 Organization

### Technical Decisions

1. **文案保持英文**: 不改为中文，保持国际化兼容
2. **保留两步流程**: 不合并视图，最小改动策略
3. **后端不变**: enterpriseId/ecode 保持不变，前端做适配
4. **CSS 类名**: `.enterprise-selector` → `.organization-selector` 同步更新

## Implementation Plan

### Tasks

- [x] Task 1: 类型定义重构 (`types/index.ts`)
  - File: `openplatform-web/auth-page/src/types/index.ts`
  - Action: 重命名接口
    - `interface Enterprise` → `interface Organization`
    - `interface EnterpriseListResponse` → `interface OrganizationListResponse`
  - Notes: 保持接口字段不变 (`id`, `name`, `status`)

- [x] Task 2: 创建 OrganizationSelector 组件
  - File: `openplatform-web/auth-page/src/components/OrganizationSelector.vue`
  - Action: 复制 EnterpriseSelector.vue 并重命名，更新以下内容:
    - 根 CSS 类名 `.enterprise-selector` → `.organization-selector`
    - 标题 `h1`: "Select Enterprise" → "Select Organization"
    - subtitle: "Choose an enterprise to authorize access for" → "Choose an organization to authorize access for"
    - loading 文案: "Loading enterprises..." → "Loading organizations..."
    - placeholder: "Select an enterprise" → "Select an organization"
    - 所有 CSS 类名 `.enterprise-select*` → `.organization-select*`
    - import: `Enterprise` → `Organization`, `getEnterpriseList` → `getOrganizationList`
    - 变量: `enterprises` → `organizations`, `selectedEnterpriseId` → `selectedOrganizationId`
  - Notes: 新文件创建后删除 EnterpriseSelector.vue

- [x] Task 3: App.vue 组件引用和状态更新
  - File: `openplatform-web/auth-page/src/App.vue`
  - Action:
    - import: `EnterpriseSelector` → `OrganizationSelector`
    - import type: `Enterprise` → `Organization`
    - template: `v-if="currentView === 'enterprise'"` → `v-if="currentView === 'organization'"`
    - component tag: `<EnterpriseSelector>` → `<OrganizationSelector>`
    - ref: `selectedEnterprise` → `selectedOrganization`
    - 注释更新: "enterprise selection" → "organization selection"

- [x] Task 4: App.vue 函数和事件更新
  - File: `openplatform-web/auth-page/src/App.vue`
  - Action:
    - 函数: `handleEnterpriseSelect` → `handleOrganizationSelect`
    - 函数: `goBackToEnterprise` → `goBackToOrganization`
    - 状态赋值: `currentView.value = 'enterprise'` → `currentView.value = 'organization'` (所有位置)
    - 重置函数: `selectedEnterprise.value = null` → `selectedOrganization.value = null`

- [x] Task 5: App.vue 授权页优化
  - File: `openplatform-web/auth-page/src/App.vue`
  - Action:
    - 标题: "Authorize Access" → "Authorize Access" (保持英文)
    - 文案: `{{ selectedEnterprise?.name || 'Enterprise' }}` → `{{ selectedOrganization?.name || 'Organization' }}`
    - 按钮顺序: 交换位置，先 Back 后 Authorize
    - 按钮文案保持英文: "Authorize", "Back"

- [x] Task 6: API 服务层重命名
  - File: `openplatform-web/auth-page/src/services/auth.ts`
  - Action:
    - 函数: `getEnterpriseList()` → `getOrganizationList()`
    - 函数: `mockGetEnterpriseList()` → `mockGetOrganizationList()`
    - 注释: "Get enterprise list" → "Get organization list"
    - 返回类型: `enterprises` → `organizations`
    - 日志: "Enterprise list API not available" → "Organization list API not available"
    - mock 数据: "Acme Corporation" → "Acme Organization"

- [x] Task 7: 清理旧文件
  - File: `openplatform-web/auth-page/src/components/EnterpriseSelector.vue`
  - Action: 删除此文件

### Acceptance Criteria

- [ ] AC 1: Given 用户首次登录, when 登录成功, then 进入 "Select Organization" 页面
- [ ] AC 2: Given 在组织选择页, when 查看页面, then 标题显示 "Select Organization"
- [ ] AC 3: Given 下拉菜单, when 查看 placeholder, then 显示 "Select an organization"
- [ ] AC 4: Given 选择一个组织, when 点击 Continue, then 进入授权确认页
- [ ] AC 5: Given 在授权确认页, when 查看按钮, then 顺序为 [Back] [Authorize]
- [ ] AC 6: Given 在授权确认页, when 查看文案, then 显示 "Organization" 而非 "Enterprise"
- [ ] AC 7: Given 点击 Back, when 在授权确认页, then 返回组织选择页
- [ ] AC 8: Given 点击 Authorize, when 授权成功, then 显示成功页面
- [ ] AC 9: Given 点击 Authorize, when 授权失败, then 显示错误信息
- [ ] AC 10: Given TypeScript 编译, when 运行 `tsc --noEmit`, then 无类型错误
- [ ] AC 11: Given 运行 dev server, when 访问页面, then 无控制台错误

## Additional Context

### Dependencies

- 无后端依赖，纯前端重构
- Element Plus 已安装 (用于 el-select 组件)

### Testing Strategy

- 手动测试授权流程完整性
- 验证 mock 数据正常工作
- 检查 TypeScript 编译无错误
- 检查浏览器控制台无错误

### Notes

用户确认：
1. 后端不需要修改，前端做适配层
2. 保留两步流程，不合并视图
3. 文案保持英文

## Review Notes

- Adversarial review completed
- Findings: 11 total, 8 fixed, 3 skipped (F5, F8, F10, F11 — pre-existing or out of scope)
- Resolution approach: Auto-fix

### Fixes Applied

- **F1**: Renamed zombie variable `e` → `org` in OrganizationSelector `.find()` callback
- **F2**: Removed unused props `loading`/`errorMessage` from OrganizationSelector, replaced with local ref
- **F3**: Renamed `enterpriseId` → `organizationId` in `submitAuthorization()` param type (backend `ecode` mapping unchanged)
- **F4**: Updated mock data IDs `ent-001/002/003` → `org-001/002/003`
- **F6**: Added `selectedOrganization.value = null` in `goBackToOrganization()` to prevent stale state
- **F7**: Added comment explaining `getSDKUUIDFromUrl` removal (UUID auto-injected by `sendEventToParent`)
- **F9**: Fixed `resetFlow` timeout race condition by storing and clearing `initTimeout`

### High-Risk Items (from Pre-mortem)

1. 组件引用断裂 → 确保删除 EnterpriseSelector.vue 前已创建 OrganizationSelector.vue
2. TypeScript 类型不一致 → 确保所有 Enterprise 类型引用已更新
3. 状态值遗漏 → 全文搜索 'enterprise' 确保无遗漏

### Future Considerations

- 单组织自动跳过选择
- 记住上次选择的组织
- i18n 国际化支持
- 引导文案优化
