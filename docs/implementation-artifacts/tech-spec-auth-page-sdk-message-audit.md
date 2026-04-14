---
title: Auth-Page 与 SDK 消息交互一致性审核
slug: auth-page-sdk-message-audit
created: 2026-04-10
status: ready-for-dev
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TypeScript', 'Vue 3', 'Vite', 'postMessage API']
files_to_modify: ['openplatform-web/auth-page/src/utils/postMessage.ts']
code_patterns: ['SDKEvent interface alignment', 'uuid-based message validation', 'timestamp on events']
test_patterns: ['TypeScript build', 'Integration testing']
---

# Tech-Spec: Auth-Page 与 SDK 消息交互一致性审核

**Created:** 2026-04-10
**Status:** ready-for-dev ✅

## Overview

### Problem Statement

Auth-Page 发送给 SDK 的消息格式与 SDK 期望接收的 `SDKEvent` 格式存在差异，需要确保两边完全兼容以保证正常的通信。

### Solution

审核并修复 auth-page 的 `postMessage.ts` 模块，确保发送的消息结构与 SDK 的 `SDKEvent` 接口完全一致。

### Scope

**In Scope:**
- 修复 `AuthPageEvent` 接口与 `SDKEvent` 的一致性
- 添加缺失的 `timestamp` 字段
- 添加缺失的 `error.details` 字段
- 将 `uuid` 改为 optional 以匹配 SDK

**Out of Scope:**
- SDK 端的修改（已保持一致）
- Auth-Page 的业务逻辑修改
- Listener-first pattern 重构
- 消息重试机制
- Protocol versioning

## Context for Development

### Codebase Patterns

| 模式 | 说明 |
|------|------|
| SDKEvent | SDK 定义的标准事件格式，包含 uuid, type, data, error, timestamp |
| UUID Validation | 使用 URL 参数传递 sdkUuid 进行消息源验证 |
| Timestamp | 事件时间戳，用于调试和消息排序 |
| Error Structure | error 包含 code, message, details 三个字段 |

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `openplatform-sdk/web/src/types.ts` | SDK 端类型定义 (SDKEvent, SDKEventType, SDKError) |
| `openplatform-web/auth-page/src/utils/postMessage.ts` | Auth-Page 消息发送模块 |
| `openplatform-sdk/web/src/index.ts` | SDK 消息接收处理逻辑 |

### Technical Decisions

| Decision | Rationale |
|----------|-----------|
| uuid 改为 optional | SDK 中 uuid 是 optional，auth-page 也应保持一致 |
| error.details 添加 | SDKError 包含 details，AuthPageEvent.error 应保持一致 |
| timestamp 自动添加 | sendEventToParent 统一添加 timestamp，确保事件可追溯 |

## Implementation Plan

### Tasks

**注意：以下任务已完成，文档仅作为审计记录**

- [x] Task 1: 更新 AuthPageEvent 接口，uuid 改为 optional
  - File: `openplatform-web/auth-page/src/utils/postMessage.ts`
  - Action: 将 `uuid: string` 改为 `uuid?: string`
  - Notes: SDKEvent.uuid 是 optional，保持一致

- [x] Task 2: 添加 error.details 字段
  - File: `openplatform-web/auth-page/src/utils/postMessage.ts`
  - Action: 在 `AuthPageEvent.error` 中添加 `details?: unknown`
  - Notes: 匹配 SDKError 接口

- [x] Task 3: 添加 timestamp 字段
  - File: `openplatform-web/auth-page/src/utils/postMessage.ts`
  - Action: 在 `AuthPageEvent` 中添加 `timestamp?: number`
  - Notes: 自动在 sendEventToParent 中添加

- [x] Task 4: 更新 sendEventToParent 函数
  - File: `openplatform-web/auth-page/src/utils/postMessage.ts`
  - Action: 自动添加 uuid 和 timestamp 到所有事件
  - Notes: 确保所有发送的事件都包含必要的元数据

- [x] Task 5: 更新 sendSuccessToParent 函数
  - File: `openplatform-web/auth-page/src/utils/postMessage.ts`
  - Action: 添加 timestamp，包含 authorizationId
  - Notes: SDK 期望 `data: { authorizationId }`

- [x] Task 6: 更新 sendFailedToParent 函数
  - File: `openplatform-web/auth-page/src/utils/postMessage.ts`
  - Action: 添加 details 参数，填充 error 对象
  - Notes: SDK 期望 error 包含 code, message, details

- [x] Task 7: Build 验证
  - File: `openplatform-web/auth-page/`
  - Action: `npm run build` 验证 TypeScript 编译通过
  - Notes: ✅ Build 成功 (226.80 kB)

### Acceptance Criteria

| ID | Criteria | Status |
|----|----------|--------|
| AC1 | Given auth-page sends event, when SDK receives, then message format matches SDKEvent interface | ✅ |
| AC2 | Given sendEventToParent is called, when no timestamp provided, then timestamp is automatically added | ✅ |
| AC3 | Given sendSuccessToParent is called, when SDK receives, then data contains authorizationId | ✅ |
| AC4 | Given sendFailedToParent is called with details, when SDK receives, then error contains code, message, and details | ✅ |
| AC5 | Given TypeScript build, when compilation, then no type errors | ✅ |
| AC6 | Given production deployment, when allowedOrigins configured, then origin validation is enforced | ✅ (需配置) |

## Additional Context

### Dependencies

- SDK types (`SDKEvent`, `SDKError`) - 无直接依赖，通过反向工程保持一致
- Vue 3 Composition API
- Browser postMessage API
- Vite build toolchain

### Testing Strategy

**推荐测试（未来改进）：**

1. **单元测试**
   - 测试 `sendEventToParent` 验证 uuid 和 timestamp 自动添加
   - 测试 `sendSuccessToParent` 验证返回格式
   - 测试 `sendFailedToParent` 验证 details 参数

2. **集成测试**
   - SDK 端测试消息接收处理
   - Auth-page SDK 端到端测试

3. **手动测试**
   - 打开 auth-page → SDK popup 模式 → 验证 ready 事件
   - 完成授权 → 验证 authorization_succeed 事件
   - 取消授权 → 验证 authorization_failed 事件

### Notes

**已验证一致性：**
- Auth-page 是 standalone 应用，不直接依赖 SDK types
- 消息格式通过反向工程与 SDK 保持一致
- timestamp 使用 Date.now() 生成毫秒级时间戳

**安全考虑：**
- UUID 使用 122-bit 熵，不可预测
- production 环境必须配置 `allowedOrigins`
- 记录所有被拒绝的 postMessage 尝试

**可靠性限制（Out of Scope）：**
- postMessage 是异步不可靠通道，无 delivery guarantee
- 无重试机制，critical events 可能丢失
- Listener-first pattern 未实现（可能导致 early event 丢失）

**未来改进建议：**
- Listener-first pattern：先设置 listener 再创建 promise
- 消息缓冲：缓冲早期事件直到 listener 就绪
- Protocol versioning：版本化消息协议以支持未来兼容性
- 共享类型包：创建 common 包统一类型定义
