# Admin Portal 完整业务设计与开发方案

> **版本:** v1.0 | **日期:** 2026-08-15

---

## 一、业务流程图

### 1.1 开发者注册审核流程

```
┌─────────────────────────────────────────────────────────────────────┐
│  Developer Portal (ISV)               │  Admin Portal (管理端)        │
├─────────────────────────────────────────────────────────────────────┤
│                                      │                              │
│  1. 注册账号                          │                              │
│  POST /isv/auth/register             │                              │
│  → kybStatus = 'pending'             │                              │
│  → status = 'active'（注册即激活）    │                              │
│                                      │                              │
│                                      │  2. 查看待审核列表             │
│                                      │  GET /admin/developers        │
│                                      │  ?kybStatus=pending           │
│                                      │                              │
│                                      │  3. 查看详情                  │
│                                      │  GET /admin/developers/:id    │
│                                      │                              │
│                                      │  4. 审核操作                  │
│                                      │  ┌─────────────────────────┐ │
│                                      │  │ 通过                     │ │
│                                      │  │ POST /admin/developers   │ │
│                                      │  │   /:id/approve           │ │
│                                      │  │ → kybStatus='approved'   │ │
│                                      │  │ → status='active'        │ │
│                                      │  ├─────────────────────────┤ │
│                                      │  │ 拒绝                     │ │
│                                      │  │ POST /admin/developers   │ │
│                                      │  │   /:id/reject            │ │
│                                      │  │ Body: { reason }         │ │
│                                      │  │ → kybStatus='rejected'   │ │
│                                      │  │ → status='suspended'     │ │
│                                      │  └─────────────────────────┘ │
│                                      │                              │
│  5. 审核通过后                        │  6. 后续管理                  │
│  → 可以登录 Developer Portal         │  ┌─────────────────────────┐ │
│  → 可以创建应用                       │  │ 冻结/封禁/激活            │ │
│  → 可以调用 API                      │  │ POST /admin/developers   │ │
│                                      │  │   /:id/suspend|ban|      │ │
│                                      │  │   activate               │ │
│                                      │  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 开发者状态机

```
                  register
                     │
                     ▼
              ┌──────────────┐
              │   pending     │  (待审核)
              └──────┬───────┘
                ┌────┴────┐
                │         │
            approve    reject
                │         │
                ▼         ▼
         ┌──────────┐  ┌──────────┐
         │ approved │  │ rejected │
         └────┬─────┘  └────┬─────┘
              │              │
         ┌────┴────┐    (重新提交)
         │         │        │
      suspend   ban         ▼
         │         │   ┌──────────┐
         ▼         ▼   │ pending  │ (重新审核)
   ┌──────────┐ ┌──────┐ └──────────┘
   │suspended │ │banned│
   └────┬─────┘ └──────┘
        │
     activate
        │
        ▼
   ┌──────────┐
   │  active  │
   └──────────┘
```

---

## 二、数据库设计

### 2.1 现有模型（不需要修改）

`IsvDeveloper` 模型已包含全部核心字段，不需要修改：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (UUID) | 主键 |
| email | String (unique) | 登录邮箱 |
| passwordHash | String | 密码哈希 |
| legalName | String | 企业名称 |
| registrationNumber | String? | 统一社会信用代码 |
| jurisdiction | String? | 注册地 |
| dateOfIncorporation | String? | 成立日期 |
| registeredAddress | String? | 注册地址 |
| website | String? | 官网 |
| uboInfo | Json? | UBO 信息 |
| kybStatus | String | pending/approved/rejected |
| kybReviewedAt | DateTime? | 审核时间 |
| kybReviewedBy | String? | 审核人 |
| status | String | active/suspended/banned/deleted |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### 2.2 需要新增的模型

#### 模型 1: DeveloperAudit（开发者操作审计日志）

```prisma
model DeveloperAudit {
  id            String   @id @default(uuid())
  developerId   String   @map("developer_id")
  action        String   // approve/reject/suspend/ban/activate
  reason        String?  // 操作原因（拒绝/封禁时必须填写）
  adminId       String   @map("admin_id")   // 操作管理员 ID
  adminEmail    String   @map("admin_email") // 操作管理员邮箱
  createdAt     DateTime @default(now()) @map("created_at")
  
  @@index([developerId])
  @@map("developer_audit")
}
```

**用途：** 记录每次管理员对开发者的操作，替代 KYB mock 的 `auditTrail`。

#### 模型 2: Announcement（系统公告）

```prisma
model Announcement {
  id          String   @id @default(uuid())
  title       String
  content     String   @db.Text
  type        String   @default("system")  // system/maintenance/feature
  status      String   @default("draft")   // draft/published/archived
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  @@map("announcements")
}
```

#### 模型 3: Ticket（工单，后续开发）

```prisma
model Ticket {
  id          String   @id @default(uuid())
  developerId String   @map("developer_id")
  title       String
  description String   @db.Text
  type        String   @default("technical") // technical/approval/other
  priority    String   @default("normal")    // low/normal/high/urgent
  status      String   @default("pending")   // pending/processing/resolved/closed
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  @@index([developerId])
  @@map("tickets")
}
```

### 2.3 迁移计划

```bash
# 1. 修改 schema.prisma，添加上述模型
# 2. 生成迁移
npx prisma migrate dev --name add_developer_audit_announcement_ticket

# 3. 部署到生产
npx prisma migrate deploy
```

**迁移 SQL 只包含 CREATE TABLE，不修改现有表，不影响现有数据。**

---

## 三、API 接口标准

### 3.1 统一响应格式

```typescript
// 成功
{
  "code": 0,
  "message": "success",
  "data": { ... },
  "trace_id": "uuid"
}

// 错误
{
  "code": 40001,
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Email is required" }],
  "trace_id": "uuid"
}

// 列表
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [...],
    "total": 100,
    "page": 1,
    "pageSize": 10
  },
  "trace_id": "uuid"
}
```

### 3.2 需要新增/修复的 API

#### 修复 1: 开发者控制器增加 `trace_id` 和 `message`

**当前：** `developer.controller.ts` 成功响应缺少 `message` 和 `trace_id`

**修复：** 统一为 `{ code: 0, message: 'success', data: ..., trace_id: req.headers['x-trace-id'] || '' }`

#### 修复 2: `rejectDeveloper` 持久化拒绝原因

**当前：** `reason` 被读取但未存储

**修复：** 写入 `DeveloperAudit` 表

#### 新增 1: 开发者审计日志

```
GET /admin/developers/:id/audit
→ 查询 DeveloperAudit 表，返回该开发者的所有操作记录
Response: { code: 0, data: { list: DeveloperAudit[], total } }
```

#### 新增 2: 系统公告 CRUD

```
GET    /admin/announcements          → 列表
POST   /admin/announcements          → 创建
GET    /admin/announcements/:id      → 详情
PUT    /admin/announcements/:id      → 更新
DELETE /admin/announcements/:id      → 删除
```

---

## 四、页面设计

### 4.1 仪表盘

```
┌──────────────────────────────────────────────────────┐
│  仪表盘                                              │
├──────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────────┐ │
│  │ 开发者   │ │ 应用     │ │ 待审核   │ │ API 调用量  │ │
│  │ 128      │ │ 256      │ │ 5        │ │ 12,580     │ │
│  └─────────┘ └─────────┘ └─────────┘ └────────────┘ │
│                                                      │
│  ┌──────────────────────┐ ┌────────────────────────┐ │
│  │ API 调用趋势（折线图）│ │ 错误率趋势（折线图）    │ │
│  │                      │ │                        │ │
│  └──────────────────────┘ └────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**数据来源：** 
- 统计卡片：`GET /admin/dashboard/stats`（Mock）
- 趋势图：`GET /admin/dashboard/trends`（Mock）

### 4.2 开发者管理 → 开发者列表

```
┌──────────────────────────────────────────────────────┐
│  开发者列表                                          │
│  [状态筛选 ▼] [KYB筛选 ▼] [搜索] [刷新]              │
├──────────────────────────────────────────────────────┤
│  企业名称    │ 邮箱      │ KYB状态 │ 账号状态 │ 操作  │
│  TechCorp   │ t@t.com  │ pending │ active   │ 查看  │
│  GlobalPay  │ g@g.com  │ approved│ active   │ 查看  │
│  SecureFin  │ s@s.com  │ rejected│ suspended│ 查看  │
├──────────────────────────────────────────────────────┤
│                    分页: < 1 2 3 >                    │
└──────────────────────────────────────────────────────┘
```

**数据来源：** `GET /admin/developers`（✅ Prisma 真实数据）

**列定义：**
| 列 | 字段 | 宽度 |
|----|------|------|
| 企业名称 | legalName | 150 |
| 邮箱 | email（从详情获取） | 200 |
| 信用代码 | registrationNumber | 180 |
| 注册地 | jurisdiction | 120 |
| KYB状态 | kybStatus（Tag） | 100 |
| 账号状态 | status（Tag） | 100 |
| 创建时间 | createdAt | 180 |

**状态标签颜色：**
- kybStatus: pending→warning, approved→success, rejected→danger
- status: active→success, suspended→warning, banned→danger, deleted→info

### 4.3 开发者管理 → 注册申请（Tabs）

```
┌──────────────────────────────────────────────────────┐
│  注册申请                                            │
│  [待审核] [历史记录]                                  │
├──────────────────────────────────────────────────────┤
│  ┌─ 待审核 Tab ────────────────────────────────────┐ │
│  │ 企业名称     │ 邮箱      │ 提交时间     │ 操作    │ │
│  │ TechCorp    │ t@t.com  │ 2026-08-15  │ 审核    │ │
│  │ NewCompany  │ n@n.com  │ 2026-08-14  │ 审核    │ │
│  └────────────────────────────────────────────────┘ │
│  ┌─ 历史记录 Tab ──────────────────────────────────┐ │
│  │ 企业名称     │ 邮箱      │ 审核结果 │ 审核时间   │ │
│  │ GlobalPay   │ g@g.com  │ approved │ 2026-08-10 │ │
│  │ SecureFin   │ s@s.com  │ rejected │ 2026-08-09 │ │
│  └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**数据来源：**
- 待审核：`GET /admin/developers?kybStatus=pending`
- 历史记录：`GET /admin/developers?kybStatus=approved,rejected`

### 4.4 开发者详情页

```
┌──────────────────────────────────────────────────────┐
│  ← 返回列表                开发者详情                │
├──────────────────────────────────────────────────────┤
│  ┌─ 企业信息 ──────────────────────────────────────┐ │
│  │ 企业名称: TechCorp Solutions                     │ │
│  │ 信用代码: 91110108MA01XXXXX                      │ │
│  │ 注册地:   China                                  │ │
│  │ 成立日期: 2020-01-01                             │ │
│  │ 注册地址: 北京市朝阳区...                         │ │
│  │ 官网:     https://techcorp.com                   │ │
│  └────────────────────────────────────────────────┘ │
│  ┌─ KYB 信息 ──────────────────────────────────────┐ │
│  │ KYB 状态:  pending / approved / rejected        │ │
│  │ 审核时间:  2026-08-15 10:30                      │ │
│  │ 审核人:    admin@cregis.com                      │ │
│  └────────────────────────────────────────────────┘ │
│  ┌─ 联系信息 ──────────────────────────────────────┐ │
│  │ 邮箱:      tech@techcorp.com                     │ │
│  └────────────────────────────────────────────────┘ │
│  ┌─ UBO 信息 ──────────────────────────────────────┐ │
│  │ UBO 1: 张三, Chinese, 60%                       │ │
│  │ UBO 2: 李四, Chinese, 40%                       │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  [审批通过] [审批拒绝] [冻结] [封禁] [激活]           │
└──────────────────────────────────────────────────────┘
```

**数据来源：** `GET /admin/developers/:id`

**操作按钮逻辑：**
- kybStatus === 'pending' → 显示 [审批通过] [审批拒绝]
- status === 'active' → 显示 [冻结] [封禁]
- status === 'suspended' → 显示 [激活] [封禁]
- status === 'banned' → 显示 [激活]

### 4.5 统计分析

```
┌──────────────────────────────────────────────────────┐
│  API 统计                                            │
├──────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │ 今日调用  │ │ 本周调用  │ │ 本月调用  │              │
│  │ 1,234    │ │ 8,567    │ │ 35,890   │              │
│  └──────────┘ └──────────┘ └──────────┘              │
│                                                      │
│  ┌──────────────────────┐ ┌────────────────────────┐ │
│  │ Top 应用              │ │ 响应时间趋势            │ │
│  │ 1. TechCorp  5,000   │ │                        │ │
│  │ 2. CryptoPay 3,000   │ │                        │ │
│  │ 3. DeFi      2,000   │ │                        │ │
│  └──────────────────────┘ └────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**数据来源：** `GET /admin/stats/api/summary`, `GET /admin/stats/api/top-apps`（Mock）

### 4.6 系统监控

```
┌──────────────────────────────────────────────────────┐
│  服务状态                                            │
├──────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ API GW   │ │ Auth Svc │ │ KYB Svc  │ │ DB Svc  │ │
│  │ ● healthy│ │ ● healthy│ │ ● degrade│ │● healthy│ │
│  │ 12ms     │ │ 8ms      │ │ 250ms    │ │ 3ms     │ │
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │
│                                                      │
│  ┌─ 资源使用 ──────────────────────────────────────┐ │
│  │ CPU:  ████████░░  45%                           │ │
│  │ MEM:  ██████░░░░  35%                           │ │
│  │ DISK: ███░░░░░░░  20%                           │ │
│  └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**数据来源：** `GET /admin/health/status`, `GET /admin/health/services`, `GET /admin/health/resources`（Mock）

### 4.7 系统设置 → 管理员管理

```
┌──────────────────────────────────────────────────────┐
│  管理员管理                                          │
│  [+ 新增管理员]                                      │
├──────────────────────────────────────────────────────┤
│  姓名        │ 邮箱           │ 角色      │ 状态    │
│  Super Admin │ admin@cregis   │ super_admin│ active │
│  Operator1   │ op@cregis.com  │ operator  │ active │
├──────────────────────────────────────────────────────┤
│                    分页: < 1 2 >                      │
└──────────────────────────────────────────────────────┘
```

**数据来源：** `GET /admin/admins`（✅ Prisma 真实数据）

---

## 五、优先级排期

| 优先级 | 模块 | 状态 | 数据源 |
|--------|------|------|--------|
| **P0** | 开发者列表 | 待开发 | ✅ Prisma 真实数据 |
| **P0** | 注册申请（Tabs） | 待开发 | ✅ Prisma 真实数据 |
| **P0** | 开发者详情 | 待开发 | ✅ Prisma 真实数据 |
| **P0** | 仪表盘 | 待开发 | Mock 数据 |
| **P0** | 管理员管理 | 待开发 | ✅ Prisma 真实数据 |
| **P1** | 统计分析 | 待开发 | Mock 数据 |
| **P1** | 系统监控 | 待开发 | Mock 数据 |
| **P1** | 角色管理/菜单管理 | 已存在 | Art Design Pro 自带 |
| **P2** | 系统配置 | 占位 | 后续开发 |
| **P2** | 操作日志 | 待开发 | 内存数据（后续迁移 Prisma） |
| **P3** | 订阅管理 | 占位 | 计费系统完成后 |
| **P3** | 工单管理 | 占位 | 后续迭代 |