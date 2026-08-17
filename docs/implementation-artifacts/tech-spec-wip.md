---
title: '三方API调用记录与订阅配额消费'
slug: 'api-logging-subscription-quota'
created: '2026-08-17'
status: 'in-progress'
stepsCompleted: [1]
tech_stack: ['Node.js', 'Express', 'Prisma', 'node-cron', 'TypeScript']
files_to_modify:
  - 'src/routes/thirdparty.routes.ts'
  - 'src/middleware/quota-check.middleware.ts (NEW)'
  - 'src/middleware/api-log.middleware.ts (NEW)'
  - 'src/services/quota.service.ts (NEW)'
  - 'src/services/api-log.service.ts (NEW)'
  - 'src/main.ts'
code_patterns:
  - 'Express middleware: (req, res, next) => {}'
  - 'Prisma atomic UPDATE: $executeRaw'
  - 'node-cron: cron.schedule("0 0 * * *", ...)'
  - 'Repository pattern: getXxxRepository()'
test_patterns:
  - 'Integration: verify ApiLog write + quota check + daily reset'
---

# 三方API调用记录与订阅配额消费

## 概述

**问题：** 三方 API 调用从未被记录，订阅配额从未被消费检查。

**方案：**
1. 在 `/api/thirdparty/*` 转发层写入 ApiLog（try-catch 包裹，不阻塞请求）
2. 每次调用前检查每日配额，超限返回 429
3. 使用数据库原子 UPDATE 防竞态条件
4. 每日 0 点重置 `dailyApiUsage`，启动时检查上次重置时间
5. 套餐到期自动标记 `expired`
6. ApiLog 保留 30 天，定期清理

**范围：** 只记录三方 API 调用（`/api/thirdparty/*`）

**范围外：** 不记录开发者门户内部 API、不实现 Redis 缓存、不实现超额计费

## 架构决策

1. **配额检查用数据库原子 UPDATE** — 无需 Redis，`UPDATE ... WHERE dailyApiUsage < dailyApiLimit` 防竞态
2. **ApiLog 同步写入** — try-catch 包裹，失败不阻塞请求，延迟增加 < 5ms
3. **双重重置保障** — node-cron 每日 0 点 + 启动时检查上次重置时间
4. **配额检查失败时放行** — 数据库超时 3s 时降级放行，避免因数据库问题拒绝所有请求

## 安全审查

- 签名验证（已有）确保调用者身份真实
- 配额检查（新增）防超量调用
- ApiLog 使用 Prisma JSON 类型，自动转义防注入
- 不需要额外安全措施

## 失败模式

| 组件 | 失败模式 | 缓解 |
|------|---------|------|
| ApiLog 写入 | DB 连接失败 | try-catch，不阻塞 |
| 配额检查 | DB 超时 | 3s 超时降级放行 |
| 每日重置 | cron 丢失 | 启动时检查 |
| 并发写入 | 竞态条件 | 原子 UPDATE |
| 日志膨胀 | 磁盘满 | 30 天清理 |

## 开发上下文

**技术栈：** Node.js + Express + Prisma + TypeScript

**关键文件：**
- `src/routes/thirdparty.routes.ts` — 三方 API 转发入口（在这里集成中间件）
- `src/middleware/quota-check.middleware.ts` — 新增：配额检查中间件
- `src/middleware/api-log.middleware.ts` — 新增：ApiLog 记录中间件
- `src/services/quota.service.ts` — 新增：配额检查 + 重置逻辑
- `src/main.ts` — 添加 cron 任务和启动时重置检查

**代码模式：**
- 中间件模式：`(req, res, next) => { ... }`
- Prisma 原子操作：`$executeRaw` 或 `$queryRaw`
- node-cron：`cron.schedule("0 0 * * *", ...)`
- 启动时检查：读取 `lastResetDate` 标记，超过 1 天则重置

**实现步骤：**

### Task 1: 创建 ApiLog 服务
- 文件：`src/services/api-log.service.ts`
- 接口：`createApiLog(data)` — 写入 ApiLog 记录
- try-catch 包裹，失败仅 console.error

### Task 2: 创建配额服务
- 文件：`src/services/quota.service.ts`
- 接口：
  - `checkAndIncrement(developerId)` — 原子检查并+1，返回是否超限
  - `resetDailyUsage()` — 重置所有 `dailyApiUsage = 0`
  - `checkAndResetIfNeeded()` — 启动时检查是否需要重置

### Task 3: 创建配额检查中间件
- 文件：`src/middleware/quota-check.middleware.ts`
- 逻辑：从 `req.context` 获取 developerId → 调用 `checkAndIncrement` → 超限返回 429

### Task 4: 创建 ApiLog 记录中间件
- 文件：`src/middleware/api-log.middleware.ts`
- 逻辑：请求完成后记录 appId、endpoint、status、responseTime

### Task 5: 集成到三方路由
- 修改 `src/routes/thirdparty.routes.ts`：在 `forwardRequest` 前添加配额检查，后添加日志记录

### Task 6: 添加定时任务
- 修改 `src/main.ts`：添加 node-cron 每日重置任务 + 启动时检查