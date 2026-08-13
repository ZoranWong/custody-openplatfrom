# Cregis Custody OpenPlatform - 完整开发需求文档

**日期:** 2026-08-13
**状态:** 待实施
**版本:** v2.0

---

## 目录

1. [项目现状总结](#1-项目现状总结)
2. [P0 - 安全缺陷修复](#2-p0---安全缺陷修复)
3. [P1 - 重大 BUG 与未完成功能](#3-p1---重大-bug-与未完成功能)
4. [P2 - 技术债务清理](#4-p2---技术债务清理)
5. [Minor - 加固与规范性](#5-minor---加固与规范性)
6. [API 代码组织优化](#6-api-代码组织优化)
7. [代码注释完善](#7-代码注释完善)
8. [UI 改造 - Art Design Pro 二次开发](#8-ui-改造---art-design-pro-二次开发)
9. [新功能规划](#9-新功能规划)
10. [执行清单](#10-执行清单)

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

**核心流程（OAuth 授权 → 签名验证 → 请求转发）是完整可运行的。** 但大量管理后台功能（Billing、Dashboard、KYB、审计日志）使用 mock/内存数据，存在技术债务。

**关键约束：**
- 对外三方 API（`/api/thirdparty/*`、`/api/oauth/*`）的请求/响应结构**不可修改**
- 内部管理 API（`/api/v1/admin/*`、`/api/v1/isv/*`）可在兼容前提下调整
- 管理后台 UI 基于 [Art Design Pro](https://github.com/Daymychen/art-design-pro)（Vue 3 + Element Plus + Tailwind）做二次开发

### 1.3 分层验证架构

系统采用分层验证，不同接口使用不同的认证策略，这是刻意的设计：

| 接口类型 | 认证方式 | 说明 |
|---------|---------|------|
| 内部管理接口（`/api/v1/admin/*`） | JWT (HS256) + Cookie | 管理员登录态验证 |
| 内部 ISV 接口（`/api/v1/isv/*`） | JWT (HS256) Bearer | ISV 登录态验证 |
| 外部 OAuth 接口（`/api/thirdparty/oauth/*`） | appId + MD5 签名（Basic） | 验证开发者身份，不涉及资源操作 |
| 外部资源操作接口（`/api/thirdparty/treasury/*`） | appId + MD5 签名 + authorizationId（Resource） | 验证开发者身份 + 授权资源归属，转发到资源服务器 |

### 1.4 已知问题统计

| 优先级 | 数量 | 说明 |
|--------|------|------|
| P0 | 1 | 安全缺陷，必须立即修复 |
| P1 | 5 | 重大 BUG 与未完成功能 |
| P2 | 24 | 技术债务（死代码、不一致） |
| Minor | 18 | 加固与规范性改进 |
| API 组织优化 | 8 | 代码结构优化 |
| 注释完善 | 6 | 关键代码注释 |
| UI 改造 | 6 | Art Design Pro 迁移 |
| 新功能 | 5 | 新增业务能力 |

---

## 2. P0 - 安全缺陷修复

### P0-1: 修复授权 IDOR 漏洞

**文件:** `src/services/resource-authorization.service.ts:60-69`, `src/repositories/implementations/authorization.repository.ts:11-13`

**问题:** `checkAuthorization(appId, authorizationId)` 调用 `repo.findById(authorizationId)` 时只查询 `{ where: { id: authorizationId } }`，未验证 `oauthResource.appId === appId`。App A 可使用 App B 的 `authorizationId` 操作其资源。

**验证说明:** `resource-validation.middleware.ts` 已验证 appId 对应的 application 存在且活跃，但未验证 authorizationId 归属于该 appId。`resource.validator.ts` 调用 `checkAuthorization(basicWithAuth.appId, basicWithAuth.authorizationId)` 时，appId 参数传入但从未在 DB 查询或比较中使用。

**目标:** 在 `checkAuthorization` 中增加 appId 归属校验，或在 `findById` 查询中加入 appId 过滤条件。

**影响范围:** 所有资源操作接口（`/api/thirdparty/treasury/*`）

---

## 3. P1 - 重大 BUG 与未完成功能

### P1-1: Metrics 管理端点缺少认证

**文件:** `src/routes/metrics.routes.ts`

**问题:** `GET /metrics/summary`、`GET /metrics/app/:appid`、`GET /metrics/apps` 暴露按应用维度的运营数据（请求量、错误率、延迟分位数），`POST /metrics/reset` 可重置所有指标。这些端点均无任何认证。

**说明:** `GET /metrics` 作为 Prometheus 抓取端点无需认证，这是合理的。但管理类 metrics 端点需要保护。

**目标:** 为管理类 metrics 端点（`/summary`、`/app/:appid`、`/apps`、`POST /reset`）增加 admin 认证。

---

### P1-2: 管理员操作审计日志可伪造

**文件:** `src/controllers/isv-status.controller.ts:88,133,177`

**问题:** `adminId` 从客户端可控的 `req.headers['x-admin-id']` 读取，而非来自 JWT 认证中间件设置的 `(req as any).adminId`。管理员可伪造其身份归属到其他管理员。

**说明:** 授权决策由 `adminAuthMiddleware` + `requirePermission` 保证，这不是越权漏洞。但审计日志中操作人身份不可信，影响事后追溯。

**额外发现:** `developer.controller.ts:158` 中 `approveDeveloper` 使用了 `(req as any).user?.email`，但 `adminAuthMiddleware` 设置的是 `adminEmail` 而非 `user.email`，审核人始终记录为默认值 `'admin@cregis.com'`。

**目标:**
- 将 `isv-status.controller.ts` 中的 `req.headers['x-admin-id']` 改为 `(req as any).adminId`
- 修复 `developer.controller.ts` 中的 `(req as any).user?.email` 改为 `(req as any).adminEmail`

---

### P1-3: 开发者管理路由缺少角色权限检查

**文件:** `src/routes/v1/admin-auth.routes.ts:36-43`

**问题:** 开发者审批/拒绝/激活/冻结/封禁路由仅使用 `adminAuthMiddleware`，无 `requireRole` 或 `requirePermission`。任何已登录管理员（包括 `viewer` 角色）均可执行这些操作。

**说明:** 对比 `admin.routes.ts` 中 KYB/ISV 状态路由均使用了 `requirePermission(Resource.ISV_KYB)` 等权限检查。

**目标:** 为开发者管理路由增加权限检查：
- 审批/拒绝/封禁 → `requirePermission(Resource.ISV_KYB)` 或 `requireRole('super_admin', 'admin')`
- 激活/冻结 → `requirePermission(Resource.ISV_STATUS)`

---

### P1-4: OAuth Token 签发端点不可用

**文件:** `src/services/token.service.ts:696-723`

**问题:** `/api/oauth/appToken/refresh` 端点（`client_credentials` grant type）使用的默认 `tokenService` 实例中，`defaultCredentialService.validateCredentials` 永远返回 `{ valid: false }`，导致该端点始终返回 "Invalid credentials"。

**说明:** 外部三方开发者的 OAuth 流程使用的是 `/api/thirdparty/oauth/token`（`thirdparty.routes.ts`），该端点直接调用 `signJWT`，工作正常。`/api/oauth/appToken/refresh` 是内部管理用的 OAuth Token 端点，当前因默认 CredentialService 为 stub 而不可用。

**目标:** 实现真实的 `CredentialService`，基于 `Application` 表验证 `appId` + `appSecret`，或确认该端点是否需要保留。

---

### P1-5: API 限流中间件未挂载

**文件:** `src/main.ts`

**问题:** `rateLimitMiddleware` 和 `adminRateLimitMiddleware` 均已实现但从未挂载到任何路由或全局中间件。当前无有效的 API 限流保护。

**说明:** `resource-validation.middleware.ts` 中的 nonce 重放检查不是限流，仅防止重放攻击。`token.service.ts` 中的 `RateLimiter` 也是默认 no-op 实现。

**目标:** 在合适的位置挂载限流中间件：
- 对外三方 API → 分层限流（按 `TIER_APP_MAPPING` 配置）
- 管理后台 API → 单独限流策略
- 登录/注册等敏感端点 → 严格限流

---

## 4. P2 - 技术债务清理

### P2-1: Node SDK 死代码清理

**文件:** `openplatform-sdk/node/src/services/`, `openplatform-sdk/node/src/auth/`

**问题:** `services/` 和 `auth/` 目录下的服务类使用不同的 URL 路径（`/api/third-party/...`），从未从入口文件 `src/index.ts` 导出。实际使用的是 `core/index.ts` 中 `CregisSDK` 类的内联方法。

**目标:** 删除 `services/` 和 `auth/` 目录，清理 `example.ts` 中对 `getAuthService()` 的无效引用。

---

### P2-2: ISV 忘记密码/重置密码实现

**文件:** `src/controllers/isv-auth.controller.ts`, `src/routes/v1/isv.routes.ts`

**问题:** `forgot-password` 和 `reset-password` 是 demo 桩（`console.log('[Demo]...')`，始终返回成功）。

**目标:** 实现邮箱验证码发送 + 密码重置流程。

---

### P2-3: 权限管理接口实现

**文件:** `src/routes/v1/isv.routes.ts`

**问题:** `PUT /isv/applications/:appId/permissions` 返回 501 NOT_IMPLEMENTED。

**目标:** 基于 `EndpointPermission` 表实现应用级别的权限配置。

---

### P2-4: Web SDK 测试修复

**文件:** `openplatform-sdk/web/src/index.test.ts`

**问题:** 测试中 `SDKConfig` 要求 `appId`/`authUrl` 字段，但实际代码不需要；`openAuthorization` 测试使用对象形式但实际只接受字符串 URL。

**目标:** 修复测试用例，使其与当前实现一致。

---

### P2-5: Developer Portal 死代码清理

**文件:** `openplatform-web/developer-portal/src/`

**问题:**
- `services/mockData.ts` (451行) — 未被任何页面或组件导入
- `composables/useRegistrationForm.ts` + `useStepNavigation.ts` — 未被 `RegisterPage.vue` 使用
- `services/api.ts` 中的 legacy API 方法

**目标:** 删除以上死代码。

---

### P2-6: Java SDK 模块启用

**文件:** `openplatform-sdk/java/pom.xml`

**问题:** `cregis-sdk-http-netty` 和 `cregis-sdk-spring-boot-starter` 模块被注释掉。

**目标:** 修复编译问题，启用这两个模块。

---

### P2-7: Auth-page 移除 mock 降级

**文件:** `openplatform-web/auth-page/src/services/auth.ts`

**问题:** `getOrganizationList` 仍有 mock 回退；`mockFirstAuthenticate`/`mockSecondAuthenticate` 含硬编码凭证仍被导出。

**目标:** 移除所有 mock 函数和回退逻辑。

---

### P2-8: 删除 forwarders.ts 死代码

**文件:** `src/services/forwarders.ts` (315行)

**问题:** `DefaultForwarder`、`CustodyForwarder`、`ForwarderRegistryImpl`、`getForwarder` 从未被导入。实际转发在 `thirdparty.routes.ts` 内联实现。

**目标:** 删除该文件。

---

### P2-9: 删除 validation-rules.ts 死代码

**文件:** `src/config/validation-rules.ts` (344行)

**问题:** 定义了 `/enterprise`、`/unit`、`/payment` 等端点的验证规则，但这些端点均不存在。

**目标:** 删除该文件。

---

### P2-10: 删除 validation.middleware.ts 死代码

**文件:** `src/middleware/validation.middleware.ts`

**问题:** 从未被导入或使用。

**目标:** 删除该文件。

---

### P2-11: 合并重复验证器文件

**文件:** `src/services/validators/common.validator.ts` (7.5KB) vs `common.validators.ts` (8KB)

**问题:** 两个几乎相同的文件，API 不同，造成混淆。`basic.validator.ts`/`resource.validator.ts` 导入单数版本；`validation-rules.ts`/`request.validators.ts`（均死代码）导入复数版本。

**目标:** 统一为一个文件，移除重复代码。

---

### P2-12: 删除 request.validators.ts 死代码

**文件:** `src/services/validators/request.validators.ts` (9.4KB)

**问题:** 仅被已死的 `validation-rules.ts` 引用。

**目标:** 删除该文件。

---

### P2-13: 删除 permission-check 死代码

**文件:** `src/services/permission-check.service.ts`, `src/middleware/permission-check.middleware.ts`

**问题:** 仅被自己的测试引用，实际权限检查使用 `admin-permission.middleware.ts`。

**目标:** 删除或整合到 `admin-permission.middleware.ts`。

---

### P2-14: 注册 getDeveloperUsers 路由

**文件:** `src/controllers/developer.controller.ts:123`

**问题:** `getDeveloperUsers` 控制器已定义但未注册到任何路由文件。

**目标:** 在路由文件中注册该端点。

---

### P2-15: getDeveloperStats 增加分页

**文件:** `src/controllers/developer.controller.ts:330-333`

**问题:** `isvRepo.findByFilters({})` 无分页，全量加载所有开发者计算统计数据。

**目标:** 使用 SQL 聚合查询（`groupBy`）替代内存统计。

---

### P2-16: 统一导入路径

**文件:** `src/middleware/audit-logging.middleware.ts:14`, `src/services/request-logger.service.ts:16`

**问题:** 使用 `.js` 扩展名导入（`from '../utils/logger.js'`），与代码库其他部分不一致。

**目标:** 统一为无扩展名导入。

---

### P2-17: 删除 developerAuthService 死代码

**文件:** `src/services/kyb-review.service.ts:694-809`

**问题:** `developerAuthService`（register/login/getById 等）是内存存储，从未被导入。

**目标:** 删除该代码块。

---

### P2-18: 删除 signature.middleware.ts 死代码

**文件:** `src/middleware/signature.middleware.ts`

**问题:** `createSignatureMiddleware` 和 `createRawBodyMiddleware` 已实现但从未使用。实际签名验证通过 `resource-validation.middleware.ts` → `common.validator.ts` (MD5) 完成。

**目标:** 删除该文件，统一签名方案。

---

### P2-19: 删除 jwt-auth.middleware.ts 死代码

**文件:** `src/middleware/jwt-auth.middleware.ts`

**问题:** RS256 Bearer JWT 认证中间件，没有路由使用它。Admin 使用 HS256（`admin-auth.middleware.ts`），ISV 使用 HS256（`isv-auth.middleware.ts`），三方 OAuth 使用 MD5 签名。

**目标:** 删除该文件。

---

### P2-20: appSecret 生成使用安全随机数

**文件:** `src/services/isv-user.service.ts:191`, `src/routes/v1/isv.routes.ts:437`

**问题:** `appSecret` 使用 `Math.random()` 生成，非密码学安全。

**目标:** 改用 `crypto.randomBytes(16).toString('hex')`。

---

### P2-21: 登录限流存储增加过期清理

**文件:** `src/controllers/admin-auth.controller.ts:37-38`

**问题:** `loginAttempts` 和 `refreshAttempts` Map 无过期清理，可导致内存耗尽。

**目标:** 实现 TTL 清理机制。

---

### P2-22: 转发路由 accountTypy 拼写错误监控

**文件:** `src/config/forward-routes.ts:170,177`

**问题:** 后端路径使用 `accountTypy`（后端拼写错误），如果后端修复拼写会导致静默 404。

**目标:** 增加自动化测试验证转发路由与后端实际路径匹配，或与后端确认后统一拼写。

---

### P2-23: 两套开发者管理系统统一

**文件:** `src/services/kyb-review.service.ts`, `src/controllers/developer.controller.ts`

**问题:** KYB 审核使用内存 `kybStore`（`kyb-review.service.ts`），开发者管理使用 Prisma `IsvDeveloper` 表（`developer.controller.ts`），形成两套并行的开发者管理系统。

**目标:** 统一使用 Prisma `IsvDeveloper` 模型。

---

### P2-24: 清理生产路径 console.log

**文件:** `src/routes/thirdparty.routes.ts:132,142,150`, `src/services/http-client.service.ts:236`

**问题:** 生产路径中 `console.log` 调试日志（包括请求路径、响应内容）。

**目标:** 替换为 debug 级别日志（winston），仅在开发环境输出。

---

## 5. Minor - 加固与规范性

### MIN-1: 移除 JWT 密钥硬编码回退值

**文件:** `src/middleware/admin-auth.middleware.ts:10`, `src/controllers/isv-auth.controller.ts:17`

**问题:** `getEnvOrDefault` 在缺少环境变量时回退到 `'dev-secret-key-change-in-production'`。

**目标:** 生产环境启动时强制检查 JWT 密钥是否存在，缺失时拒绝启动。

---

### MIN-2: 统一 JWT 方案文档化

**文件:** 多个文件

**问题:** 三套不一致的 JWT 方案：Admin 用 HS256 + JWT_SECRET，OAuth 用 RS256 + 公私钥对，ISV 用 HS256 + JWT_SECRET。

**目标:** 统一文档化 JWT 方案选择，确保每种方案的使用场景明确。

---

### MIN-3: 错误处理器加固

**文件:** `src/main.ts:133`, 多个 controller 文件

**问题:** 多个 controller 中 `console.error` 完整错误对象，可能在容器日志中泄露敏感信息。

**目标:** 统一错误处理，生产环境仅记录错误码和请求 ID，详细信息写入 debug 级别。

---

### MIN-4: 移除仓库中的种子数据凭证

**文件:** `data/admins.json`

**问题:** 包含真实的 bcrypt 哈希和 admin 邮箱。

**目标:** 种子数据从环境变量或 CI/CD 注入，不提交到仓库。

---

### MIN-5: Seed 脚本不打印明文密码

**文件:** `scripts/seed-admin.ts:164`

**问题:** `console.log(`Password: ${password}`)` 打印明文密码到标准输出。

**目标:** 移除密码打印。

---

### MIN-6: parseExpiry 支持多段时间单位

**文件:** `src/controllers/admin-auth.controller.ts:120-134`

**问题:** 正则 `/^(\d+)([smhd])$/` 仅支持单段时间单位。

**目标:** 扩展解析逻辑支持复合格式，或使用成熟的库（如 `ms`）。

---

### MIN-7: API Service 增加 CI/CD

**文件:** `.github/workflows/`

**问题:** 仅有 SDK 发布工作流，无 API Service 的构建/测试/部署流程。

**目标:** 增加 `ci-api-service.yml`：lint → typecheck → test → build。

---

### MIN-8: 增加 lint 和 typecheck 脚本

**文件:** `openplatform-api-service/package.json`

**问题:** 无 `lint` 和 `typecheck` 脚本。

**目标:** 增加 `lint`（ESLint）和 `typecheck`（`tsc --noEmit`）脚本。

---

### MIN-9: ISV 服务使用异步 bcrypt

**文件:** `src/services/isv-user.service.ts:69,100`

**问题:** `bcrypt.hashSync`/`compareSync` 阻塞事件循环，admin 路径使用异步版本。

**目标:** 改为 `bcrypt.hash`/`bcrypt.compare`。

---

### MIN-10: 实现 ISV 登出 Token 失效

**文件:** `src/controllers/isv-auth.controller.ts:207-225`

**问题:** `logout` 返回成功但不撤销 Token。

**目标:** 将 ISV 登出的 Token 加入黑名单。

---

### MIN-11: KYB 状态变更时撤销 Token

**文件:** `src/services/kyb-review.service.ts:632-634`

**问题:** `// Revoke tokens (placeholder - integrate with token service)` 后跟 `console.log(...)`。

**目标:** 实现 Token 撤销逻辑。

---

### MIN-12: 审查 .gitignore 完整性

**文件:** `.gitignore`

**问题:** 需确认 `logs/`、`.dev-pids/`、`.dev-logs/`、`data/*.json` 是否被正确排除。

**目标:** 审查并补充遗漏的忽略规则。

---

### MIN-13: 清理 authorization.controller.ts 内联签名

**文件:** `src/controllers/authorization.controller.ts:41-50,175-182,336-343`

**问题:** 自建签名串构建和 HMAC-SHA256 验证，与统一的 MD5 验证器不一致。

**目标:** 改为使用统一的验证器。

---

### MIN-14: verifyOauthToken 增加 resourceKey 归属校验

**文件:** `src/controllers/thirdparty.controller.ts:286-290`

**问题:** `oauthRepo.upsert({ appId, resourceKey, ... })` 不验证应用是否有权使用该 `resourceKey`。

**目标:** 增加 resourceKey 归属校验逻辑。

---

### MIN-15: Nonce 缓存增加 TTL 检查

**文件:** `src/middleware/nonce-cache.ts:16-19`

**问题:** `isDuplicate` 检查 `this.cache.has(key)` 不验证 TTL，过期但未清理的 nonce 被错误拒绝。

**目标:** 在 `isDuplicate` 中检查存储时间戳，超时 nonce 视为无效。

---

### MIN-16: 修复限流分层映射

**文件:** `src/middleware/rate-limit.middleware.ts:188-198`

**问题:** `getTierForApp` 始终返回 `defaultTier`，`TIER_APP_MAPPING` 配置从未生效。

**目标:** 在 P1-5 中一并修复。

---

### MIN-17: 默认 TokenService 实例化确认

**文件:** `src/services/token.service.ts:718-723`

**问题:** 如果 `/api/oauth/appToken/refresh` 端点确实不需要（P1-4 确认），则默认实例的 stub 实现无需修复，但应添加注释说明。

**目标:** 添加注释说明默认实例为 stub，仅用于内部管理端点。

---

### MIN-18: 密码明文日志移除

**文件:** `src/controllers/admin-auth.controller.ts`

**问题:** 登录时 `console.log` 打印明文密码。

**目标:** 移除所有密码相关的日志输出。

---

## 6. API 代码组织优化

### ORG-1: 目录结构整理

**目标:** 统一 `src/` 目录下的文件组织：
- 删除已确认的死代码文件（见 P2-8 ~ P2-13, P2-17 ~ P2-19）
- 合并重复的验证器文件（`common.validator.ts` + `common.validators.ts`）
- 将 `thirdparty.routes.ts` 中的 `forwardRequest` 内联函数抽取为独立模块 `src/services/forward-request.service.ts`

### ORG-2: 控制器方法命名规范

**目标:** 统一 controller 中的函数命名风格：
- 当前混用 `camelCase` 和 `getXxx` / `createXxx` 等模式
- 统一为 `getXxx`、`createXxx`、`updateXxx`、`deleteXxx` 风格

### ORG-3: 路由文件组织

**目标:**
- 确保每个 controller 方法都在对应的路由文件中注册
- 将 `admin-auth.routes.ts` 中的开发者管理路由拆分到独立的 `developer.routes.ts`
- 路由文件按功能域组织：`admin-auth`、`admin-developer`、`admin-kyb`、`admin-isv`、`admin-stats`、`isv-auth`、`isv-application` 等

### ORG-4: 中间件挂载方式规范化

**目标:**
- 将限流中间件按路由分组挂载（而非全局挂载）
- 在 `main.ts` 中添加注释说明每个中间件的作用和适用范围
- 混乱的中间件导入顺序（当前 interleaved）整理为按功能分组

### ORG-5: 服务层依赖注入规范化

**目标:**
- 当前 `tokenService` 使用默认实例（stub），缺少正式的依赖注入机制
- 统一使用工厂函数模式，在 `main.ts` 或 `startServer()` 中组装依赖

### ORG-6: 类型定义整理

**目标:**
- `src/types/` 目录下的类型定义与 `src/requests/` 目录下的请求类型有重叠
- 统一为 `src/types/` 目录，按功能域组织

### ORG-7: 环境变量统一管理

**目标:**
- 当前环境变量分散在各个文件中通过 `process.env` 直接读取
- 统一在 `src/config/` 下创建 `env.config.ts`，集中管理所有环境变量读取和默认值

### ORG-8: 错误处理统一

**目标:**
- 当前各 controller 自行处理错误，格式不完全一致
- 创建统一的错误处理中间件，支持 `ApiError` 类，自动映射错误码到 HTTP 状态码

---

## 7. 代码注释完善

### DOC-1: 签名验证流程注释

**文件:** `src/services/validators/common.validator.ts`, `src/middleware/resource-validation.middleware.ts`

**目标:** 为签名计算和验证流程添加详细注释，说明：
- Basic 签名 vs Resource 签名的区别
- business JSON 排序和 MD5 计算步骤
- 与 `docs/signature-spec.md` 的对应关系

### DOC-2: 转发路由配置注释

**文件:** `src/config/forward-routes.ts`

**目标:**
- 为每个转发路由添加业务用途说明
- 注明 `paramMapping` 中 `context` vs `url` 的来源区别
- 添加 `accountTypy` 拼写注释说明

### DOC-3: 分层验证架构注释

**文件:** `src/main.ts`

**目标:** 在文件头部添加架构说明，包括：
- 三种认证方式（Admin JWT / ISV JWT / MD5 签名）的适用场景
- 中间件挂载顺序和原因
- 路由分组说明

### DOC-4: 关键服务类 JSDoc

**文件:** `src/services/token.service.ts`, `src/services/resource-authorization.service.ts`, `src/services/application-callback.service.ts`

**目标:** 为公开方法添加完整的 JSDoc 注释（参数、返回值、异常、使用示例）

### DOC-5: Prisma Schema 注释

**文件:** `prisma/schema.prisma`

**目标:**
- 为每个模型添加业务用途说明
- 标记当前使用状态（已使用 / 未使用）
- 移除或更新 TODO 注释（如 `IsvEnterprise` 缺失）

### DOC-6: 回调机制注释

**文件:** `src/services/application-callback.service.ts`

**目标:** 添加回调签名计算、重试策略、事件类型的详细注释，与 `docs/callback-webhook-spec.md` 保持一致

---

## 8. UI 改造 - Art Design Pro 二次开发

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

## 9. 新功能规划

### NEW-1: Webhook 管理页面

**目标:**
- 在 Developer Portal 增加 Webhook 配置管理页面
- 功能：注册 Webhook URL、查看已注册列表、删除、测试发送
- 展示 Webhook 事件类型（authorization.*、transaction.*、task.*）

### NEW-2: KYB 进度可视化

**目标:**
- 在 Developer Portal 增加 KYB 审核进度页面
- 进度节点：已提交 → 审核中 → 补充材料（可选）→ 通过/驳回 → 已激活

### NEW-3: API 日志查询页面

**目标:**
- 在 Admin Portal 增加 API 调用日志查询页面
- 支持按 appId、时间范围、状态码、端点过滤
- 展示请求/响应详情

### NEW-4: Admin Portal 测试覆盖

**目标:**
- 为关键页面编写单元测试（登录、Dashboard、KYB 审核、开发者管理）
- 使用 vitest + @vue/test-utils

### NEW-5: 监控告警

**目标:**
- 基于已有的 Prometheus 指标，增加告警能力
- 定义关键指标告警阈值（错误率、延迟、QPS 异常）
- 实现告警通知（邮件/Webhook）

---

## 10. 执行清单

### 阶段一：P0 安全修复（预计 1 周）

- [ ] P0-1: 修复授权 IDOR 漏洞

### 阶段二：P1 重大修复（预计 3-4 周）

- [ ] P1-1: Metrics 管理端点增加认证
- [ ] P1-2: 修复管理员操作审计日志可伪造
- [ ] P1-3: 开发者管理路由增加角色权限检查
- [ ] P1-4: OAuth Token 签发端点修复或确认废弃
- [ ] P1-5: API 限流中间件挂载

### 阶段三：P2 技术债务 + API 组织优化 + 注释完善（预计 3-4 周）

- [ ] P2-1 ~ P2-24: 所有技术债务清理项
- [ ] ORG-1 ~ ORG-8: API 代码组织优化
- [ ] DOC-1 ~ DOC-6: 代码注释完善

### 阶段四：Minor 加固（预计 1-2 周）

- [ ] MIN-1 ~ MIN-18: 所有加固与规范性改进

### 阶段五：UI 改造（预计 4-6 周）

- [ ] UI-1 ~ UI-6: Art Design Pro 迁移

### 阶段六：新功能（预计 2-3 周）

- [ ] NEW-1 ~ NEW-5: 新功能实现

---

## 附录

### A. 关键文档引用

- [消息签名规范](../signature-spec.md)
- [第三方开发者接入指南](../thirdparty-integration-guide.md)
- [PRD - Cregis Custody 开放平台](../prd-cregis-custody-2026-02-02-cn.md)
- [Art Design Pro](https://github.com/Daymychen/art-design-pro)

### B. 不修改的对外 API

以下 API 的请求/响应结构、路由路径、签名方式不可修改：
- `/api/thirdparty/oauth/*` — OAuth 授权流程
- `/api/thirdparty/treasury/*` — 13 个 custody 转发端点
- `/api/oauth/*` — OAuth Token 管理
- `/api/thirdparty/*` catch-all — 转发请求