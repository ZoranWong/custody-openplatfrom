# Story 3.3: 授权标识返回

Status: done

## Story

As a **third-party developer**,
I want to receive an authorization identifier,
So that I can use it for subsequent API calls.

## Acceptance Criteria

1. Given authorization is stored, When third-party queries by authorizationId, Then returns full authorization details
2. Given authorization ID is returned, Then can be used for future API requests
3. Given authorization is revoked, When queried, Then returns revoked status
4. Given invalid authorization ID, When queried, Then returns 404 error

---

## Story Context

### From Epic 1 (Authorization SDK MVP)

**Epic Goal:** 演示完整的授权流程（开发者集成 → 用户登录 → 授权完成）

**This Story's Role:** Module 3 Story 3 - Return authorization ID to third-party

### Dependencies

- Story 3.2: 授权信息存储 (done) - 已完成授权存储功能

### Flow

1. 开发者平台调用 Story 3.2 接口存储授权
2. 返回 authorizationId 给开发者
3. 开发者使用 authorizationId 查询授权详情（Story 3.3）

---

## Tasks / Subtasks

- [x] Task 1: Implement GET /v1/authorizations/:id endpoint (AC: 1-4)
  - [x] Subtask 1.1: Add route for authorization query
  - [x] Subtask 1.2: Implement controller method to find by ID
  - [x] Subtask 1.3: Handle not found case
  - [x] Subtask 1.4: Add authorization validation (signature)
- [x] Task 2: Write unit tests (AC: All)
  - [x] Subtask 2.1: Test successful query
  - [x] Subtask 2.2: Test not found case
  - [x] Subtask 2.3: Test revoked status

---

## Technical Requirements

### API Endpoint: 授权详情查询 (GET /v1/authorizations/:id)

**Request:**
```
GET /api/v1/authorizations/{authorizationId}
Headers:
  X-App-Id: app-123
  X-Timestamp: 1738051200
  X-Nonce: random-string-xyz
  X-Signature: hmac-sha256-signature
```

**Response (Success):**
```json
{
  "code": 200,
  "data": {
    "authorizationId": "auth-abc123",
    "appId": "app-123",
    "resourceKey": "ent-789",
    "permissions": ["read", "write"],
    "status": "active",
    "createdAt": "2026-02-27T10:00:00Z",
    "updatedAt": "2026-02-27T10:00:00Z",
    "expiresAt": "2027-12-31T23:59:59Z"
  }
}
```

**Response (Not Found):**
```json
{
  "code": 40401,
  "message": "Authorization not found"
}
```

**Response (Revoked):**
```json
{
  "code": 200,
  "data": {
    "authorizationId": "auth-abc123",
    "status": "revoked"
  }
}
```

### Database Schema

已通过 Story 3.2 创建:
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
│   │   └── authorization.controller.ts  # 添加 getAuthorization 方法
│   ├── routes/
│   │   └── v1/
│   │       └── authorization.routes.ts  # 添加 GET /:id 路由
├── tests/unit/
│   └── authorization-query.test.ts
```

### Signature Calculation

签名验证规则同 Story 3.2:
- Path: `/v1/authorizations/{id}`
- Method: `GET`

### Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 40401 | Authorization not found | 授权记录不存在 |
| 40101 | Missing signature | 缺少签名 |
| 40102 | Invalid signature | 签名无效 |

---

## Architecture Compliance

### Coding Standards

- 使用 camelCase 命名 (参考 CLAUDE.md)
- Node.js/Express + TypeScript

### Testing Requirements

- 使用 Vitest 作为测试框架

---

## References

- [Source: docs/planning-artifacts/epic-auth-sdk-mvp.md#Story-33-授权标识返回]
- [Story 3.2: 授权信息存储](./3-2-authorization-storage.md)

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List (Expected)

- `openplatform-api-service/src/controllers/authorization.controller.ts` (添加 getAuthorization)
- `openplatform-api-service/src/routes/v1/authorization.routes.ts` (添加 GET /:id)
- `openplatform-api-service/src/repositories/repository.interfaces.ts` (添加 findById)
- `openplatform-api-service/tests/unit/authorization-query.test.ts`
