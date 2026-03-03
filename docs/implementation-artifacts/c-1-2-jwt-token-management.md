# Story C.1.2: JWT Token Management

Status: done

## Story

As an **API Gateway**,
I want to manage JWT tokens for ISV authentication,
so that I can secure API access with proper token lifecycle management.

## Acceptance Criteria

**Token Issuance (via OAuth Token Endpoint C.1.3):**
- **Given** valid ISV credentials (appid + appsecret)
- **When** POST to `/oauth/token` with `grant_type=client_credentials`
- **Then** verify credentials using `CredentialService`
- **And** issue AccessToken with 2-hour expiration (7200 seconds)
- **And** issue RefreshToken with 30-day expiration (2592000 seconds)
- **And** return `{ access_token, refresh_token, expires_in, token_type }`
- **And** rate limited: 10 requests/min per IP

**Token Refresh:**
- **Given** expired AccessToken and valid RefreshToken
- **When** POST to `/oauth/token` with `grant_type=refresh_token`
- **Then** validate RefreshToken (check type='refresh', not expired)
- **And** rotate RefreshToken (new RefreshToken + new AccessToken)
- **And** revoke old RefreshToken immediately (prevent reuse)

**Token Validation Middleware:**
- **Given** incoming request with Authorization header
- **When** extracting Bearer token
- **Then** get global public key from config
- **And** verify JWT signature using RS256
- **And** verify token is not expired
- **And** check AccessToken not in blacklist (immediate revocation)
- **And** extract appid, enterprise_id, permissions from token claims
- **And** reject with 40105 for invalid/missing token
- **And** reject with 40106 for expired token (use refresh)

**Token Revocation:**
- **Given** logout request or security incident
- **When** calling POST `/oauth/revoke`
- **Then** invalidate RefreshToken immediately (Redis)
- **And** add AccessToken jti to blacklist (Redis, TTL = token remaining lifetime)

## Tasks / Subtasks

- [x] Task 1: Create JWT utility module (AC: 2-4)
  - [x] Implement JWT signing with global RSA key pair
  - [x] Implement JWT verification (RS256)
  - [x] Implement token expiration validation
  - [x] Implement token claims extraction (appid, permissions, type)
- [x] Task 2: Create JWT middleware for request authentication (AC: 3)
  - [x] Extract Authorization header, validate Bearer format
  - [x] Get global public key from config
  - [x] Verify JWT signature and expiration
  - [x] Check AccessToken blacklist
  - [x] Attach decoded claims to request object
  - [x] Generate trace_id at middleware entry
- [x] Task 3: Create token service (AC: 1-2)
  - [x] Integrate with CredentialService for validation
  - [x] Issue tokens with proper expiration (AccessToken: 2h, RefreshToken: 30d)
  - [x] Implement RefreshToken rotation (new pair on refresh)
  - [x] Implement token revocation with Redis
  - [x] Store RefreshToken records in database
- [x] Task 4: Add unit tests (AC: 1-4)
  - [x] Test JWT signing and verification
  - [x] Test token expiration handling
  - [x] Test token refresh with rotation
  - [x] Test middleware authentication
  - [x] Test revocation and blacklist

## Dev Notes

### Technical Stack & Constraints

- **Framework:** Express + TypeScript
- **JWT Library:** `jsonwebtoken` (Node.js native, RS256)
- **Key Management:** Global RSA key pair from environment variables
- **Storage:** Redis for token blacklist/revocation, MySQL for RefreshToken persistence
- **Rate Limiting:** 10 requests/min on token endpoints
- **Error Codes:**
  - `40105`: Invalid or missing AccessToken
  - `40106`: Expired AccessToken (should refresh)
  - `40107`: Invalid RefreshToken
  - `40108`: Revoked token

### JWT Token Structure

```typescript
interface AccessTokenPayload {
  appid: string;
  enterprise_id?: string;
  permissions: string[];
  iat: number;        // Issued at
  exp: number;        // Expires at (2 hours from iat)
  jti: string;        // Unique token ID (for revocation)
}

interface RefreshTokenPayload {
  appid: string;
  type: 'refresh';   // Must be 'refresh'
  iat: number;
  exp: number;       // Expires at (30 days from iat)
  jti: string;       // Unique token ID
}
```

### Database Schema (RefreshToken)

```sql
CREATE TABLE refresh_tokens (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  jti VARCHAR(36) NOT NULL UNIQUE,      -- Unique token ID
  appid VARCHAR(64) NOT NULL,           -- Application ID
  user_id VARCHAR(64) NOT NULL,         -- ISV user ID
  expires_at BIGINT NOT NULL,           -- Unix timestamp
  revoked BOOLEAN DEFAULT FALSE,         -- Immediate revocation
  replaced_by_jti VARCHAR(36),          -- For token rotation
  created_at BIGINT NOT NULL,           -- Created timestamp
  last_used_at BIGINT,                  -- Last usage timestamp
  INDEX idx_appid (appid),
  INDEX idx_expires_at (expires_at),
  INDEX idx_revoked (revoked)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Redis Keys

```
# AccessToken blacklist (immediate revocation)
jwt:blacklist:{jti} -> "1" (TTL: remaining token lifetime)

# RefreshToken revocation
jwt:revoked:{jti} -> "1" (TTL: token remaining lifetime)

# Rate limiting for token endpoints
ratelimit:token:{ip} -> counter (TTL: 60 seconds)
```

### Project Structure

```
openplatform-api-service/
├── src/
│   ├── middleware/
│   │   └── jwt-auth.middleware.ts    # JWT authentication middleware
│   │
│   ├── utils/
│   │   └── jwt.util.ts              # JWT signing/verification utilities
│   │
│   ├── services/
│   │   └── token.service.ts          # Token issuance and refresh logic
│   │
│   ├── types/
│   │   └── jwt.types.ts              # JWT type definitions
│   │
│   └── config/
│       └── jwt.config.ts             # JWT configuration (keys, expiry)
│
└── tests/
    └── unit/
        ├── jwt.test.ts               # Utility tests
        ├── jwt-auth.test.ts          # Middleware tests
        └── token.service.test.ts     # Service tests
```

### JWT Utility API

```typescript
// src/utils/jwt.util.ts

interface JWTPayload {
  appid: string;
  enterprise_id?: string;
  permissions?: string[];
  type?: string;
}

interface SignedToken {
  token: string;
  expiresAt: number;
  jti: string;
}

// Load keys from environment (global RSA key pair)
const JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY!;  // base64 encoded
const JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY!;   // base64 encoded

function signAccessToken(
  payload: Omit<AccessTokenPayload, 'iat' | 'exp' | 'jti'>,
  options?: { expiresIn?: number }
): SignedToken

function signRefreshToken(
  appid: string,
  options?: { expiresIn?: number }
): SignedToken

function verifyToken(token: string): AccessTokenPayload | null

function decodeToken(token: string): JWTPayload | null

function isTokenExpired(exp: number): boolean

function generateJti(): string  // UUID v4
```

### Token Service API

```typescript
// src/services/token.service.ts

interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface TokenClaims {
  appid: string;
  user_id: string;
  enterprise_id?: string;
  permissions?: string[];
}

class TokenService {
  constructor(
    privateKey: string,
    redisClient: Redis,
    refreshTokenRepo: RefreshTokenRepository,
    credentialService: CredentialService,
    rateLimiter: RateLimiter
  )

  async issueTokens(claims: TokenClaims): Promise<TokenPair>

  async refreshAccessToken(
    refreshToken: string,
    appid: string
  ): Promise<TokenPair>

  async revokeAccessToken(jti: string, expiresIn: number): Promise<void>

  async revokeRefreshToken(refreshToken: string): Promise<void>

  async isAccessTokenRevoked(jti: string): Promise<boolean>

  async isRefreshTokenValid(refreshToken: string): Promise<boolean>
}
```

### Middleware Implementation (CORRECTED)

```typescript
// src/middleware/jwt-auth.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { verifyToken, decodeToken } from '../utils/jwt.util';
import { getGlobalPublicKey } from '../config/jwt.config';
import { tokenService } from '../services/token.service';

interface AuthenticatedRequest extends Request {
  appid?: string;
  enterprise_id?: string;
  permissions?: string[];
  jti?: string;
  user_id?: string;
}

export const jwtAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Generate trace_id at entry (consistent with C.1.1)
  const traceId = (req.headers['x-trace-id'] as string) ||
    `jwt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  res.setHeader('X-Trace-Id', traceId);

  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      code: 40105,
      message: 'Missing or invalid Authorization header',
      trace_id: traceId,
    });
  }

  const token = authHeader.slice(7);

  // Get global public key first (NOT per-app key)
  const publicKey = getGlobalPublicKey();

  // Verify JWT using global public key
  const payload = verifyToken(token, publicKey);

  if (!payload) {
    return res.status(401).json({
      code: 40105,
      message: 'Invalid token',
      trace_id: traceId,
    });
  }

  // Check if token type is access_token (not refresh_token)
  if (payload.type === 'refresh') {
    return res.status(401).json({
      code: 40105,
      message: 'Invalid token type: use access_token',
      trace_id: traceId,
    });
  }

  // Check expiration
  if (isTokenExpired(payload.exp)) {
    return res.status(401).json({
      code: 40106,
      message: 'Token expired, please refresh',
      trace_id: traceId,
    });
  }

  // Check blacklist for immediate revocation
  if (await tokenService.isAccessTokenRevoked(payload.jti)) {
    return res.status(401).json({
      code: 40108,
      message: 'Token has been revoked',
      trace_id: traceId,
    });
  }

  // Attach payload to request
  req.appid = payload.appid;
  req.enterprise_id = payload.enterprise_id;
  req.permissions = payload.permissions;
  req.jti = payload.jti;

  next();
};
```

### Project Structure Notes

- Align with previous story C.1.1 patterns (`src/middleware/`, `src/utils/`, `src/types/`)
- JWT keys: Global RSA key pair from environment variables:
  - `JWT_PRIVATE_KEY` (base64 encoded PKCS8)
  - `JWT_PUBLIC_KEY` (base64 encoded SPKI)
- Use `jsonwebtoken` npm package (standard JWT library)
- Tests follow `tests/unit/*.test.ts` pattern using vitest
- **Scope separation:**
  - C.1.2: JWT Utility + Token Service + Auth Middleware
  - C.1.3: OAuth HTTP endpoints (`/oauth/token`, `/oauth/revoke`)

### Dependencies on Previous Work

- **C.1.1 HMAC Signature:** JWT tokens complement HMAC signatures
  - HMAC: Secures API requests (app-level authentication)
  - JWT: Secures user sessions (ISV developer authentication)
  - Both can be used together in production requests

### Integration with C.1.3 (OAuth Token Endpoint)

**C.1.2 provides:** TokenService with `issueTokens()` and `refreshAccessToken()` methods
**C.1.3 uses:** TokenService to handle HTTP endpoints

```typescript
// C.1.3 will implement:
POST /oauth/token
  ├── grant_type=client_credentials
  │   └── tokenService.issueTokens(credentials)
  └── grant_type=refresh_token
      └── tokenService.refreshAccessToken(refreshToken, appid)

POST /oauth/revoke
  └── tokenService.revokeRefreshToken(refreshToken)
```

### References

- [Source: docs/planning-artifacts/epics.md#Story-C.1.2]
- [Source: docs/planning-artifacts/architecture.md#认证与安全]
- [Source: docs/planning-artifacts/architecture.md#API-Gateway-详细结构]

## Dev Agent Record

### Agent Model Used

MiniMax-M2.1

### Debug Log References

### Completion Notes List

- All 4 tasks implemented and passing: JWT utility, middleware, token service, and unit tests
- 120 total tests passing (27 JWT util + 31 middleware + 26 token service + 36 existing)
- Key implementation details:
  - `signAccessToken`/`signRefreshToken` delegate `exp` generation to `jsonwebtoken` library
  - `TokenServiceConfig` accepts both `privateKey` and `publicKey` for test injection
  - Middleware decodes token without verification to distinguish expired vs invalid tokens
  - `jwt.config.ts` not created (keys loaded via `getJWTKeys()` in jwt.util.ts from env vars)

### File List

- `openplatform-api-service/src/utils/jwt.util.ts`
- `openplatform-api-service/src/types/jwt.types.ts`
- `openplatform-api-service/src/middleware/jwt-auth.middleware.ts`
- `openplatform-api-service/src/services/token.service.ts`
- `openplatform-api-service/tests/unit/jwt.test.ts`
- `openplatform-api-service/tests/unit/jwt-auth.test.ts`
- `openplatform-api-service/tests/unit/token.service.test.ts`

## Senior Developer Review (AI)

### Review Date

2026-02-09

### Issues Fixed

#### 🔴 CRITICAL Issues

1. **Story Overlap Fixed:** Added explicit scope separation with C.1.3
   - C.1.2: JWT core logic (utility, service, middleware)
   - C.1.3: OAuth HTTP endpoints using C.1.2 services

2. **Middleware Logic Fixed:** Changed `getAppPublicKey(req.appid)` to `getGlobalPublicKey()`
   - Circular dependency eliminated
   - Uses single global RSA key for all apps

3. **Credential Validation Added:** Integrated CredentialService interface
   - TokenService now requires CredentialService for validation
   - Clear dependency contract defined

#### 🟡 HIGH Issues Fixed

4. **Key Management Specified:** Added global RSA key from environment variables
   - `JWT_PRIVATE_KEY` (base64 PKCS8)
   - `JWT_PUBLIC_KEY` (base64 SPKI)

5. **RefreshToken Rotation Mandated:** Changed "optionally" to REQUIRED
   - Every refresh: new RefreshToken + new AccessToken
   - Old token marked as `replaced_by_jti`

6. **Token Schema Added:** Complete database schema for RefreshToken
   - Full SQL CREATE TABLE statement
   - Indexes for common queries

#### 🟡 MEDIUM Issues Fixed

7. **AccessToken Blacklist Added:** Redis blacklist for immediate revocation
   - Key: `jwt:blacklist:{jti}`
   - TTL: Remaining token lifetime

8. **RefreshToken Validation:** Added `type='refresh'` check in middleware
   - Middleware rejects refresh tokens used as access tokens

9. **Error Codes Consistent:** 40108 now properly implemented via blacklist

#### 🟢 LOW Issues Fixed

10. **trace_id Generation:** Added at middleware entry (consistent with C.1.1)
    - Format: `jwt_{timestamp}_{random}`

11. **Rate Limiting:** Added 10 requests/min per IP on token endpoints
    - Integrated RateLimiter in TokenService

12. **Error Messages:** Consistent format with trace_id included

### Final Status

✅ Story updated with all review fixes. Ready for implementation.

---

## Code Review (AI) — 2026-02-09

### Reviewer: Adversarial Senior Developer Review

### Issues Found: 4 HIGH, 4 MEDIUM, 2 LOW → All Fixed

#### 🔴 HIGH Issues Fixed

1. **JWTErrorCode 枚举重复值** — `MISSING_TOKEN`, `INVALID_TOKEN`, `INVALID_TOKEN_TYPE` 三个使用同一 code 40105
   - Fix: 给 `INVALID_TOKEN_TYPE` 分配独立 code 40109，添加 `INVALID_REFRESH_TOKEN = 40107`
   - File: `src/middleware/jwt-auth.middleware.ts:17-24`

2. **refreshAccessToken permissions 硬编码空数组** — 刷新后 AccessToken 丢失所有权限
   - Fix: 从 CredentialService 重新获取 permissions 和 enterprise_id
   - File: `src/services/token.service.ts:246-263`

3. **refreshAccessToken enterprise_id 无意义三元表达式** — `existingRecord.user_id ? undefined : undefined`
   - Fix: 同 #2，从 CredentialService 获取
   - File: `src/services/token.service.ts:256`

4. **Story File List 包含不存在的文件** — `jwt.config.ts` 声称创建但实际不存在
   - Fix: 从 File List 中移除 `jwt.config.ts`

#### 🟡 MEDIUM Issues Fixed

5. **rateLimit 硬编码 `'client'` 作为限流 key** — 所有请求共享同一限流计数器
   - Fix: `issueTokens` 和 `refreshAccessToken` 接受可选 `clientIp` 参数，fallback 到 appid
   - File: `src/services/token.service.ts:85,169`

6. **jwtAuthMiddleware 模块加载时可能抛出异常** — `getJWTKeys()` 在 DEFAULT_CONFIG 中被立即调用
   - Fix: 将 `getPublicKey` 改为 lazy 函数，加 try/catch 提供清晰错误信息
   - File: `src/middleware/jwt-auth.middleware.ts:32-38`

7. **optionalAuth 每次请求创建新中间件实例** — 且未传入 blacklist
   - Fix: 改为 `createOptionalAuth` 工厂函数 + 缓存默认实例
   - File: `src/middleware/jwt-auth.middleware.ts:196-211`

8. **TokenErrorCode.INVALID_CREDENTIALS = 40101 与 HMAC 冲突** — C.1.1 签名模块使用 40101-40104
   - Fix: 改为 40110 避免冲突
   - File: `src/services/token.service.ts:28`

#### 🟢 LOW Issues Fixed

9. **未使用的 `decodeBase64Key` 函数** — 死代码
   - Fix: 删除
   - File: `src/utils/jwt.util.ts`

10. **未使用的 `getJWTKeys` import** — token.service.ts 中多余导入
    - Fix: 删除
    - File: `src/services/token.service.ts:12`

### Test Results After Fixes

120/120 tests passing (5 test files)
