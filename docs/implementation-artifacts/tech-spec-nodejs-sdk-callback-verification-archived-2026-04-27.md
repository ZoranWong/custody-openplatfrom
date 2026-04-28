---
title: 'Node.js SDK Callback 签名验证'
slug: 'nodejs-sdk-callback-verification'
created: '2026-04-20'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - TypeScript
  - Node.js 18+
  - crypto (Node.js built-in)
  - vitest (testing)
files_to_modify:
  - openplatform-sdk/node/src/core/callback.service.ts (new)
  - openplatform-sdk/node/src/types.ts
  - openplatform-sdk/node/src/core/index.ts
  - openplatform-sdk/node/src/index.ts
  - openplatform-sdk/node/src/__tests__/callback.test.ts (new)
code_patterns:
  - SDK 实例方法模式 (public method on CregisSDK class)
  - HMAC-SHA256 签名验证
  - SDKError 错误处理模式 (SDKErrorCode.SIGNATURE_INVALID)
test_patterns:
  - vitest 测试框架
  - describe/it/expect 结构
  - vi.fn() 模拟 callback
  - Mock HTTP request 对象
---

# Tech-Spec: Node.js SDK Callback 签名验证

**Created:** 2026-04-20

## Overview

### Problem Statement

Cregis 托管平台通过 Webhook 向开发者服务器推送事件通知（交易完成、授权变更等）。当前 Node.js SDK 缺少接收和验证这些回调的能力，开发者需要自行实现签名验证逻辑，增加了集成复杂度。

### Solution

在 `CregisSDK` 类上添加 `onCallback()` 方法，该方法接收 HTTP 请求对象和回调处理器函数，自动完成签名验证，验证通过后调用用户提供的 callback 函数处理业务逻辑。

### Scope

**In Scope:**
- `onCallback()` SDK 方法
- HMAC-SHA256 签名验证（与 API 服务端保持一致）
- Callback payload 类型定义

**Out of Scope:**
- Express/Koa 中间件封装（直接使用 SDK 方法即可）
- Replay 攻击防护（timestamp 过期检查）
- 回调重试逻辑（由 API 服务端处理）

## Context for Development

### Codebase Patterns

**SDK 实例方法模式：**
```typescript
// 位于 openplatform-sdk/node/src/core/index.ts
export class CregisSDK {
  private readonly config: SDKConfig;  // 包含 appId, appSecret

  constructor(config: SDKConfig) {
    this.config = config;
  }

  // 方法签名：public onCallback(req, callback): void
  public onCallback(req: any, callback: (payload: CallbackPayload) => void): void {
    // 验证签名，调用 callback
  }
}
```

**SDKError 错误处理模式：**
```typescript
// 位于 openplatform-sdk/node/src/core/error.ts
import { SDKError, SDKErrorCode } from './error';

// 签名验证失败时抛出 SDKError
throw new SDKError(
  SDKErrorCode.SIGNATURE_INVALID,
  'Invalid callback signature'
);
```

**Request 对象兼容（Express/Koa）：**
```typescript
// Express: req.headers, req.body
// Koa: ctx.request.headers, ctx.request.body

interface CallbackRequest {
  headers: {
    'x-signature'?: string;   // 'sha256=xxx'
    'x-timestamp'?: string;   // '1234567890'
    'x-event'?: string;       // 'transaction.completed'
  };
  body: {
    appId: string;
    timestamp: string;
    event?: string;
    data: Record<string, unknown>;
  };
}
```

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `openplatform-api-service/src/services/application-callback.service.ts:73-85` | 签名算法实现参考 |
| `openplatform-sdk/node/src/core/index.ts` | CregisSDK 主类，添加新方法 |
| `openplatform-sdk/node/src/core/error.ts` | SDKError 和 SDKErrorCode |
| `openplatform-sdk/node/src/types.ts` | 类型定义 |
| `openplatform-sdk/web/src/index.test.ts` | 测试模式参考 |

### Technical Decisions

1. **签名算法**：与 API 服务端保持一致
   - **有 event 时**: `signData = appId + "." + event + "." + timestamp`
   - **无 event 时**: `signData = appId + "." + timestamp`
   - `signature = HMAC-SHA256(appSecret, signData).hex()`
   - Header 格式：`X-Signature: sha256={signature}`

2. **Request 对象兼容**：支持 Express/Koa 原生 Request 对象
   ```typescript
   // Express: req.headers, req.body
   // Koa: ctx.request.headers, ctx.request.body
   ```

3. **错误处理**：签名验证失败抛出 SDKError
   - 使用现有 `SDKErrorCode.SIGNATURE_INVALID`

4. **实现位置**：新建 `callback.service.ts` 模块化

## Implementation Plan

### Tasks

**Task 1: 创建 Callback Service 模块**
- File: `openplatform-sdk/node/src/core/callback.service.ts` (new)
- Action: 新建 `CallbackService` 类
- 实现内容：
  ```typescript
  import crypto from 'crypto';
  import { SDKError, SDKErrorCode } from './error';

  export class CallbackService {
    /**
     * 验证回调签名
     * @param params { appSecret, appId, event?, timestamp, signature }
     * @returns true if valid
     */
    verifySignature(params: {
      appSecret: string;
      appId: string;
      event?: string;
      timestamp: string;
      signature: string;
    }): boolean {
      // 构建 signData
      let signData = params.appId;
      if (params.event) {
        signData += '.' + params.event;
      }
      signData += '.' + params.timestamp;

      // 计算期望签名
      const expectedSignature = crypto
        .createHmac('sha256', params.appSecret)
        .update(signData)
        .digest('hex');

      // timingSafeEqual 防止时序攻击
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(params.signature)
      );
    }
  }
  ```

**Task 2: 添加 Callback 类型定义**
- File: `openplatform-sdk/node/src/types.ts`
- Action: 在文件末尾添加以下类型
- 实现内容：
  ```typescript
  /**
   * Callback Payload - 回调消息体
   */
  export interface CallbackPayload {
    appId: string;
    event?: string;
    timestamp: string;
    data: Record<string, unknown>;
  }

  /**
   * Callback Event Types - 回调事件类型
   */
  export type CallbackEventType =
    | 'authorization.created'
    | 'authorization.revoked'
    | 'authorization.expired'
    | 'transaction.submitted'
    | 'transaction.confirming'
    | 'transaction.completed'
    | 'transaction.failed'
    | 'task.approved'
    | 'task.rejected';

  /**
   * HTTP Request 对象接口（兼容 Express/Koa）
   */
  export interface CallbackRequest {
    headers: {
      'x-signature'?: string;
      'x-timestamp'?: string;
      'x-event'?: string;
    };
    body: CallbackPayload;
  }
  ```

**Task 3: 在 CregisSDK 添加 onCallback 方法**
- File: `openplatform-sdk/node/src/core/index.ts`
- Action: 在 `CregisSDK` 类中添加 `onCallback` 方法
- 实现内容：
  ```typescript
  import { CallbackService } from './callback.service';
  import { CallbackPayload, CallbackRequest } from '../types';

  export class CregisSDK {
    private readonly callbackService: CallbackService;

    constructor(config: SDKConfig) {
      // ... 现有代码 ...
      this.callbackService = new CallbackService();
    }

    /**
     * 处理回调请求
     * @param req Express/Koa 请求对象
     * @param callback 业务处理回调
     */
    public onCallback(
      req: CallbackRequest | { headers: any; body: any },
      callback: (payload: CallbackPayload) => void
    ): void {
      // 1. 提取 headers
      const signature = req.headers['x-signature']?.replace('sha256=', '');
      const timestamp = req.headers['x-timestamp'];
      const event = req.body?.event || req.headers['x-event'];

      // 2. 验证必需参数
      if (!signature || !timestamp) {
        throw new SDKError(
          SDKErrorCode.SIGNATURE_INVALID,
          'Missing required signature or timestamp headers'
        );
      }

      // 3. 验证签名
      const isValid = this.callbackService.verifySignature({
        appSecret: this.config.appSecret,
        appId: req.body.appId || this.config.appId,
        event,
        timestamp,
        signature,
      });

      if (!isValid) {
        throw new SDKError(
          SDKErrorCode.SIGNATURE_INVALID,
          'Invalid callback signature'
        );
      }

      // 4. debug 模式输出
      if (this.config.debug) {
        console.log('[CregisSDK] Callback verified:', { event, timestamp });
      }

      // 5. 调用业务回调
      callback(req.body as CallbackPayload);
    }
  }
  ```

**Task 4: 导出新类型**
- File: `openplatform-sdk/node/src/index.ts`
- Action: 添加导出
- 实现内容：
  ```typescript
  export { CallbackService } from './core/callback.service';
  export * from '../types';
  ```

**Task 5: 编写单元测试**
- File: `openplatform-sdk/node/src/__tests__/callback.test.ts` (new)
- Action: 创建测试文件
- 测试用例：
  - AC1-AC6 全部覆盖

### Acceptance Criteria

**AC1: 业务参数回调 - 有效签名**
- Given body.event 不存在（业务参数 callback）
- And X-Signature 正确（基于 appId + "." + timestamp 签名）
- And X-Timestamp 存在
- When 调用 sdk.onCallback(req, callback)
- Then callback 被调用，传入 payload

**AC2: 全局 Application 回调 - 有效签名**
- Given body.event 存在（全局 Application callback）
- And X-Signature 正确（基于 appId + "." + event + "." + timestamp 签名）
- When 调用 sdk.onCallback(req, callback)
- Then callback 被调用

**AC3: 签名验证失败**
- Given X-Signature 是错误的签名
- When 调用 sdk.onCallback(req, callback)
- Then 抛出 SDKError，code = 'SIGNATURE_INVALID'
- And callback 不被调用

**AC4: 缺少 X-Signature header**
- Given X-Signature header 缺失
- When 调用 sdk.onCallback(req, callback)
- Then 抛出 SDKError，code = 'SIGNATURE_INVALID'

**AC5: 缺少 X-Timestamp header**
- Given X-Timestamp header 缺失
- When 调用 sdk.onCallback(req, callback)
- Then 抛出 SDKError，code = 'SIGNATURE_INVALID'

**AC6: Koa 兼容模式**
- Given 请求对象是 Koa 格式 `{ request: { headers, body } }`
- When 调用 sdk.onCallback(koaCtx, callback)
- Then 正确提取 headers 和 body
- And 签名验证通过

## Additional Context

### Dependencies

- Node.js 内置 `crypto` 模块（无需额外依赖）
- TypeScript 类型系统
- 测试依赖：vitest（已存在于项目）

### Testing Strategy

**单元测试**（`openplatform-sdk/node/src/__tests__/callback.test.ts`）：
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { CallbackService } from '../../core/callback.service';
import { CregisSDK } from '../../core';

describe('CallbackService', () => {
  it('should verify valid signature (no event)', () => { ... });
  it('should verify valid signature (with event)', () => { ... });
  it('should reject invalid signature', () => { ... });
});

describe('CregisSDK.onCallback', () => {
  it('should call callback on valid signature (no event)', () => { ... });
  it('should call callback on valid signature (with event)', () => { ... });
  it('should throw SDKError on invalid signature', () => { ... });
  it('should throw SDKError on missing X-Signature', () => { ... });
  it('should throw SDKError on missing X-Timestamp', () => { ... });
  it('should work with Koa context', () => { ... });
});
```

**Mock 对象**：
- 模拟 Express/Koa request 对象 `{ headers: {}, body: {} }`
- 使用 crypto 直接计算有效签名进行正向测试

### Notes

- **签名验证采用 `crypto.timingSafeEqual` 防止时序攻击**
- **两种回调场景的签名格式差异**：
  - 业务参数 callback: `appId + "." + timestamp`
  - 全局 Application callback: `appId + "." + event + "." + timestamp`
  - event 来源：`body.event` 或 `X-Event header`（优先 body.event）
- **高优先级风险**：签名算法必须与 API 服务端 `ApplicationCallbackService.buildSignature` 完全一致
- **已知限制**：无 replay 攻击防护（时间戳过期检查），可根据后续需求添加
- **未来考虑**：Express/Koa 中间件封装（如 `sdk.callbackMiddleware()`），当前直接使用 `onCallback` 即可
