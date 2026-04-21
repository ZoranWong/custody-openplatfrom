---
title: 'Application Callback Webhook 推送功能'
slug: 'application-callback-webhook'
created: '2026-04-20'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - TypeScript
  - Express
  - Prisma
  - MySQL
  - Axios (HTTP Client)
  - crypto (HMAC-SHA256)
files_to_modify:
  - openplatform-api-service/prisma/schema.prisma
  - openplatform-api-service/src/types/isv.types.ts
  - openplatform-api-service/src/services/application-callback.service.ts
  - openplatform-api-service/src/services/isv-user.service.ts
  - openplatform-api-service/src/controllers/authorization.controller.ts
  - openplatform-api-service/src/controllers/developer.controller.ts
  - openplatform-api-service/src/routes/v1/isv.routes.ts
code_patterns:
  - Service Factory Pattern (createXxxService)
  - Repository Pattern (getXxxRepository)
  - Object-based Service (export const xxxService = { ... })
  - HMAC-SHA256 签名
  - 指数退避重试 (1s, 5s, 30s)
test_patterns:
  - Vitest 单元测试
  - Mock HTTP Client
  - Service 注入模式
---

# Tech-Spec: Application Callback Webhook 推送功能

**Created:** 2026-04-20 | **Status:** Review

---

## Overview

### Problem Statement

开发者需要在授权、交易、任务审核发生时接收实时通知。当前系统缺少应用级回调推送机制，无法主动通知开发者业务状态变化。

### Solution

在 Application 表添加 `callbackUrl` 字段，当授权创建/撤销/过期、交易状态变更、任务审核完成时，通过 HTTP POST 推送事件到开发者的回调地址，使用 HMAC-SHA256(appSecret) 签名验证。

### Scope

**In Scope:**
- 删除: 移除 Webhook 表及相关代码（webhook.service.ts, webhook controller, routes）
- Prisma Schema: Application 表增加 callbackUrl 字段
- ApplicationCallbackService: 回调推送服务（签名、发送、重试）
- 授权事件触发点（authorization.created/revoked/expired）
- 交易事件触发点（transaction.submitted/confirming/completed/failed）
- 任务审核事件触发点（task.approved/rejected）

**Out of Scope:**
- 独立 Webhook 表（删除）
- Webhook 管理 API（删除）
- 邮件/SMS 推送
- 回调回执确认机制

---

## Context for Development

### 需要删除的文件

| 文件 | 说明 |
|------|------|
| `prisma/schema.prisma` 中的 `model Webhook` | 删除 Webhook 模型 |
| `src/services/webhook.service.ts` | 删除 WebhookService |
| `src/services/webhook-handlers/` | 删除整个目录 |
| `src/controllers/webhook-config.controller.ts` | 删除 |
| `src/routes/v1/webhook-config.routes.ts` | 删除 |
| `src/middleware/webhook.middleware.ts` | 删除 |
| `src/types/webhook.types.ts` | 删除 |
| `tests/unit/webhook.service.test.ts` | 删除测试 |

### Codebase Patterns

**1. Service 创建模式**
```typescript
export function createCallbackService(
  httpClient?: HttpClient
): ApplicationCallbackService {
  return {
    pushEvent: async (appId, event, data) => { ... }
  }
}
export const applicationCallbackService = createCallbackService()
```

**2. HMAC-SHA256 签名模式**
```typescript
import crypto from 'crypto'

function buildSignature(secret: string, appId: string, event: string, timestamp: string): string {
  const signData = `${appId}.${event}.${timestamp}`
  return crypto
    .createHmac('sha256', secret)
    .update(signData)
    .digest('hex')
}
```

**3. 重试配置模式**
```typescript
const CALLBACK_CONFIG = {
  maxRetries: 3,
  retryDelays: [0, 1000, 5000, 30000], // 0s, 1s, 5s, 30s
  timeout: 30000
}
```

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `prisma/schema.prisma:60-90` | Application 模型结构 |
| `src/types/isv.types.ts` | Application 接口定义 |
| `src/services/http-client.service.ts` | HTTP 客户端实现 |
| `src/repositories/repository.factory.ts` | Repository 获取工厂 |
| `src/services/isv-user.service.ts` | Application CRUD 服务模式 |
| `src/controllers/authorization.controller.ts` | 授权控制器（触发点） |
| `src/repositories/implementations/application.repository.ts` | 应用数据访问 |

### Technical Decisions

| 决策 | 选择 | 理由 |
|------|------|------|
| 存储 | Application 表加 callbackUrl | 简单 1:1 关系 |
| 签名算法 | HMAC-SHA256 | 安全性高，业界标准 |
| 签名密钥 | 复用 appSecret | 简化集成，无需额外配置 |
| 签名内容 | appId + "." + event + "." + timestamp | 固定字段，无 JSON 顺序依赖 |
| 重试策略 | 3 次指数退避 | 平衡可靠性与资源消耗 |
| 重试延迟 | 0s, 1s, 5s, 30s | 指数退避模式 |
| HTTP Client | Axios (已有 http-client.service.ts) | 支持超时、重试、拦截器 |
| 触发模式 | 同步触发，失败异步重试 | 不阻塞主流程 |
| 事件订阅 | 无需订阅，所有事件推送 | 简单，所有事件都推送到 callbackUrl |

### Events

| 类别 | 事件 | 说明 | 触发位置 |
|------|------|------|----------|
| 授权 | authorization.created | 授权创建 | authorization.controller.ts |
| | authorization.revoked | 授权撤销 | authorization.controller.ts |
| | authorization.expired | 授权过期 | 定时任务/Scheduler |
| 交易 | transaction.submitted | 已提交 | 待确认 |
| | transaction.confirming | 确认中 | 待确认 |
| | transaction.completed | 交易完成 | 待确认 |
| | transaction.failed | 交易失败 | 待确认 |
| 任务 | task.approved | 审核通过 | 待确认 |
| | task.rejected | 审核拒绝 | 待确认 |

### Callback Payload Format

```json
// Request Body
{
  "appId": "app_xxx",
  "event": "transaction.completed",
  "timestamp": "1745220600000",
  "data": {
    "transactionId": "tx_123",
    "amount": "100.00",
    "currency": "USDT"
  }
}

// Headers
X-Timestamp: 1745220600000
X-Signature: sha256=xxxxxxxxxxxxxx
X-Event: transaction.completed
Content-Type: application/json
```

### Signature Verification

```
signData = appId + "." + event + "." + timestamp

例: "app_xxx.transaction.completed.1745220600000"

signature = HMAC-SHA256(appSecret, signData)
```

**开发者端验证伪代码:**
```javascript
const crypto = require('crypto')
const signData = `${appId}.${event}.${timestamp}`
const expectedSig = crypto
  .createHmac('sha256', appSecret)
  .update(signData)
  .digest('hex')

// X-Signature = "sha256=xxxx" 格式，需去掉前缀
const receivedSig = ctx.headers['x-signature'].replace('sha256=', '')
if (receivedSig !== expectedSig) return 401
```

### Retry Strategy

| 重试次数 | 延迟 | 总等待 |
|----------|------|--------|
| 第 1 次 | 0 秒（首次立即） | 0s |
| 第 2 次 | 1 秒 | 1s |
| 第 3 次 | 5 秒 | 6s |
| 第 4 次 | 30 秒 | 36s |

---

## Implementation Plan

### Task 0: 删除 Webhook 相关代码

- **删除 Prisma Schema 中的 Webhook 模型** `prisma/schema.prisma`
  - 删除 `model Webhook { ... }` (lines ~125-147)
  - 删除 Application 中的 `webhooks Webhook[]` 关系

- **删除 WebhookService** `src/services/webhook.service.ts`
  - 整个文件删除

- **删除 Webhook Handlers 目录** `src/services/webhook-handlers/`
  - 删除整个目录

- **删除 Webhook Controller** `src/controllers/webhook-config.controller.ts`
  - 整个文件删除

- **删除 Webhook Routes** `src/routes/v1/webhook-config.routes.ts`
  - 整个文件删除

- **删除 Webhook Middleware** `src/middleware/webhook.middleware.ts`
  - 整个文件删除

- **删除 Webhook Types** `src/types/webhook.types.ts`
  - 整个文件删除

- **删除 Webhook Tests** `tests/unit/webhook.service.test.ts`
  - 整个文件删除

- **更新路由入口** `src/routes/v1/index.ts`
  - 移除 webhook-config.routes 的导入和注册

### Task 1: Prisma Schema 修改

- **文件:** `openplatform-api-service/prisma/schema.prisma`
- **位置:** Application 模型 (line ~76)
- **操作:** 在 `status String @default("active")` 后添加:
  ```prisma
  /// 回调 URL（用于推送事件通知）
  callbackUrl String? @map("callback_url")
  ```
- **执行:** `npx prisma migrate dev --name add-application-callback-url`

### Task 2: 类型定义更新

- **文件:** `openplatform-api-service/src/types/isv.types.ts`
- **操作:** 在 `Application` 接口添加:
  ```typescript
  callbackUrl?: string
  ```

### Task 3: 创建 ApplicationCallbackService

- **文件:** `openplatform-api-service/src/services/application-callback.service.ts`
- **功能:**
  ```typescript
  // 推送事件
  async pushEvent(params: {
    appId: string
    event: CallbackEventType
    data: Record<string, unknown>
  }): Promise<{ success: boolean; error?: string }>

  // 内部方法
  private buildSignature(appSecret: string, appId: string, event: string, timestamp: string): string
  private async sendWithRetry(url: string, payload: CallbackPayload, appSecret: string): Promise<void>
  private validateHttps(url: string): boolean
  ```
- **依赖:**
  - `http-client.service.ts` - HTTP 请求
  - `prisma` - 获取 Application 的 callbackUrl 和 appSecret
  - `crypto` - HMAC-SHA256

### Task 4: 授权事件触发点

- **文件:** `openplatform-api-service/src/controllers/authorization.controller.ts`
- **操作:**
  - 引入 `applicationCallbackService`
  - 在 `createAuthorization` 成功处添加:
    ```typescript
    // 异步推送，不阻塞主流程
    applicationCallbackService.pushEvent({
      appId: authorization.appId,
      event: 'authorization.created',
      data: {
        authorizationId: authorization.id,
        resourceKey: authorization.resourceKey,
        expiresAt: authorization.expiresAt
      }
    }).catch(err => logger.error('Callback push failed:', err))
    ```
  - 在 `revokeAuthorization` 成功处添加: `event: 'authorization.revoked'`
  - 在授权过期检查中触发: `event: 'authorization.expired'`

### Task 5: 交易事件触发点

- **文件:** 待确认（需搜索 transaction 相关控制器）
- **操作:** 在交易状态变更处调用 `applicationCallbackService.pushEvent()`
- **事件映射:**
  - 创建交易 → `transaction.submitted`
  - 开始确认 → `transaction.confirming`
  - 确认完成 → `transaction.completed`
  - 确认失败 → `transaction.failed`

### Task 6: 任务审核事件触发点

- **文件:** 待确认（需搜索 task/approval 相关控制器）
- **操作:** 在任务审核完成处调用 `applicationCallbackService.pushEvent()`
- **事件:**
  - 审核通过 → `task.approved`
  - 审核拒绝 → `task.rejected`

### Task 7: Application CRUD 更新

- **文件:** `openplatform-api-service/src/services/isv-user.service.ts`
- **操作:**
  - `createApplication` 增加 `callbackUrl` 参数处理
  - `updateApplication` 增加 `callbackUrl` 更新支持

### Task 8: 单元测试

- **文件:** `openplatform-api-service/tests/unit/application-callback.service.test.ts`
- **测试用例:**
  1. `buildSignature` - 验证 HMAC-SHA256 结果
  2. `pushEvent` - 验证 HTTP POST 调用
  3. `pushEvent` with retry - 验证失败重试逻辑
  4. `validateHttps` - 验证非 HTTPS URL 被拒绝

---

## Acceptance Criteria

### AC0: 删除 Webhook 代码
- **Given:** 项目中有 Webhook 相关代码
- **When:** 开始开发
- **Then:** 删除所有 webhook 相关文件，代码编译通过

### AC1: Callback URL 配置
- **Given:** ISV 开发者在创建应用时提供了 callbackUrl
- **When:** 应用创建成功
- **Then:** callbackUrl 存储到 Application 表，Prisma migrate 成功

### AC2: 授权事件推送 - Created
- **Given:** 用户完成授权
- **When:** OauthResource 创建成功
- **Then:** HTTP POST 推送到 callbackUrl，event=authorization.created，包含 authorizationId 和 resourceKey

### AC3: 授权事件推送 - Revoked
- **Given:** 管理员撤销授权
- **When:** 授权状态更新为 revoked
- **Then:** 推送 event=authorization.revoked 到 callbackUrl

### AC4: 授权事件推送 - Expired
- **Given:** 授权过期时间到达
- **When:** 定时任务检测到过期授权
- **Then:** 推送 event=authorization.expired 到 callbackUrl

### AC5: 交易状态推送
- **Given:** 交易状态变更为 submitted/confirming/completed/failed
- **When:** 交易状态更新成功
- **Then:** 推送对应 event 到 callbackUrl，包含 transactionId, amount, currency

### AC6: 任务审核推送
- **Given:** 任务审核完成（通过或拒绝）
- **When:** 审核结果记录成功
- **Then:** 推送 task.approved 或 task.rejected 到 callbackUrl

### AC7: 签名生成正确
- **Given:** pushEvent 被调用
- **When:** 生成 X-Signature header
- **Then:** 使用 HMAC-SHA256(appSecret, appId.event.timestamp)，格式为 sha256=xxxx

### AC8: 重试机制
- **Given:** callbackUrl 返回非 200 状态码
- **When:** 推送失败
- **Then:** 在 0s, 1s, 5s, 30s 后重试，共 4 次

### AC9: 重试失败处理
- **Given:** 4 次重试后仍然失败
- **When:** -
- **Then:** 记录错误日志到文件，不阻塞主业务流程

### AC10: HTTPS 验证
- **Given:** callbackUrl 不是以 https:// 开头
- **When:** 尝试推送
- **Then:** 跳过推送，记录警告日志 "Callback URL must use HTTPS"

### AC11: 无 callbackUrl 跳过
- **Given:** Application 没有配置 callbackUrl
- **When:** 事件触发
- **Then:** 不执行 HTTP 请求，直接返回 (跳过)

---

## Additional Context

### Dependencies

| 依赖 | 来源 | 用途 |
|------|------|------|
| Prisma ORM | 已有 | 数据库操作 |
| crypto | Node.js 内置 | HMAC-SHA256 签名 |
| http-client.service.ts | 已有 | HTTP POST 请求 |
| prisma client | 已有 | 获取 Application 数据 |

### Testing Strategy

1. **单元测试 (Vitest)**
   - `application-callback.service.test.ts`
   - 覆盖: 签名生成、重试逻辑、HTTPS 验证

2. **Mock HTTP**
   - 使用 nock 模拟 callbackUrl 响应
   - 测试成功/失败场景

3. **Manual Testing**
   - 配置 test app 的 callbackUrl 到 ngrok/本地服务
   - 触发授权/交易事件，验证 HTTP 推送

### Notes

1. **安全要求**: callbackUrl 必须 HTTPS，否则跳过并记录警告
2. **非阻塞**: 推送失败不影响主业务流程（异步重试）
3. **幂等性**: 开发者端应根据 event + timestamp 做幂等处理
4. **超时**: HTTP 请求超时 30 秒
5. **日志**: 所有推送尝试和结果记录到日志文件
6. **简化**: 无需事件订阅配置，所有事件都推送到 callbackUrl

### 风险与限制

1. **回调服务器宕机**: 最多重试 4 次后放弃，开发者可能丢失事件
   - 缓解: 考虑后续增加持久化重试队列
2. **开发者服务器响应慢**: 可能触发超时
   - 缓解: 超时 30 秒，不等待完整响应
3. **网络问题**: 推送失败不重试网络层错误（DNS 等）
   - 缓解: HTTP 客户端已有超时配置

### Future Considerations (Out of Scope)

- 事件订阅配置（选择性推送）
- 邮件/SMS 备用通知
- 回调回执确认机制
- 推送历史查看 UI