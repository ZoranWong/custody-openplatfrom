# Story e-3-1: 开发者列表

**Story ID:** e-3-1
**Module:** E (Admin Portal API 集成)
**Priority:** P0
**Estimated Points:** 2
**Status:** review

---

## Story

作为 **管理员**，
我希望查看所有开发者的列表，
以便了解当前平台上的开发者注册情况和审核状态。

## Acceptance Criteria

### 1. 列表展示 (AC: #1)
- [ ] 表格展示开发者列表，包含企业名称、联系邮箱、KYB状态、账户状态、注册时间
- [ ] 支持按 KYB 状态筛选（全部/待审核/已通过/已拒绝）
- [ ] 支持按账户状态筛选（全部/已激活/已暂停/已封禁）
- [ ] 列表按注册时间降序排列

### 2. 分页功能 (AC: #2)
- [ ] 集成 Element Plus Pagination 组件
- [ ] 支持切换每页条数（10/20/50）
- [ ] 总数显示正确
- [ ] 页面跳转后保持筛选状态

### 3. 状态标签 (AC: #3)
- [ ] KYB 状态：approved=success, pending=warning, rejected=danger
- [ ] 账户状态：active=success, suspended=warning, banned=danger, pending=info
- [ ] 标签颜色与状态对应正确

### 4. 操作功能 (AC: #4)
- [ ] "查看详情" 按钮跳转到 `/developer/:id`
- [ ] 待审核开发者显示 "审核" 按钮
- [ ] 审核按钮跳转到 `/developer/:id/review`

## Tasks / Subtasks

### 前端实现

- [x] Task 1: 类型定义
  - [x] 1.1 定义 DeveloperItem 接口
  - [x] 1.2 定义 DeveloperListResponse 接口
  - [x] 1.3 定义 DeveloperFilter 接口

- [x] Task 2: API 方法实现
  - [x] 2.1 实现 getDevelopers 方法（支持分页和筛选）
  - [x] 2.2 实现 getDeveloperById 方法

- [x] Task 3: 列表页面集成
  - [x] 3.1 替换 mock 数据为 API 调用
  - [x] 3.2 集成筛选标签（全部/待审核/已激活/已暂停）
  - [x] 3.3 集成 Pagination 组件
  - [x] 3.4 实现筛选状态与 API 参数同步

### 后端实现

- [x] Task 4: Repository 层
  - [x] 4.1 复用现有 ISV Repository（已支持 findAll）

- [x] Task 5: Controller 层
  - [x] 5.1 实现 GET /admin/developers 端点
  - [x] 5.2 支持 query 参数：status, kybStatus, page, pageSize
  - [x] 5.3 返回开发者列表和总数

- [x] Task 6: Route 层
  - [x] 6.1 添加 GET /admin/developers 路由

## Dev Notes

### API 设计

**GET /admin/developers**

Request:
```typescript
interface DevelopersRequest {
  page?: number        // 默认 1
  pageSize?: number    // 默认 10
  status?: 'active' | 'suspended' | 'banned' | 'pending'
  kybStatus?: 'approved' | 'pending' | 'rejected'
}
```

Response:
```typescript
interface DevelopersResponse {
  code: number
  data: {
    list: DeveloperItem[]
    total: number
    page: number
    pageSize: number
  }
  message?: string
}

interface DeveloperItem {
  id: string
  companyName: string
  contactEmail: string
  status: 'active' | 'suspended' | 'banned' | 'pending'
  kybStatus: 'approved' | 'pending' | 'rejected'
  kybReviewedAt?: string
  createdAt: string
}
```

### 前端组件结构

```
DeveloperListPage.vue
├── tabs (筛选标签)
├── el-table
│   ├── companyName (企业名称)
│   ├── contactEmail (联系邮箱)
│   ├── kybStatus (KYB 状态)
│   ├── status (账户状态)
│   ├── createdAt (注册时间)
│   └── 操作 (查看详情/审核)
└── el-pagination (分页)
```

### 项目结构

Frontend path: `openplatform-web/admin-portal/`
- Views: `src/views/developer/DeveloperListPage.vue`
- Services: `src/services/api.ts` (添加 getDevelopers 方法)
- Types: `src/types/developer.ts` (新建)

Backend path: `openplatform-api-service/`
- Repository: `src/repositories/developer.repository.ts`
- Controller: `src/controllers/developer.controller.ts` (新建)
- Routes: `src/routes/v1/developer.routes.ts` (新建)

## Testing Standards

- 单元测试：筛选逻辑、分页计算
- 集成测试：API 响应解析
- E2E 测试：完整列表展示流程

## Dev Agent Record

### Agent Model Used

MiniMax-M2.1

### Debug Log References

N/A - Implementation completed

### Completion Notes List

- Created DeveloperItem, DeveloperDetail interfaces
- Implemented getDevelopers and getDeveloperById API methods
- Updated DeveloperListPage.vue with API integration
- Updated DeveloperDetailPage.vue with API integration
- Created developer.controller.ts with pagination and filtering
- Added routes for /developers and /developers/:id
- Added test data with 10 developers of various statuses

### Implementation Plan

**Backend:**
- Created developer.controller.ts with getDevelopers and getDeveloperById
- Routes added to admin-auth.routes.ts
- Reuses existing ISV repository for data access

**Frontend:**
- Created src/types/developer.ts for type definitions
- Added getDevelopers and getDeveloperById to api.ts
- Updated DeveloperListPage.vue to use API with loading state, pagination, filtering
- Updated DeveloperDetailPage.vue to use API with loading state

## File List

**Frontend:**
- `openplatform-web/admin-portal/src/types/developer.ts`
- `openplatform-web/admin-portal/src/views/developer/DeveloperListPage.vue`
- `openplatform-web/admin-portal/src/views/developer/DeveloperDetailPage.vue`
- `openplatform-web/admin-portal/src/services/api.ts`

**Backend:**
- `openplatform-api-service/src/controllers/developer.controller.ts`
- `openplatform-api-service/src/routes/v1/admin-auth.routes.ts`
- `openplatform-api-service/data/isv.json`

## Change Log

- 2026-02-12: Story created from sprint-status.yaml
- 2026-02-12: Implementation complete - API integration done
