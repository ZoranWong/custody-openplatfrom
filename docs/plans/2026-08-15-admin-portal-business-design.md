# Admin Portal 完整业务设计与开发方案

> **版本:** v3.0 | **日期:** 2026-08-15

---

## 一、业务流程图

### 1.1 开发者注册审核流程

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Developer Portal (ISV)                    │  Admin Portal (管理端)           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                           │                                  │
│  1. 注册账号                               │                                  │
│  POST /isv/auth/register                  │                                  │
│  → 写入 DeveloperApplication              │                                  │
│    status = 'pending'                     │                                  │
│                                           │                                  │
│                                           │  2. 查看待审核列表                 │
│                                           │  GET /admin/applications          │
│                                           │  ?status=pending                  │
│                                           │                                  │
│                                           │  3. 查看详情                      │
│                                           │  GET /admin/applications/:id      │
│                                           │                                  │
│                                           │  4. 审核操作                      │
│                                           │  ┌─────────────────────────────┐ │
│                                           │  │ 通过                         │ │
│                                           │  │ POST /admin/applications     │ │
│                                           │  │   /:id/approve               │ │
│                                           │  │ → 创建 IsvDeveloper 记录     │ │
│                                           │  │ → Application status=        │ │
│                                           │  │   'approved'                 │ │
│                                           │  │ → 写入 DeveloperAudit 日志   │ │
│                                           │  ├─────────────────────────────┤ │
│                                           │  │ 拒绝                         │ │
│                                           │  │ POST /admin/applications     │ │
│                                           │  │   /:id/reject               │ │
│                                           │  │ Body: { reason }             │ │
│                                           │  │ → Application status=        │ │
│                                           │  │   'rejected'                 │ │
│                                           │  │ → 写入 DeveloperAudit 日志   │ │
│                                           │  │ → 开发者可重新提交            │ │
│                                           │  └─────────────────────────────┘ │
│                                           │                                  │
│  5. 审核通过后                             │  6. 开发者列表管理                │
│  → 可以登录 Developer Portal              │  GET /admin/developers           │
│  → 可以创建应用                            │  ┌─────────────────────────────┐ │
│  → 可以调用 API                           │  │ 冻结/封禁/激活                │ │
│                                           │  │ POST /admin/developers       │ │
│                                           │  │   /:id/suspend|ban|activate  │ │
│                                           │  └─────────────────────────────┘ │
│                                           │                                  │
│  7. 审核被拒绝后                           │                                  │
│  → 可以修改资料重新提交                     │                                  │
│  → POST /isv/auth/reapply                │                                  │
│  → Application status = 'pending'        │                                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

**关键设计决策：** 注册申请（DeveloperApplication）与开发者（IsvDeveloper）分离。
- `DeveloperApplication` 存储所有注册申请，含 pending/rejected/approved 三种状态
- `IsvDeveloper` 仅存储审核通过后的正式开发者
- 拒绝后开发者可修改资料重新提交，无需重新注册

### 1.2 开发者状态机

```
                    register
                       │
                       ▼
                ┌──────────────┐
                │   pending     │  (DeveloperApplication, 待审核)
                └──────┬───────┘
                  ┌────┴────┐
                  │         │
              approve    reject
                  │         │
                  ▼         ▼
           ┌──────────┐  ┌──────────┐
           │ approved │  │ rejected │  (DeveloperApplication 状态)
           └────┬─────┘  └────┬─────┘
                │              │
          创建 IsvDeveloper    │ (重新提交)
                │              │
           ┌────┴────┐         ▼
           │         │   ┌──────────┐
        suspend   ban   │ pending  │ (DeveloperApplication 重新进入审核)
           │         │   └──────────┘
           ▼         ▼
     ┌──────────┐ ┌──────┐
     │suspended │ │banned│  (IsvDeveloper 状态)
     └────┬─────┘ └──────┘
          │
       activate
          │
          ▼
     ┌──────────┐
     │  active  │
     └──────────┘
```

### 1.3 订阅购买流程

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Developer Portal (ISV)                    │  Admin Portal (管理端)           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                           │                                  │
│  1. 浏览套餐                               │  管理员配置套餐                    │
│  GET /isv/packages                        │  POST /admin/packages             │
│                                           │  → 创建 Package                   │
│                                           │                                  │
│  2. 选择套餐并下单                          │                                  │
│  POST /isv/orders                         │                                  │
│  Body: { packageId, period }              │                                  │
│  → 创建 Order (status='pending')          │                                  │
│                                           │                                  │
│  3. 支付                                   │                                  │
│  POST /isv/orders/:id/pay                 │                                  │
│  → 创建 Payment (status='processing')     │                                  │
│  → 调用支付网关                             │                                  │
│                                           │                                  │
│  4. 支付回调                                │                                  │
│  POST /isv/payments/callback              │                                  │
│  → Payment status='completed'             │                                  │
│  → Order status='paid'                    │                                  │
│  → 创建/更新 Subscription                  │                                  │
│                                           │                                  │
│                                           │  5. 查看订阅与订单                  │
│                                           │  GET /admin/subscriptions         │
│                                           │  GET /admin/orders                │
│                                           │  GET /admin/payments              │
│                                           │                                  │
│  6. 续费/升级                               │                                  │
│  POST /isv/orders (新订单)                 │                                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 工单处理流程

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Developer Portal (ISV)                    │  Admin Portal (管理端)           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                           │                                  │
│  1. 创建工单                                │                                  │
│  POST /isv/tickets                        │                                  │
│  Body: { title, description, type,        │                                  │
│          priority }                       │                                  │
│  → Ticket status='pending'                │                                  │
│                                           │                                  │
│                                           │  2. 查看工单列表                   │
│                                           │  GET /admin/tickets               │
│                                           │  ?status=pending                  │
│                                           │                                  │
│                                           │  3. 认领工单                      │
│                                           │  POST /admin/tickets/:id/claim    │
│                                           │  → Ticket status='processing'     │
│                                           │  → Ticket assignedTo = adminId    │
│                                           │                                  │
│                                           │  4. 回复工单                      │
│                                           │  POST /admin/tickets/:id/reply    │
│                                           │  → 创建 TicketReply               │
│                                           │                                  │
│  5. 查看回复                                │                                  │
│  GET /isv/tickets/:id/replies             │                                  │
│                                           │                                  │
│  6. 补充信息                                │  7. 关闭工单                      │
│  POST /isv/tickets/:id/reply              │  POST /admin/tickets/:id/close    │
│                                           │  → Ticket status='closed'         │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 二、数据库设计

### 2.1 现有模型（不需要修改）

以下模型已存在于 `prisma/schema.prisma`，本方案不修改其结构：

| 模型 | 表名 | 用途 |
|------|------|------|
| `IsvDeveloper` | `isv_developer` | 正式开发者（审核通过后创建） |
| `Application` | `applications` | 开发者创建的应用 |
| `OauthResource` | `oauth_resources` | OAuth 资源授权 |
| `ApiLog` | `api_logs` | API 调用日志 |
| `Metric` | `metrics` | 指标数据 |
| `Trace` | `traces` | 分布式追踪 |
| `IsvUser` | `isv_users` | ISV 用户 |
| `Binding` | `bindings` | 绑定关系 |
| `EndpointPermission` | `endpoint_permissions` | 端点权限 |
| `RefreshToken` | `refresh_tokens` | 刷新令牌 |
| `Admin` | `admins` | 管理员 |

### 2.2 新增模型

#### 模型 1: DeveloperApplication（注册申请表）

**用途：** 存储所有开发者注册申请，无论审核通过与否。审核通过后额外创建 `IsvDeveloper` 记录，两个表通过 `developerId` 关联。

```prisma
model DeveloperApplication {
  /// 申请唯一标识 UUID
  id                   String   @id @default(uuid())
  /// 开发者邮箱（唯一）
  email                String   @unique
  /// 密码哈希
  passwordHash         String   @map("password_hash")
  /// 企业名称
  legalName            String   @map("legal_name")
  /// 统一社会信用代码
  registrationNumber   String?  @map("registration_number")
  /// 注册地（国家/地区）
  jurisdiction         String?  @map("jurisdiction")
  /// 成立日期
  dateOfIncorporation  String?  @map("date_of_incorporation")
  /// 注册地址
  registeredAddress    String?  @map("registered_address")
  /// 官网
  website              String?
  /// UBO 信息（受益所有人）
  uboInfo              Json?    @map("ubo_info")
  /// 审核状态: pending(待审核), approved(已通过), rejected(已拒绝)
  status               String   @default("pending")
  /// 审核时间
  reviewedAt           DateTime? @map("reviewed_at")
  /// 审核人 ID（管理员）
  reviewedBy           String?   @map("reviewed_by")
  /// 拒绝原因
  rejectReason         String?   @map("reject_reason")
  /// 审核通过后关联的开发者ID
  developerId          String?   @map("developer_id")
  /// 创建时间
  createdAt            DateTime @default(now()) @map("created_at")
  /// 更新时间
  updatedAt            DateTime @updatedAt @map("updated_at")

  @@index([status])
  @@index([email])
  @@index([developerId])
  @@map("developer_applications")
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | String (UUID) | 是 | 主键 |
| email | String (unique) | 是 | 开发者邮箱 |
| passwordHash | String | 是 | 密码哈希 |
| legalName | String | 是 | 企业名称 |
| registrationNumber | String? | 否 | 统一社会信用代码 |
| jurisdiction | String? | 否 | 注册地 |
| dateOfIncorporation | String? | 否 | 成立日期 |
| registeredAddress | String? | 否 | 注册地址 |
| website | String? | 否 | 官网 |
| uboInfo | Json? | 否 | UBO 信息 |
| status | String | 是 | pending/approved/rejected |
| reviewedAt | DateTime? | 否 | 审核时间 |
| reviewedBy | String? | 否 | 审核人 ID |
| rejectReason | String? | 否 | 拒绝原因 |
| developerId | String? | 否 | 审核通过后关联的 IsvDeveloper.id |
| createdAt | DateTime | 是 | 创建时间 |
| updatedAt | DateTime | 是 | 更新时间 |

**索引：**
- `@@index([status])` — 按状态筛选待审核/已审核
- `@@index([email])` — 按邮箱查找
- `@@index([developerId])` — 关联开发者查询

---

#### 模型 2: DeveloperAudit（开发者操作审计日志）

**用途：** 记录管理员对开发者/注册申请的所有操作，包括审核、冻结、封禁、激活等。

```prisma
model DeveloperAudit {
  /// 审计记录唯一标识 UUID
  id            String   @id @default(uuid())
  /// 关联的开发者ID（IsvDeveloper.id）
  developerId   String   @map("developer_id")
  /// 操作类型: approve/reject/suspend/ban/activate
  action        String
  /// 操作原因（拒绝/封禁时必须填写）
  reason        String?  @db.Text
  /// 操作管理员 ID
  adminId       String   @map("admin_id")
  /// 操作管理员邮箱（冗余，方便查询）
  adminEmail    String   @map("admin_email")
  /// 操作前状态
  previousStatus String? @map("previous_status")
  /// 操作后状态
  newStatus     String?  @map("new_status")
  /// 创建时间
  createdAt     DateTime @default(now()) @map("created_at")

  @@index([developerId])
  @@index([adminId])
  @@index([action])
  @@index([createdAt])
  @@map("developer_audit")
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | String (UUID) | 是 | 主键 |
| developerId | String | 是 | 关联的开发者 ID |
| action | String | 是 | approve/reject/suspend/ban/activate |
| reason | String? | 否 | 操作原因 |
| adminId | String | 是 | 操作管理员 ID |
| adminEmail | String | 是 | 操作管理员邮箱 |
| previousStatus | String? | 否 | 操作前状态 |
| newStatus | String? | 否 | 操作后状态 |
| createdAt | DateTime | 是 | 创建时间 |

**索引：**
- `@@index([developerId])` — 按开发者查询审计记录
- `@@index([adminId])` — 按管理员查询操作记录
- `@@index([action])` — 按操作类型筛选
- `@@index([createdAt])` — 按时间排序

---

#### 模型 3: Package（订阅套餐表）

**用途：** 定义平台提供的订阅套餐，管理员可配置不同档位的套餐。

```prisma
model Package {
  /// 套餐唯一标识 UUID
  id              String   @id @default(uuid())
  /// 套餐名称
  name            String
  /// 套餐描述
  description     String?  @db.Text
  /// 套餐类型: basic(基础版), professional(专业版), enterprise(企业版)
  type            String   @default("basic")
  /// 价格（美元，月付）
  monthlyPrice    Decimal  @map("monthly_price") @db.Decimal(10, 2)
  /// 价格（美元，年付）
  yearlyPrice     Decimal? @map("yearly_price") @db.Decimal(10, 2)
  /// API 调用次数上限（月）
  apiCallLimit    Int      @default(10000) @map("api_call_limit")
  /// 最大应用数
  maxApplications Int      @default(3) @map("max_applications")
  /// 是否支持自定义域名
  customDomain    Boolean  @default(false) @map("custom_domain")
  /// 是否支持白标
  whiteLabel      Boolean  @default(false) @map("white_label")
  /// 技术支持级别: community(社区), email(邮件), priority(优先)
  supportLevel    String   @default("community") @map("support_level")
  /// 套餐状态: active(启用), inactive(停用)
  status          String   @default("active")
  /// 排序序号
  sortOrder       Int      @default(0) @map("sort_order")
  /// 创建时间
  createdAt       DateTime @default(now()) @map("created_at")
  /// 更新时间
  updatedAt       DateTime @updatedAt @map("updated_at")

  subscriptions   Subscription[]

  @@index([type])
  @@index([status])
  @@map("packages")
}
```

---

#### 模型 4: Subscription（订阅表）

**用途：** 记录开发者的订阅关系，关联套餐和开发者。

```prisma
model Subscription {
  /// 订阅唯一标识 UUID
  id              String   @id @default(uuid())
  /// 关联的开发者 ID
  developerId     String   @map("developer_id")
  /// 关联的套餐 ID
  packageId       String   @map("package_id")
  /// 订阅状态: active(生效中), paused(暂停), cancelled(已取消), expired(已过期)
  status          String   @default("active")
  /// 订阅开始时间
  startDate       DateTime @map("start_date")
  /// 订阅结束时间
  endDate         DateTime @map("end_date")
  /// 是否自动续费
  autoRenew       Boolean  @default(false) @map("auto_renew")
  /// 计费周期: monthly(月付), yearly(年付)
  billingCycle    String   @default("monthly") @map("billing_cycle")
  /// 创建时间
  createdAt       DateTime @default(now()) @map("created_at")
  /// 更新时间
  updatedAt       DateTime @updatedAt @map("updated_at")

  developer       IsvDeveloper @relation(fields: [developerId], references: [id], onDelete: Cascade)
  package         Package      @relation(fields: [packageId], references: [id])

  @@index([developerId])
  @@index([packageId])
  @@index([status])
  @@index([endDate])
  @@map("subscriptions")
}
```

---

#### 模型 5: Order（订单表）

**用途：** 记录开发者的订阅购买订单。

```prisma
model Order {
  /// 订单唯一标识 UUID
  id              String   @id @default(uuid())
  /// 订单号（业务唯一编号）
  orderNo         String   @unique @map("order_no")
  /// 关联的开发者 ID
  developerId     String   @map("developer_id")
  /// 关联的套餐 ID
  packageId       String   @map("package_id")
  /// 订单金额
  amount          Decimal  @db.Decimal(10, 2)
  /// 币种
  currency        String   @default("USD")
  /// 订单状态: pending(待支付), paid(已支付), cancelled(已取消), refunded(已退款)
  status          String   @default("pending")
  /// 计费周期: monthly(月付), yearly(年付)
  billingCycle    String   @default("monthly") @map("billing_cycle")
  /// 创建时间
  createdAt       DateTime @default(now()) @map("created_at")
  /// 更新时间
  updatedAt       DateTime @updatedAt @map("updated_at")

  payments        Payment[]

  @@index([developerId])
  @@index([orderNo])
  @@index([status])
  @@index([createdAt])
  @@map("orders")
}
```

---

#### 模型 6: Payment（支付表）

**用途：** 记录每笔支付交易。

```prisma
model Payment {
  /// 支付唯一标识 UUID
  id              String   @id @default(uuid())
  /// 关联的订单 ID
  orderId         String   @map("order_id")
  /// 支付金额
  amount          Decimal  @db.Decimal(10, 2)
  /// 币种
  currency        String   @default("USD")
  /// 支付方式: crypto(加密货币), bank_transfer(银行转账)
  paymentMethod   String   @default("crypto") @map("payment_method")
  /// 支付状态: pending(待处理), processing(处理中), completed(已完成), failed(失败), refunded(已退款)
  status          String   @default("pending")
  /// 交易哈希（加密货币支付）
  transactionHash String?  @map("transaction_hash")
  /// 支付网关交易号
  gatewayTradeNo  String?  @map("gateway_trade_no")
  /// 支付完成时间
  paidAt          DateTime? @map("paid_at")
  /// 创建时间
  createdAt       DateTime @default(now()) @map("created_at")
  /// 更新时间
  updatedAt       DateTime @updatedAt @map("updated_at")

  order           Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId])
  @@index([status])
  @@index([transactionHash])
  @@map("payments")
}
```

---

#### 模型 7: Announcement（系统公告）

**用途：** 管理系统公告，可在开发者门户展示。

```prisma
model Announcement {
  /// 公告唯一标识 UUID
  id          String   @id @default(uuid())
  /// 公告标题
  title       String
  /// 公告内容
  content     String   @db.Text
  /// 公告类型: system(系统), maintenance(维护), feature(功能更新)
  type        String   @default("system")
  /// 公告状态: draft(草稿), published(已发布), archived(已归档)
  status      String   @default("draft")
  /// 发布人 ID（管理员）
  publishedBy String?  @map("published_by")
  /// 发布时间
  publishedAt DateTime? @map("published_at")
  /// 创建时间
  createdAt   DateTime @default(now()) @map("created_at")
  /// 更新时间
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([status])
  @@index([type])
  @@index([publishedAt])
  @@map("announcements")
}
```

---

#### 模型 8: Ticket（工单表）

**用途：** 开发者提交的工单，管理员可认领、回复、关闭。

```prisma
model Ticket {
  /// 工单唯一标识 UUID
  id          String   @id @default(uuid())
  /// 工单编号（业务唯一编号）
  ticketNo    String   @unique @map("ticket_no")
  /// 关联的开发者 ID
  developerId String   @map("developer_id")
  /// 工单标题
  title       String
  /// 工单描述
  description String   @db.Text
  /// 工单类型: technical(技术问题), approval(审批相关), billing(计费问题), other(其他)
  type        String   @default("technical")
  /// 优先级: low(低), normal(普通), high(高), urgent(紧急)
  priority    String   @default("normal")
  /// 工单状态: pending(待处理), processing(处理中), waiting_reply(等待回复), resolved(已解决), closed(已关闭)
  status      String   @default("pending")
  /// 认领人 ID（管理员）
  assignedTo  String?  @map("assigned_to")
  /// 解决时间
  resolvedAt  DateTime? @map("resolved_at")
  /// 关闭时间
  closedAt    DateTime? @map("closed_at")
  /// 创建时间
  createdAt   DateTime @default(now()) @map("created_at")
  /// 更新时间
  updatedAt   DateTime @updatedAt @map("updated_at")

  replies     TicketReply[]

  @@index([developerId])
  @@index([ticketNo])
  @@index([status])
  @@index([assignedTo])
  @@index([priority])
  @@index([createdAt])
  @@map("tickets")
}
```

---

#### 模型 9: TicketReply（工单回复表）

**用途：** 记录工单的每一次回复，支持开发者和管理员双向回复。

```prisma
model TicketReply {
  /// 回复唯一标识 UUID
  id          String   @id @default(uuid())
  /// 关联的工单 ID
  ticketId    String   @map("ticket_id")
  /// 回复内容
  content     String   @db.Text
  /// 回复人类型: admin(管理员), developer(开发者)
  replyByType String   @map("reply_by_type")
  /// 回复人 ID
  replyById   String   @map("reply_by_id")
  /// 回复人名称
  replyByName String   @map("reply_by_name")
  /// 是否为内部备注（仅管理员可见）
  isInternal  Boolean  @default(false) @map("is_internal")
  /// 创建时间
  createdAt   DateTime @default(now()) @map("created_at")

  ticket      Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  @@index([ticketId])
  @@index([createdAt])
  @@map("ticket_replies")
}
```

---

#### 模型 10: SystemConfig（系统配置表）

**用途：** 存储系统级别的配置项，支持键值对形式。

```prisma
model SystemConfig {
  /// 配置唯一标识 UUID
  id          String   @id @default(uuid())
  /// 配置键（唯一）
  configKey   String   @unique @map("config_key")
  /// 配置值
  configValue String   @db.Text @map("config_value")
  /// 配置类型: string, number, boolean, json
  valueType   String   @default("string") @map("value_type")
  /// 配置描述
  description String?
  /// 配置分组: system(系统), security(安全), notification(通知), billing(计费)
  group       String   @default("system")
  /// 是否可编辑
  editable    Boolean  @default(true)
  /// 最后修改人 ID
  updatedBy   String?  @map("updated_by")
  /// 创建时间
  createdAt   DateTime @default(now()) @map("created_at")
  /// 更新时间
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([group])
  @@map("system_configs")
}
```

**预设配置项：**

| configKey | 说明 | 默认值 |
|-----------|------|--------|
| `system.name` | 系统名称 | Cregis OpenPlatform |
| `system.logo_url` | Logo URL | - |
| `security.login_attempts` | 最大登录尝试次数 | 5 |
| `security.session_timeout` | 会话超时（分钟） | 120 |
| `security.mfa_required` | 是否强制 MFA | false |
| `notification.email_enabled` | 是否启用邮件通知 | true |
| `billing.default_currency` | 默认币种 | USD |

---

#### 模型 11: AdminAudit（管理员操作审计日志）

**用途：** 记录管理员所有敏感操作，独立于 `DeveloperAudit`。

```prisma
model AdminAudit {
  /// 审计记录唯一标识 UUID
  id            String   @id @default(uuid())
  /// 操作管理员 ID
  adminId       String   @map("admin_id")
  /// 操作管理员邮箱
  adminEmail    String   @map("admin_email")
  /// 操作管理员角色
  adminRole     String   @map("admin_role")
  /// 操作类型: LOGIN/LOGOUT/CREATE/UPDATE/DELETE/EXPORT 等
  action        String
  /// 操作资源类型: developer/application/package/ticket/admin 等
  resource      String
  /// 操作资源 ID
  resourceId    String?  @map("resource_id")
  /// 操作结果: SUCCESS/FAILURE/PARTIAL
  result        String   @default("SUCCESS")
  /// 操作详情 JSON
  details       Json?
  /// 错误信息
  errorMessage  String?  @map("error_message")
  /// 客户端 IP
  ipAddress     String   @map("ip_address")
  /// User-Agent
  userAgent     String?  @map("user_agent")
  /// 请求路径
  requestPath   String   @map("request_path")
  /// 请求方法
  requestMethod String   @map("request_method")
  /// 追踪 ID
  traceId       String?  @map("trace_id")
  /// 创建时间
  createdAt     DateTime @default(now()) @map("created_at")

  @@index([adminId])
  @@index([action])
  @@index([resource])
  @@index([createdAt])
  @@map("admin_audit")
}
```

---

### 2.3 迁移方案

```bash
# 1. 修改 schema.prisma，添加上述 11 个模型
# 2. 生成迁移文件
npx prisma migrate dev --name add_admin_portal_modules

# 3. 部署到生产
npx prisma migrate deploy
```

**迁移 SQL 只包含 CREATE TABLE 语句，不修改现有表，零风险。**

---

## 三、API 接口设计

### 3.1 统一响应格式

所有 API 响应遵循以下格式：

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

// 分页列表
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

**错误码范围：**

| 范围 | 说明 |
|------|------|
| 400xx | 参数错误 |
| 401xx | 认证错误 |
| 403xx | 授权错误 |
| 404xx | 资源不存在 |
| 409xx | 冲突错误 |
| 429xx | 限流错误 |
| 500xx | 服务端错误 |

---

### 3.2 开发者管理 API

#### 3.2.1 注册申请（DeveloperApplication）

| 方法 | 路径 | 说明 | 数据源 |
|------|------|------|--------|
| GET | `/admin/applications` | 获取注册申请列表 | REAL (Prisma) |
| GET | `/admin/applications/stats` | 注册申请统计 | REAL (Prisma) |
| GET | `/admin/applications/:id` | 获取申请详情 | REAL (Prisma) |
| POST | `/admin/applications/:id/approve` | 审批通过 | REAL (Prisma) |
| POST | `/admin/applications/:id/reject` | 审批拒绝 | REAL (Prisma) |

**GET /admin/applications**

请求参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页条数，默认 10 |
| status | string | 否 | 筛选状态: pending/approved/rejected |
| keyword | string | 否 | 搜索关键词（企业名/邮箱） |

响应格式：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [{
      "id": "uuid",
      "email": "developer@example.com",
      "legalName": "TechCorp Ltd",
      "registrationNumber": "91110108MA01XXXXX",
      "jurisdiction": "China",
      "status": "pending",
      "createdAt": "2026-08-15T10:00:00.000Z"
    }],
    "total": 50,
    "page": 1,
    "pageSize": 10
  },
  "trace_id": "uuid"
}
```

**GET /admin/applications/:id**

响应格式：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid",
    "email": "developer@example.com",
    "legalName": "TechCorp Ltd",
    "registrationNumber": "91110108MA01XXXXX",
    "jurisdiction": "China",
    "dateOfIncorporation": "2020-01-01",
    "registeredAddress": "北京市朝阳区...",
    "website": "https://techcorp.com",
    "uboInfo": [{ "name": "张三", "nationality": "Chinese", "ownershipPercentage": 60 }],
    "status": "pending",
    "reviewedAt": null,
    "reviewedBy": null,
    "rejectReason": null,
    "developerId": null,
    "createdAt": "2026-08-15T10:00:00.000Z",
    "updatedAt": "2026-08-15T10:00:00.000Z"
  },
  "trace_id": "uuid"
}
```

**POST /admin/applications/:id/approve**

请求体：无（管理员信息从 JWT 获取）

成功响应：

```json
{
  "code": 0,
  "message": "Application approved, developer created",
  "data": {
    "applicationId": "uuid",
    "developerId": "uuid"
  },
  "trace_id": "uuid"
}
```

**POST /admin/applications/:id/reject**

请求体：

```json
{
  "reason": "企业信息不完整，请补充营业执照"
}
```

成功响应：

```json
{
  "code": 0,
  "message": "Application rejected",
  "data": {
    "applicationId": "uuid",
    "status": "rejected"
  },
  "trace_id": "uuid"
}
```

---

#### 3.2.2 开发者列表（IsvDeveloper）

| 方法 | 路径 | 说明 | 数据源 |
|------|------|------|--------|
| GET | `/admin/developers` | 获取开发者列表 | REAL (Prisma) |
| GET | `/admin/developers/stats` | 开发者统计 | REAL (Prisma) |
| GET | `/admin/developers/:id` | 获取开发者详情 | REAL (Prisma) |
| GET | `/admin/developers/:id/applications` | 获取开发者的应用列表 | REAL (Prisma) |
| POST | `/admin/developers/:id/activate` | 激活开发者 | REAL (Prisma) |
| POST | `/admin/developers/:id/suspend` | 冻结开发者 | REAL (Prisma) |
| POST | `/admin/developers/:id/ban` | 封禁开发者 | REAL (Prisma) |

**GET /admin/developers**

请求参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页条数，默认 10 |
| status | string | 否 | 筛选状态: active/suspended/banned/deleted |
| keyword | string | 否 | 搜索关键词（企业名/邮箱） |

响应格式：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [{
      "id": "uuid",
      "email": "developer@example.com",
      "legalName": "TechCorp Ltd",
      "registrationNumber": "91110108MA01XXXXX",
      "jurisdiction": "China",
      "kybStatus": "approved",
      "status": "active",
      "kybReviewedAt": "2026-08-10T14:00:00.000Z",
      "createdAt": "2026-08-09T10:00:00.000Z"
    }],
    "total": 128,
    "page": 1,
    "pageSize": 10
  },
  "trace_id": "uuid"
}
```

**POST /admin/developers/:id/ban**

请求体：

```json
{
  "reason": "违规使用 API，多次警告无效"
}
```

---

#### 3.2.3 开发者审计日志

| 方法 | 路径 | 说明 | 数据源 |
|------|------|------|--------|
| GET | `/admin/developers/:id/audit` | 获取开发者操作审计日志 | REAL (Prisma) |

**GET /admin/developers/:id/audit**

请求参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |
| action | string | 否 | 筛选操作类型 |

响应格式：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [{
      "id": "uuid",
      "developerId": "uuid",
      "action": "approve",
      "reason": null,
      "adminId": "uuid",
      "adminEmail": "admin@cregis.com",
      "previousStatus": "pending",
      "newStatus": "active",
      "createdAt": "2026-08-10T14:00:00.000Z"
    }],
    "total": 5,
    "page": 1,
    "pageSize": 10
  },
  "trace_id": "uuid"
}
```

---

### 3.3 仪表盘 API

| 方法 | 路径 | 说明 | 数据源 |
|------|------|------|--------|
| GET | `/admin/dashboard/stats` | 平台概览统计 | MOCK (当前) |
| GET | `/admin/dashboard/trends` | 趋势数据（折线图） | MOCK (当前) |
| GET | `/admin/dashboard/details` | 详细统计 | MOCK (当前) |
| POST | `/admin/dashboard/refresh` | 强制刷新缓存 | MOCK (当前) |
| GET | `/admin/dashboard/health` | 仪表盘服务健康检查 | MOCK (当前) |

**GET /admin/dashboard/stats**

响应格式：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "totalDevelopers": 128,
    "totalApplications": 256,
    "pendingKYBReviews": 5,
    "apiCalls": {
      "today": 12580,
      "thisWeek": 85670,
      "thisMonth": 358900
    },
    "errorRate": 0.52,
    "lastUpdated": "2026-08-15T10:00:00.000Z"
  },
  "trace_id": "uuid"
}
```

**未来真实数据来源设计：**

| 统计项 | 当前 | 未来数据源 |
|--------|------|------------|
| totalDevelopers | Math.random() | `SELECT COUNT(*) FROM isv_developer WHERE status='active'` |
| totalApplications | Math.random() | `SELECT COUNT(*) FROM applications WHERE status='active'` |
| pendingKYBReviews | Math.random() | `SELECT COUNT(*) FROM developer_applications WHERE status='pending'` |
| apiCalls.today | Math.random() | `SELECT COUNT(*) FROM api_logs WHERE created_at >= CURDATE()` |
| apiCalls.thisWeek | Math.random() | `SELECT COUNT(*) FROM api_logs WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)` |
| apiCalls.thisMonth | Math.random() | `SELECT COUNT(*) FROM api_logs WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)` |
| errorRate | Math.random() | `SELECT COUNT(*) FILTER(WHERE response_status >= 400) / COUNT(*) FROM api_logs WHERE created_at >= CURDATE()` |

**GET /admin/dashboard/trends**

请求参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| days | number | 否 | 天数，1-30，默认 7 |

响应格式：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "apiCalls": [
      { "timestamp": "2026-08-15T00:00:00.000Z", "value": 1523 },
      { "timestamp": "2026-08-15T01:00:00.000Z", "value": 1201 }
    ],
    "errorRate": [
      { "timestamp": "2026-08-15T00:00:00.000Z", "value": 0.5 },
      { "timestamp": "2026-08-15T01:00:00.000Z", "value": 0.3 }
    ]
  },
  "trace_id": "uuid"
}
```

**未来真实数据来源：** 按小时聚合 `api_logs` 表：
```sql
SELECT DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') AS hour,
       COUNT(*) AS calls,
       SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END) AS errors
FROM api_logs
WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
GROUP BY hour
ORDER BY hour
```

---

### 3.4 统计分析 API

| 方法 | 路径 | 说明 | 数据源 |
|------|------|------|--------|
| GET | `/admin/stats/api/summary` | API 统计概要 | MOCK (当前) |
| GET | `/admin/stats/api/top-apps` | Top 应用排行 | MOCK (当前) |
| GET | `/admin/stats/api/response-times` | 响应时间趋势 | MOCK (当前) |
| GET | `/admin/stats/api/errors` | 错误率趋势 | MOCK (当前) |
| GET | `/admin/stats/api/app/:appId` | 应用详情统计 | MOCK (当前) |
| GET | `/admin/stats/api/export` | 导出 CSV | MOCK (当前) |
| GET | `/admin/stats/revenue/summary` | 收入概要 | MOCK (当前) |
| GET | `/admin/stats/revenue/by-developer` | 按开发者收入 | MOCK (当前) |
| GET | `/admin/stats/revenue/trends` | 收入趋势 | MOCK (当前) |
| GET | `/admin/stats/revenue/forecast` | 收入预测 | MOCK (当前) |

**GET /admin/stats/api/summary**

响应格式：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "today": {
      "calls": 12580,
      "avgResponseTime": 85,
      "errorRate": 0.52
    },
    "thisWeek": {
      "calls": 85670,
      "avgResponseTime": 92
    },
    "thisMonth": {
      "calls": 358900,
      "avgResponseTime": 88
    },
    "uniqueEndpoints": 45
  },
  "trace_id": "uuid"
}
```

**未来真实数据来源：** 基于 `api_logs` 表聚合查询：
```sql
-- 今日调用量
SELECT COUNT(*) FROM api_logs WHERE created_at >= CURDATE();

-- 平均响应时间
SELECT AVG(response_time) FROM api_logs WHERE created_at >= CURDATE();

-- 错误率
SELECT SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)
FROM api_logs WHERE created_at >= CURDATE();
```

**GET /admin/stats/api/top-apps**

请求参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| limit | number | 否 | 返回条数，默认 10 |

**未来真实数据来源：** 基于 `api_logs` 按 `app_id` 分组聚合。

---

### 3.5 系统监控 API

| 方法 | 路径 | 说明 | 数据源 |
|------|------|------|--------|
| GET | `/admin/health/status` | 整体健康状态 | MOCK (当前) |
| GET | `/admin/health/services` | 各服务健康状态 | MOCK (当前) |
| GET | `/admin/health/resources` | 资源使用率 | MOCK (当前) |
| GET | `/admin/health/history` | 历史健康数据 | MOCK (当前) |
| GET | `/admin/health/service/:serviceId` | 服务详情 | MOCK (当前) |
| POST | `/admin/health/refresh` | 强制刷新健康数据 | MOCK (当前) |

**GET /admin/health/status**

响应格式：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "overall": {
      "status": "healthy",
      "lastCheck": "2026-08-15T10:00:00.000Z",
      "uptime": 864000
    },
    "servicesCount": {
      "healthy": 8,
      "degraded": 0,
      "down": 0,
      "total": 8
    }
  },
  "trace_id": "uuid"
}
```

**GET /admin/health/services**

响应格式：

```json
{
  "code": 0,
  "message": "success",
  "data": [{
    "serviceId": "srv_abc123",
    "serviceName": "API Gateway",
    "status": "healthy",
    "responseTime": { "avg": 12, "p50": 10, "p95": 25, "p99": 50 },
    "errorRate": 0.01,
    "lastCheck": "2026-08-15T10:00:00.000Z"
  }],
  "trace_id": "uuid"
}
```

**GET /admin/health/resources**

响应格式：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "cpu": 45.0,
    "memory": 35.0,
    "disk": 20.0,
    "network": { "in": 5120, "out": 10240 }
  },
  "trace_id": "uuid"
}
```

**未来真实数据来源：**
- 服务状态：通过 HTTP Health Check 端点定期探测各微服务
- 资源使用：集成 `os.cpus()`, `os.totalmem()`, `os.freemem()` 或 Prometheus/CloudWatch
- 历史数据：定时任务每分钟采集，写入时序数据库或内存缓存

---

### 3.6 系统设置 API

| 方法 | 路径 | 说明 | 数据源 |
|------|------|------|--------|
| GET | `/admin/admins` | 管理员列表 | REAL (Prisma) |
| POST | `/admin/admins` | 创建管理员 | REAL (Prisma) |
| GET | `/admin/admins/:id` | 管理员详情 | REAL (Prisma) |
| PUT | `/admin/admins/:id` | 更新管理员 | REAL (Prisma) |
| DELETE | `/admin/admins/:id` | 删除管理员 | REAL (Prisma) |
| GET | `/admin/configs` | 系统配置列表 | REAL (Prisma) |
| GET | `/admin/configs/:key` | 获取单个配置 | REAL (Prisma) |
| PUT | `/admin/configs/:key` | 更新配置 | REAL (Prisma) |
| GET | `/admin/audit` | 管理员操作日志 | REAL (Prisma) |

**GET /admin/admins**

响应格式：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [{
      "id": "uuid",
      "email": "admin@cregis.com",
      "name": "Super Admin",
      "role": "super_admin",
      "status": "active",
      "lastLoginAt": "2026-08-15T09:00:00.000Z",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }],
    "total": 5
  },
  "trace_id": "uuid"
}
```

**POST /admin/admins**

请求体：

```json
{
  "email": "newadmin@cregis.com",
  "name": "New Admin",
  "password": "SecurePass123!",
  "role": "operator"
}
```

**GET /admin/configs**

请求参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| group | string | 否 | 配置分组筛选 |

响应格式：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [{
      "id": "uuid",
      "configKey": "system.name",
      "configValue": "Cregis OpenPlatform",
      "valueType": "string",
      "description": "系统名称",
      "group": "system",
      "editable": true,
      "updatedAt": "2026-08-15T10:00:00.000Z"
    }]
  },
  "trace_id": "uuid"
}
```

**PUT /admin/configs/:key**

请求体：

```json
{
  "configValue": "Cregis Platform v2"
}
```

**GET /admin/audit**

请求参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |
| adminId | string | 否 | 按管理员筛选 |
| action | string | 否 | 按操作类型筛选 |
| resource | string | 否 | 按资源类型筛选 |
| startDate | string | 否 | 开始日期 |
| endDate | string | 否 | 结束日期 |

响应格式：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [{
      "id": "uuid",
      "adminId": "uuid",
      "adminEmail": "admin@cregis.com",
      "adminRole": "super_admin",
      "action": "ISV_KYB_APPROVE",
      "resource": "developer",
      "resourceId": "uuid",
      "result": "SUCCESS",
      "ipAddress": "192.168.1.1",
      "requestPath": "/admin/applications/xxx/approve",
      "requestMethod": "POST",
      "createdAt": "2026-08-15T10:00:00.000Z"
    }],
    "total": 250,
    "page": 1,
    "pageSize": 20
  },
  "trace_id": "uuid"
}
```

---

### 3.7 订阅管理 API

| 方法 | 路径 | 说明 | 数据源 |
|------|------|------|--------|
| GET | `/admin/packages` | 套餐列表 | REAL (Prisma) |
| POST | `/admin/packages` | 创建套餐 | REAL (Prisma) |
| GET | `/admin/packages/:id` | 套餐详情 | REAL (Prisma) |
| PUT | `/admin/packages/:id` | 更新套餐 | REAL (Prisma) |
| DELETE | `/admin/packages/:id` | 删除套餐 | REAL (Prisma) |
| GET | `/admin/subscriptions` | 订阅列表 | REAL (Prisma) |
| GET | `/admin/subscriptions/:id` | 订阅详情 | REAL (Prisma) |
| POST | `/admin/subscriptions/:id/cancel` | 取消订阅 | REAL (Prisma) |
| GET | `/admin/orders` | 订单列表 | REAL (Prisma) |
| GET | `/admin/orders/:id` | 订单详情 | REAL (Prisma) |
| GET | `/admin/payments` | 支付记录列表 | REAL (Prisma) |
| GET | `/admin/payments/:id` | 支付详情 | REAL (Prisma) |

**GET /admin/packages**

响应格式：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [{
      "id": "uuid",
      "name": "专业版",
      "description": "适合成长型企业",
      "type": "professional",
      "monthlyPrice": 99.00,
      "yearlyPrice": 990.00,
      "apiCallLimit": 100000,
      "maxApplications": 10,
      "customDomain": true,
      "whiteLabel": false,
      "supportLevel": "email",
      "status": "active",
      "sortOrder": 2
    }],
    "total": 3
  },
  "trace_id": "uuid"
}
```

**POST /admin/packages**

请求体：

```json
{
  "name": "企业版",
  "description": "适合大型企业，无限调用",
  "type": "enterprise",
  "monthlyPrice": 499.00,
  "yearlyPrice": 4990.00,
  "apiCallLimit": 1000000,
  "maxApplications": 50,
  "customDomain": true,
  "whiteLabel": true,
  "supportLevel": "priority",
  "sortOrder": 3
}
```

**GET /admin/subscriptions**

请求参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |
| status | string | 否 | 筛选: active/paused/cancelled/expired |
| developerId | string | 否 | 按开发者筛选 |

响应格式：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [{
      "id": "uuid",
      "developerId": "uuid",
      "developerName": "TechCorp Ltd",
      "packageId": "uuid",
      "packageName": "专业版",
      "status": "active",
      "startDate": "2026-08-01T00:00:00.000Z",
      "endDate": "2026-09-01T00:00:00.000Z",
      "autoRenew": true,
      "billingCycle": "monthly",
      "createdAt": "2026-08-01T00:00:00.000Z"
    }],
    "total": 45,
    "page": 1,
    "pageSize": 10
  },
  "trace_id": "uuid"
}
```

**GET /admin/orders**

请求参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |
| status | string | 否 | 筛选: pending/paid/cancelled/refunded |
| developerId | string | 否 | 按开发者筛选 |

---

### 3.8 工单管理 API

| 方法 | 路径 | 说明 | 数据源 |
|------|------|------|--------|
| GET | `/admin/tickets` | 工单列表 | REAL (Prisma) |
| GET | `/admin/tickets/stats` | 工单统计 | REAL (Prisma) |
| GET | `/admin/tickets/:id` | 工单详情（含回复） | REAL (Prisma) |
| POST | `/admin/tickets/:id/claim` | 认领工单 | REAL (Prisma) |
| POST | `/admin/tickets/:id/reply` | 回复工单 | REAL (Prisma) |
| POST | `/admin/tickets/:id/close` | 关闭工单 | REAL (Prisma) |

**GET /admin/tickets**

请求参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |
| status | string | 否 | 筛选: pending/processing/waiting_reply/resolved/closed |
| type | string | 否 | 筛选: technical/approval/billing/other |
| priority | string | 否 | 筛选: low/normal/high/urgent |
| assignedTo | string | 否 | 按认领人筛选 |
| developerId | string | 否 | 按开发者筛选 |

响应格式：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [{
      "id": "uuid",
      "ticketNo": "TK-20260815-001",
      "developerId": "uuid",
      "developerName": "TechCorp Ltd",
      "title": "API 调用返回 500 错误",
      "type": "technical",
      "priority": "high",
      "status": "processing",
      "assignedTo": "admin-uuid",
      "assignedToName": "Operator1",
      "createdAt": "2026-08-15T09:00:00.000Z",
      "updatedAt": "2026-08-15T09:30:00.000Z"
    }],
    "total": 28,
    "page": 1,
    "pageSize": 10
  },
  "trace_id": "uuid"
}
```

**GET /admin/tickets/:id**

响应包含工单详情和回复列表：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid",
    "ticketNo": "TK-20260815-001",
    "developerId": "uuid",
    "developerName": "TechCorp Ltd",
    "title": "API 调用返回 500 错误",
    "description": "在调用 /api/v1/wallet/balance 接口时，持续返回 500 错误...",
    "type": "technical",
    "priority": "high",
    "status": "processing",
    "assignedTo": "admin-uuid",
    "assignedToName": "Operator1",
    "createdAt": "2026-08-15T09:00:00.000Z",
    "replies": [{
      "id": "uuid",
      "content": "请提供请求的 trace_id 以便排查",
      "replyByType": "admin",
      "replyById": "admin-uuid",
      "replyByName": "Operator1",
      "isInternal": false,
      "createdAt": "2026-08-15T09:30:00.000Z"
    }]
  },
  "trace_id": "uuid"
}
```

**POST /admin/tickets/:id/reply**

请求体：

```json
{
  "content": "已定位问题，正在修复中",
  "isInternal": false
}
```

---

### 3.9 公告管理 API

| 方法 | 路径 | 说明 | 数据源 |
|------|------|------|--------|
| GET | `/admin/announcements` | 公告列表 | REAL (Prisma) |
| POST | `/admin/announcements` | 创建公告 | REAL (Prisma) |
| GET | `/admin/announcements/:id` | 公告详情 | REAL (Prisma) |
| PUT | `/admin/announcements/:id` | 更新公告 | REAL (Prisma) |
| DELETE | `/admin/announcements/:id` | 删除公告 | REAL (Prisma) |
| POST | `/admin/announcements/:id/publish` | 发布公告 | REAL (Prisma) |
| POST | `/admin/announcements/:id/archive` | 归档公告 | REAL (Prisma) |

---

## 四、页面设计

### 4.1 仪表盘

```
┌──────────────────────────────────────────────────────────────────┐
│  仪表盘                                         [刷新]            │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐       │
│  │ 开发者    │ │ 应用      │ │ 待审核    │ │ API 调用量    │       │
│  │   128     │ │   256     │ │    5      │ │  12,580      │       │
│  │ ↑12% 较上月│ │ ↑8% 较上月│ │ 较昨日+2   │ │ 今日          │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘       │
│                                                                  │
│  ┌─────────────────────────┐ ┌──────────────────────────────┐   │
│  │ API 调用趋势（折线图）    │ │ 错误率趋势（折线图）          │   │
│  │    *    *               │ │                              │   │
│  │   * *  * *  *   *      │ │  *     *                     │   │
│  │  *   *    *  * * *     │ │   *   * *  *  *              │   │
│  │  Mon Tue Wed Thu Fri   │ │  Mon Tue Wed Thu Fri         │   │
│  └─────────────────────────┘ └──────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 最近注册申请                                               │   │
│  │ TechCorp Ltd     | pending  | 2026-08-15  | [查看]        │   │
│  │ GlobalPay Inc    | pending  | 2026-08-15  | [查看]        │   │
│  │ SecureFin Ltd    | pending  | 2026-08-14  | [查看]        │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

**数据来源：**
- `GET /admin/dashboard/stats` — 统计卡片（当前 MOCK）
- `GET /admin/dashboard/trends?days=7` — 趋势图（当前 MOCK）
- `GET /admin/applications?status=pending&pageSize=5` — 最近注册申请（REAL）

**页面组件：**
- `StatsCard` — 统计卡片组件
- `LineChart` — 折线图组件（ECharts/Chart.js）
- `RecentApplications` — 最近注册申请列表

---

### 4.2 开发者管理

#### 4.2.1 注册申请（Tabs 布局）

```
┌──────────────────────────────────────────────────────────────────┐
│  注册申请                                                        │
│  [待审核 (5)] [已通过 (120)] [已拒绝 (3)]                         │
├──────────────────────────────────────────────────────────────────┤
│  ┌─ 搜索 ────────────────────┐  ┌─ 筛选 ──────────────────┐     │
│  │ [________________] [搜索] │  │ [全部状态 ▾] [刷新]      │     │
│  └───────────────────────────┘  └──────────────────────────┘     │
│                                                                  │
│  ┌─ 待审核 Tab ──────────────────────────────────────────────┐  │
│  │ 企业名称       │ 邮箱          │ 提交时间     │ 操作       │  │
│  │ TechCorp Ltd  │ t@t.com      │ 2026-08-15  │ [查看] [审核]│  │
│  │ NewCompany    │ n@n.com      │ 2026-08-14  │ [查看] [审核]│  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│                    分页: < 1 2 3 >                                │
└──────────────────────────────────────────────────────────────────┘
```

**数据来源：** `GET /admin/applications?status=pending&page=1&pageSize=10`

**审核弹窗：**

```
┌──────────────────────────────────────┐
│  审核注册申请 - TechCorp Ltd          │
├──────────────────────────────────────┤
│  企业信息:                            │
│  企业名称: TechCorp Ltd               │
│  信用代码: 91110108MA01XXXXX          │
│  注册地:   China                      │
│  成立日期: 2020-01-01                 │
│  注册地址: 北京市朝阳区...             │
│  官网:     https://techcorp.com       │
│                                      │
│  UBO 信息:                            │
│  UBO 1: 张三, Chinese, 60%           │
│  UBO 2: 李四, Chinese, 40%           │
│                                      │
│  [审批通过]  [审批拒绝]  [取消]        │
└──────────────────────────────────────┘
```

**审批拒绝弹窗（需填写原因）：**

```
┌──────────────────────────────────────┐
│  拒绝注册申请 - TechCorp Ltd          │
├──────────────────────────────────────┤
│  拒绝原因:                            │
│  ┌────────────────────────────────┐  │
│  │ 请填写拒绝原因（必填）           │  │
│  │                                │  │
│  └────────────────────────────────┘  │
│                                      │
│  [确认拒绝]  [取消]                   │
└──────────────────────────────────────┘
```

**操作按钮逻辑：**
- status === 'pending' --> 显示 [审批通过] [审批拒绝]
- status === 'approved' --> 显示 [查看关联开发者]
- status === 'rejected' --> 仅显示 [查看]

---

#### 4.2.2 开发者列表

```
┌──────────────────────────────────────────────────────────────────┐
│  开发者列表                                                      │
│  ┌─ 搜索 ────────────────────┐  ┌─ 筛选 ───────────────────┐    │
│  │ [________________] [搜索] │  │ [全部状态 ▾] [刷新]       │    │
│  └───────────────────────────┘  └───────────────────────────┘    │
│                                                                  │
│  企业名称      │ 邮箱      │ 状态    │ 创建时间    │ 操作        │
│  TechCorp Ltd │ t@t.com  │ active  │ 2026-08-10 │ 查看 冻结 封禁│
│  GlobalPay    │ g@g.com  │ active  │ 2026-08-09 │ 查看 冻结 封禁│
│  SecureFin    │ s@s.com  │ suspend │ 2026-08-08 │ 查看 激活 封禁│
│  BadActor     │ b@b.com  │ banned  │ 2026-08-07 │ 查看 激活     │
├──────────────────────────────────────────────────────────────────┤
│                    分页: < 1 2 3 ... 13 >                         │
└──────────────────────────────────────────────────────────────────┘
```

**数据来源：** `GET /admin/developers?page=1&pageSize=10`

**状态标签颜色：**
- status: active --> success(绿), suspended --> warning(橙), banned --> danger(红), deleted --> info(灰)

**操作按钮逻辑：**
- status === 'active' --> [查看] [冻结] [封禁]
- status === 'suspended' --> [查看] [激活] [封禁]
- status === 'banned' --> [查看] [激活]
- status === 'deleted' --> [查看]

---

#### 4.2.3 开发者详情

```
┌──────────────────────────────────────────────────────────────────┐
│  ← 返回              开发者详情 - TechCorp Ltd                    │
├──────────────────────────────────────────────────────────────────┤
│  ┌─ 企业信息 ─────────────────────────────────────────────────┐  │
│  │ 企业名称:  TechCorp Solutions                                │  │
│  │ 信用代码:  91110108MA01XXXXX                                 │  │
│  │ 注册地:    China                                             │  │
│  │ 成立日期:  2020-01-01                                        │  │
│  │ 注册地址:  北京市朝阳区建国路100号                            │  │
│  │ 官网:      https://techcorp.com                              │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ 账号信息 ─────────────────────────────────────────────────┐  │
│  │ 邮箱:      tech@techcorp.com                                  │  │
│  │ 账号状态:  [active] 标签                                      │  │
│  │ KYB 状态:  [approved] 标签                                    │  │
│  │ 审核时间:  2026-08-10 14:00                                   │  │
│  │ 审核人:    admin@cregis.com                                   │  │
│  │ 创建时间:  2026-08-09 10:00                                   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ UBO 信息 ─────────────────────────────────────────────────┐  │
│  │ 姓名     │ 国籍     │ 持股比例  │ 职位                       │  │
│  │ 张三     │ Chinese  │ 60%       │ CEO                        │  │
│  │ 李四     │ Chinese  │ 40%       │ CTO                        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ 操作审计 ─────────────────────────────────────────────────┐  │
│  │ 操作     │ 操作人            │ 时间                │ 原因    │  │
│  │ approve  │ admin@cregis.com  │ 2026-08-10 14:00   │ -       │  │
│  │ suspend  │ admin@cregis.com  │ 2026-08-12 09:00   │ 维护    │  │
│  │ activate │ admin@cregis.com  │ 2026-08-12 11:00   │ 恢复    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [冻结] [封禁] [激活]  (根据状态动态显示)                         │
└──────────────────────────────────────────────────────────────────┘
```

**数据来源：**
- 开发者信息: `GET /admin/developers/:id`
- 审计日志: `GET /admin/developers/:id/audit`

---

### 4.3 统计分析

```
┌──────────────────────────────────────────────────────────────────┐
│  统计分析                                      [时间范围 ▾ 7天]  │
│  [API 统计] [收入统计]                                           │
├──────────────────────────────────────────────────────────────────┤
│  ┌─ API 统计 Tab ─────────────────────────────────────────────┐ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │ │
│  │  │ 今日调用  │ │ 本周调用  │ │ 本月调用  │ │ 平均响应时间  │  │ │
│  │  │ 12,580   │ │ 85,670   │ │ 358,900  │ │   88ms        │  │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │ │
│  │                                                            │ │
│  │  ┌──────────────────────┐ ┌──────────────────────────────┐ │ │
│  │  │ 响应时间趋势（折线图） │ │ 错误率趋势（折线图）         │ │ │
│  │  └──────────────────────┘ └──────────────────────────────┘ │ │
│  │                                                            │ │
│  │  ┌─ Top 应用 ───────────────────────────────────────────┐  │ │
│  │  │ 排名 │ 应用名称         │ 调用量   │ 错误率 │ 响应时间 │  │ │
│  │  │ 1   │ TechCorp Exchange│ 125,000  │ 0.02%  │ 85ms     │  │ │
│  │  │ 2   │ CryptoPay        │ 98,000   │ 0.05%  │ 92ms     │  │ │
│  │  │ 3   │ DeFi Wallet      │ 87,600   │ 0.08%  │ 105ms    │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ 收入统计 Tab ─────────────────────────────────────────────┐ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │ │
│  │  │ 今日收入  │ │ 本周收入  │ │ 本月收入  │ │ 总收入        │  │ │
│  │  │ $1,234   │ │ $8,567   │ │ $35,890  │ │ $256,780     │  │ │
│  │  │ ↑12%     │ │ ↑8%      │ │ ↑15%     │ │              │  │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │ 收入趋势（折线图 + 柱状图）                            │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                                                            │ │
│  │  ┌─ 按开发者收入 ───────────────────────────────────────┐  │ │
│  │  │ 开发者          │ 收入      │ 交易数   │ 均费        │  │ │
│  │  │ TechCorp       │ $12,500   │ 5,000    │ $2.50       │  │ │
│  │  │ GlobalPay      │ $8,900    │ 3,200    │ $2.78       │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**数据来源：**
- `GET /admin/stats/api/summary` — API 统计概要（MOCK）
- `GET /admin/stats/api/top-apps` — Top 应用（MOCK）
- `GET /admin/stats/api/response-times` — 响应时间趋势（MOCK）
- `GET /admin/stats/api/errors` — 错误率趋势（MOCK）
- `GET /admin/stats/revenue/summary` — 收入概要（MOCK）
- `GET /admin/stats/revenue/trends` — 收入趋势（MOCK）
- `GET /admin/stats/revenue/by-developer` — 按开发者收入（MOCK）

---

### 4.4 系统监控

```
┌──────────────────────────────────────────────────────────────────┐
│  系统监控                                      [自动刷新: 30s ▾] │
│  [服务状态] [资源使用] [历史记录]                                  │
├──────────────────────────────────────────────────────────────────┤
│  ┌─ 服务状态 Tab ─────────────────────────────────────────────┐ │
│  │                                                            │ │
│  │  整体状态: [● healthy]  最后检查: 2026-08-15 10:00:00      │ │
│  │  运行时间: 10d 2h 30m                                      │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │ 服务名称          │ 状态    │ 响应时间 │ 错误率 │ 详情 │  │ │
│  │  │ API Gateway      │ ● healthy│ 12ms   │ 0.01% │ →    │  │ │
│  │  │ Auth Service     │ ● healthy│ 8ms    │ 0.00% │ →    │  │ │
│  │  │ KYB Service      │ ● degrade│ 250ms  │ 2.5%  │ →    │  │ │
│  │  │ Dashboard Service│ ● healthy│ 15ms   │ 0.02% │ →    │  │ │
│  │  │ Payment Service  │ ● healthy│ 45ms   │ 0.10% │ →    │  │ │
│  │  │ Database         │ ● healthy│ 3ms    │ 0.00% │ →    │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ 资源使用 Tab ─────────────────────────────────────────────┐ │
│  │  CPU:  ████████░░░░░░░░░░░  45%                             │ │
│  │  MEM:  ██████░░░░░░░░░░░░░  35%                             │ │
│  │  DISK: ███░░░░░░░░░░░░░░░░  20%                             │ │
│  │                                                             │ │
│  │  网络: 入站 5.12 MB/s  |  出站 10.24 MB/s                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ 历史记录 Tab ─────────────────────────────────────────────┐ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │ 健康状态历史（24小时折线图）                           │  │ │
│  │  │ healthy ████████████████████████░░                    │  │ │
│  │  │ degrade ░░░░░░░░░░░░░░░███████░░░                    │  │ │
│  │  │ down    ░░░░░░░░░░░░░░░░░░░░░░░░░░                   │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**数据来源：**
- `GET /admin/health/status` — 整体健康状态（MOCK）
- `GET /admin/health/services` — 服务状态（MOCK）
- `GET /admin/health/resources` — 资源使用（MOCK）
- `GET /admin/health/history?hours=24` — 历史记录（MOCK）

---

### 4.5 系统设置

#### 4.5.1 管理员管理

```
┌──────────────────────────────────────────────────────────────────┐
│  管理员管理                                   [+ 新增管理员]      │
│  [管理员列表] [角色管理]                                          │
├──────────────────────────────────────────────────────────────────┤
│  姓名        │ 邮箱           │ 角色         │ 状态    │ 操作    │
│  Super Admin │ admin@cregis   │ super_admin  │ active  │ 编辑 删除│
│  Operator1   │ op1@cregis.com │ operator     │ active  │ 编辑 删除│
│  Viewer1     │ view@cregis.com│ viewer       │ active  │ 编辑 删除│
├──────────────────────────────────────────────────────────────────┤
│                    分页: < 1 >                                    │
└──────────────────────────────────────────────────────────────────┘
```

**新增/编辑管理员弹窗：**

```
┌──────────────────────────────────────┐
│  新增管理员                           │
├──────────────────────────────────────┤
│  邮箱:     [________________]        │
│  姓名:     [________________]        │
│  角色:     [super_admin ▾]           │
│  密码:     [________________]        │
│  确认密码: [________________]        │
│                                      │
│  [确定] [取消]                        │
└──────────────────────────────────────┘
```

**数据来源：**
- `GET /admin/admins` — 管理员列表（REAL）
- `POST /admin/admins` — 创建管理员（REAL）
- `PUT /admin/admins/:id` — 更新管理员（REAL）
- `DELETE /admin/admins/:id` — 删除管理员（REAL）

---

#### 4.5.2 系统配置

```
┌──────────────────────────────────────────────────────────────────┐
│  系统配置                                                        │
│  [系统] [安全] [通知] [计费]                                      │
├──────────────────────────────────────────────────────────────────┤
│  ┌─ 系统 Tab ─────────────────────────────────────────────────┐ │
│  │ 配置项          │ 配置值                 │ 描述      │ 操作  │ │
│  │ system.name     │ Cregis OpenPlatform    │ 系统名称  │ 编辑  │ │
│  │ system.logo_url │ https://cdn.cregis...  │ Logo URL  │ 编辑  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ 安全 Tab ─────────────────────────────────────────────────┐ │
│  │ 配置项                     │ 配置值 │ 描述              │ 操作│ │
│  │ security.login_attempts    │ 5      │ 最大登录尝试次数   │ 编辑│ │
│  │ security.session_timeout   │ 120    │ 会话超时(分钟)     │ 编辑│ │
│  │ security.mfa_required      │ false  │ 是否强制 MFA      │ 编辑│ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**数据来源：**
- `GET /admin/configs?group=system` — 系统配置列表（REAL）
- `PUT /admin/configs/:key` — 更新配置（REAL）

---

#### 4.5.3 操作日志

```
┌──────────────────────────────────────────────────────────────────┐
│  操作日志                                                        │
│  ┌─ 筛选 ────────────────────────────────────────────────────┐  │
│  │ 管理员: [全部 ▾]  操作: [全部 ▾]  资源: [全部 ▾]           │  │
│  │ 日期: [2026-08-01] 至 [2026-08-15]  [搜索] [导出]         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  时间                │ 管理员          │ 操作           │ 资源   │
│  2026-08-15 10:00   │ admin@cregis    │ ISV_KYB_APPROVE│ dev..  │
│  2026-08-15 09:30   │ op1@cregis.com  │ ADMIN_LOGIN    │ -      │
│  2026-08-15 09:00   │ admin@cregis    │ SYSTEM_CONFIG  │ sys..  │
│  2026-08-14 18:00   │ admin@cregis    │ ISV_STATUS     │ dev..  │
├──────────────────────────────────────────────────────────────────┤
│                    分页: < 1 2 3 ... 13 >                         │
└──────────────────────────────────────────────────────────────────┘
```

**数据来源：** `GET /admin/audit?page=1&pageSize=20`（REAL）

---

### 4.6 订阅管理

```
┌──────────────────────────────────────────────────────────────────┐
│  订阅管理                                                        │
│  [套餐管理] [订阅列表] [订单列表] [支付记录]                       │
├──────────────────────────────────────────────────────────────────┤
│  ┌─ 套餐管理 Tab ─────────────────────────────────────────────┐ │
│  │                                        [+ 新增套餐]         │ │
│  │ ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │ │
│  │ │ 基础版        │ │ 专业版        │ │ 企业版               │ │ │
│  │ │ $29/月        │ │ $99/月        │ │ $499/月              │ │ │
│  │ │ 10,000 调用   │ │ 100,000 调用  │ │ 1,000,000 调用       │ │ │
│  │ │ 3 个应用      │ │ 10 个应用     │ │ 50 个应用            │ │ │
│  │ │ 社区支持      │ │ 邮件支持      │ │ 优先支持             │ │ │
│  │ │ [编辑] [停用] │ │ [编辑] [停用] │ │ [编辑] [停用]        │ │ │
│  │ └──────────────┘ └──────────────┘ └──────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ 订阅列表 Tab ─────────────────────────────────────────────┐ │
│  │ 开发者         │ 套餐    │ 状态   │ 到期时间    │ 操作      │ │
│  │ TechCorp Ltd  │ 专业版  │ active │ 2026-09-01 │ 查看 取消  │ │
│  │ GlobalPay     │ 企业版  │ active │ 2026-12-01 │ 查看 取消  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ 订单列表 Tab ─────────────────────────────────────────────┐ │
│  │ 订单号          │ 开发者      │ 金额  │ 状态   │ 时间        │ │
│  │ ORD-20260815-01│ TechCorp    │ $99   │ paid   │ 2026-08-15 │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**数据来源：**
- `GET /admin/packages` — 套餐列表（REAL）
- `GET /admin/subscriptions` — 订阅列表（REAL）
- `GET /admin/orders` — 订单列表（REAL）
- `GET /admin/payments` — 支付记录（REAL）

---

### 4.7 工单管理

```
┌──────────────────────────────────────────────────────────────────┐
│  工单管理                                                        │
│  ┌─ 筛选 ────────────────────────────────────────────────────┐  │
│  │ 状态: [全部 ▾]  类型: [全部 ▾]  优先级: [全部 ▾]  [搜索]   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ 统计卡片 ────────────────────────────────────────────────┐  │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │ │ 待处理    │ │ 处理中    │ │ 已解决    │ │ 已关闭        │  │  │
│  │ │   5       │ │   12      │ │   8       │ │   3          │  │  │
│  │ └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  工单编号          │ 标题               │ 开发者   │ 状态    │ 优先级│
│  TK-20260815-001  │ API 返回500错误     │ TechCorp │ process │ high │
│  TK-20260815-002  │ 申请提升API限额     │ GlobalPay│ pending │ normal│
│  TK-20260814-001  │ 账单疑问            │ SecureFin│ resolved│ low  │
├──────────────────────────────────────────────────────────────────┤
│                    分页: < 1 2 3 >                                │
└──────────────────────────────────────────────────────────────────┘
```

**工单详情侧边栏/弹窗：**

```
┌──────────────────────────────────────────────────────────────────┐
│  工单详情 - TK-20260815-001                                      │
├──────────────────────────────────────────────────────────────────┤
│  标题:    API 调用返回 500 错误                                   │
│  开发者:  TechCorp Ltd                                            │
│  类型:    technical | 优先级: high | 状态: processing            │
│  认领人:  Operator1                                               │
│  创建时间: 2026-08-15 09:00                                       │
│                                                                  │
│  描述:                                                            │
│  在调用 /api/v1/wallet/balance 接口时，持续返回 500 错误...       │
│                                                                  │
│  ┌─ 回复历史 ─────────────────────────────────────────────────┐  │
│  │  [Developer] TechCorp - 2026-08-15 09:00                   │  │
│  │  在调用 /api/v1/wallet/balance 接口时，持续返回 500 错误... │  │
│  │                                                            │  │
│  │  [Admin] Operator1 - 2026-08-15 09:30                      │  │
│  │  请提供请求的 trace_id 以便排查                             │  │
│  │                                                            │  │
│  │  [Developer] TechCorp - 2026-08-15 09:45                   │  │
│  │  trace_id: trc_abc123def456                                │  │
│  │                                                            │  │
│  │  [Admin - 内部备注] Operator1 - 2026-08-15 09:50           │  │
│  │  已定位到数据库连接池耗尽问题，正在修复                     │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ 回复 ─────────────────────────────────────────────────────┐  │
│  │ [________________________________________________________] │  │
│  │ [ ] 内部备注（仅管理员可见）                                │  │
│  │                                          [发送回复] [关闭工单]│  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

**数据来源：**
- `GET /admin/tickets?page=1&pageSize=10` — 工单列表（REAL）
- `GET /admin/tickets/stats` — 工单统计（REAL）
- `GET /admin/tickets/:id` — 工单详情 + 回复（REAL）
- `POST /admin/tickets/:id/reply` — 回复工单（REAL）
- `POST /admin/tickets/:id/close` — 关闭工单（REAL）

---

## 五、实施优先级

| 优先级 | 模块 | 子模块 | 数据源 | 状态 |
|--------|------|--------|--------|------|
| **P0** | 开发者管理 | 注册申请（DeveloperApplication） | REAL (Prisma) | 待开发 |
| **P0** | 开发者管理 | 开发者列表（IsvDeveloper） | REAL (Prisma) | 已有基础 |
| **P0** | 开发者管理 | 开发者详情 + 审计日志 | REAL (Prisma) | 待完善 |
| **P0** | 仪表盘 | 统计卡片 + 趋势图 | MOCK (后续 REAL) | 待开发 |
| **P0** | 系统设置 | 管理员管理 | REAL (Prisma) | 已有基础 |
| **P1** | 系统设置 | 系统配置（SystemConfig） | REAL (Prisma) | 待开发 |
| **P1** | 系统设置 | 操作日志（AdminAudit） | REAL (Prisma) | 待开发 |
| **P1** | 统计分析 | API 统计 + 收入统计 | MOCK (后续 REAL) | 待开发 |
| **P1** | 系统监控 | 服务状态 + 资源使用 | MOCK (后续 REAL) | 待开发 |
| **P2** | 系统设置 | 公告管理（Announcement） | REAL (Prisma) | 待开发 |
| **P3** | 订阅管理 | 套餐 + 订阅 + 订单 + 支付 | REAL (Prisma) | 待开发 |
| **P3** | 工单管理 | 工单 + 回复 | REAL (Prisma) | 待开发 |

---

## 六、数据库模型关系图

```
DeveloperApplication ──(developerId)──> IsvDeveloper
                                            │
                      ┌─────────────────────┼─────────────────────┐
                      │                     │                     │
                 Application           Subscription            Ticket
                      │                     │                     │
                 ApiLog, Metric          Package              TicketReply
                      │
                 OauthResource

DeveloperAudit ──(developerId)──> IsvDeveloper
AdminAudit ──(adminId)──> Admin

Order ──(developerId)──> IsvDeveloper
Payment ──(orderId)──> Order

SystemConfig (独立)
Announcement (独立)
```

---

## 七、开发规范

### 7.1 命名规范

- 所有标识符使用 camelCase（变量、函数、属性、文件名）
- 数据库表名使用 snake_case
- 数据库字段名使用 snake_case，通过 `@map()` 映射到 Prisma camelCase
- API 路径使用 kebab-case（如 `/admin/developer-applications`）

### 7.2 响应格式

所有 API 响应必须包含 `code`, `message`, `trace_id` 字段。成功时 `code: 0`，`message: "success"`。

### 7.3 审计日志

所有管理员敏感操作（创建/更新/删除/审核）必须写入 `AdminAudit` 表。开发者相关操作写入 `DeveloperAudit` 表。

### 7.4 权限控制

管理员 API 需通过 `adminAuthMiddleware` 认证，敏感操作需通过 `requirePermission` 检查权限。

### 7.5 分页规范

分页参数统一使用 `page`（页码）和 `pageSize`（每页条数）。响应中返回 `list`, `total`, `page`, `pageSize`。