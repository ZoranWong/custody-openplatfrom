# Cregis Custody OpenPlatform - 完整开发需求文档

**日期:** 2026-08-13
**状态:** 待实施
**版本:** v4.0

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

核心流程（OAuth 授权 → 签名验证 → 请求转发）是完整可运行的。管理后台功能（Billing、Dashboard、KYB、审计日志）使用 mock/内存数据，存在技术债务。

**关键约束：**
- 对外三方 API（`/api/thirdparty/*`、`/api/oauth/*`）的请求/响应结构**不可修改**
- 内部管理 API（`/api/v1/admin/*`、`/api/v1/isv/*`）可在兼容前提下调整
- 管理后台 UI 基于 [Art Design Pro](https://github.com/Daymychen/art-design-pro)（Vue 3 + Element Plus + Tailwind）做二次开发

### 1.3 分层验证架构

系统采用分层验证，不同接口使用不同的认证策略：

| 接口类型 | 认证方式 | 说明 |
|---------|---------|------|
| 内部管理接口（`/api/v1/admin/*`） | JWT (HS256) + Cookie | 管理员登录态验证 |
| 内部 ISV 接口（`/api/v1/isv/*`） | JWT (HS256) Bearer | ISV 登录态验证 |
| 外部 OAuth 接口（`/api/thirdparty/oauth/*`） | appId + MD5 签名（Basic） | 验证开发者身份，不涉及资源操作 |
| 外部资源操作接口（`/api/thirdparty/treasury/*`） | appId + MD5 签名 + authorizationId（Resource） | 验证开发者身份 + 授权资源归属，转发到资源服务器 |

### 1.4 已知问题统计

| 优先级 | 数量 | 说明 |
|--------|------|------|
| P0 | 2 | 安全缺陷，必须立即修复 |
| P1 | 8 | 重大 BUG 与未完成功能 |
| P2 | 2 | 技术债务 |
| Minor | 18 | 加固与规范性改进 |
| API 组织优化 | 8 | 代码结构优化 |
| 注释完善 | 6 | 关键代码注释 |
| UI 改造 | 6 | Art Design Pro 迁移 |
| Mock→真实 | 7 | 内存/mock 数据迁移为真实实现 |
| Admin Portal | 6 | 管理后台新功能 |
| Developer Portal | 9 | 开发者门户新功能 |
| SDK 完善 | 4 | SDK 补齐遗漏 |
| 其他 | 5 | 测试、监控、验证、插件页面 |
| 补充功能 | 8 | 后期迭代（注销、导出、日志、发票等） |

---

## 2. P0 - 安全缺陷修复

### P0-1: 移除密码明文日志

**文件:** `src/controllers/admin-auth.controller.ts:191-195`

**问题:** 登录时 `console.log` 打印原始密码到标准输出：
```typescript
console.log('[Login] Password verification:', {
  inputPassword: password,
  storedHash: admin.passwordHash.substring(0, 20) + '...',
  inputLength: password.length
})
```

**目标:** 移除所有密码相关的日志输出，仅记录登录尝试的元数据（邮箱、时间、结果）。

---

### P0-2: 修复管理员操作审计身份

**文件:** `src/controllers/isv-status.controller.ts:88,133,177`, `src/controllers/developer.controller.ts:158,195`

**问题一:** `isv-status.controller.ts` 中 `adminId` 从客户端可控的 `req.headers['x-admin-id']` 读取，而非来自 JWT 认证中间件设置的 `(req as any).adminId`。管理员可伪造操作归属。

**问题二:** `developer.controller.ts` 中 `approveDeveloper` 使用 `(req as any).user?.email` 获取审核人邮箱，但 `adminAuthMiddleware` 设置的是 `(req as any).adminEmail`，导致审核人始终记录为默认值 `'admin@cregis.com'`。

**目标:**
- 将 `isv-status.controller.ts` 中 `req.headers['x-admin-id']` 改为 `(req as any).adminId`
- 将 `developer.controller.ts` 中 `(req as any).user?.email` 改为 `(req as any).adminEmail`

---

## 3. P1 - 重大 BUG 与未完成功能

### P1-1: 修复 GET /api/v1/admin/admins 路由错误

**文件:** `src/routes/v1/admin-auth.routes.ts:33`

**问题:** `router.get('/admins', adminAuthMiddleware, requireRole('super_admin'), getAdminProfile)` — 路由路径是 `/admins`（应返回管理员列表），但 handler 是 `getAdminProfile`（返回当前登录用户自己的 profile）。这是代码复制粘贴错误。

**目标:** 实现正确的管理员列表查询逻辑，或修正 handler 映射。

---

### P1-2: 实现 OAuth Token 刷新端点

**文件:** `src/services/token.service.ts:696-723`, `src/controllers/oauth.controller.ts`, `src/routes/oauth.routes.ts`

**问题:** `/api/oauth/appToken/refresh` 端点用于 admin 和 ISV 前端刷新 token。但当前 `defaultCredentialService.validateCredentials` 永远返回 `{ valid: false }`，导致 `client_credentials` grant 始终返回 "Invalid credentials"；`defaultRefreshTokenRepo.findByJti` 永远返回 `null`，导致 `refresh_token` grant 始终返回 "Refresh token not found"。

**目标:** 实现真实的 `CredentialService`（基于 `Application` 表验证 appId + appSecret）和 `RefreshTokenRepository`（基于 Prisma 持久化），确保 admin 和 ISV 前端可以正常刷新 token。

---

### P1-3: 挂载 API 限流中间件

**文件:** `src/main.ts`, `src/middleware/rate-limit.middleware.ts`, `src/middleware/admin-rate-limit.middleware.ts`

**问题:** `rateLimitMiddleware` 和 `adminRateLimitMiddleware` 均已实现但从未挂载到任何路由或全局中间件。当前仅 `admin-auth.controller.ts` 中有登录/刷新限流（内存 Map），其他所有端点无限流保护。

**目标:** 按路由分组挂载限流中间件：
- 对外三方 API → 分层限流
- 管理后台 API → 单独限流策略
- 登录/注册等敏感端点 → 严格限流

---

### P1-4: 开发者管理路由增加角色权限检查

**文件:** `src/routes/v1/admin-auth.routes.ts:36-43`

**问题:** 开发者审批/拒绝/激活/冻结/封禁路由仅使用 `adminAuthMiddleware`，无 `requireRole` 或 `requirePermission`。任何已登录管理员（包括 `viewer` 角色）均可执行这些操作。对比 `admin.routes.ts` 中 KYB/ISV 状态路由均使用了 `requirePermission`。

**目标:** 增加权限检查：
- 审批/拒绝/封禁 → `requirePermission(Resource.ISV_KYB)` 或 `requireRole('super_admin', 'admin')`
- 激活/冻结 → `requirePermission(Resource.ISV_STATUS)`

---

### P1-5: 修复 Nonce 缓存 TTL 失效

**文件:** `src/middleware/nonce-cache.ts:16-19`

**问题:** `isDuplicate` 只检查 `this.cache.has(key)`，不验证 TTL。过期但未清理的 nonce 被错误拒绝。且清理仅在 `cache.size > 10000` 时触发（`record` 方法中），正常情况下过期 nonce 永远不被清理。

**目标:** 在 `isDuplicate` 中检查存储时间戳，超时 nonce 视为无效；实现定期清理或使用 TTL Map。

---

### P1-6: Nginx 启用 HTTPS

**文件:** `deploy/nginx.conf:7-8`

**问题:** `listen 80` 仅 HTTP，无 `listen 443` SSL 配置。管理后台登录凭证通过 HTTP 明文传输。`helmet()` 设置的 HSTS 头在 HTTP 下被浏览器忽略。

**目标:** 增加 SSL/TLS 配置，HTTP 重定向到 HTTPS，启用 HSTS。

---

### P1-7: 内存存储迁移为可扩展方案

**文件:** `src/middleware/nonce-cache.ts`, `src/controllers/admin-auth.controller.ts:37-38`, `src/services/admin-auth.service.ts`

**问题:** Nonce 缓存、Token 黑名单、登录限流均为进程内存 Map。PM2 单实例运行时可工作，但水平扩展时各实例间状态不共享，nonce 重放保护和 token 黑名单失效。重启丢失所有状态。

**目标:** 将需要跨实例共享的存储迁移到 Redis：
- Nonce 缓存 → Redis（TTL 自动过期）
- Token 黑名单 → Redis
- 登录限流 → Redis

---

### P1-8: 修复 TransferTaskDetailDialog DOM XSS

**文件:** `openplatform-sdk/web/src/components/transfer/TransferTaskDetailDialog.ts:78-88,484`

**问题:** 用户数据字段（`party.name`、`party.address`、`data.amount`、`data.proposal` 等）直接拼接 HTML 模板字符串，通过 `this.overlay.innerHTML = html` 渲染，无任何转义。恶意构造的数据可执行任意 JavaScript。

**目标:** 使用 `textContent` 或 HTML 实体转义处理所有用户数据字段。

---

## 4. P2 - 技术债务清理

### P2-1: 修复 `banned` 状态不在 Schema 枚举

**文件:** `prisma/schema.prisma:42-43`, `src/controllers/developer.controller.ts:313`

**问题:** Schema 文档定义 `status` 为 `active(正常), suspended(停用), deleted(已删除)`。但 `banDeveloper` 写入 `status: 'banned'`。`getDeveloperStats` 统计计数初始化不含 `banned`，导致被封禁的开发者不被统计。由于 `status` 是 `String` 类型（非 DB enum），数据库接受 `'banned'` 但状态机不完整。

**目标:** 统一状态定义：在 Schema 中增加 `banned` 状态说明，修复 `getDeveloperStats` 统计包含 `banned`。

---

### P2-2: 修复限流分层映射

**文件:** `src/middleware/rate-limit.middleware.ts:188-198`

**问题:** `getTierForApp` 始终返回 `defaultTier`，`TIER_APP_MAPPING` 配置从未生效。在 P1-3 挂载限流中间件时一并修复。

**目标:** 实现基于 appId 的限流分层查询，支持 free/basic/pro/enterprise 四个层级。

---

## 5. Minor - 加固与规范性

### MIN-1: 签名比较使用恒定时间算法

**文件:** `src/services/validators/common.validator.ts:228,251`

**问题:** `verifyBasicSignature` 和 `verifyResourceSignature` 使用 `===` 比较签名。虽然当前系统因签名每次变化且网络噪声远大于信号而无可利用场景，但作为安全编码规范应使用恒定时间比较。

**目标:** 改用 `crypto.timingSafeEqual`。

---

### MIN-2: 移除 JWT 密钥硬编码回退值

**文件:** `src/middleware/admin-auth.middleware.ts:10`, `src/controllers/isv-auth.controller.ts:17`

**问题:** `getEnvOrDefault` 在缺少环境变量时回退到 `'dev-secret-key-change-in-production'`。

**目标:** 生产环境启动时强制检查 JWT 密钥是否存在，缺失时拒绝启动。

---

### MIN-3: 统一 JWT 方案文档化

**文件:** 多个文件

**问题:** Admin 用 HS256 + JWT_SECRET，OAuth 用 RS256 + 公私钥对，ISV 用 HS256 + JWT_SECRET。不同方案适用于不同场景，但缺少统一文档。

**目标:** 在代码注释中说明每种 JWT 方案的使用场景和原因。

---

### MIN-4: 错误处理器加固

**文件:** `src/main.ts:133`, 多个 controller 文件

**问题:** 多个 controller 中 `console.error` 完整错误对象，可能在容器日志中泄露敏感信息。

**目标:** 统一错误处理，生产环境仅记录错误码和请求 ID。

---

### MIN-5: 移除仓库中的种子数据凭证

**文件:** `data/admins.json`

**问题:** 包含真实的 bcrypt 哈希和 admin 邮箱。

**目标:** 种子数据从环境变量或 CI/CD 注入，不提交到仓库。

---

### MIN-6: Seed 脚本不打印明文密码

**文件:** `scripts/seed-admin.ts:164`

**问题:** `console.log` 打印明文密码到标准输出。

**目标:** 移除密码打印。

---

### MIN-7: parseExpiry 支持多段时间单位

**文件:** `src/controllers/admin-auth.controller.ts:120-134`

**问题:** 正则 `/^(\d+)([smhd])$/` 仅支持单段时间单位。

**目标:** 扩展解析逻辑或使用成熟的库。

---

### MIN-8: API Service 增加 CI/CD

**文件:** `.github/workflows/`

**问题:** 仅有 SDK 发布工作流，无 API Service 的构建/测试/部署流程。

**目标:** 增加 `ci-api-service.yml`。

---

### MIN-9: 增加 lint 和 typecheck 脚本

**文件:** `openplatform-api-service/package.json`

**问题:** 无 `lint` 和 `typecheck` 脚本。

**目标:** 增加 ESLint 和 `tsc --noEmit` 脚本。

---

### MIN-10: ISV 服务使用异步 bcrypt

**文件:** `src/services/isv-user.service.ts:69,100`

**问题:** `bcrypt.hashSync`/`compareSync` 阻塞事件循环。

**目标:** 改为异步版本。

---

### MIN-11: 实现 ISV 登出 Token 失效

**文件:** `src/controllers/isv-auth.controller.ts:207-225`

**问题:** `logout` 返回成功但不撤销 Token。

**目标:** 将 ISV 登出的 Token 加入黑名单。

---

### MIN-12: KYB 状态变更时撤销 Token

**文件:** `src/services/kyb-review.service.ts:632-634`

**问题:** 冻结/封禁 ISV 时不撤销其 Token。

**目标:** 实现 Token 撤销逻辑。

---

### MIN-13: 审查 .gitignore 完整性

**文件:** `.gitignore`

**问题:** 需确认 `logs/`、`.dev-pids/`、`.dev-logs/`、`data/*.json` 是否被正确排除。

**目标:** 审查并补充遗漏的忽略规则。

---

### MIN-14: 清理 authorization.controller.ts 内联签名

**文件:** `src/controllers/authorization.controller.ts`

**问题:** 自建签名串构建和 HMAC-SHA256 验证，与验证器架构不一致。

**目标:** 改为使用统一的验证器或添加注释说明原因。

---

### MIN-15: verifyOauthToken 增加 resourceKey 归属校验

**文件:** `src/controllers/thirdparty.controller.ts:286-290`

**问题:** `oauthRepo.upsert` 不验证应用是否有权使用该 `resourceKey`。

**目标:** 增加 resourceKey 归属校验逻辑。

---

### MIN-16: 默认 TokenService 实例添加说明注释

**文件:** `src/services/token.service.ts:718-723`

**问题:** 默认实例为 stub 实现，缺少说明。

**目标:** 添加注释说明默认实例需要替换为真实实现（Redis + DB）。

---

### MIN-17: 清理生产路径 console.log

**文件:** `src/routes/thirdparty.routes.ts:132,142,150`, `src/services/http-client.service.ts:236`

**问题:** 生产路径中 `console.log` 调试日志。

**目标:** 替换为 debug 级别日志。

---

### MIN-18: 删除死代码文件

**文件:**
- `src/services/forwarders.ts` (315行)
- `src/config/validation-rules.ts` (344行)
- `src/middleware/validation.middleware.ts`
- `src/services/validators/request.validators.ts` (9.4KB)
- `src/services/validators/common.validators.ts` (与 common.validator.ts 重复)
- `src/services/permission-check.service.ts`
- `src/middleware/permission-check.middleware.ts`
- `src/middleware/jwt-auth.middleware.ts`
- `src/middleware/signature.middleware.ts`
- `src/services/kyb-review.service.ts` 中的 `developerAuthService` 代码块
- `openplatform-sdk/node/src/services/` 和 `openplatform-sdk/node/src/auth/` 目录
- `openplatform-web/developer-portal/src/services/mockData.ts`
- `openplatform-web/developer-portal/src/composables/useRegistrationForm.ts` 和 `useStepNavigation.ts`

**目标:** 删除以上死代码，减少维护负担。

---

## 6. API 代码组织优化

### ORG-1: 目录结构整理

**目标:**
- 删除已确认的死代码文件（见 MIN-18）
- 合并重复的验证器文件（`common.validator.ts` + `common.validators.ts`）
- 将 `thirdparty.routes.ts` 中的 `forwardRequest` 内联函数抽取为独立模块

### ORG-2: 控制器方法命名规范

**目标:** 统一为 `getXxx`、`createXxx`、`updateXxx`、`deleteXxx` 风格。

### ORG-3: 路由文件按功能域组织

**目标:** 按 `admin-auth`、`admin-developer`、`admin-kyb`、`admin-isv`、`admin-stats`、`isv-auth`、`isv-application` 等拆分路由文件。

### ORG-4: 中间件挂载方式规范化

**目标:** 在 `main.ts` 中添加注释说明每个中间件的作用和适用范围，按功能分组整理导入顺序。

### ORG-5: 服务层依赖注入规范化

**目标:** 统一使用工厂函数模式，在 `main.ts` 或 `startServer()` 中组装依赖。

### ORG-6: 类型定义整理

**目标:** 将 `src/types/` 和 `src/requests/` 统一为 `src/types/`，按功能域组织。

### ORG-7: 环境变量统一管理

**目标:** 在 `src/config/` 下创建 `env.config.ts`，集中管理所有环境变量读取和默认值。

### ORG-8: 错误处理统一

**目标:** 创建统一的错误处理中间件，支持 `ApiError` 类，自动映射错误码到 HTTP 状态码。

---

## 7. 代码注释完善

### DOC-1: 签名验证流程注释

**文件:** `src/services/validators/common.validator.ts`, `src/middleware/resource-validation.middleware.ts`

**目标:** 添加详细注释说明 Basic 签名 vs Resource 签名的区别、计算步骤、与 `docs/signature-spec.md` 的对应关系。

### DOC-2: 转发路由配置注释

**文件:** `src/config/forward-routes.ts`

**目标:** 为每个转发路由添加业务用途说明，注明 `paramMapping` 中 `context` vs `url` 的来源区别。

### DOC-3: 分层验证架构注释

**文件:** `src/main.ts`

**目标:** 在文件头部添加架构说明，包括三种认证方式的适用场景、中间件挂载顺序和原因、路由分组说明。

### DOC-4: 关键服务类 JSDoc

**文件:** `src/services/token.service.ts`, `src/services/resource-authorization.service.ts`, `src/services/application-callback.service.ts`

**目标:** 为公开方法添加完整的 JSDoc 注释。

### DOC-5: Prisma Schema 注释

**文件:** `prisma/schema.prisma`

**目标:** 为每个模型添加业务用途说明，标记当前使用状态，更新 TODO 注释。

### DOC-6: 回调机制注释

**文件:** `src/services/application-callback.service.ts`

**目标:** 添加回调签名计算、重试策略、事件类型的详细注释，与 `docs/callback-webhook-spec.md` 保持一致。

---

## 8. UI 改造 - Art Design Pro 二次开发

### UI-1: admin-portal 迁移到 Art Design Pro 脚手架

**目标:** 在 Art Design Pro 项目结构中重建 admin-portal，复用 Layout、主题、组件体系。保持所有现有 API 调用层不变。

### UI-2: developer-portal 迁移到 Art Design Pro 脚手架

**目标:** 在 Art Design Pro 项目结构中重建 developer-portal，清理死代码。保持所有现有 API 调用层不变。

### UI-3: 表格页面统一使用 useTable

**目标:** KYB 审核列表、开发者列表、ISV 状态列表、API 统计等表格页面统一使用 `useTable` API。

### UI-4: 表单页面统一使用 ArtForm

**目标:** 注册、登录、创建应用、KYB 表单等页面统一使用 `ArtForm` 组件。

### UI-5: 引入代码规范体系

**目标:** 配置 ESLint + Prettier + Stylelint + Husky + commitlint。

### UI-6: 支持暗黑模式

**目标:** 利用 Art Design Pro 的主题系统，支持亮色/暗黑模式切换。

---

## 9. 新功能规划

### 9.1 Mock → 真实实现

以下功能当前使用 mock 数据或内存存储，需要实现为真实的数据存储和业务逻辑。

#### REAL-1: Billing 计费服务真实化

**当前状态:** `billing.service.ts` 返回硬编码的 MOCK_INVOICES、MOCK_PAYMENTS、MOCK_USAGE_STATS。

**目标:** 基于 Prisma 实现真实计费：
- 新增 Package（套餐配置）、Subscription（ISV 订阅）、Order（订单）、Payment（支付记录）模型
- 套餐支持多地区（`package_code + region`），不同地区独立定价、独立文案
- 支持体验卡（免费30天）、月卡、年卡（折扣可配置）
- 所有套餐参数（名称、价格、日调用量、折扣、有效期、功能权限）在 Admin Portal 后台可配置
- 注册审核通过后自动发放体验卡
- 实现套餐查询、下单、支付回调、订阅状态、用量检查 API

#### REAL-2: Dashboard 统计真实化

**当前状态:** `dashboard-stats.service.ts` 使用 `Math.random()` 生成所有统计数据。

**目标:** 基于 `ApiLog`、`Metric` 表实现真实数据聚合。

#### REAL-3: KYB 审核服务迁移到 Prisma

**当前状态:** `kyb-review.service.ts` 使用内存 Map（`kybStore.applications`、`kybStore.isvAccounts`）存储 KYB 审核数据和 ISV 状态。`kyb-review.controller.ts`、`kyb-history.controller.ts`、`isv-status.controller.ts` 均依赖此内存数据。但 `developer.controller.ts` 操作的是 Prisma `IsvDeveloper` 表，形成两套并行的开发者管理系统。

**目标:** 将 KYB 审核、历史、ISV 状态管理统一迁移到 Prisma `IsvDeveloper` 模型，移除内存 Map。

#### REAL-4: Audit 日志迁移到 Prisma

**当前状态:** `admin-audit.service.ts` 使用内存 Map。

**目标:** 迁移到 Prisma `ApiLog` 模型。

#### REAL-5: Trace 服务迁移到 Prisma

**当前状态:** `trace-storage.service.ts` 使用内存存储。

**目标:** 迁移到 Prisma `Trace` 模型。

#### REAL-6: Auth-page 移除 mock 降级

**当前状态:** `getOrganizationList` 仍有 mock 回退，`mockFirstAuthenticate`/`mockSecondAuthenticate` 含硬编码凭证。

**目标:** 移除所有 mock 函数和回退逻辑。

#### REAL-7: Developer Portal 移除 mock 数据

**当前状态:** `services/mockData.ts` 虽未被使用但保留在代码中；`RegisterPage.vue` 中注册流程未与后端完全同步。

**目标:** 清理 mock 数据，确保所有功能使用真实 API。

---

### 9.2 Admin Portal 新功能

#### ADMIN-1: 管理员账号管理

**说明:** 当前 `Admin` Prisma 模型支持多角色但无管理页面。`GET /api/v1/admin/admins` 路由错误指向 `getAdminProfile`（P1-1）。

**目标:**
- 修复 `/admins` 路由，实现管理员列表查询
- 实现创建管理员、编辑角色、启用/禁用管理员
- 仅 super_admin 可操作

#### ADMIN-2: 审计日志查看

**说明:** 后端已有完整的审计日志 API（`/audit/query`、`/audit/logs/:id`、`/audit/export`、`/audit/stats`），但 Admin Portal 无对应页面。

**目标:** 增加审计日志查看页面，支持按操作人、时间范围、操作类型过滤，支持导出。

#### ADMIN-3: API 调用日志查询

**说明:** Prisma 已有 `ApiLog` 模型，但无前后端实现。

**目标:** 实现 API 日志查询 API + Admin Portal 页面，支持按 appId、时间范围、状态码、端点过滤。

#### ADMIN-4: 套餐管理

**说明:** 配合 REAL-1 计费体系。

**目标:** Admin Portal 增加套餐配置页面：
- 套餐 CRUD（名称、价格、日调用量、折扣、有效期、功能权限）
- 多地区配置（`package_code + region`）
- 启用/禁用套餐

#### ADMIN-5: 订单与支付管理

**说明:** 配合 REAL-1 计费体系。

**目标:** Admin Portal 增加订单列表、支付审核（线下转账确认）、退款处理。

#### ADMIN-6: 系统公告管理

**说明:** 发布系统公告给 ISV。

**目标:** 公告 CRUD，支持定向推送（全部 ISV / 按套餐等级 / 按地区）。

---

### 9.3 Developer Portal 新功能

#### DEV-1: 套餐购买与续费

**说明:** 配合 REAL-1 计费体系。

**目标:** ISV 可查看套餐列表（按地区展示对应价格和文案）、选择套餐和周期（月卡/年卡）、下单支付、查看订单历史。

#### DEV-2: 消费明细

**说明:** ISV 需要查看详细的 API 调用计费记录。

**目标:** 展示每日 API 调用量、剩余额度、消费趋势图。

#### DEV-3: 账户充值

**说明:** 配合 REAL-1 计费体系。

**目标:** 支持在线充值、线下转账凭证上传。

#### DEV-4: KYB 审核进度

**说明:** 当前 `ProfilePage.vue` 仅显示 KYB 状态标签，无进度展示。

**目标:** 增加 KYB 审核进度页面：已提交 → 审核中 → 补充材料 → 通过/驳回 → 已激活。支持补充材料提交。

#### DEV-5: 团队成员管理

**说明:** 后端已有 `GET /isv/users`、`POST /isv/users` API，但 Developer Portal 无对应页面。

**目标:** ISV Owner 可添加/删除开发者成员，分配应用访问权限。

#### DEV-6: Webhook 配置管理

**说明:** Node SDK 已有 WebhookService，但后端路由不存在，前端无页面。

**目标:**
- 后端：实现 Webhook CRUD API（`/api/v1/isv/webhooks`）
- 前端：Webhook 配置页面（注册、列表、编辑、删除、测试发送）
- 展示 Webhook 推送日志和重试历史

#### DEV-7: API 密钥管理

**说明:** ISV 需要查看和重新生成 appSecret。

**目标:** 在应用详情页增加 appSecret 查看（脱敏）和重新生成功能。

#### DEV-8: 通知中心

**说明:** ISV 需要接收系统通知。

**目标:** 通知列表（系统公告、审核结果、额度告警、套餐到期提醒），支持已读/未读状态。

#### DEV-9: SDK 下载入口

**说明:** ISV 需要获取各语言 SDK。

**目标:** 在 Developer Portal 增加 SDK 下载页面（Java/Node.js/Web），包含安装命令和快速开始示例。

---

### 9.4 SDK 完善

#### SDK-1: Node SDK 补齐遗漏方法

**说明:** 对接文档文档中 13 个 treasury 端点，Node SDK 只实现了 7 个。遗漏：`pooling`（归集）、`createUnitAddress`（创建地址）、`listUnitAccounts`（查询账户余额）。

**目标:** 补齐遗漏的 3 个方法，确保 Node SDK 覆盖全部 13 个端点。

#### SDK-2: Java SDK 补齐遗漏方法

**说明:** 与 Node SDK 同理，且缺少 WebhookService。

**目标:** 补齐遗漏的 treasury 方法和 Webhook 服务。

#### SDK-3: Java SDK 启用 netty 和 spring-boot-starter 模块

**说明:** `pom.xml` 中两个模块被注释掉。

**目标:** 修复编译问题，启用模块。

#### SDK-4: Web SDK 测试修复

**说明:** `src/index.test.ts` 中测试用例与当前实现不一致。

**目标:** 修复测试，使其与当前 `SDKConfig` 和 `openAuthorization` 签名一致。

---

### 9.5 其他

#### OTH-1: Admin Portal 测试覆盖

**说明:** admin-portal 当前零测试。

**目标:** 为关键页面编写单元测试（登录、Dashboard、KYB 审核、开发者管理）。

#### OTH-2: 监控告警

**说明:** 基于已有的 Prometheus 指标。

**目标:** 定义关键指标告警阈值（错误率、延迟、QPS 异常），实现告警通知（邮件/Webhook）。

#### OTH-3: 邮件/短信验证

**说明:** 注册流程缺少邮箱/手机验证，`forgot-password` 是 stub。

**目标:** 实现邮箱验证码发送 + 密码重置流程。

#### OTH-4: ISV 忘记密码/重置密码

**说明:** 当前是 demo 桩。

**目标:** 实现邮箱验证码 + 密码重置。

#### OTH-5: 嵌入式插件页面（PRD 规划）

**说明:** PRD 指定四个嵌入式插件页面，当前仅实现了 OAuth 授权页和 TransferTaskDetailDialog。

**目标:** 补充 Treasury Unit 创建授权页、Policy 配置页、Policy 签名页。

---

### 9.6 补充功能（后期迭代）

#### LATE-1: ISV 自助注销

**说明:** 当前 `IsvDeveloper.status` 有 `deleted` 状态，但无对应的注销 API。

**目标:** ISV 可申请注销账号，管理员审核后执行注销。

#### LATE-2: 数据导出

**说明:** ISV 需要导出自己的 API 调用记录和消费明细。

**目标:** 支持 CSV/Excel 导出，按时间范围筛选。

#### LATE-3: ISV 侧操作日志

**说明:** ISV 需要查看团队成员的操作记录（谁创建了应用、谁修改了 Webhook 配置等）。

**目标:** 在 Developer Portal 增加操作日志页面。

#### LATE-4: API 调用限流通知

**说明:** 当日调用量接近上限时提前通知 ISV。

**目标:** 在用量达到 80%/90%/100% 时分别发送通知（邮件/站内信），引导升级套餐。

#### LATE-5: 发票管理

**说明:** ISV 购买套餐后需要开具发票。

**目标:** 支持发票申请（填写抬头、税号），管理员审核开票，ISV 查看发票历史。

#### LATE-6: Admin 多因子认证（MFA）

**说明:** 管理后台登录需要 MFA 保护。

**目标:** Admin 登录后需要 TOTP 验证，复用 auth-page 已有的 TOTP 流程。

#### LATE-7: IP 白名单

**说明:** ISV 可配置 API 调用的 IP 白名单。

**目标:** 在应用详情中增加 IP 白名单配置，API 网关层校验。

#### LATE-8: 应用转让

**说明:** ISV 将应用转让给另一个 ISV。

**目标:** 支持应用转让申请 + 接收方确认流程。

---

## 10. 执行清单

### 阶段一：P0 安全修复（预计 1 周）

- [ ] P0-1: 移除密码明文日志
- [ ] P0-2: 修复管理员操作审计身份

### 阶段二：P1 重大修复（预计 3-4 周）

- [ ] P1-1: 修复 GET /api/v1/admin/admins 路由错误
- [ ] P1-2: 实现 OAuth Token 刷新端点
- [ ] P1-3: 挂载 API 限流中间件
- [ ] P1-4: 开发者管理路由增加角色权限检查
- [ ] P1-5: 修复 Nonce 缓存 TTL 失效
- [ ] P1-6: Nginx 启用 HTTPS
- [ ] P1-7: 内存存储迁移为可扩展方案
- [ ] P1-8: 修复 TransferTaskDetailDialog DOM XSS

### 阶段三：P2 + API 组织优化 + 注释完善 + Minor（预计 3-4 周）

- [ ] P2-1: 修复 banned 状态不在 Schema 枚举
- [ ] P2-2: 修复限流分层映射
- [ ] MIN-1 ~ MIN-18: 加固与规范性改进
- [ ] ORG-1 ~ ORG-8: API 代码组织优化
- [ ] DOC-1 ~ DOC-6: 代码注释完善

### 阶段四：UI 改造（预计 4-6 周）

- [ ] UI-1 ~ UI-6: Art Design Pro 迁移

### 阶段五：Mock → 真实实现（预计 4-6 周）

- [ ] REAL-1: Billing 计费服务真实化（套餐模型 + 订阅 + 订单 + 支付）
- [ ] REAL-2: Dashboard 统计真实化
- [ ] REAL-3: KYB 审核服务迁移到 Prisma
- [ ] REAL-4: Audit 日志迁移到 Prisma
- [ ] REAL-5: Trace 服务迁移到 Prisma
- [ ] REAL-6: Auth-page 移除 mock 降级
- [ ] REAL-7: Developer Portal 移除 mock 数据

### 阶段六：Admin Portal 新功能（预计 3-4 周）

- [ ] ADMIN-1: 管理员账号管理
- [ ] ADMIN-2: 审计日志查看
- [ ] ADMIN-3: API 调用日志查询
- [ ] ADMIN-4: 套餐管理
- [ ] ADMIN-5: 订单与支付管理
- [ ] ADMIN-6: 系统公告管理

### 阶段七：Developer Portal 新功能（预计 3-4 周）

- [ ] DEV-1: 套餐购买与续费
- [ ] DEV-2: 消费明细
- [ ] DEV-3: 账户充值
- [ ] DEV-4: KYB 审核进度
- [ ] DEV-5: 团队成员管理
- [ ] DEV-6: Webhook 配置管理
- [ ] DEV-7: API 密钥管理
- [ ] DEV-8: 通知中心
- [ ] DEV-9: SDK 下载入口

### 阶段八：SDK 完善 + 其他（预计 2-3 周）

- [ ] SDK-1: Node SDK 补齐遗漏方法
- [ ] SDK-2: Java SDK 补齐遗漏方法
- [ ] SDK-3: Java SDK 启用 netty 和 spring-boot-starter
- [ ] SDK-4: Web SDK 测试修复
- [ ] OTH-1: Admin Portal 测试覆盖
- [ ] OTH-2: 监控告警
- [ ] OTH-3: 邮件/短信验证
- [ ] OTH-4: ISV 忘记密码/重置密码
- [ ] OTH-5: 嵌入式插件页面

### 阶段九：补充功能（后期迭代，预计 3-4 周）

- [ ] LATE-1: ISV 自助注销
- [ ] LATE-2: 数据导出
- [ ] LATE-3: ISV 侧操作日志
- [ ] LATE-4: API 调用限流通知
- [ ] LATE-5: 发票管理
- [ ] LATE-6: Admin 多因子认证（MFA）
- [ ] LATE-7: IP 白名单
- [ ] LATE-8: 应用转让

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
- `/api/thirdparty/*` catch-all — 转发请求

### C. 内部 API（可在兼容前提下调整）

- `/api/v1/admin/*` — 管理后台 API
- `/api/v1/isv/*` — ISV 开发者 API
- `/api/oauth/*` — 内部 OAuth Token 管理
- `/api/v1/authorizations` — 授权记录管理
