# Story e-3-2: 开发者详情

**Story ID:** e-3-2
**Module:** E (Admin Portal API 集成)
**Priority:** P0
**Estimated Points:** 1
**Status:** review

**依赖:** e-3-1 开发者列表 (完成后详情页 API 即可用)

---

## Story

作为 **管理员**，
我希望查看单个开发者的详细信息，
以便了解开发者的企业信息、KYB审核状态和账户状态。

## Acceptance Criteria

### 1. 基本信息展示 (AC: #1)
- [x] 企业名称
- [x] 联系邮箱
- [x] 联系电话
- [x] 官网地址
- [x] 注册时间
- [x] 账户状态（带颜色标签）

### 2. KYB 信息展示 (AC: #2)
- [x] KYB 状态（approved/pending/rejected，带颜色标签）
- [x] 审核时间
- [x] 审核人
- [x] 营业执照编号
- [x] 注册地址

### 3. 状态颜色标识 (AC: #3)
- [x] 账户状态：
  - active = success (绿色)
  - suspended = warning (橙色)
  - banned = danger (红色)
  - pending = info (蓝色)
- [x] KYB 状态：
  - approved = success (绿色)
  - pending = warning (橙色)
  - rejected = danger (红色)

### 4. 导航功能 (AC: #4)
- [x] 返回列表按钮跳转到 `/developer`
- [x] 页面标题显示企业名称

## Tasks / Subtasks

### 前端实现

- [x] Task 1: 类型定义
  - [x] 1.1 扩展 DeveloperItem 接口添加详细信息字段 (在 e-3-1 中完成)
  - [x] 1.2 定义 DeveloperDetailResponse 接口 (在 e-3-1 中完成)

- [x] Task 2: API 方法实现
  - [x] 2.1 确认 getDeveloperById 方法 (在 e-3-1 中完成)

- [x] Task 3: 详情页面集成
  - [x] 3.1 替换 mock 数据为 API 调用
  - [x] 3.2 使用 el-descriptions 展示基本信息
  - [x] 3.3 使用 el-descriptions 展示 KYB 信息
  - [x] 3.4 实现状态标签颜色映射

### 后端实现

- [x] Task 4: Repository 层
  - [x] 4.1 复用 ISV Repository (已支持 findById)

- [x] Task 5: Controller 层
  - [x] 5.1 实现 GET /admin/developers/:id 端点 (在 e-3-1 中完成)
  - [x] 5.2 返回完整开发者信息

- [x] Task 6: Route 层
  - [x] 6.1 添加 GET /admin/developers/:id 路由 (在 e-3-1 中完成)

## Dev Notes

### API 设计

**GET /admin/developers/:id**

Response:
```typescript
interface DeveloperDetailResponse {
  code: number
  data: DeveloperDetail
  message?: string
}

interface DeveloperDetail {
  id: string
  companyName: string
  contactEmail: string
  contactPhone?: string
  website?: string
  status: 'active' | 'suspended' | 'banned' | 'pending'
  kybStatus: 'approved' | 'pending' | 'rejected'
  kybReviewedAt?: string
  kybReviewedBy?: string
  businessLicense?: string
  registeredAddress?: string
  createdAt: string
  updatedAt?: string
}
```

### 前端组件结构

```
DeveloperDetailPage.vue
├── page-header
│   └── 返回按钮 + 企业名称
├── el-card (基本信息)
│   └── el-descriptions
│       ├── 企业名称
│       ├── 状态
│       ├── 联系邮箱
│       ├── 联系电话
│       ├── 注册时间
│       └── 官网
└── el-card (KYB 信息)
    └── el-descriptions
        ├── KYB 状态
        ├── 审核时间
        ├── 审核人
        ├── 营业执照
        └── 注册地址
```

### 项目结构

Frontend path: `openplatform-web/admin-portal/`
- Views: `src/views/developer/DeveloperDetailPage.vue`
- Services: `src/services/api.ts` (getDeveloperById)
- Types: `src/types/developer.ts`

Backend path: `openplatform-api-service/`
- Repository: `src/repositories/developer.repository.ts`
- Routes: `src/routes/v1/developer.routes.ts`

## Testing Standards

- 单元测试：状态映射函数
- 集成测试：详情数据加载
- E2E 测试：详情页展示和导航

## Dev Agent Record

### Agent Model Used

MiniMax-M1.5

### Debug Log References

N/A - Implementation completed as part of e-3-1

### Completion Notes List

- DeveloperDetailPage.vue updated to use API
- Loading state added
- el-descriptions used for basic info and KYB info
- Status tag color mapping implemented
- Back navigation works correctly

### Implementation Plan

Frontend:
- Updated DeveloperDetailPage.vue to use apiService.getDeveloperById
- Added loading state with v-loading
- Used el-descriptions for structured data display
- Implemented status color mapping

Backend:
- Already implemented in e-3-1 developer.controller.ts

## File List

**Frontend:**
- `openplatform-web/admin-portal/src/views/developer/DeveloperDetailPage.vue`
- `openplatform-web/admin-portal/src/types/developer.ts`

**Backend:**
- (已在 e-3-1 中实现)

## Change Log

- 2026-02-12: Story created from sprint-status.yaml
- 2026-02-12: Implementation complete - API integration done (as part of e-3-1)
