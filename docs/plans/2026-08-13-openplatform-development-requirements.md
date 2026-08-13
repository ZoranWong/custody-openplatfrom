# Cregis Custody OpenPlatform - 完整开发需求文档

**日期:** 2026-08-13
**状态:** 待实施
**版本:** v1.0

---

## 目录

1. [项目现状总结](#1-项目现状总结)
2. [P0 - 安全缺陷修复（13 项）](#2-p0---安全缺陷修复)
3. [P1 - 重大 BUG 与未完成功能（19 项）](#3-p1---重大-bug-与未完成功能)
4. [P2 - 技术债务清理（24 项）](#4-p2---技术债务清理)
5. [Minor - 加固与规范性（18 项）](#5-minor---加固与规范性)
6. [UI 改造 - Art Design Pro 二次开发（6 项）](#6-ui-改造---art-design-pro-二次开发)
7. [新功能规划（5 项）](#7-新功能规划)
8. [执行清单（按优先级排序）](#8-执行清单)

---

## 1. 项目现状总结

### 1.1 项目概述

Cregis Custody OpenPlatform 是一个银行级加密货币托管开放平台，采用 monorepo 架构，包含三个核心子项目：

| 子项目 | 技术栈 | 状态 |
|--------|--------|------|
| `openplatform-api-service` | Express 4 + TypeScript + Prisma 7 (MySQL) | 骨架完整，大量 mock |
| `openplatform-sdk` | Java / Node.js / Web (TypeScript) | 核心可用，有死代码 |
| `openplatform-web` | Vue 3 + Vite + Element Plus + Tailwind | 页面完整，待 UI 重构 |

### 1.2 整体评估

**核心流程（OAuth 授权 → 签名验证 → 请求转发）是完整可运行的。** 但大量管理后台功能（Billing、Dashboard、KYB、审计日志）使用 mock/内存数据，多个安全中间件已实现但未挂载，存在显著的安全和技术债务。

**关键约束：**
- 对外 API（`/api/thirdparty/*`、`/api/oauth/*`）的请求/响应结构**不可修改**
- 内部管理 API（`/api/v1/admin/*`、`/api/v1/isv/*`）可在兼容前提下调整
- 管理后台 UI 基于 [Art Design Pro](https://github.com/Daymychen/art-design-pro)（Vue 3 + Element Plus + Tailwind）做二次开发

### 1.3 已知问题统计

| 优先级 | 数量 | 说明 |
|--------|------|------|
| P0 | 13 | 安全缺陷，必须立即修复 |
| P1 | 19 | 重大 BUG 与未完成功能 |
| P2 | 24 | 技术债务（死代码、不一致） |
| Minor | 18 | 加固与规范性改进 |
| UI 改造 | 6 | Art Design Pro 迁移 |
| 新功能 | 5 | 新增业务能力 |

---

## 2. P0 - 安全缺陷修复

### P0-1: 统一签名方案为 MD5

**文件:** `src/services/validators/common.validator.ts`, `src/utils/signature.util.ts`, `src/controllers/authorization.controller.ts`

**问题:** 代码中同时存在三套签名方案：
1. MD5 签名（`common.validator.ts`，`signature-spec.md` 规定的标准方案）
2. HMAC-SHA256 签名（`signature.util.ts`，未使用）
3. 内联 HMAC-SHA256（`authorization.controller.ts`，自行构建签名串）

**目标:** 统一为 MD5 签名方案，移除 HMAC-SHA256 签名代码，确保与 `docs/signature-spec.md` 一致。

**影响范围:** 签名验证逻辑、SDK 签名计算

---

### P0-2: 安全中间件全局挂载

**文件:** `src/main.ts`

**问题:** 以下中间件均已实现但未在 `main.ts` 中挂载：
- `jwtAuthMiddleware` — 开发者 JWT 认证未生效
- `signatureMiddleware` — HMAC-SHA256 签名路径未生效
- `rateLimitMiddleware` — 无 API 限流
- `validationMiddleware` — 请求验证未生效
- `permissionCheckMiddleware` — 端点权限检查未生效
- `adminRateLimitMiddleware` — 管理后台无限流

**目标:** 合理挂载这些中间件，确保 API 请求经过签名/JWT 认证/限流/验证/权限检查。同时确保不影响已有路由中手动应用的中间件。

---

### P0-3: 修复 GET /api/v1/admin/admins 路由错误

**文件:** `src/routes/v1/admin-auth.routes.ts`

**问题:** `GET /api/v1/admin/admins` 的处理器错误地指向 `getAdminProfile`（返回当前用户 Profile），应返回管理员列表。

**目标:** 实现正确的管理员列表查询逻辑，按角色权限（super_admin 可查看所有管理员）返回列表。

---

### P0-4: 移除密码明文日志

**文件:** `src/controllers/admin-auth.controller.ts`

**问题:** 登录时 `console.log` 打印明文密码：
```typescript
console.log('[Login] Password verification:', { inputPassword: password, ... })
```

**目标:** 移除所有密码相关的日志输出，仅记录登录尝试的元数据（邮箱、时间、结果）。

---

### P0-A: 修复授权 IDOR 漏洞

**文件:** `src/services/resource-authorization.service.ts:59-69`

**问题:** `checkAuthorization(appId, authorizationId)` 调用 `repo.findById(authorizationId)` 后未验证 `oauthResource.appId === appId`。App A 可使用 App B 的 `authorizationId` 访问其资源。

**目标:** 在 `checkAuthorization` 中增加 `appId` 归属校验，拒绝跨应用授权使用。

---

### P0-B: Metrics 端点增加认证

**文件:** `src/routes/metrics.routes.ts`

**问题:** `/metrics`、`/metrics/summary`、`/metrics/app/:appid`、`/metrics/apps`、`POST /metrics/reset` 均无任何认证。任何人可读取内部运行数据或重置所有指标。

**目标:** 为 metrics 端点增加 admin 认证，`/metrics` 可保留为 Prometheus 抓取端点（IP 白名单），管理类 metrics 端点需要 admin 登录。

---

### P0-C: 修复 CORS 配置

**文件:** `src/main.ts:52-55`

**问题:** `cors({ origin: true, credentials: true })` 反射任意来源并发送凭证，任何网站可发起带凭证的跨域请求。

**目标:** 改为白名单模式，配置允许的来源域名列表，通过环境变量 `CORS_ORIGINS` 管理。

---

### P0-D: `/oauth/verify` 增加签名验证

**文件:** `src/routes/thirdparty.routes.ts:188`, `src/controllers/thirdparty.controller.ts:224`

**问题:** `/oauth/verify` 端点无签名验证中间件，仅验证 JWT 有效性。其他 OAuth 端点（`/oauth/token`、`/oauth/authorizeUrl`）均正确使用了 `basicValidationMiddleware`。

**目标:** 为 `/oauth/verify` 增加 `basicValidationMiddleware`，与其他 OAuth 端点保持一致。

---

### P0-E: `/custody/callback` 增加认证或移除

**文件:** `src/routes/thirdparty.routes.ts:195-203`

**问题:** `/custody/callback` 测试端点无认证，且暴露内部 `context` 信息给未认证调用者。

**目标:** 增加认证或移除该测试端点，生产环境不应暴露调试接口。

---

### P0-F: 修复管理员 ID 可伪造漏洞

**文件:** `src/controllers/isv-status.controller.ts:88,133,177`

**问题:** `const adminId = req.headers['x-admin-id'] as string || 'unknown'` 从客户端可控的请求头读取管理员 ID，而非来自 JWT 认证中间件设置的 `req.adminId`。

**目标:** 改为使用 `(req as any).adminId`（由 `adminAuthMiddleware` 设置），确保管理员身份不可伪造。

---

### P0-G: Web SDK 默认拒绝所有来源

**文件:** `openplatform-sdk/web/src/index.ts:185-186`

**问题:** `validateOrigin` 未配置时返回 `true`（允许所有来源），恶意页面可接收 `authorization_succeed` 消息获取 `authorizationId`。

**目标:** 默认改为拒绝模式，必须显式配置 `allowedOrigins`。

---

### P0-H: Auth-page postMessage 安全加固

**文件:** `openplatform-web/auth-page/src/utils/postMessage.ts:172`

**问题:** `const targetOrigin = parentOrigin || '*'` — 当 `parentOrigin` 未知时，敏感消息（含 `authorizationId`）发送到 `'*'`。

**目标:** 移除 `'*'` 回退，在 `parentOrigin` 未知时拒绝发送消息，记录安全警告。

---

### P0-I: 签名比较使用恒定时间算法

**文件:** `src/services/validators/common.validator.ts:228,251`

**问题:** `verifyBasicSignature` 和 `verifyResourceSignature` 使用 `===` 比较签名，存在时序攻击风险。

**目标:** 改用 `crypto.timingSafeEqual` 进行签名比较。

---

## 3. P1 - 重大 BUG 与未完成功能

### P1-1: Billing 服务真实化

**文件:** `src/services/billing.service.ts`, `src/controllers/billing.controller.ts`

**问题:** 所有计费数据返回硬编码的 mock 数据（`MOCK_INVOICES`、`MOCK_PAYMENTS`、`MOCK_USAGE_STATS`）。

**目标:** 基于 Prisma 实现真实计费数据存储，或对接外部计费系统。
- 方案 A: 新增 Prisma 模型（Invoice、Payment、UsageRecord），自建计费逻辑
- 方案 B: 对接外部计费/支付系统（如 Stripe）

**方案待定。**

---

### P1-2: Dashboard 统计真实化

**文件:** `src/services/dashboard-stats.service.ts`

**问题:** 所有 Dashboard/API/Revenue/Health 统计数据使用 `Math.random()` 生成。

**目标:** 基于 `ApiLog`、`Metric` 表（Prisma 已有模型）实现真实数据聚合：
- Dashboard 统计：从 ApiLog 聚合 API 调用量、成功率
- API 统计：从 Metric 表聚合 QPS、延迟分位数
- Revenue 统计：从计费数据聚合收入
- Health 统计：从系统指标聚合服务健康状态

---

### P1-3: KYB Review 迁移到 Prisma

**文件:** `src/services/kyb-review.service.ts`

**问题:** KYB 审核使用内存 `Map` 存储，重启丢失，且与 `developer.controller.ts` 的 Prisma `IsvDeveloper` 表形成两套并行的开发者管理系统。

**目标:** 统一使用 Prisma `IsvDeveloper` 模型（已有 `kybStatus` 字段）：
- 将 KYB 审核列表从 `IsvDeveloper` 表查询，按 `kybStatus` 过滤
- 审核通过/驳回操作更新 `IsvDeveloper` 表的 `kybStatus`、`kybReviewedAt`、`kybReviewedBy` 字段
- 移除内存 `kybStore`

---

### P1-4: Audit 日志迁移到 Prisma

**文件:** `src/services/admin-audit.service.ts`

**问题:** 审计日志使用内存 `Map`，90 天过期，重启丢失。

**目标:** 迁移到 Prisma `ApiLog` 模型（已有完整字段定义），实现持久化存储和查询。

---

### P1-5: Trace 服务迁移到 Prisma

**文件:** `src/services/trace-storage.service.ts`

**问题:** 分布式追踪数据使用内存存储。

**目标:** 迁移到 Prisma `Trace` 模型（已有完整字段定义）。

---

### P1-A: 修复默认 TokenService 永远拒绝凭证

**文件:** `src/services/token.service.ts:696-723`

**问题:** 默认 `CredentialService` 的 `validateCredentials` 返回 `{ valid: false }`，导致 `/oauth/appToken/refresh` 流程不可用。

**目标:** 实现真实的 `CredentialService`，基于 `Application` 表验证 `appId` + `appSecret`。

---

### P1-B: 限流中间件挂载

**文件:** `src/main.ts`

**问题:** `rateLimitMiddleware` 和 `adminRateLimitMiddleware` 均已实现但从未挂载，无任何 API 限流生效。

**目标:** 在 `main.ts` 中挂载限流中间件：
- 对外 API 使用分层限流（`TIER_APP_MAPPING` 配置）
- 管理后台 API 使用独立限流策略

---

### P1-C: JWT 认证中间件挂载

**文件:** `src/main.ts`

**问题:** `jwtAuthMiddleware`（RS256，开发者 JWT 认证）已实现但从未挂载。

**目标:** 挂载 JWT 认证中间件，确保开发者 Bearer Token 经过 RS256 验证。

---

### P1-D: 签名中间件清理

**文件:** `src/middleware/signature.middleware.ts`

**问题:** `createSignatureMiddleware` 和 `createRawBodyMiddleware` 已实现但从未使用。HMAC-SHA256 签名路径是死代码。

**目标:** 在 P0-1（统一签名方案为 MD5）完成后，移除 HMAC-SHA256 签名中间件，保持代码库只有一套签名方案。

---

### P1-E: 开发者管理路由增加权限检查

**文件:** `src/routes/v1/admin-auth.routes.ts:36-43`

**问题:** 开发者审批/拒绝/激活/冻结/封禁路由仅使用 `adminAuthMiddleware`，无 `requireRole`/`requirePermission`。任何已登录管理员（包括 `viewer`）均可执行这些操作。

**目标:** 增加权限检查：
- 审批/拒绝/封禁 → `requirePermission(Resource.ISV_KYB)`
- 激活/冻结 → `requirePermission(Resource.ISV_STATUS)`

---

### P1-F: 修复非法状态值写入数据库

**文件:** `src/controllers/developer.controller.ts:308-313`

**问题:** `banDeveloper` 写入 `status: 'banned'`，但 Prisma Schema 定义的合法值为 `active`、`suspended`、`deleted`。

**目标:** 统一状态枚举，在 Prisma Schema 中增加 `banned` 状态或修改 `banDeveloper` 使用已定义的状态值。

---

### P1-G: 修复 Nonce 重放保护 BUG

**文件:** `src/middleware/nonce-cache.ts:16-19`

**问题:** `isDuplicate` 检查 `this.cache.has(key)` 不验证 TTL，过期但未清理的 nonce 被错误拒绝。且清理仅在 `cache.size > 10000` 时触发。

**目标:** 在 `isDuplicate` 中检查存储时间戳，超时 nonce 视为无效；实现定期清理机制。

---

### P1-H: 修复限流分层映射

**文件:** `src/middleware/rate-limit.middleware.ts:188-198`

**问题:** `getTierForApp` 始终返回 `defaultTier`，`TIER_APP_MAPPING` 配置从未生效。

**目标:** 实现基于 appId 的限流分层查询，支持 free/basic/pro/enterprise 四个层级。

---

### P1-I: 实现 IsvEnterprise 模型

**文件:** `prisma/schema.prisma:116`

**问题:** Schema 中有 TODO 注释，`OauthResource` 的 `IsvEnterprise` 关联关系被注释掉。

**目标:** 实现 `IsvEnterprise` 模型并与 `OauthResource` 建立关联。

---

### P1-J: 创建 Prisma 迁移

**文件:** `prisma/`

**问题:** 只有 `schema.prisma`，无 `migrations/` 目录，无法通过 `prisma migrate deploy` 部署。

**目标:** 生成初始迁移文件，建立正式的数据库迁移管理流程。

---

### P1-K: Nginx 启用 HTTPS

**文件:** `deploy/nginx.conf`

**问题:** 仅监听 80 端口，无 SSL/TLS 配置，无 HSTS。

**目标:** 增加 443 端口 SSL 配置，HTTP 重定向到 HTTPS，启用 HSTS。

---

### P1-L: PM2 配置补充环境变量

**文件:** `deploy/ecosystem.config.js`

**问题:** `env` 仅设置 `NODE_ENV` 和 `PORT`，缺少 `STORAGE_TYPE=mysql`、`JWT_SECRET`、`JWT_PRIVATE_KEY`、`JWT_PUBLIC_KEY`、数据库连接信息。

**目标:** 补充完整的环境变量配置，使用 `.env` 文件或 CI/CD 注入。

---

### P1-M: 内存存储可扩展性改造

**文件:** 多个服务文件

**问题:** Nonce 缓存、Token 黑名单、Trace 存储、审计日志、Metrics 均为进程内内存存储，单实例运行。水平扩展时这些存储会失效。

**目标:** 将需要跨实例共享的存储迁移到 Redis 或数据库：
- Nonce 缓存 → Redis（TTL 自动过期）
- Token 黑名单 → Redis
- Trace 存储 → Prisma `Trace` 表
- 审计日志 → Prisma `ApiLog` 表

---

### P1-N: 修复 TransferTaskDetailDialog DOM XSS

**文件:** `openplatform-sdk/web/src/components/transfer/TransferTaskDetailDialog.ts:78-88,484`

**问题:** 用户数据字段直接拼接 HTML 模板字符串，赋值给 `innerHTML`，无任何转义。

**目标:** 使用 `textContent` 或 HTML 实体转义，防止 XSS 注入。

---

## 4. P2 - 技术债务清理

### P2-1: Node SDK 死代码清理

**文件:** `openplatform-sdk/node/src/services/`, `openplatform-sdk/node/src/auth/`

**问题:** `services/` 和 `auth/` 目录下的服务类（`TreasuryService`、`PayoutService`、`TransactionService`、`SignatureService`、`WebhookService`、`AuthService`）使用不同的 URL 路径（`/api/third-party/...`），且从未从入口文件 `src/index.ts` 导出。实际使用的是 `core/index.ts` 中 `CregisSDK` 类的内联方法。

**目标:** 删除 `services/` 和 `auth/` 目录，清理 `example.ts` 中对 `getAuthService()` 的无效引用。

---

### P2-2: ISV 忘记密码/重置密码实现

**文件:** `src/controllers/isv-auth.controller.ts`, `src/routes/v1/isv.routes.ts`

**问题:** `forgot-password` 和 `reset-password` 是 demo 桩（`console.log('[Demo]...')`，始终返回成功）。

**目标:** 实现邮箱验证码发送 + 密码重置流程：
- 发送重置验证码到注册邮箱
- 验证码校验 + 新密码设置
- 验证码有效期 5 分钟，单次使用

---

### P2-3: 权限管理接口实现

**文件:** `src/routes/v1/isv.routes.ts`

**问题:** `PUT /isv/applications/:appId/permissions` 返回 501 NOT_IMPLEMENTED。

**目标:** 基于 `EndpointPermission` 表实现应用级别的权限配置（读/写/管理）。

---

### P2-4: Web SDK 测试修复

**文件:** `openplatform-sdk/web/src/index.test.ts`

**问题:** 测试中 `SDKConfig` 要求 `appId`/`authUrl` 字段，但实际代码不需要；`openAuthorization` 测试使用对象形式但实际只接受字符串 URL。

**目标:** 修复测试用例，使其与当前实现一致。`TransferTaskDetailDialog` 测试部分已对齐，保持不变。

---

### P2-5: Developer Portal 死代码清理

**文件:** `openplatform-web/developer-portal/src/`

**问题:**
- `services/mockData.ts` (451行) — 未被任何页面或组件导入
- `composables/useRegistrationForm.ts` + `useStepNavigation.ts` — 未被 `RegisterPage.vue` 使用
- `services/api.ts` 中的 legacy API 方法（`_legacyLogin`、`_legacyRefreshToken` 等）

**目标:** 删除以上死代码，清理 deprecated API 方法。

---

### P2-6: Java SDK 模块启用

**文件:** `openplatform-sdk/java/pom.xml`

**问题:** `cregis-sdk-http-netty` 和 `cregis-sdk-spring-boot-starter` 模块在 pom.xml 中被注释掉（"TODO: fix compilation before re-enabling"）。

**目标:** 修复编译问题，启用这两个模块。

---

### P2-7: Auth-page 移除 mock 降级

**文件:** `openplatform-web/auth-page/src/services/auth.ts`

**问题:** `getOrganizationList` 仍有 mock 回退；`mockFirstAuthenticate`/`mockSecondAuthenticate` 含硬编码凭证仍被导出。

**目标:** 移除所有 mock 函数和回退逻辑，确保生产环境只使用真实 API。

---

### P2-A: 删除 forwarders.ts 死代码

**文件:** `src/services/forwarders.ts` (315行)

**问题:** `DefaultForwarder`、`CustodyForwarder`、`ForwarderRegistryImpl`、`getForwarder` 从未被导入。实际转发在 `thirdparty.routes.ts` 内联实现。

**目标:** 删除该文件。

---

### P2-B: 删除 validation-rules.ts 死代码

**文件:** `src/config/validation-rules.ts` (344行)

**问题:** 定义了 `/enterprise`、`/unit`、`/payment` 等端点的验证规则，但这些端点均不存在。

**目标:** 删除该文件。

---

### P2-C: 删除 validation.middleware.ts 死代码

**文件:** `src/middleware/validation.middleware.ts`

**问题:** 从未被导入或使用。

**目标:** 删除该文件。

---

### P2-D: 合并重复验证器文件

**文件:** `src/services/validators/common.validator.ts` (7.5KB) vs `common.validators.ts` (8KB)

**问题:** 两个几乎相同的文件，API 不同，造成混淆。

**目标:** 统一为一个文件，移除重复代码。

---

### P2-E: 删除 request.validators.ts 死代码

**文件:** `src/services/validators/request.validators.ts` (9.4KB)

**问题:** 仅被已死的 `validation-rules.ts` 引用。

**目标:** 删除该文件。

---

### P2-F: 删除 permission-check 死代码

**文件:** `src/services/permission-check.service.ts`, `src/middleware/permission-check.middleware.ts`

**问题:** 仅被自己的测试引用，实际权限检查使用 `admin-permission.middleware.ts`。

**目标:** 删除或整合到 `admin-permission.middleware.ts`。

---

### P2-G: 注册 getDeveloperUsers 路由

**文件:** `src/controllers/developer.controller.ts:123`

**问题:** `getDeveloperUsers` 控制器已定义但未注册到任何路由文件。

**目标:** 在路由文件中注册该端点。

---

### P2-H: 确认 Node SDK services/ 清理

**文件:** `openplatform-sdk/node/src/index.ts`

**问题:** 确认 `services/` 目录完全未导出，P2-1 可安全执行。

**目标:** 与 P2-1 一起执行。

---

### P2-I: getDeveloperStats 增加分页

**文件:** `src/controllers/developer.controller.ts:330-333`

**问题:** `isvRepo.findByFilters({})` 无分页，全量加载所有开发者计算统计数据。

**目标:** 使用 SQL 聚合查询（`groupBy`）替代内存统计。

---

### P2-J: 统一导入路径

**文件:** `src/middleware/audit-logging.middleware.ts:14`, `src/services/request-logger.service.ts:16`

**问题:** 使用 `.js` 扩展名导入（`from '../utils/logger.js'`），与代码库其他部分不一致。

**目标:** 统一为无扩展名导入。

---

### P2-K: 统一 KYB 与开发者管理系统

**文件:** `src/services/kyb-review.service.ts`, `src/controllers/developer.controller.ts`

**问题:** KYB 审核使用内存 `kybStore`，开发者管理使用 Prisma `IsvDeveloper` 表，两套系统数据不一致。

**目标:** 在 P1-3 中统一为 Prisma `IsvDeveloper` 表。

---

### P2-L: 删除 developerAuthService 死代码

**文件:** `src/services/kyb-review.service.ts:694-809`

**问题:** `developerAuthService`（register/login/getById 等）是内存存储，从未被导入。

**目标:** 删除该代码块。

---

### P2-M: 确认 Auth-page 组织列表 mock 移除

**文件:** `openplatform-web/auth-page/src/services/auth.ts:359-378`

**问题:** 确认 mock 回退逻辑存在，需在 P2-7 中移除。

**目标:** 与 P2-7 一起执行。

---

### P2-N: 移除 Auth-page 无用 mock 函数

**文件:** `openplatform-web/auth-page/src/services/auth.ts:380-425`

**问题:** `mockFirstAuthenticate`/`mockSecondAuthenticate` 含硬编码凭证 `admin@test.com/admin123`，虽未调用但已导出。

**目标:** 与 P2-7 一起执行，删除这些函数。

---

### P2-O: appSecret 生成使用安全随机数

**文件:** `src/services/isv-user.service.ts:191`, `src/routes/v1/isv.routes.ts:437`

**问题:** `appSecret` 使用 `Math.random()` 生成，非密码学安全。

**目标:** 改用 `crypto.randomBytes(16).toString('hex')`。

---

### P2-P: 登录限流存储增加过期清理

**文件:** `src/controllers/admin-auth.controller.ts:37-38`

**问题:** `loginAttempts` 和 `refreshAttempts` Map 无过期清理，可导致内存耗尽。

**目标:** 实现 TTL 清理机制，或迁移到 Redis。

---

### P2-Q: 转发路由拼写错误监控

**文件:** `src/config/forward-routes.ts:170,177`

**问题:** 后端路径使用 `accountTypy`（后端拼写错误），如果后端修复拼写会导致静默 404。

**目标:** 增加自动化测试验证转发路由与后端实际路径匹配（或与后端确认后统一拼写）。

---

## 5. Minor - 加固与规范性

### MIN-A: 移除 JWT 密钥硬编码回退值

**文件:** `src/middleware/admin-auth.middleware.ts:10`, `src/controllers/isv-auth.controller.ts:17`

**问题:** `getEnvOrDefault` 在缺少环境变量时回退到 `'dev-secret-key-change-in-production'`。

**目标:** 生产环境启动时强制检查 JWT 密钥是否存在，缺失时拒绝启动（而非静默使用不安全回退值）。

---

### MIN-B: 统一 JWT 方案

**文件:** 多个文件

**问题:** 三套不一致的 JWT 方案：Admin 用 HS256 + JWT_SECRET，OAuth 用 RS256 + 公私钥对，ISV 用 HS256 + JWT_SECRET。

**目标:** 统一文档化 JWT 方案选择，确保每种方案的使用场景明确。

---

### MIN-C: 清理生产路径 console.log

**文件:** `src/routes/thirdparty.routes.ts:132,142,150`, `src/services/http-client.service.ts:236`

**问题:** 生产路径中 `console.log` 调试日志。

**目标:** 替换为 debug 级别日志（winston），仅在开发环境输出。

---

### MIN-D: 错误处理器加固

**文件:** `src/main.ts:133`, 多个 controller 文件

**问题:** 多个 controller 中 `console.error` 完整错误对象，可能在容器日志中泄露敏感信息。

**目标:** 统一错误处理，生产环境仅记录错误码和请求 ID，详细信息写入 debug 级别。

---

### MIN-E: 移除仓库中的种子数据凭证

**文件:** `data/admins.json:4`

**问题:** 包含真实的 bcrypt 哈希和 admin 邮箱。

**目标:** 种子数据从环境变量或 CI/CD 注入，不提交到仓库。

---

### MIN-F: Seed 脚本不打印明文密码

**文件:** `scripts/seed-admin.ts:164`

**问题:** `console.log(`Password: ${password}`)` 打印明文密码到标准输出。

**目标:** 移除密码打印，仅在首次运行时通过安全渠道传递密码。

---

### MIN-G: parseExpiry 支持多段时间单位

**文件:** `src/controllers/admin-auth.controller.ts:120-134`

**问题:** 正则 `/^(\d+)([smhd])$/` 仅支持单段时间单位（如 `90s`），不支持 `1h30m` 等复合格式。

**目标:** 扩展解析逻辑支持复合格式，或使用成熟的库（如 `ms`）。

---

### MIN-H: API Service 增加 CI/CD

**文件:** `.github/workflows/`

**问题:** 仅有 SDK 发布工作流，无 API Service 的构建/测试/部署流程。

**目标:** 增加 `ci-api-service.yml`：lint → typecheck → test → build → deploy。

---

### MIN-I: 增加 lint 和 typecheck 脚本

**文件:** `openplatform-api-service/package.json`

**问题:** 无 `lint` 和 `typecheck` 脚本。

**目标:** 增加 `lint`（ESLint）和 `typecheck`（`tsc --noEmit`）脚本。

---

### MIN-J: ISV 服务使用异步 bcrypt

**文件:** `src/services/isv-user.service.ts:69,100`

**问题:** `bcrypt.hashSync`/`compareSync` 阻塞事件循环，admin 路径使用异步版本。

**目标:** 改为 `bcrypt.hash`/`bcrypt.compare`。

---

### MIN-K: 实现 ISV 登出 Token 失效

**文件:** `src/controllers/isv-auth.controller.ts:207-225`

**问题:** `logout` 返回成功但不撤销 Token，被盗的 ISV JWT 在 24h 内持续有效。

**目标:** 将 ISV 登出的 Token 加入黑名单。

---

### MIN-L: KYB 状态变更时撤销 Token

**文件:** `src/services/kyb-review.service.ts:632-634`

**问题:** `// Revoke tokens (placeholder - integrate with token service)` 后跟 `console.log(...)`。

**目标:** 实现 Token 撤销逻辑，确保 ISV 被冻结/封禁后其 Token 立即失效。

---

### MIN-M: 审查 .gitignore 完整性

**文件:** `.gitignore`

**问题:** 需确认 `logs/`、`.dev-pids/`、`.dev-logs/`、`data/*.json` 是否被正确排除。

**目标:** 审查并补充遗漏的忽略规则。

---

### MIN-N: 清理 authorization.controller.ts 内联签名

**文件:** `src/controllers/authorization.controller.ts:41-50,175-182,336-343`

**问题:** 自建签名串构建和 HMAC-SHA256 验证，是三套签名方案之一。

**目标:** 在 P0-1 统一签名方案后，改为使用统一的验证器。

---

### MIN-O: verifyOauthToken 增加 resourceKey 归属校验

**文件:** `src/controllers/thirdparty.controller.ts:286-290`

**问题:** `oauthRepo.upsert({ appId, resourceKey, ... })` 不验证应用是否有权使用该 `resourceKey`。

**目标:** 增加 resourceKey 归属校验逻辑。

---

## 6. UI 改造 - Art Design Pro 二次开发

### 背景

当前管理后台（admin-portal 和 developer-portal）使用裸 Vue 3 + Element Plus + Tailwind 编写，无统一模板框架。Art Design Pro 是成熟的后台管理模板，提供：
- 统一的 Layout 组件（侧边栏、顶部栏、面包屑）
- 主题系统（亮色/暗黑切换）
- `useTable` API（统一的分页、搜索、排序表格逻辑）
- `ArtForm` 组件（统一的表单构建）
- 代码规范体系（ESLint + Prettier + Stylelint + Husky + commitlint）

### UI-1: admin-portal 迁移到 Art Design Pro 脚手架

**目标:**
- 在 Art Design Pro 项目结构中重建 admin-portal
- 复用 Art Design Pro 的 Layout、主题、组件体系
- 保持所有现有 API 调用层不变

### UI-2: developer-portal 迁移到 Art Design Pro 脚手架

**目标:**
- 在 Art Design Pro 项目结构中重建 developer-portal
- 清理死代码（P2-5）
- 保持所有现有 API 调用层不变

### UI-3: 表格页面统一使用 useTable

**目标:**
- KYB 审核列表、开发者列表、ISV 状态列表、API 统计等表格页面统一使用 `useTable` API
- 统一分页、搜索、排序、导出功能

### UI-4: 表单页面统一使用 ArtForm

**目标:**
- 注册、登录、创建应用、KYB 表单等页面统一使用 `ArtForm` 组件
- 统一表单验证、提交、错误处理

### UI-5: 引入代码规范体系

**目标:**
- 为 admin-portal 和 developer-portal 配置 ESLint + Prettier + Stylelint
- 配置 Husky pre-commit hooks
- 配置 commitlint 规范提交信息

### UI-6: 支持暗黑模式

**目标:**
- 利用 Art Design Pro 的主题系统，支持亮色/暗黑模式切换
- 用户偏好持久化到 localStorage

---

## 7. 新功能规划

### NEW-1: Webhook 管理页面

**说明:** Node SDK 已有 `registerWebhook`/`listWebhooks`/`deleteWebhook` 方法，但 Developer Portal 无对应的前端页面。

**目标:**
- 在 Developer Portal 增加 Webhook 配置管理页面
- 功能：注册 Webhook URL、查看已注册列表、删除、测试发送
- 展示 Webhook 事件类型（authorization.*、transaction.*、task.*）

### NEW-2: KYB 进度可视化

**说明:** 开发者注册后需经过审核流程，当前无进度展示。

**目标:**
- 在 Developer Portal 增加 KYB 审核进度页面
- 进度节点：已提交 → 审核中 → 补充材料（可选）→ 通过/驳回 → 已激活

### NEW-3: API 日志查询页面

**说明:** Prisma 已有 `ApiLog` 模型，但 Admin Portal 无查询页面。

**目标:**
- 在 Admin Portal 增加 API 调用日志查询页面
- 支持按 appId、时间范围、状态码、端点过滤
- 展示请求/响应详情

### NEW-4: Admin Portal 测试覆盖

**说明:** admin-portal 当前零测试。

**目标:**
- 为关键页面编写单元测试（登录、Dashboard、KYB 审核、开发者管理）
- 使用 vitest + @vue/test-utils

### NEW-5: 监控告警

**说明:** 基于已有的 Prometheus 指标，增加告警能力。

**目标:**
- 定义关键指标告警阈值（错误率、延迟、QPS 异常）
- 实现告警通知（邮件/Webhook）

---

## 8. 执行清单

### 阶段一：P0 安全修复（预计 2-3 周）

- [ ] P0-4: 移除密码明文日志
- [ ] P0-3: 修复 GET /api/v1/admin/admins 路由错误
- [ ] P0-F: 修复管理员 ID 可伪造漏洞
- [ ] P0-I: 签名比较使用恒定时间算法
- [ ] P0-A: 修复授权 IDOR 漏洞
- [ ] P0-D: `/oauth/verify` 增加签名验证
- [ ] P0-E: `/custody/callback` 增加认证或移除
- [ ] P0-C: 修复 CORS 配置
- [ ] P0-B: Metrics 端点增加认证
- [ ] P0-G: Web SDK 默认拒绝所有来源
- [ ] P0-H: Auth-page postMessage 安全加固
- [ ] P0-1: 统一签名方案为 MD5
- [ ] P0-2: 安全中间件全局挂载

### 阶段二：P1 重大修复（预计 4-6 周）

- [ ] P1-J: 创建 Prisma 迁移
- [ ] P1-L: PM2 配置补充环境变量
- [ ] P1-K: Nginx 启用 HTTPS
- [ ] P1-A: 修复默认 TokenService 永远拒绝凭证
- [ ] P1-F: 修复非法状态值写入数据库
- [ ] P1-G: 修复 Nonce 重放保护 BUG
- [ ] P1-E: 开发者管理路由增加权限检查
- [ ] P1-B: 限流中间件挂载
- [ ] P1-C: JWT 认证中间件挂载
- [ ] P1-H: 修复限流分层映射
- [ ] P1-3: KYB Review 迁移到 Prisma
- [ ] P1-4: Audit 日志迁移到 Prisma
- [ ] P1-5: Trace 服务迁移到 Prisma
- [ ] P1-2: Dashboard 统计真实化
- [ ] P1-M: 内存存储可扩展性改造
- [ ] P1-I: 实现 IsvEnterprise 模型
- [ ] P1-D: 签名中间件清理
- [ ] P1-N: 修复 TransferTaskDetailDialog DOM XSS
- [ ] P1-1: Billing 服务真实化（方案待定）

### 阶段三：P2 技术债务（预计 3-4 周）

- [ ] P2-O: appSecret 生成使用安全随机数
- [ ] P2-P: 登录限流存储增加过期清理
- [ ] P2-I: getDeveloperStats 增加分页
- [ ] P2-2: ISV 忘记密码/重置密码实现
- [ ] P2-3: 权限管理接口实现
- [ ] P2-1: Node SDK 死代码清理
- [ ] P2-6: Java SDK 模块启用
- [ ] P2-4: Web SDK 测试修复
- [ ] P2-5: Developer Portal 死代码清理
- [ ] P2-7: Auth-page 移除 mock 降级
- [ ] P2-A: 删除 forwarders.ts 死代码
- [ ] P2-B: 删除 validation-rules.ts 死代码
- [ ] P2-C: 删除 validation.middleware.ts 死代码
- [ ] P2-D: 合并重复验证器文件
- [ ] P2-E: 删除 request.validators.ts 死代码
- [ ] P2-F: 删除 permission-check 死代码
- [ ] P2-G: 注册 getDeveloperUsers 路由
- [ ] P2-J: 统一导入路径
- [ ] P2-L: 删除 developerAuthService 死代码
- [ ] P2-Q: 转发路由拼写错误监控
- [ ] P2-K: 与 P1-3 一起完成

### 阶段四：Minor 加固（预计 1-2 周）

- [ ] MIN-A: 移除 JWT 密钥硬编码回退值
- [ ] MIN-B: 统一 JWT 方案文档化
- [ ] MIN-C: 清理生产路径 console.log
- [ ] MIN-D: 错误处理器加固
- [ ] MIN-E: 移除仓库中的种子数据凭证
- [ ] MIN-F: Seed 脚本不打印明文密码
- [ ] MIN-G: parseExpiry 支持多段时间单位
- [ ] MIN-H: API Service 增加 CI/CD
- [ ] MIN-I: 增加 lint 和 typecheck 脚本
- [ ] MIN-J: ISV 服务使用异步 bcrypt
- [ ] MIN-K: 实现 ISV 登出 Token 失效
- [ ] MIN-L: KYB 状态变更时撤销 Token
- [ ] MIN-M: 审查 .gitignore 完整性
- [ ] MIN-N: 清理 authorization.controller.ts 内联签名
- [ ] MIN-O: verifyOauthToken 增加 resourceKey 归属校验

### 阶段五：UI 改造（预计 4-6 周）

- [ ] UI-1: admin-portal 迁移到 Art Design Pro 脚手架
- [ ] UI-2: developer-portal 迁移到 Art Design Pro 脚手架
- [ ] UI-3: 表格页面统一使用 useTable
- [ ] UI-4: 表单页面统一使用 ArtForm
- [ ] UI-5: 引入代码规范体系
- [ ] UI-6: 支持暗黑模式

### 阶段六：新功能（预计 2-3 周）

- [ ] NEW-1: Webhook 管理页面
- [ ] NEW-2: KYB 进度可视化
- [ ] NEW-3: API 日志查询页面
- [ ] NEW-4: Admin Portal 测试覆盖
- [ ] NEW-5: 监控告警

---

## 附录

### A. 关键文档引用

- [消息签名规范](../signature-spec.md)
- [第三方开发者接入指南](../thirdparty-integration-guide.md)
- [PRD - Cregis Custody 开放平台](../prd-cregis-custody-2026-02-02-cn.md)
- [Art Design Pro](https://github.com/Daymychen/art-design-pro)

### B. 不修改的对外 API

以下 API 的请求/响应结构不可修改：
- `/api/thirdparty/oauth/*` — OAuth 授权流程
- `/api/thirdparty/treasury/*` — 13 个 custody 转发端点
- `/api/oauth/*` — OAuth Token 管理
- `/api/thirdparty/*` catch-all — 转发请求