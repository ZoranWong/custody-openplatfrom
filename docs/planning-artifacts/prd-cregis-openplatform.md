---
stepsCompleted:
  - "step-01-init"
workflowType: "prd"
author: "zoran wang"
date: "2026-02-06"
inputDocuments:
  - "../prd-cregis-custody-2026-02-02-cn.md"
---

# 产品需求文档 (PRD) - Cregis 开放平台

**作者:** zoran wang
**日期:** 2026-02-06

## 执行摘要

Cregis 开放平台是一个面向第三方开发者 (ISV) 的企业级金融服务接入平台，类似于微信开放平台或支付宝开放平台。平台核心价值在于将 Cregis Custody 的企业级加密货币托管能力（资产保管、FundFlow 签名引擎、财务单元管理等）通过标准化的 API 和 SDK 开放给 ISV，由 ISV 为其企业用户提供金融服务。

**核心业务模式：**

```
终端企业 → ISV 服务 → SDK → API 网关 → Cregis Custody 底层
```

**平台目标：**
- 降低 ISV 接入 Cregis 能力的门槛
- 支持 ISV 为不同行业企业提供定制化金融服务
- 通过 KYB 企业认证确保合规性
- 提供 SDK Demo 支持 ISV 快速验证

## 1. 系统架构

### 1.1 分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                       标准分层架构                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              终端企业 (Enterprise)                      │   │
│  │              使用 ISV 服务开展业务                       │   │
│  └────────────────────────┬────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           三方开发者/ISV                                │   │
│  │           使用 SDK 接入能力                             │   │
│  └────────────────────────┬────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   SDK 层                                │   │
│  │         前端 SDK + 后端 SDK (5种语言)                 │   │
│  └────────────────────────┬────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   API 网关层                             │   │
│  │         认证 / 权限校验 / 请求转发 / Webhook            │   │
│  └────────────────────────┬────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Cregis Custody 底层                         │   │
│  │         企业管理 / 金库 / 签名引擎 / 链上操作           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**分层依赖关系：**

| 层级 | 依赖 | 说明 |
|------|------|------|
| 终端企业 | ISV 服务 | 使用 ISV 提供的金融服务 |
| ISV | SDK | 调用 SDK 接入 Cregis 能力 |
| SDK | API 网关 | REST API 封装 |
| API 网关 | Custody | 请求转发、权限校验 |
| Custody | 底层 | 核心金融业务 |

### 1.2 系统清单

| # | 系统 | 类型 | 说明 |
|---|------|------|------|
| 1 | 开发者门户 | 前端 Web | ISV 注册、应用管理 |
| 2 | API 网关 | 后端服务 | 认证、转发、权限校验 |
| 3 | 前端 SDK | npm 包 | iframe 嵌入式页面 |
| 4 | 后端 SDK (5个) | SDK | Go/Java/Python/Node.js/PHP |
| 5 | 管理后台 | 前端 Web | 平台运营管理 |
| 6 | SDK Demo | 前端 Web | SDK 演示验证 |

### 1.3 平台定位

Cregis 开放平台是连接 Cregis Custody 底层能力与第三方开发者的桥梁。平台本身不处理核心金融业务，仅承担身份认证、请求转发、权限校验的职责。

| 职责 | 说明 |
|------|------|
| 身份认证 | AppID/AppKey 验证、Token 管理 |
| 权限校验 | 验证 App 是否有权访问指定企业资源 |
| 请求转发 | 透传 SDK 请求到 Cregis Custody |
| 事件推送 | Webhook 通知 ISV 业务状态变更 |

### 1.4 核心数据模型

```
┌─────────────────────────────────────────────────────────────────┐
│                          数据模型                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  开发者 (Developer)                                               │
│  ├── DeveloperID: 开发者唯一标识                                 │
│  ├── DeveloperName: 开发者名称                                   │
│  ├── ContactInfo: 联系信息                                       │
│  └── CreatedAt: 注册时间                                         │
│                                                                  │
│  应用 (App)                                                      │
│  ├── AppID: 应用唯一标识                                         │
│  ├── DeveloperID: 所属开发者                                     │
│  ├── AppName: 应用名称                                           │
│  ├── AppDesc: 应用描述                                           │
│  ├── CallbackURL: Webhook 回调地址                               │
│  ├── Status: 应用状态 (active/inactive/blocked)                  │
│  └── CreatedAt: 创建时间                                         │
│                                                                  │
│  企业 (Enterprise)                                               │
│  ├── EnterpriseID: 企业唯一标识 (开放平台)                       │
│  ├── CustodyEnterpriseID: Custody 企业 ID (关联)                 │
│  ├── CustodyVaultID: 金库 ID                                    │
│  ├── KYBInfo: 企业认证信息                                       │
│  │   ├── BusinessLicense: 营业执照                               │
│  │   ├── UBOInfo: 最终受益人信息                                 │
│  │   └── CompanyStructure: 公司结构                               │
│  ├── Status: 企业状态 (pending/verified/suspended)               │
│  └── CreatedAt: 开户时间                                         │
│                                                                  │
│  授权关系 (App-Enterprise Binding)                               │
│  ├── BindingID: 授权关系唯一标识                                 │
│  ├── AppID: 关联应用                                             │
│  ├── EnterpriseID: 关联企业                                       │
│  ├── Permissions: 授权权限列表                                   │
│  ├── Status: 授权状态 (active/revoked)                          │
│  └── CreatedAt: 授权时间                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**映射规则：**

| 规则 | 说明 |
|------|------|
| 企业去重 | 相同 KYB 信息 → Custody 中同一个 EnterpriseID |
| 资源绑定 | 同一企业 + 不同 AppID → 同一个 Custody 企业资源 |
| 授权独立 | App 与 Enterprise 独立授权，可灵活组合 |

### 1.3 核心业务流程

```
┌─────────────────────────────────────────────────────────────────┐
│                         业务流程总览                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  阶段一：ISV 入驻                                                 │
│  ├── 开发者注册 (邮箱/手机)                                       │
│  ├── 开发者 KYB 认证                                              │
│  └── 创建应用 (AppID)                                             │
│                                                                  │
│  阶段二：企业开户                                                 │
│  ├── 企业通过 ISV 服务提交 KYB 信息                               │
│  ├── 开放平台验证企业 KYB                                         │
│  ├── 在 Custody 创建企业主体 + 金库                               │
│  └── 返回 EnterpriseID + CustodyEnterpriseID                      │
│                                                                  │
│  阶段三：授权绑定                                                 │
│  ├── 企业登录 Custody                                             │
│  ├── 选择授权 ISV 应用                                            │
│  └── 建立 App-Enterprise 授权关系                                 │
│                                                                  │
│  阶段四：创建财务单元                                             │
│  ├── ISV 获得授权后创建财务单元                                   │
│  ├── 配置账户类型 (Individual/Corporate/Payment)                  │
│  └── 返回 TreasuryUnitID                                          │
│                                                                  │
│  阶段五：业务调用                                                 │
│  ├── ISV 通过后端 SDK 调用 Custody 能力 (API)                     │
│  ├── 涉及用户确认的操作通过前端 SDK (iframe)                      │
│  ├── FundFlow 执行签名                                            │
│  └── Webhook 推送业务状态                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.4 API 网关设计

#### 1.4.1 请求格式规范

所有业务 API 请求使用统一的 JSON Body 格式，包含 `basic` 和 `data` 两部分：

```
{
  "basic": {
    "appid": "string",
    "enterprise_id": "string",
    "nonce": "string",
    "timestamp": "number",
    "signature": "string"
  },
  "data": {
    // 业务数据
  }
}
```

**basic 字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| appid | string | 是 | 应用唯一标识 |
| enterprise_id | string | 是 | 企业唯一标识 |
| nonce | string | 是 | 随机字符串 (防重放) |
| timestamp | number | 是 | 请求时间戳 (秒) |
| signature | string | 是 | 请求签名 |

**签名算法：**

```
signature = HMAC-SHA256(AppSecret,
  "#{appid}#{enterprise_id}#{nonce}#{timestamp}#{data_json}")
```

**请求示例 (创建支付订单)：**

```json
{
  "basic": {
    "appid": "app_abc123",
    "enterprise_id": "ent_xyz789",
    "nonce": "a1b2c3d4e5f6",
    "timestamp": 1707225600,
    "signature": "xxxxssssssssssssssss"
  },
  "data": {
    "treasury_unit_id": "tu_001",
    "order_id": "ORDER_20260206_001",
    "amount": 1000,
    "currency": "USDT",
    "recipient_address": "0x1234...",
    "memo": "payment for invoice #123"
  }
}
```

#### 1.4.2 响应格式规范

```
{
  "code": 0,
  "message": "success",
  "data": {
    // 业务响应数据
  },
  "trace_id": "string"
}
```

**响应字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| code | number | 错误码 (0=成功) |
| message | string | 状态描述 |
| data | object | 业务响应数据 |
| trace_id | string | 请求追踪 ID |

#### 1.4.3 认证流程

```
┌─────────────────────────────────────────────────────────────────┐
│                         API 认证流程                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ISV 后端                                                        │
│      │                                                          │
│      ├── 1. 使用 AppID + AppSecret 获取 AccessToken              │
│      │      POST /oauth/token                                    │
│      │                                                          │
│      └── 2. 携带 Basic 信息调用业务接口                         │
│           POST /api/v1/xxx                                       │
│               │                                                  │
│               ├── Body: { basic + data }                        │
│               │   ├── basic: {appid, enterprise_id, signature}  │
│               │   └── data: { 业务数据 }                       │
│               │                                                  │
│               ▼                                                  │
│              开放平台 API Gateway                                │
│                        │                                          │
│                        ├── 验证 Basic 信息                       │
│                        │   ├── 校验 appid 有效性                 │
│                        │   ├── 校验 enterprise_id 关联           │
│                        │   ├── 校验 timestamp (5分钟有效)       │
│                        │   ├── 校验 nonce (防重放)               │
│                        │   └── 验签 signature                    │
│                        │                                          │
│                        ├── 权限校验                             │
│                        │   └── 验证 App 是否有权访问企业         │
│                        │                                          │
│                        ├── 转发请求到 Custody                    │
│                        └── 返回结果                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 1.4.4 Token 管理

| 字段 | 说明 |
|------|------|
| AccessToken | 临时访问令牌，有效期 2 小时 |
| RefreshToken | 刷新令牌，有效期 30 天 |
| TokenType | Bearer |

### 1.5 SDK Demo 设计

**Demo 目标：** 提供可运行的 Demo 展示 SDK 的核心功能，帮助 ISV 快速理解接入方式。

**Demo 架构：**

| 类型 | 技术 | 说明 |
|------|------|------|
| 前端 Demo | React/Vue | 集成前端 SDK，展示授权/签名交互 |
| 后端 Demo | 多语言 | Go/Java/Python/Node.js/PHP，展示 API 调用 |

**Demo 场景：**

| 场景 | 说明 |
|------|------|
| 开发者入驻 | 注册、创建应用 |
| 企业开户 | 提交 KYB、创建企业 |
| 授权绑定 | 企业授权 App |
| 支付流程 | 发起支付、签名确认 |
| 归集流程 | 手动归集 |
| 签名任务 | 多签任务流程 |

## 2. SDK 能力

### 2.1 SDK 总览

| 类型 | 语言 | 包名 | 职责 |
|------|------|------|------|
| 前端 SDK | TypeScript | @cregis/openplatform-web | iframe 页面交互 (授权/签名) |
| 后端 SDK | Go | @cregis/openplatform-go | 认证 + 业务操作 + 查询 |
| 后端 SDK | Java | @cregis/openplatform-java | 认证 + 业务操作 + 查询 |
| 后端 SDK | Python | @cregis/openplatform-python | 认证 + 业务操作 + 查询 |
| 后端 SDK | Node.js | @cregis/openplatform-node | 认证 + 业务操作 + 查询 |
| 后端 SDK | PHP | @cregis/openplatform-php | 认证 + 业务操作 + 查询 |

### 2.2 前端 SDK (@cregis/openplatform-web)

前端 SDK 提供基于 iframe 的嵌入式页面交互能力，用于需要用户交互确认的场景。

**安装：**

```bash
npm install @cregis/openplatform-web
```

**初始化：**

```typescript
import { CregisWebSDK } from '@cregis/openplatform-web';

const sdk = new CregisWebSDK({
  appId: 'your-app-id',
  container: document.getElementById('cregis-container'),
  onEvent: (event) => {
    console.log('Event:', event);
  }
});
```

#### 2.2.1 功能列表

| 功能 | 页面 | 说明 |
|------|------|------|
| 企业授权 | AuthorizationPage | 企业扫码/登录 → 授权 ISV 管理财务能力 |
| 任务签名 | TaskSignaturePage | 展示签名任务数据 → 密码学签名 |
| 签名单据显示 | SignatureDisplayPage | 解析签名数据 → 展示业务信息 |

#### 2.2.2 页面通信协议

```
┌─────────────────────────────────────────────────────────────────┐
│                        页面通信协议                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  初始化请求 (ISV → SDK)                                           │
│  {                                                              │
│    action: 'open-page',                                         │
│    pageType: 'authorization',                                    │
│    params: {                                                    │
│      enterpriseId: 'xxx',                                       │
│      permissions: ['payment', 'pool', 'transfer']               │
│    }                                                            │
│  }                                                              │
│                                                                  │
│  初始化请求 (签名)                                               │
│  {                                                              │
│    action: 'open-page',                                         │
│    pageType: 'task-signature',                                  │
│    params: {                                                    │
│      taskId: 'xxx',                                             │
│      data: { /* 签名数据 */ }                                   │
│    }                                                            │
│  }                                                              │
│                                                                  │
│  页面回调 (SDK → ISV)                                           │
│  {                                                              │
│    action: 'on-result',                                         │
│    pageType: 'authorization',                                    │
│    data: {                                                      │
│      status: 'completed',                                       │
│      bindingId: 'xxx'                                           │
│    }                                                            │
│  }                                                              │
│                                                                  │
│  事件通知 (SDK → ISV)                                           │
│  {                                                              │
│    action: 'on-event',                                          │
│    eventType: 'task-signed',                                    │
│    data: {                                                      │
│      taskId: 'xxx',                                             │
│      result: 'success'                                          │
│    }                                                            │
│  }                                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 后端 SDK

后端 SDK 提供认证、业务操作和查询能力，通过 API 调用完成所有财务操作。

#### 2.3.1 认证模块

```
┌─────────────────────────────────────────────────────────────────┐
│                          认证模块流程                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  初始化                                                          │
│  const client = new CregisClient({                              │
│    appId: 'your-app-id',                                        │
│    appKey: 'your-app-secret'                                    │
│  });                                                           │
│                                                                  │
│  获取 Token                                                      │
│  const token = await client.getAccessToken();                   │
│                                                                  │
│  自动刷新 (内部处理)                                              │
│  - Token 过期前自动刷新                                           │
│  - Refresh Token 换取新 Token                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.3.2 功能列表

| 功能 | 方法 | 说明 |
|------|------|------|
| **认证** | | |
| getAccessToken() | 获取访问令牌 |
| refreshToken() | 刷新访问令牌 |
| **企业开户** | |
| createEnterprise(kybInfo) | 创建企业 + 金库 |
| getEnterprise(enterpriseId) | 查询企业信息 |
| **财务单元** | |
| createTreasuryUnit(params) | 创建财务单元 |
| listTreasuryUnits(enterpriseId) | 查询财务单元列表 |
| getTreasuryUnit(unitId) | 查询财务单元详情 |
| updateTreasuryUnit(unitId, params) | 更新财务单元配置 |
| **账户** | |
| getAccountBalance(accountId) | 查询账户余额 |
| listAccounts(unitId) | 查询单元账户列表 |
| **支付** | |
| createPaymentOrder(params) | 创建支付订单 |
| getPaymentOrder(orderId) | 查询支付订单 |
| confirmPayment(orderId) | 确认支付 (需前端签名) |
| **资金划拨** | |
| createTransfer(params) | 创建划拨任务 |
| getTransfer(transferId) | 查询划拨状态 |
| confirmTransfer(transferId) | 确认划拨 (需前端签名) |
| **归集** | |
| createManualPool(params) | 手动归集 |
| getPoolStatus(poolId) | 查询归集状态 |
| configureAutoPool(unitId, config) | 配置自动归集 |
| **签名任务** | |
| createSignatureTask(params) | 创建签名任务 |
| getSignatureTask(taskId) | 查询签名任务状态 |
| listSignatureTasks(filters) | 查询签名任务列表 |
| **查询** | |
| listTransactions(unitId, filters) | 查询交易记录 |
| getTransaction(txId) | 查询单笔交易 |
| getReconciliationReport(unitId, date) | 查询对账报告 |
| listWebhookEvents(filters) | 查询 Webhook 事件 |

### 2.4 Webhook 处理

```
┌─────────────────────────────────────────────────────────────────┐
│                        Webhook 事件处理                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  事件类型                                                         │
│  ├── task.created: 签名任务创建                                  │
│  ├── task.signed: 签名完成                                      │
│  ├── task.expired: 任务超时                                     │
│  ├── task.rejected: 签名拒绝                                    │
│  ├── payment.completed: 支付完成                                │
│  ├── pool.completed: 归集完成                                   │
│  ├── transfer.completed: 划拨完成                               │
│  └── audit.required: 审批请求                                    │
│                                                                  │
│  签名验证                                                         │
│  - 开放平台使用 AppSecret 签名                                    │
│  - SDK 提供验签方法                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 3. FundFlow 签名引擎

### 3.1 签名任务特性

| 特性 | 说明 |
|------|------|
| 多签机制 | 多人协作完成签名 |
| 异步执行 | 任务提交后异步处理 |
| 状态跟踪 | 实时查询签名进度 |
| 超时处理 | 任务超时自动取消 |
| 阈值配置 | 支持 N/M 签名阈值 |

### 3.2 签名任务状态机

```
┌─────────────────────────────────────────────────────────────────┐
│                      签名任务状态机                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  created (创建)                                                 │
│      │                                                          │
│      ├── 超时 → cancelled (已取消)                              │
│      ├── 拒绝 → rejected (已驳回)                              │
│      └── 进入签名流程                                            │
│               │                                                  │
│               ├── pending (待签名)                              │
│               │     │                                            │
│               │     └── signer1 签名 → signing (签名中)          │
│               │               │                                  │
│               │               ├── 拒绝 → rejected              │
│               │               └── 完成 → signing                │
│               │                      │                           │
│               │                      ├── 部分签名 → signing       │
│               │                      └── 达到阈值 → completed    │
│               │                                                   │
│               └── timeout → cancelled                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 签名流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        签名任务流程                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. ISV 后端创建签名任务                                         │
│     const taskId = await client.createSignatureTask({            │
│       enterpriseId: 'xxx',                                      │
│       treasuryUnitId: 'xxx',                                    │
│       operationType: 'payment',                                 │
│       signers: ['user1@email.com', 'user2@email.com'],          │
│       threshold: 2,                                             │
│       data: { ... }                                             │
│     });                                                        │
│                                                                  │
│  2. 返回 TaskID                                                  │
│                                                                  │
│  3. 前端 SDK 展示签名页面                                        │
│     sdk.openPage('task-signature', { taskId });                │
│                                                                  │
│  4. 用户在 iframe 页面完成签名                                    │
│                                                                  │
│  5. FundFlow 执行签名 (达到阈值自动完成)                        │
│                                                                  │
│  6. Webhook 推送完成通知                                        │
│     {                                                          │
│       eventType: 'task.signed',                                 │
│       taskId: 'xxx',                                           │
│       result: 'success',                                        │
│       signature: 'xxx'                                          │
│     }                                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 4. Cregis Custody 事件推送

### 4.1 事件列表

| 事件 | 说明 | 触发时机 |
|------|------|----------|
| payment.completed | 支付完成 | 链上交易确认 |
| pool.completed | 归集完成 | 资金归集到账 |
| transfer.completed | 划拨完成 | 账户间划拨完成 |
| task.created | 签名任务创建 | 新签名任务生成 |
| task.signed | 签名完成 | 多签任务完成 |
| task.expired | 任务超时 | 签名超时 |
| audit.required | 审批请求 | 需要人工审批 |
| risk.detected | 风险检测 | 风控拦截 |

### 4.2 推送流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        事件推送流程                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Cregis Custody                                                  │
│      │                                                          │
│      ├── 业务事件发生                                            │
│      ├── 构建事件消息                                            │
│      │   ├── eventType                                         │
│      │   ├── timestamp                                         │
│      │   ├── data                                              │
│      │   └── signature                                         │
│      └── 推送到开放平台 Webhook                                  │
│               │                                                  │
│               ▼                                                  │
│      开放平台                                                    │
│               │                                                  │
│               ├── 验证签名                                       │
│               ├── 路由到对应 App                                  │
│               └── POST 到 App CallbackURL                        │
│                        │                                          │
│                        ▼                                          │
│              ISV 业务系统                                         │
│                        │                                          │
│                        └── 更新业务数据                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 5. 平台管理后台

### 5.1 功能模块

| 模块 | 功能 |
|------|------|
| ISV 管理 | 开发者注册审核、应用审核 |
| 企业 KYB 审核 | 营业执照验证、UBO 信息审核 |
| 财务单元审核 | 财务单元配置审核 |
| 运营监控 | API 调用统计、异常监控 |

### 5.2 ISV 管理

| 功能 | 说明 |
|------|------|
| 开发者列表 | 查看所有开发者 |
| 开发者详情 | 查看 KYB 信息、创建的应用 |
| 应用审核 | 审核新创建的应用 |
| 应用状态管理 | 启用/禁用/封禁应用 |
| API 调用统计 | 查看应用的 API 调用量 |

### 5.3 企业 KYB 审核

| 功能 | 说明 |
|------|------|
| 企业列表 | 查看所有企业 |
| KYB 审核 | 审核营业执照、UBO 信息 |
| 审核历史 | 查看审核记录 |
| 企业状态管理 | 正常/暂停/禁用 |

### 5.4 签名审核

**注：** FundFlow 直接完成签名，无需人工审核。

## 6. 首期功能范围

### 6.1 MVP 功能列表

| 模块 | 功能 | 优先级 | 演示 |
|------|------|--------|------|
| **开放平台** | | | |
| | 开发者注册 | P0 | √ |
| | 应用创建 | P0 | √ |
| | KYB 企业认证 | P0 | √ |
| | 授权绑定 | P0 | √ |
| | API 网关 (认证 + 转发) | P0 | √ |
| | Webhook 推送 | P0 | √ |
| **前端 SDK** | | | |
| | npm 包发布 | P0 | √ |
| | 企业授权页面 | P0 | √ |
| | 签名任务页面 | P0 | √ |
| | 签名单据显示页面 | P0 | √ |
| **后端 SDK** | | | |
| | Go SDK | P0 | √ |
| | Java SDK | P0 | √ |
| | Python SDK | P0 | √ |
| | Node.js SDK | P0 | √ |
| | PHP SDK | P0 | √ |
| | 认证模块 | P0 | √ |
| | 企业开户 API | P0 | √ |
| | 财务单元 API | P0 | √ |
| | 支付订单 API | P0 | √ |
| | 资金划拨 API | P0 | √ |
| | 手动归集 API | P0 | √ |
| | 自动归集配置 API | P0 | √ |
| | 签名任务 API | P0 | √ |
| | 查询模块 | P0 | √ |
| **管理后台** | | | |
| | ISV 审核 | P1 | |
| | 企业 KYB 审核 | P1 | |
| **Custody 对接** | | P2 | 暂不 |
| **真实链上操作** | | P2 | 暂不 |

### 6.2 交付物

| 类型 | 内容 |
|------|------|
| 文档 | PRD、API 文档、SDK 使用文档 |
| 代码 | 前端 SDK、后端 SDK (5 语言)、Demo |
| 演示 | 在线 Demo 站点 |

## 7. 非功能需求

### 7.1 安全性

| 需求 | 说明 |
|------|------|
| 传输安全 | 全站 HTTPS |
| 签名验证 | 所有 Webhook 验签 |
| Token 安全 | 短期 Token + Refresh Token |
| 权限校验 | AppID + EnterpriseID 绑定校验 |

### 7.2 性能

| 需求 | 说明 |
|------|------|
| API 响应 | P99 < 500ms |
| 并发支持 | 1000 QPS |
| Token 刷新 | 自动后台刷新 |

### 7.3 可用性

| 需求 | 说明 |
|------|------|
| 可用性 | 99.9% |

## 8. 术语表

| 术语 | 说明 |
|------|------|
| ISV | 独立软件开发商 (第三方开发者) |
| KYB | Know Your Business (企业认证) |
| Treasury Unit | 财务单元 (业务组织基本单元) |
| FundFlow | Cregis 签名引擎 |
| Vault | 金库 (Custody 资产容器) |
| Board | 签名实体 (托管在 Custody) |

## 附录

### A. API 网关路由规则

| 路径 | 目标服务 | 说明 |
|------|----------|------|
| /oauth/* | 认证服务 | Token 获取/刷新 |
| /api/v1/enterprise/* | Custody | 企业管理 |
| /api/v1/treasury/* | Custody | 财务单元管理 |
| /api/v1/account/* | Custody | 账户管理 |
| /api/v1/transaction/* | Custody | 交易管理 |
| /api/v1/signature/* | FundFlow | 签名任务 |
| /api/v1/webhook/* | Webhook | 事件推送配置 |
| /api/v1/payment/* | Custody | 支付管理 |
| /api/v1/transfer/* | Custody | 划拨管理 |
| /api/v1/pool/* | Custody | 归集管理 |

### B. 错误码定义

| 错误码 | 说明 |
|--------|------|
| 40001 | 参数错误 |
| 40002 | AppID 无效 |
| 40003 | Token 无效 |
| 40004 | Token 已过期 |
| 40005 | 无权访问该企业 |
| 40006 | 企业未授权 |
| 40007 | 财务单元不存在 |
| 40008 | 签名任务不存在 |
| 50001 | 内部错误 |
| 50002 | Custody 服务不可用 |
