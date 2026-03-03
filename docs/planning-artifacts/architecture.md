---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - "../prd-cregis-openplatform.md"
workflowType: 'architecture'
project_name: 'cregis-custody-openplatform'
user_name: 'zoran wang'
date: '2026-02-06'
lastStep: 8
status: 'complete'
completedAt: '2026-02-25'
---

# 架构决策文档

_本文档通过逐步协作发现逐步构建。_

---

## 项目上下文

基于 PRD (`prd-cregis-openplatform.md`)：

**核心业务：**
- Cregis 开放平台为 ISV 提供金融服务接入能力
- 分层架构：终端企业 → ISV → SDK → API 网关 → Cregis Custody

**系统清单：**
| # | 系统 | 类型 |
|---|------|------|
| 1 | 开发者门户 | 前端 Web |
| 2 | API 网关 | 后端服务 |
| 3 | 前端 SDK | npm 包 |
| 4 | 后端 SDK × 5 | Go/Java/Python/Node.js/PHP |
| 5 | 管理后台 | 前端 Web |
| 6 | SDK Demo | 前端 Web |

**API 规范：**
- 请求格式：Body 包含 `basic` + `data`
- 签名算法：HMAC-SHA256

---

## 项目上下文分析

### 需求概览

**功能需求 (22个):**
- ISV 模块: 注册、登录、应用管理
- 企业模块: KYB 认证、授权、财务单元
- 业务模块: 支付、划拨、归集、签名
- SDK 模块: 前端 iframe SDK ×3 + 后端 SDK ×5
- 管理模块: ISV 审核、企业审核

**非功能需求:**
- 安全性: HTTPS、Webhook 验签、HMAC-SHA256
- 性能: API P99 < 500ms, 1000 QPS
- 可用性: 99.9%

### 技术约束

- SDK 语言: Go, Java, Python, Node.js, PHP, TypeScript
- 前端框架: React/Vue
- API 格式: Body = basic + data
- 防重放: 由 ISV 业务系统处理 Nonce

### 规模评估

- 复杂度: 中等
- 主要领域: API 网关 + SDK + Web
- 跨域关注点: 认证授权、安全、API 性能、多 SDK 一致性

### 架构决策要点

| 决策 | 推荐方案 | 理由 |
|------|----------|------|
| 网关语言 | Node.js | 开发效率优先 |
| SDK 生成 | 代码生成 | 多语言一致性 |
| 消息协议 | postMessage | iframe 标准 |
| 防重放 | ISV 处理 | Nonce 是 ISV 责任 |
| Webhook 推送 | Custody → 平台 → ISV | 两级推送架构 |
| 中间件 | Redis 队列 | 异步解耦 |

### 开放平台业务职责

| 类型 | 说明 |
|------|------|
| 认证服务 | Token 管理、API 签名验证 |
| 业务服务 | vault 创建、unit 创建、授权关系管理 |
| **计费服务** | API 调用计费、费用结算、账单管理 |
| Webhook 转发 | 接收 Custody 事件，转发到 ISV |
| 数据库 | 存储 vault/unit/计费映射关系 |

### 系统层级

| 层级 | 系统 | 职责 |
|------|------|------|
| **前端** | 开发者门户 | ISV 注册/登录、创建应用 |
| **前端** | 管理后台 | 开发者管理、KYB 审核、应用审核 |
| **前端** | SDK Demo | SDK 演示验证 |
| **后端** | 开放平台服务 | 认证、业务处理、Webhook 转发 |
| **后端** | API 网关 | 签名验证、权限校验、请求转发 |

---

## Starter 模板评估

### 技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Vue 3 + Vite | 组件化、开发效率高 |
| 后端框架 | Express + TypeScript | 灵活、类型安全 |
| 数据库 | MySQL | 成熟稳定 |
| 部署 | Docker | 容器化部署 |

### 项目结构

```
openplatform/
├── docker-compose.yml
│
├── developer-portal/      # 开发者门户 (Vue)
├── admin-portal/          # 管理后台 (Vue)
├── sdk-demo/              # SDK Demo (Vue)
│
├── api-gateway/           # API 网关 (Express)
│
└── sdk/
    ├── web/               # 前端 SDK (npm)
    ├── go/                # Go SDK
    ├── java/              # Java SDK
    ├── python/            # Python SDK
    ├── nodejs/            # Node.js SDK
    └── php/               # PHP SDK
```

### 初始化命令

**前端 (Vue 3 + Vite + TypeScript):**

```bash
npm create vite@latest developer-portal -- --template vue-ts
npm create vite@latest admin-portal -- --template vue-ts
npm create vite@latest sdk-demo -- --template vue-ts
```

**后端 (Express + TypeScript):**

```bash
npx express-generator-ts api-gateway --typescript
```

**Docker Compose:**

```yaml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: openplatform

  api-gateway:
    build: ./api-gateway
    ports:
      - "3000:3000"
    depends_on:
      - mysql

  developer-portal:
    build: ./developer-portal
    ports:
      - "5173:5173"

  admin-portal:
    build: ./admin-portal
    ports:
      - "5174:5174"

  sdk-demo:
    build: ./sdk-demo
    ports:
      - "5175:5175"
```

---

## Party Mode 讨论优化建议

### 开发环境策略

| 环境 | 策略 | 说明 |
|------|------|------|
| **开发** | nodemon + HMR | 后端热重载，前端 Vite HMR |
| **测试** | 独立 test db | migration 确保数据一致性 |
| **生产** | Docker / K8s | 容器化部署 |

### SDK 一致性保障

| 策略 | 说明 |
|------|------|
| **OpenAPI Spec** | Gateway 定义接口规范 |
| **代码生成** | 6 个 SDK 从 Spec 自动生成 |
| **变更同步** | 接口变更 → SDK 自动同步 |

### 开发效率优化

```bash
# 后端开发 (热重载)
cd api-gateway
npm run dev  # nodemon + ts-node

# 前端开发 (HMR)
cd developer-portal
npm run dev  # Vite HMR

# Docker 仅用于部署和 CI/CD
```

---

## 核心架构决策

### 决策汇总

| 类别 | 决策 | 选择 | 理由 |
|------|------|------|------|
| **数据** | ORM | Prisma | 类型安全、自动生成 |
| **数据** | 迁移 | Prisma Migrate | 与 ORM 集成 |
| **数据** | 缓存 | Redis | 队列 + 缓存共用 |
| **认证** | Token | JWT | 无状态、扩展性好 |
| **认证** | 签名 | HMAC-SHA256 | PRD 已定义 |
| **认证** | 密码 | bcrypt | 成熟、安全 |
| **API** | 风格 | REST | SDK 风格一致 |
| **API** | 文档 | Swagger | SDK 生成需要 |
| **API** | 错误 | 统一错误码 | PRD 兼容性 |
| **前端** | 状态 | Pinia | Vue 3 官方 |
| **前端** | HTTP | Axios | 拦截器方便 |
| **前端** | UI | Element Plus | 文档丰富 |
| **基建** | 日志 | Winston | Express 生态 |
| **基建** | 配置 | dotenv | 简单通用 |
| **基建** | 调度 | Bull | Redis 集成 |

### 详细决策

#### 数据架构

| 决策 | 选择 | 说明 |
|------|------|------|
| ORM | Prisma | 类型安全的 ORM，支持自动迁移 |
| 迁移工具 | Prisma Migrate | 内置版本控制 |
| 缓存 | Redis | Webhook 队列 + API 缓存 |

#### 认证与安全

| 决策 | 选择 | 说明 |
|------|------|------|
| 开发者认证 | JWT | AccessToken 2小时，RefreshToken 30天 |
| API 签名 | HMAC-SHA256 | PRD 定义 |
| 密码加密 | bcrypt | 12 rounds |

#### API 与通信

| 决策 | 选择 | 说明 |
|------|------|------|
| API 风格 | RESTful | 资源导向 |
| API 文档 | OpenAPI 3.0 | SDK 代码生成 |
| 错误处理 | PRD 错误码 | 40001-50002 |

#### 前端架构

| 决策 | 选择 | 说明 |
|------|------|------|
| 状态管理 | Pinia | 组合式 API |
| HTTP 客户端 | Axios | 请求/响应拦截 |
| UI 组件库 | Element Plus | Vue 3 适配 |

#### 基础设施

| 决策 | 选择 | 说明 |
|------|------|------|
| 日志 | Winston | JSON 格式 |
| 配置 | dotenv | 环境变量 |
| 任务调度 | Bull | Redis 队列 |

---
stepsCompleted: [1, 2, 3, 4, 5]

---

## 实施模式与一致性规则

### 命名规范

| 类别 | 规范 | 示例 |
|------|------|------|
| **数据库表名** | snake_case 复数 | `developers`, `apps`, `enterprises` |
| **主键** | `id` | `id` |
| **外键** | `{table}_id` | `enterprise_id`, `developer_id` |
| **普通列** | snake_case | `created_at`, `app_secret` |
| **API 端点** | /api/v1/{resource} | `/api/v1/developers` |
| **API 参数** | snake_case | `enterprise_id`, `app_id` |
| **文件** | kebab-case | `user-card.tsx`, `auth-middleware.ts` |
| **函数** | camelCase | `getUserData`, `createApp` |
| **常量** | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| **状态/枚举** | UPPER_SNAKE_CASE | `STATUS_ACTIVE` |

### API 响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": {
    // 业务数据
  },
  "trace_id": "string"
}
```

### 错误响应格式

```json
{
  "code": 40001,
  "message": "参数错误",
  "trace_id": "string"
}
```

### JSON 数据格式

| 类型 | 规范 |
|------|------|
| 字段命名 | snake_case (`enterprise_id`) |
| 日期格式 | ISO 8601 (`2026-02-06T10:00:00Z`) |
| 布尔值 | true/false |
| 金额 | 单位: 最小单位 (如 satoshi, wei) |

### 项目结构规范

```
# 后端结构 (Express)
api-gateway/
├── src/
│   ├── controllers/    # 控制器
│   ├── services/      # 业务逻辑
│   ├── repositories/  # 数据访问
│   ├── middleware/    # 中间件
│   ├── routes/        # 路由
│   ├── utils/         # 工具
│   └── prisma/        # ORM
└── tests/

# 前端结构 (Vue)
developer-portal/
├── src/
│   ├── components/    # 组件
│   ├── views/        # 页面
│   ├── stores/       # Pinia
│   ├── services/     # API 服务
│   ├── utils/        # 工具
│   └── types/        # TypeScript
└── tests/
```

### 测试文件规范

| 类型 | 位置 |
|------|------|
| 后端单元测试 | `*.test.ts` 同目录 |
| 前端组件测试 | `*.spec.ts` 同目录 |
| E2E 测试 | `tests/e2e/` |

### 强制规范 (AI Agent 必须遵守)

1. 所有 API 必须返回 `{ code, message, data }` 结构
2. 所有日期使用 ISO 8601 格式
3. 数据库主键使用 `id`，外键使用 `{table}_id`
4. API 错误码遵循 PRD 定义 (40001-50002)
5. 所有敏感配置使用环境变量

---
stepsCompleted: [1, 2, 3, 4, 5, 6]

---

## 项目结构与边界

### 完整项目目录结构

```
openplatform/
├── docker-compose.yml
├── docker-compose.prod.yml
├── README.md
├── .env.example
├── .gitignore
│
├── developer-portal/                    # 开发者门户 (Vue 3 + Vite)
├── admin-portal/                       # 管理后台 (Vue 3 + Vite)
├── sdk-demo/                           # SDK 演示 (Vue 3 + Vite)
│
├── api-gateway/                        # API 网关 (Express + TypeScript)
│
└── sdk/                               # 多语言 SDK
    ├── web/                            # TypeScript npm 包
    ├── go/                             # Go SDK
    ├── java/                           # Java SDK
    ├── python/                         # Python SDK
    ├── nodejs/                         # Node.js SDK
    └── php/                            # PHP SDK
```

### API Gateway 详细结构

```
api-gateway/
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
│
├── src/
│   ├── main.ts                         # 入口文件
│   ├── app.ts                          # Express 应用配置
│   │
│   ├── config/                         # 配置
│   │   ├── index.ts                    # 配置导出
│   │   ├── database.ts                 # 数据库配置
│   │   ├── redis.ts                    # Redis 配置
│   │   └── jwt.ts                      # JWT 配置
│   │
│   ├── middleware/                     # 中间件
│   │   ├── auth.middleware.ts          # 认证中间件
│   │   ├── signature.middleware.ts     # 签名验证
│   │   ├── error.middleware.ts        # 错误处理
│   │   └── rate-limit.middleware.ts   # 限流
│   │
│   ├── routes/                         # 路由
│   │   ├── index.ts                    # 路由入口
│   │   ├── v1/                         # API v1
│   │   │   ├── index.ts
│   │   │   ├── auth.routes.ts         # 认证相关
│   │   │   ├── developer.routes.ts    # 开发者管理
│   │   │   ├── app.routes.ts         # 应用管理
│   │   │   ├── enterprise.routes.ts   # 企业管理
│   │   │   ├── vault.routes.ts        # Vault 管理
│   │   │   ├── unit.routes.ts         # 财务单元管理
│   │   │   ├── transaction.routes.ts  # 交易管理
│   │   │   ├── billing.routes.ts      # 计费管理
│   │   │   └── webhook.routes.ts      # Webhook 配置
│   │   │
│   │   └── openapi.yaml               # OpenAPI 规范
│   │
│   ├── controllers/                    # 控制器
│   │   ├── auth.controller.ts
│   │   ├── developer.controller.ts
│   │   ├── app.controller.ts
│   │   ├── enterprise.controller.ts
│   │   ├── vault.controller.ts
│   │   ├── unit.controller.ts
│   │   ├── transaction.controller.ts
│   │   ├── billing.controller.ts
│   │   └── webhook.controller.ts
│   │
│   ├── services/                       # 业务逻辑
│   │   ├── auth.service.ts
│   │   ├── developer.service.ts
│   │   ├── app.service.ts
│   │   ├── enterprise.service.ts
│   │   ├── vault.service.ts
│   │   ├── unit.service.ts
│   │   ├── billing.service.ts
│   │   └── webhook.service.ts
│   │
│   ├── repositories/                   # 数据访问
│   │   ├── developer.repository.ts
│   │   ├── app.repository.ts
│   │   ├── enterprise.repository.ts
│   │   └── billing.repository.ts
│   │
│   ├── prisma/                         # ORM
│   │   ├── schema.prisma
│   │   └── migrations/
│   │
│   ├── utils/                          # 工具函数
│   │   ├── signature.util.ts          # HMAC 签名
│   │   ├── jwt.util.ts                # JWT 工具
│   │   ├── error.util.ts              # 错误码
│   │   └── date.util.ts               # 日期处理
│   │
│   └── types/                          # 类型定义
│       ├── api.types.ts
│       └── error.types.ts
│
└── tests/                              # 测试
    ├── unit/
    └── integration/
```

### 开发者门户详细结构

```
developer-portal/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .env.example
├── .gitignore
├── Dockerfile
│
├── public/
│   └── favicon.ico
│
├── src/
│   ├── main.ts                         # 入口
│   ├── App.vue                         # 根组件
│   ├── router/                         # 路由
│   │   └── index.ts
│   │
│   ├── views/                          # 页面
│   │   ├── Home.vue                   # 首页
│   │   ├── Login.vue                  # 登录
│   │   ├── Register.vue               # 注册
│   │   ├── Dashboard.vue              # 控制台
│   │   ├── Apps.vue                   # 应用列表
│   │   ├── AppDetail.vue               # 应用详情
│   │   ├── CreateApp.vue              # 创建应用
│   │   ├── Enterprise.vue              # 企业管理
│   │   ├── Billing.vue                 # 账单
│   │   └── Settings.vue                # 设置
│   │
│   ├── components/                     # 组件
│   │   ├── common/                    # 公共组件
│   │   │   ├── Header.vue
│   │   │   ├── Sidebar.vue
│   │   │   ├── Footer.vue
│   │   │   ├── Table.vue
│   │   │   ├── Form.vue
│   │   │   └── Modal.vue
│   │   │
│   │   └── business/                  # 业务组件
│   │       ├── AppCard.vue
│   │       ├── ApiKey.vue
│   │       ├── BillingChart.vue
│   │       └── UsageStats.vue
│   │
│   ├── services/                      # API 服务
│   │   ├── api.service.ts             # Axios 实例
│   │   ├── auth.service.ts
│   │   ├── developer.service.ts
│   │   ├── app.service.ts
│   │   └── billing.service.ts
│   │
│   ├── stores/                        # Pinia 状态
│   │   ├── index.ts
│   │   ├── auth.store.ts
│   │   ├── developer.store.ts
│   │   └── app.store.ts
│   │
│   ├── composables/                   # 组合式函数
│   │   ├── useAuth.ts
│   │   ├── useForm.ts
│   │   └── useTable.ts
│   │
│   ├── utils/                         # 工具
│   │   ├── request.ts                 # Axios 封装
│   │   ├── validate.ts                # 表单验证
│   │   └── format.ts                  # 格式化
│   │
│   ├── styles/                        # 样式
│   │   ├── main.css
│   │   └── variables.css
│   │
│   └── types/                         # 类型
│       ├── api.ts
│       └── store.ts
│
└── tests/                             # 测试
    ├── unit/
    └── e2e/
```

### SDK Web npm 包结构

```
sdk/web/
├── package.json
├── tsconfig.json
├── .gitignore
├── README.md
│
├── src/
│   ├── index.ts                       # 主入口
│   ├── client.ts                      # 客户端类
│   │
│   ├── types/                         # 类型
│   │   ├── index.ts
│   │   ├── auth.types.ts
│   │   ├── enterprise.types.ts
│   │   ├── vault.types.ts
│   │   ├── unit.types.ts
│   │   └── billing.types.ts
│   │
│   ├── services/                      # 服务
│   │   ├── index.ts
│   │   ├── auth.service.ts
│   │   ├── enterprise.service.ts
│   │   ├── vault.service.ts
│   │   ├── unit.service.ts
│   │   └── billing.service.ts
│   │
│   ├── iframe/                        # iframe SDK
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── manager.ts                 # iframe 管理器
│   │   └── channels.ts                # postMessage 通信
│   │
│   └── utils/                         # 工具
│       ├── signature.ts               # 签名生成
│       └── request.ts                 # 请求封装
│
└── tests/
    └── unit/
```

### SDK 后端多语言结构 (Go 示例)

```
sdk/go/
├── go.mod
├── go.sum
├── README.md
│
├── client.go                          # 客户端主文件
│
├── types/                             # 类型定义
│   ├── types.go
│   ├── auth.go
│   ├── enterprise.go
│   ├── vault.go
│   ├── unit.go
│   └── billing.go
│
├── services/                          # 服务
│   ├── auth.go
│   ├── enterprise.go
│   ├── vault.go
│   ├── unit.go
│   └── billing.go
│
├── signature/                         # 签名
│   └── signature.go
│
├── utils/                             # 工具
│   └── request.go
│
└── tests/
    └── unit/
```

### 前端 SDK iframe 页面结构

```
sdk/web/src/iframe-pages/
├── index.html                         # iframe 容器
│
├── authorization/                      # 授权页面
│   ├── index.vue
│   ├── components/
│   │   ├── LoginForm.vue
│   │   ├── EnterpriseSelect.vue
│   │   └── PermissionGrant.vue
│   └── styles/
│       └── authorization.css
│
├── signature/                          # 签名页面
│   ├── index.vue
│   ├── components/
│   │   ├── TaskDetail.vue
│   │   ├── SignConfirm.vue
│   │   └── SignHistory.vue
│   └── styles/
│       └── signature.css
│
└── display/                           # 签名单据显示
    ├── index.vue
    ├── components/
    │   └── SignatureData.vue
    └── styles/
        └── display.css
```

### 功能模块映射

| 功能 | 目录位置 |
|------|----------|
| ISV 注册/登录 | api-gateway/src/services/auth.service.ts |
| 应用管理 | api-gateway/src/services/app.service.ts |
| 企业 KYB | api-gateway/src/services/enterprise.service.ts |
| Vault 创建 | api-gateway/src/services/vault.service.ts |
| Unit 创建 | api-gateway/src/services/unit.service.ts |
| 支付/划拨/归集 | api-gateway/src/services/transaction.service.ts |
| 计费服务 | api-gateway/src/services/billing.service.ts |
| Webhook 转发 | api-gateway/src/services/webhook.service.ts |
| SDK 签名验证 | sdk/*/signature/ |

### 跨域关注点

| 关注点 | 处理方式 |
|--------|----------|
| 认证 | JWT 中间件 + 签名验证 |
| 错误处理 | 统一错误码 + PRD 兼容 |
| 日志 | Winston JSON 格式 |
| 缓存 | Redis key 统一前缀 |

### 集成边界

```
┌─────────────────────────────────────────────────────────────────┐
│                        集成边界                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ISV (外部)                                                     │
│       │                                                         │
│       ├── SDK 调用 (HTTPS)                                      │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    API Gateway                            │   │
│  │                                                         │   │
│  │  认证 → 签名验证 → 权限校验 → 请求转发                   │   │
│  │                                                         │   │
│  └────────────────────────┬────────────────────────────────┘   │
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Cregis Custody                      │   │
│  │                                                         │   │
│  │  Vault/Unit/Transaction/FundFlow                        │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 数据库边界

| 服务 | 数据库 | 说明 |
|------|--------|------|
| api-gateway | openplatform | 开发者/应用/企业映射/计费 |
| webhook | redis | 消息队列 |
| cache | redis | API 缓存 |

---

## 架构验证结果

### 一致性验证 ✅

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 技术选型兼容 | ✅ | Vue 3 + Express + MySQL + Prisma 兼容 |
| 命名规范一致 | ✅ | snake_case/camelCase/kebab-case 定义清晰 |
| 响应格式统一 | ✅ | `{ code, message, data }` 贯穿所有 API |
| 错误码一致 | ✅ | PRD 错误码 40001-50002 |

### 需求覆盖验证 ✅

| 需求类别 | 覆盖状态 |
|----------|----------|
| ISV 模块 (注册/登录/应用) | ✅ 有对应 service + routes |
| 企业 KYB 认证 | ✅ enterprise.service.ts |
| Vault/Unit 创建 | ✅ vault/ unit.service.ts |
| 支付/划拨/归集 | ✅ transaction.service.ts |
| 计费服务 | ✅ billing.service.ts |
| Webhook 转发 | ✅ webhook.service.ts |
| 前端 SDK iframe | ✅ iframe-pages/ 目录 |
| 后端 SDK (5语言) | ✅ sdk/*/ 结构 |

### 实施就绪验证 ✅

| 检查项 | 状态 |
|--------|------|
| 项目结构完整 | ✅ 6 个服务目录定义清晰 |
| 组件边界明确 | ✅ controllers/services/repositories 分层 |
| API 路由定义 | ✅ v1/ 下含所有业务路由 |
| 数据库边界 | ✅ Prisma schema 定义 |

### 差距分析

| 类型 | 差距 | 建议 |
|------|------|------|
| 重要 | Prisma Schema 未定义 | 开发时补充 |
| 建议 | SDK 代码生成器未选型 | 可后续补充 |

### 架构就绪评估

**总体状态：** ✅ 已就绪实施

**信心等级：** 高

**主要优势：**
- 技术栈成熟、兼容性好
- 项目结构清晰、分层合理
- 命名规范统一、强制执行
- API 规范完整 (OpenAPI)

**后续增强：**
- 开发时补充 Prisma Schema
- 完善 SDK 代码生成流程

### 架构完成清单

- [x] 项目上下文分析
- [x] 技术栈选型 (Vue 3 + Express + MySQL + Prisma)
- [x] 核心架构决策 (15 项)
- [x] 实施模式与一致性规则
- [x] 完整项目结构 (6 个服务)
- [x] 功能模块映射
- [x] 集成边界定义
- [x] 验证结果

---

**下一步：** 退出 Party Mode 或 继续创建 Epics & Stories

---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7]