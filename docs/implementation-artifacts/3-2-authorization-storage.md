# Story 3.2: 授权信息存储

Status: done

## Story

As an **OpenPlatform backend**,
I want to store authorization information submitted by developer platforms,
So that I can track and manage third-party platform access to custody platform resources.

## Acceptance Criteria

1. Given valid signed request with appId, appSecret, and authorization data, When submitted, Then stores authorization and returns success
2. Given request with invalid signature, When submitting, Then returns signature validation error
3. Given duplicate authorization (same appId + resourceKey), When new authorization submitted, Then updates existing record
4. Given invalid resourceKey, When submitting, Then returns error

## Tasks / Subtasks

- [x] Task 1: Implement authorization storage endpoint with HMAC signature (AC: 1-4)
  - [x] Subtask 1.1: Create POST /v1/authorizations endpoint
  - [x] Subtask 1.2: Implement HMAC signature validation
  - [x] Subtask 1.3: Parse base request body (基础信息) and business data (业务信息)
  - [x] Subtask 1.4: Implement database insert/update logic (upsert)
  - [x] Subtask 1.5: Handle errors
- [x] Task 2: Create AuthorizationRepository (AC: 1-2)
  - [x] Subtask 2.1: Define Authorization entity type
  - [x] Subtask 2.2: Implement find and save methods
- [x] Task 3: Write unit tests (AC: All)
  - [x] Subtask 3.1: Test successful authorization storage
  - [x] Subtask 3.2: Test signature validation
  - [x] Subtask 3.3: Test authorization update (duplicate)

---

## Story Context

### From Epic 1 (Authorization SDK MVP)

**Epic Goal:** 演示完整的授权流程（开发者集成 → 用户登录 → 授权完成）

**This Story's Role:** Module 3 Story 2 - Store authorization in database

### Dependencies

- Story 3.1: Token校验API (已完成)

### Flow

1. 开发者平台准备授权数据
2. 开发者使用 appSecret 对请求进行 HMAC 签名
3. 提交到 OpenPlatform `/v1/authorizations`
4. OpenPlatform 验证签名
5. 验证通过后，存储授权信息
6. 返回 authorizationId (Story 3.3)

---

## Technical Requirements

### API Endpoint: 授权信息存储 (POST /v1/authorizations)

请求体由**基础信息**和**业务信息**组成:

```
POST /v1/authorizations
Content-Type: application/json

Request Body:
{
  // ===== 基础信息 (Base Request) =====
  "appId": "app-123",
  "timestamp": 1738051200,
  "nonce": "random-string-xyz",
  "signature": "hmac-sha256-signature",

  // ===== 业务信息 (Business Data) =====
  "resourceKey": "ent-789",
  "permissions": ["read", "write"],
  "expiresAt": "2027-12-31T23:59:59Z"
}

Response (Success):
{
  "code": 200,
  "data": {
    "authorizationId": "auth-abc123",
    "createdAt": "2026-02-27T10:00:00Z"
  }
}

Response (Error - Invalid Signature):
{
  "code": 40101,
  "message": "Invalid signature"
}

Response (Error - Missing Signature):
{
  "code": 40101,
  "message": "Missing signature"
}

Response (Error - Invalid Resource):
{
  "code": 40401,
  "message": "Resource not found"
}
```

### Signature Calculation

使用 HMAC-SHA256 对业务信息进行签名:

```
signature = HMAC-SHA256(appSecret, baseString)
baseString = appId + timestamp + nonce + sortedBusinessDataJSON
```

**关键：业务信息 JSON 必须按键名升序排序后序列化**

示例：
```javascript
// 原始业务数据（键顺序可能不同）
const businessData = {
  "resourceKey": "ent-789",
  "permissions": ["read", "write"],
  "expiresAt": "2027-12-31T23:59:59Z"
};

// 按键名升序排序后序列化
const sortedBusinessData = sortObjectKeys(businessData);
// 结果: { "expiresAt": "...", "permissions": [...], "resourceKey": "..." }

const baseString = appId + timestamp + nonce + JSON.stringify(sortedBusinessData);
// 例如: "app-1231738051200random-string-xyz{"expiresAt":"2027-12-31T23:59:59Z","permissions":["read","write"],"resourceKey":"ent-789"}"

const signature = crypto.createHmac('sha256', appSecret).update(baseString).digest('hex');
```

**签名验证时**：OpenPlatform 使用相同规则重新计算签名进行比较

### Database Schema

```sql
CREATE TABLE authorizations (
  id VARCHAR(36) PRIMARY KEY,
  app_id VARCHAR(64) NOT NULL,
  resource_key VARCHAR(64) NOT NULL,
  permissions JSON,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active',
  UNIQUE KEY unique_auth (app_id, resource_key)
);
```

### Authorization Entity

```typescript
interface Authorization {
  id: string;
  appId: string;
  resourceKey: string;
  permissions: string[];
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'revoked' | 'expired';
}
```

### Project Structure

```
openplatform-api-service/
├── src/
│   ├── controllers/
│   │   └── authorization.controller.ts  # 授权控制器
│   ├── repositories/
│   │   ├── repository.interfaces.ts    # 添加 AuthorizationRepository
│   │   └── implementations/
│   │       └── authorization.repository.ts
│   ├── routes/
│   │   └── v1/
│   │       └── authorization.routes.ts
│   ├── middleware/
│   │   └── signature.middleware.ts    # 签名验证中间件 (复用现有)
│   └── types/
│       └── authorization.types.ts
├── tests/unit/
│   └── authorization-storage.test.ts
```

### Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 40101 | Missing signature | 缺少签名 |
| 40102 | Invalid signature | 签名无效 |
| 40001 | Missing required parameter | 缺少必要参数 |
| 40401 | Resource not found | 资源不存在 |
| 50001 | Failed to store authorization | 存储失败 |

---

## Architecture Compliance

### Coding Standards

- 使用 camelCase 命名 (参考 CLAUDE.md)
- Node.js/Express + TypeScript

### Testing Requirements

- 使用 Vitest 作为测试框架

---

## References

- [Source: docs/planning-artifacts/epic-auth-sdk-mvp.md#Story-32-授权信息存储]
- [Source: docs/implementation-artifacts/3-1-token-validation.md]
- [Source: openplatform-api-service/src/middleware/signature.middleware.ts]

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List (Expected)

- `openplatform-api-service/src/controllers/authorization.controller.ts`
- `openplatform-api-service/src/repositories/repository.interfaces.ts`
- `openplatform-api-service/src/repositories/implementations/authorization.repository.ts`
- `openplatform-api-service/src/repositories/repository.factory.ts` (添加 getAuthorizationRepository)
- `openplatform-api-service/src/routes/v1/authorization.routes.ts`
- `openplatform-api-service/src/main.ts` (添加路由注册)
- `openplatform-api-service/src/types/authorization.types.ts`
- `openplatform-api-service/tests/unit/authorization-storage.test.ts`
