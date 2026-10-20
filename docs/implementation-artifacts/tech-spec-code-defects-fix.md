---
title: '代码缺陷修复 D1-D14'
slug: 'code-defects-fix'
created: '2026-10-20'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Node.js', 'Express', 'Prisma', 'axios', 'TypeScript']
files_to_modify:
  - 'src/controllers/thirdparty/thirdparty.controller.ts (D1)'
  - 'src/services/resource-authorization.service.ts (D2)'
  - 'src/routes/v1/isv.routes.ts (D4)'
  - 'src/middleware/resource-validation.middleware.ts (D5)'
  - 'src/middleware/rate-limit.middleware.ts (D6, D11)'
  - 'src/config/rate-limit-rules.ts (D11)'
  - 'src/services/api-log.service.ts (D7)'
  - 'src/controllers/thirdparty/forward.controller.ts (D10)'
  - 'src/services/application-callback.service.ts (D8, D14)'
code_patterns:
  - 'Express middleware: (req, res, next) => {}'
  - 'Repository pattern: getXxxRepository()'
  - 'Prisma atomic operations'
  - 'axios.create with validateStatus'
test_patterns:
  - 'Unit tests per service file'
  - 'Integration tests for route endpoints'
---

# 代码缺陷修复 D1-D14

## 概述

**来源：** `docs/code-defects-from-doc-review.md` — 文档评审时发现 14 个代码缺陷。

**当前状态：** 原始 WIP 规格（API 日志 + 配额）已实现。缺陷待修。

**范围：** D1, D2, D4, D5, D6, D7, D8, D9(前端), D10, D11, D12(前端), D14

**范围外：** D3(已移除), D13(已废弃)

## 修复优先级

| 优先级 | 缺陷 | 严重度 | 修复方案 |
|--------|------|--------|---------|
| P0 | D2 | 高(越权) | `resource-authorization.service.ts` 查询后比对 appId |
| P0 | D4 | 高(凭证泄露) | `isv.routes.ts` 详情接口剥离 appSecret |
| P0 | D14 | 高(回调丢失) | `application-callback.service.ts` 加 `validateStatus: () => true` |
| P1 | D1 | 高(授权不可用) | `thirdparty.controller.ts` permissions 改为逗号拼接，授权页兼容 JSON |
| P1 | D10 | 低(响应不统一) | `forward.controller.ts` fail() 附加 trace_id |
| P1 | D5 | 中(错误语义) | `resource-validation.middleware.ts` 用专用错误码 |
| P1 | D6 | 中(限流恒为basic) | `rate-limit.middleware.ts` 实现按订阅查询 tier |
| P1 | D7 | 中(traceId未落库) | `api-log.service.ts` 增加 traceId 参数和写入 |
| P2 | D8 | 低(重试间隔不可达) | 调整 retryDelays 或 maxRetries |
| P2 | D11 | 低(CIDR不生效) | `rate-limit-rules.ts` 用 ipaddr.js 或展开为精确匹配 |
| P2 | D12 | 低(state未回传) | 前端 App.vue 授权成功后 postMessage state |

## 实施任务

### 前置确认（实现前必须验证）

- [ ] Confirm 1: `subscriptions` 表是否有 `tier` 或等效字段？（影响 Task 7 D6）
- [ ] Confirm 2: `api_logs` 表是否已有 `trace_id` 列？（影响 Task 5 D7）
- [ ] Confirm 3: `resource-authorization.service.ts` 是否有 `logAuthorizationFailure` 函数？（影响 Task 1 D2）
- [ ] Confirm 4: `business-codes.enum.ts` 中 `AUTH_APP_NOT_ACTIVE = 40106` 是否已有？（影响 Task 6 D5）

### P0 任务（安全/可靠性 — 优先修复）

- [ ] Task 1: D2 — 授权校验比对 appId 归属
  - 文件：`src/services/resource-authorization.service.ts:55-70`
  - 动作：在 `const oauthResource = await repo.findById(authorizationId)` 之后，立即比对 `oauthResource.appId !== appId`，不匹配则记录审计日志并返回 `{ authorized: false, errorCode: 'RESOURCE_NOT_AUTHORIZED', errorMessage: '...' }`
  - 注意：缓存 key 已含 `appId`（`cache.get(appId, authorizationId)`），比对失败时需清除该缓存项
  - 测试：新增用例 — 应用 A 使用应用 B 的 authorizationId 调用，期望返回 40301

- [ ] Task 2: D4 — 应用详情接口剥离 appSecret
  - 文件：`src/routes/v1/isv.routes.ts:150-165`
  - 动作：返回应用详情前执行 `const { appSecret: _secret, ...safe } = app`，返回 `safe`。同时全局搜索所有 `app.json({.*application.*})` 模式，确保一致性
  - 搜索命令：`grep -rn 'appSecret.*res.json\|res.json.*appSecret\|application: app' src/`
  - 注意：若需展示，改为返回 `appSecretMasked`（如 `sk_mo4b***`）
  - 测试：详情接口响应断言不含 `appSecret`

- [ ] Task 3: D14 + D8 — 回调 HTTP 429/5xx 重试 + 重试间隔
  - 文件：`src/services/application-callback.service.ts:61-75, 296-306`
  - 动作：
    1. `axios.create()` 中添加 `validateStatus: () => true`
    2. 成功判定保留 `response.status >= 200 && response.status < 300`
    3. `retryable` 判断：`response.status === 429 || response.status >= 500`
    4. 将 `maxRetries` 从 3 改为 4，`retryDelays` 改为 `[0, 1000, 5000, 30000]`
  - 注意：D14 和 D8 必须同 PR，否则重试行为不完整
  - 测试：mock 429/500/503 断言重试 4 次；mock 400/404 断言不重试；断言 sleep 序列 0/1s/5s/30s

### P1 任务（功能修复）

- [ ] Task 4: D1 — permissions 序列化兼容
  - 文件：`src/controllers/thirdparty/thirdparty.controller.ts:180-190` + `openplatform-web/auth-page/src/App.vue:241`
  - 动作：网关侧 `params.set('permissions', businessData.permissions.join(','))`；前端侧兼容 JSON：
    ```ts
    const raw = urlParams.get('permissions') || '';
    const parsed = raw.startsWith('[') ? JSON.parse(raw) : raw.split(',').filter(Boolean);
    ```
  - 测试：`authorizeUrl` 单测断言 URL 中 `permissions=read,write`；授权页单测覆盖两种格式

- [ ] Task 5: D7 + D10 — traceId 落库 + 网关错误响应统一
  - 文件：`src/services/api-log.service.ts:8-46` + `src/controllers/thirdparty/forward.controller.ts:26-56, 127-131`
  - 动作：
    1. `ApiLogEntry` 接口增加 `traceId?: string`
    2. `createApiLog` 写入时包含 `traceId`
    3. `forward.controller.ts` 的 `LogContext` 增加 `traceId` 字段
    4. `fail()` 函数附加 `trace_id` 和 `data: null`
  - 测试：调用后按 traceId 查询返回记录；错误响应含 `trace_id`

- [ ] Task 6: D5 — 应用未激活错误码
  - 文件：`src/middleware/resource-validation.middleware.ts:195-199` + `src/enums/business-codes.enum.ts`
  - 动作：新增 `AUTH_APP_NOT_ACTIVE = 40106`，替换 `BusinessCodes.AUTH_DUPLICATE_NONCE`
  - 测试：停用应用后调用业务接口，断言 `code === 40106`

- [ ] Task 7: D6 + D11 — 限流档位按订阅查询 + CIDR 白名单精确匹配
  - 文件：`src/middleware/rate-limit.middleware.ts:197-206` + `src/config/rate-limit-rules.ts:167-173`
  - 动作：
    1. `getTierForApp(appId)` 查询 `subscriptions` → `packages` → tier
    2. 加 60s TTL 缓存（`cache-manager`）
    3. 缓存未命中或 DB 异常时回退 `basic`
    4. 从 `req.context?.application?.id` 取 appId
    5. 将 `WHITELIST_IPS` 中 CIDR 条目替换为精确 IP 列表
    6. 移除 `TIER_APP_MAPPING`
  - 测试：不同套餐断言不同 429 阈值；`127.0.0.1`/`::1` 命中白名单

### P2 任务（体验/一致性）

- [ ] Task 8: D12 — 授权页 state 回传
  - 文件：`openplatform-web/auth-page/src/App.vue:242, :177-192, :281-286`
  - 动作：授权成功后 `postMessage({ type: 'authorization_succeed', data: { authorizationId, state } })`，由父页面负责跳转。同时注册 `listenFromParent` 处理 URL 模式下的 `cancel`/`close` 消息

## 接受标准（Acceptance Criteria）

### 安全类

- [ ] AC 1: Given 应用 A 持有应用 B 的 authorizationId，when 调用授权校验接口，then 返回 `RESOURCE_NOT_AUTHORIZED` (40301)
- [ ] AC 2: Given 请求应用详情接口，when 检查响应体，then 不含 `appSecret` 字段
- [ ] AC 3: Given 内网 IP 访问，when 检查白名单匹配，then 回环地址（`127.0.0.1`/`::1`）精确命中白名单。如需网段支持（如 `10.x`），需引入 CIDR 匹配

### 可靠性类

- [ ] AC 4: Given 回调目标返回 HTTP 429，when 执行回调推送，then 重试 4 次后才放弃
- [ ] AC 5: Given 回调目标返回 HTTP 500，when 执行回调推送，then 同样重试 4 次
- [ ] AC 6: Given 回调目标返回 HTTP 400，when 执行回调推送，then 不重试，直接记录失败

### 功能类

- [ ] AC 7: Given 传入 permissions 为 `['read', 'write']`，when 生成授权 URL，then `permissions=read,write`（逗号拼接）
- [ ] AC 8: Given 授权页收到 JSON 格式 `["read","write"]`，when 解析 permissions，then 正确解析为 `['read', 'write']`
- [ ] AC 9: Given 网关返回错误响应，when 客户端解析，then 响应含 `trace_id` 和 `data: null`
- [ ] AC 10: Given 应用状态为 `inactive`，when 调用业务接口，then 返回 `40106`（非 `40104`）
- [ ] AC 11: Given 应用 A 有高级套餐订阅，when 限流检查，then 使用对应 tier 的阈值（非 basic）
- [ ] AC 12: Given 一次 API 调用，when 查询 api_logs 表，then 记录中包含正确的 `trace_id`

## 依赖

- **外部库：** 无新增依赖（D11 精确匹配方案零依赖）
- **内部依赖：** 
  - D14 + D8 同 PR（已合并为 Task 3）
  - D6 依赖 `subscriptions` 表有 tier 字段
  - D7 依赖 `api_logs` 表有 `trace_id` 列
- **前端依赖：** D1/D12 需要修改 `openplatform-web/auth-page/src/App.vue`（合并到 Task 4 和 Task 8）

## 测试策略

- **前置确认：** 实现前运行 Confirm 1-4 的 schema 检查
- **单元测试：** 每个修复的服务文件新增对应测试用例
- **集成测试：** 
  - D2：跨应用 authorizationId 越权测试
  - D4：详情接口响应不含 appSecret
  - D14+D8：mock 429/500 回调重试序列（4次）
  - D1：permissions 序列化 + 授权页解析
- **回归测试：** 修复后跑完整集成测试套件 `npm test`，确保无回归
- **手动测试：**
  - 部署 beta 后，完整走一遍授权流程
  - 停用应用后调用业务接口，验证错误码

## 风险与注意事项

### 高风险

- **D2 缓存失效**：旧缓存可能已缓存错误的授权结果。修复时需在比对失败时清除该 `(appId, authorizationId)` 的缓存项
- **D6 性能**：每次查订阅表会使 P99 延迟翻倍。必须实现 60s TTL 缓存，缓存未命中或 DB 异常时回退 `basic`
- **D6 依赖**：若 `subscriptions` 表无 tier 字段，需先加迁移或使用替代方案

### 已知限制

- D12 为前端修复，需要前端团队配合或单独 PR
- D11 CIDR 精确匹配方案不支持网段，如需网段支持需引入 `ipaddr.js`
- D1 前端和后端需要同步修改，建议先改后端再改前端

### 未来考虑

- 回调系统可升级为持久化队列 + 死信队列，当前为无状态重试
- 限流系统可升级为 Redis 分布式限流
- D6 长期方案：从 JWT token 中解析 tier（需改 token 签发逻辑）
