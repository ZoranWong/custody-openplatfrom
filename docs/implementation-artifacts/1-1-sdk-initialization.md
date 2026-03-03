# Story 1.1: SDK初始化与配置

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **third-party developer**,
I want to initialize the SDK with my app credentials,
So that I can use the SDK to integrate authorization.

## Acceptance Criteria

1. Given SDK initialized with appId, When configuration is valid, Then SDK is ready to use
2. Given SDK is initialized, When configuration is invalid, Then error is returned with clear message
3. Given SDK is initialized, When calling authorization methods, Then token is automatically attached to requests

## Tasks / Subtasks

- [x] Task 1: 创建 SDK 项目结构 (AC: 1, 2)
  - [x] Subtask 1.1: 创建 openplatform-sdk/web 目录结构
  - [x] Subtask 1.2: 初始化 package.json
  - [x] Subtask 1.3: 配置 tsconfig.json
- [x] Task 2: 实现 SDK 初始化方法 (AC: 1, 2, 3)
  - [x] Subtask 2.1: 创建 CregisWebSDK 类
  - [x] Subtask 2.2: 实现配置验证
  - [x] Subtask 2.3: 实现错误处理
- [x] Task 3: 编写单元测试 (AC: 1, 2)
  - [x] Subtask 3.1: 初始化测试环境
  - [x] Subtask 3.2: 编写配置验证测试
  - [x] Subtask 3.3: 编写错误处理测试
- [x] Task 4: 构建和验证 (AC: 1)
  - [x] Subtask 4.1: 运行构建
  - [x] Subtask 4.2: 运行测试

## Story Context

### From Epic 1 (Authorization SDK MVP)

**Epic Goal:** 演示完整的授权流程（开发者集成 → 用户登录 → 授权完成）

**This Story's Role:** First story - SDK must be properly initialized before any other features can work

### Technical Context

| Component | Technology |
|-----------|------------|
| SDK Package | npm (@cregis/openplatform-web) |
| Language | TypeScript |
| Module | auth (授权) + message (iframe通信) |
| Integration | iframe + postMessage |

### Dependencies

- None (this is the first story in the MVP)

---

## Technical Requirements

### SDK Architecture

| Requirement | Details |
|------------|---------|
| Package Manager | npm (公有云发布) |
| Module Structure | auth + message 两个独立模块 |
| TypeScript | TypeScript 编写，支持类型提示 |

### Initialization API

```typescript
// 预期 API 设计
import { CregisWebSDK } from '@cregis/openplatform-web';

const sdk = new CregisWebSDK({
  appId: 'your-app-id',
  container: document.getElementById('cregis-container'),
  onEvent: (event) => {
    console.log('Event:', event);
  }
});
```

### Configuration Validation

- appId: Required, string
- container: Required, DOM element
- onEvent: Optional, callback function

### Error Handling

- Invalid appId: 返回明确错误码
- Missing container: 抛出 TypeError
- Network errors: 统一错误码文档

---

## Architecture Compliance

### From Architecture Document

| Rule | Compliance |
|------|------------|
| SDK 统一管理 | npm 包发布到公有云 |
| iframe 嵌入式页面 | 使用 iframe + postMessage 通信 |
| 前端 SDK | TypeScript + npm |

### Project Structure

```
openplatform-sdk/
├── web/                    # Web SDK
│   ├── src/
│   │   ├── index.ts       # 入口文件
│   │   ├── auth/          # 授权模块
│   │   └── message/       # 消息通信模块
│   ├── package.json
│   └── tsconfig.json
```

### API Design Pattern

参考现有 API Gateway 设计:
- 统一请求格式: `{ basic: {...}, data: {...} }`
- 统一响应格式: `{ code, message, data, trace_id }`

---

## Library/Framework Requirements

### Required Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| typescript | ^5.0 | TypeScript 支持 |
| vite | ^5.0 | 构建工具 |
| @types/node | ^20 | Node 类型 |

### Peer Dependencies

- None (minimal SDK)

---

## File Structure Requirements

### Required Files

| File | Purpose |
|------|---------|
| openplatform-sdk/web/package.json | npm 包配置 |
| openplatform-sdk/web/tsconfig.json | TypeScript 配置 |
| openplatform-sdk/web/src/index.ts | SDK 入口 |
| openplatform-sdk/web/src/types.ts | 类型定义 |
| openplatform-sdk/web/src/auth/index.ts | 授权模块 |
| openplatform-sdk/web/src/message/index.ts | 消息通信模块 |

### Package.json Structure

```json
{
  "name": "@cregis/openplatform-web",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {}
}
```

---

## Testing Requirements

### Unit Tests

- SDK 初始化测试
- 配置验证测试
- 错误处理测试

### Test Framework

- 使用 Jest 或 Vitest
- 覆盖率目标: 80%

---

## Dev Notes

### Implementation Sequence

1. 创建 SDK 项目结构
2. 实现基础 TypeScript 配置
3. 实现 SDK 初始化方法
4. 实现配置验证
5. 添加错误处理
6. 编写单元测试
7. 构建并发布到 npm

### Key Decisions

- 使用 Vite 作为构建工具 (快速开发体验)
- 保持最小依赖 (无运行时依赖)
- 支持 Tree Shaking

---

### References

- [Source: docs/planning-artifacts/prd.md#6-SDK-技术需求]
- [Source: docs/planning-artifacts/epic-auth-sdk-mvp.md#Story-11-SDK-初始化与配置]
- [Source: docs/planning-artifacts/architecture.md]

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Created SDK project structure with Vite + TypeScript
- Implemented CregisWebSDK class with initialization, configuration validation, and error handling
- Added iframe authorization page support with postMessage communication
- Created unit tests for SDK initialization and token management

### Code Review Fixes Applied

- Added postMessage origin validation (security fix)
- Fixed memory leak - message listener cleanup in destroy()
- Added setAllowedOrigins() and getAllowedOrigins() functions
- Re-exported message module functions from SDK entry point
- Improved test coverage with destroy() and origin validation tests

### File List

- openplatform-sdk/web/package.json
- openplatform-sdk/web/tsconfig.json
- openplatform-sdk/web/tsconfig.node.json
- openplatform-sdk/web/vite.config.ts
- openplatform-sdk/web/vitest.config.ts
- openplatform-sdk/web/src/index.ts
- openplatform-sdk/web/src/types.ts
- openplatform-sdk/web/src/index.test.ts
- openplatform-sdk/web/src/auth/index.ts
- openplatform-sdk/web/src/message/index.ts

