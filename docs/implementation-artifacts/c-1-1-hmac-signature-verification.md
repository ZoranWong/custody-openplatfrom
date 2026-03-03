# Story C.1.1: HMAC Signature Verification

Status: done

## Story

As an **API Gateway**,
I want to verify request signatures using HMAC-SHA256,
so that I can ensure request authenticity and prevent tampering.

## Acceptance Criteria

**Given** incoming request with signature headers
**When** extracting `appid`, `nonce`, `timestamp`, `sign` from request headers
**Then** compute expected signature using HMAC-SHA256
**And** compare with provided signature
**And** reject request if signatures don't match (401 Unauthorized)
**And** reject if timestamp is older than 5 minutes (timestamp drift check)
**And** reject if nonce is duplicate within the same time window (anti-replay)

**Required Headers:**
- `X-Appid`: Application ID
- `X-Nonce`: Unique request identifier (UUID)
- `X-Timestamp`: Unix timestamp in seconds
- `X-Sign`: HMAC-SHA256 signature

**Signature Computation:**
```
sign = HMAC-SHA256(
  secret_key,
  {appid}\n{nonce}\n{timestamp}\n{request_method}\n{request_path}\n{body}
)
```

## Tasks / Subtasks

- [x] Task 1: Create signature utility module (AC: 1-4)
  - [x] Implement HMAC-SHA256 signature computation
  - [x] Implement signature verification function
  - [x] Add timestamp validation (5-minute window)
  - [x] Add nonce duplicate check (use Redis)
- [x] Task 2: Create signature middleware (AC: 1-4)
  - [x] Extract headers from request
  - [x] Validate required headers present
  - [x] Call signature utility for verification
  - [x] Return appropriate error responses
- [x] Task 3: Add unit tests (AC: 1-4)
  - [x] Test signature computation accuracy
  - [x] Test expired timestamp rejection
  - [x] Test invalid signature rejection
  - [x] Test nonce replay prevention

## Dev Notes

### Technical Stack & Constraints

- **Framework:** Express + TypeScript
- **Cryptography:** Node.js `crypto` module (HMAC-SHA256)
- **Caching:** Redis for nonce replay prevention (InMemoryNonceCache for dev)
- **Error Codes:**
  - `40101`: Missing signature headers
  - `40102`: Invalid signature
  - `40103`: Expired timestamp
  - `40104`: Duplicate nonce

### Project Structure

```
openplatform-api-service/
├── src/
│   ├── middleware/
│   │   └── signature.middleware.ts    # Signature verification middleware
│   │   └── raw-body.middleware.ts      # Raw body parser for signature
│   │
│   ├── utils/
│   │   └── signature.util.ts          # Signature computation utilities
│   │
│   └── types/
│       └── signature.types.ts         # Type definitions for signature
│
└── tests/
    └── unit/
        ├── signature.test.ts          # Utility tests (22 tests)
        └── signature.middleware.test.ts # Middleware tests (14 tests)
```

### Signature Utility API

```typescript
// src/utils/signature.util.ts

interface SignatureParams {
  appid: string;
  nonce: string;
  timestamp: number;
  method: string;
  path: string;
  body: string;
}

function computeSignature(
  secretKey: string,
  params: SignatureParams
): string

function verifySignature(
  secretKey: string,
  providedSign: string,
  params: SignatureParams
): boolean

function isTimestampValid(timestamp: number, windowSeconds: number = 300): boolean

async function isNonceUnique(appid: string, nonce: string): Promise<boolean>

async function recordNonce(appid: string, nonce: string, ttlSeconds: number): Promise<void>
```

### Middleware Implementation

```typescript
// src/middleware/signature.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { verifySignature, isTimestampValid } from '../utils/signature.util';
import { getAppSecret } from '../services/app.service';

// Create raw body middleware first (before body-parser)
export const rawBodyMiddleware = createRawBodyMiddleware();

// Create signature middleware
export const signatureMiddleware = createSignatureMiddleware(
  getAppSecret,
  new InMemoryNonceCache()
);

// In middleware:
// - Use req.rawBody for signature verification (not JSON.stringify(req.body))
// - Use req.originalUrl for path (includes query parameters)
// - Generate trace_id at entry, attach to response header
// - Log all requests with trace_id
```

### Project Structure Notes

- Align with architecture: `src/middleware/` for middleware, `src/utils/` for utilities
- Type definitions should be in `src/types/`
- Tests follow `tests/unit/*.test.ts` pattern
- All file names use kebab-case
- Raw body middleware must be applied BEFORE body-parser

### References

- [Source: docs/planning-artifacts/epics.md#Story-C.1.1]
- [Source: docs/planning-artifacts/architecture.md#认证与安全]
- [Source: docs/planning-artifacts/architecture.md#API-Gateway-详细结构]
- [Source: docs/planning-artifacts/architecture.md#签名验证]

## Dev Agent Record

### Agent Model Used

MiniMax-M2.1

### Debug Log References

### Completion Notes List

- Successfully implemented HMAC-SHA256 signature verification for API Gateway
- Created comprehensive unit tests (36 tests passing):
  - 22 tests for signature utility functions
  - 14 tests for middleware functionality
- Key security features implemented:
  - Timing-safe signature comparison to prevent timing attacks
  - 5-minute timestamp validation window
  - Nonce replay prevention with configurable TTL
  - Configurable exclusion paths (health, ready, metrics)
- Error codes follow PRD specification (40101-40104)
- Compatible with Redis-based nonce cache for production use

### File List

- `openplatform-api-service/src/utils/signature.util.ts`
- `openplatform-api-service/src/types/signature.types.ts`
- `openplatform-api-service/src/middleware/signature.middleware.ts`
- `openplatform-api-service/tests/unit/signature.test.ts`
- `openplatform-api-service/tests/unit/signature.middleware.test.ts`
- `openplatform-api-service/vitest.config.ts`

## Change Log

- 2026-02-09: Initial implementation complete with 36 unit tests passing
- 2026-02-09: Code review fixes applied (see Senior Developer Review below)

---

## Senior Developer Review (AI)

### Review Summary

**Review Date:** 2026-02-09
**Reviewer:** Claude Code (Adversarial Code Review)
**Story Status:** Approved with fixes applied

### Findings Addressed

#### 🔴 HIGH Issues (Fixed)

1. **Body 签名未标准化** - Fixed by adding `createRawBodyMiddleware()`
   - 使用原始 body 字符串进行签名验证，而非 `JSON.stringify(req.body)`
   - 确保不同 JSON 解析库产生一致的结果

2. **req.path 不包含查询参数** - Fixed by using `req.originalUrl`
   - 签名验证使用 `req.originalUrl` 包含查询参数
   - 防止带查询参数的请求验证失败

3. **trace_id 标准化注入** - Fixed by generating trace_id at middleware entry
   - 在 middleware 入口处统一生成 trace_id
   - 注入到响应头 `X-Trace-Id`

#### 🟡 MEDIUM Issues (Fixed)

4. **缺少请求日志记录** - Fixed by adding `logRequest()` function
   - 所有请求都会记录：时间戳、traceId、方法、路径、IP、阶段
   - 阶段包括：start、pass、reject、skip

#### 🟢 LOW Issues (Fixed)

5. **generateTraceId 格式标准化** - 格式: `sig_{timestamp}_{random}`

6. **InMemoryNonceCache** - 已实现过期清理逻辑

### Tests Updated

- 所有 36 个测试通过
- 测试用例已更新以适应新的 API（originalUrl, rawBody, setHeader）

### Final Status

✅ **所有问题已修复，测试通过，故事完成**
