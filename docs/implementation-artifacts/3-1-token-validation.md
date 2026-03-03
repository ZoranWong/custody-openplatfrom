# Story 3.1: Token校验API

Status: done

## Story

As an **OpenPlatform backend**,
I want to validate appTokens from third-party platforms during authorization submission,
So that I can verify the request is legitimate and extract authorization context.

## Acceptance Criteria

1. Given valid appToken, When validating token, Then returns claims with appId, userId, enterpriseId, permissions
2. Given expired appToken, When validating token, Then returns token expired error
3. Given invalid appToken, When validating token, Then returns invalid token error

## Tasks / Subtasks

- [x] Task 1: Implement token validation endpoint (AC: 1-3)
  - [x] Subtask 1.1: Create POST /v1/appToken/validate endpoint
  - [x] Subtask 1.2: Implement JWT verification logic
  - [x] Subtask 1.3: Extract and validate claims (appId, userId, enterpriseId, permissions)
  - [x] Subtask 1.4: Handle expired token error
  - [x] Subtask 1.5: Handle invalid token error
- [x] Task 2: Add token validation middleware (AC: 1)
  - [x] Subtask 2.1: Create reusable middleware for protected routes
  - [x] Subtask 2.2: Integrate with existing JWT utilities
- [x] Task 3: Write unit tests (AC: All)
  - [x] Subtask 3.1: Test token validation with valid token
  - [x] Subtask 3.2: Test token validation with expired token
  - [x] Subtask 3.3: Test token validation with invalid token

---

## Story Context

### From Epic 1 (Authorization SDK MVP)

**Epic Goal:** 演示完整的授权流程（开发者集成 → 用户登录 → 授权完成）

**This Story's Role:** Module 3 Story 1 - Backend API for appToken validation

### Token Flow

1. **Developer side**: 开发者使用 appId + appSecret 在自己的服务器上生成 appToken (JWT)
2. **OpenPlatform side**: 授权页面提交授权信息时携带 appToken，OpenPlatform 校验 token 有效性

### Dependencies

- Story 2.4: 授权确认 (已完成) - 提交授权时携带 appToken
- Story 3.2: 授权信息存储 (依赖) - 存储后返回 authorizationId

---

## Technical Requirements

### API Endpoint: Token 校验 (POST /v1/appToken/validate)

开发者平台在校验 appToken 时调用:

```
POST /v1/appToken/validate
Content-Type: application/json

Request Body:
{
  "appId": "app-123",
  "appToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response (Success):
{
  "code": 200,
  "data": {
    "valid": true,
    "claims": {
      "appId": "app-123",
      "userId": "user-456",
      "enterpriseId": "ent-789",
      "permissions": ["read", "write"],
      "exp": 1735689600
    }
  }
}

Response (Error - Missing appId):
{
  "code": 40001,
  "message": "Missing required parameter: appId"
}

Response (Error - Missing appToken):
{
  "code": 40001,
  "message": "Missing required parameter: appToken"
}

Response (Error - Expired):
{
  "code": 401,
  "message": "Token expired"
}

Response (Error - Invalid):
{
  "code": 401,
  "message": "Invalid token"
}
```

### Token Format (JWT)

appToken 由开发者使用 appSecret 作为密钥生成:
- Header: `{"alg": "HS256", "typ": "JWT"}`
- Payload:
  - `appId`: 应用ID (必填)
  - `userId`: 用户ID (必填)
  - `enterpriseId`: 企业ID (必填)
  - `permissions`: 权限数组 (必填)
  - `exp`: 过期时间戳 (必填)
  - `iat`: 签发时间戳 (必填)
- Signature: HMAC-SHA256 (使用 APP_SECRET 作为密钥)

### Project Structure

```
openplatform-api-service/
├── src/
│   ├── controllers/
│   │   └── auth.controller.ts      # 认证控制器 (扩展)
│   ├── middleware/
│   │   ├── jwt-auth.middleware.ts  # JWT认证中间件 (已存在)
│   │   └── signature.middleware.ts  # 签名验证中间件
│   ├── services/
│   │   └── token.service.ts        # Token服务 (新建)
│   ├── utils/
│   │   └── jwt.util.ts             # JWT工具函数 (已存在)
│   ├── routes/
│   │   └── v1/
│   │       └── auth.routes.ts      # 认证路由 (扩展)
│   └── types/
│       └── jwt.types.ts            # JWT类型定义
├── package.json
└── tsconfig.json
```

### Database Schema

#### Applications 表 (获取 appSecret 用于验签)

```sql
SELECT id, app_id, app_name, app_secret, status
FROM applications
WHERE app_id = ? AND status = 'active'
```

#### Authorizations 表 (验证用户授权存在)

```sql
SELECT id, app_id, user_id, enterprise_id, permissions
FROM authorizations
WHERE app_id = ? AND user_id = ? AND enterprise_id = ?
```

### Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 40001 | Missing required parameter: appId | 请求中缺少 appId |
| 40001 | Missing required parameter: appToken | 请求中缺少 appToken |
| 40401 | Application not found | 应用不存在 |
| 40301 | Application is not active | 应用未激活 |
| 50001 | Application secret not configured | 应用密钥未配置 |
| 40102 | Token expired | Token 已过期 |
| 40103 | Invalid token | Token 格式错误或签名不匹配 |
| 40103 | Invalid token: appId mismatch | Token 中的 appId 与请求中的不匹配 |

---

## Architecture Compliance

### Coding Standards

- 使用 camelCase 命名 (参考 CLAUDE.md)
- Node.js/Express + TypeScript
- 控制器: PascalCase (如 AuthController)
- 工具函数: camelCase (如 jwtUtil)
- 遵循项目现有代码风格

### Testing Requirements

- 使用 Vitest 作为测试框架
- 单元测试覆盖率: 核心逻辑 100%
- Mock 外部依赖 (JWT 库)

### Security Requirements

1. Token 验证必须验证签名 (使用对应 appSecret 验签)
2. 拒绝已过期的 Token
3. 记录验证失败日志
4. 不在日志中打印敏感信息

---

## References

- [Source: docs/planning-artifacts/epic-auth-sdk-mvp.md#Story-31-Token-校验-API]
- [Source: docs/planning-artifacts/prd.md#Token校验]
- [Source: openplatform-api-service/src/utils/jwt.util.ts]
- [Source: openplatform-api-service/src/middleware/jwt-auth.middleware.ts]
- [Source: openplatform-api-service/src/types/jwt.types.ts]

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Implemented appToken validation using HS256 algorithm
- Added `validateAppToken` method to TokenService that verifies JWT signature using appSecret
- Created REST endpoint: `POST /api/v1/appToken/validate`
- Request body: `{ appId, appToken }`
- Uses ApplicationRepository to look up appSecret by appId
- Validates application status (must be 'active')
- Validates appId match between request and token claims
- Returns claims: appId, userId, enterpriseId, permissions, exp
- Handles errors: app not found (40401), app not active (40301), expired token (40102), invalid token (40103), appId mismatch (40103)
- Added 6 unit tests covering valid token, expired token, invalid token, malformed token, missing claims, and wrong algorithm

### File List (Actual)

- `openplatform-api-service/src/services/token.service.ts` - Added `validateAppToken` method with HS256 verification
- `openplatform-api-service/src/controllers/oauth.controller.ts` - Added `validateAppToken` controller function
- `openplatform-api-service/src/routes/oauth.routes.ts` - Added POST /v1/appToken/validate route
- `openplatform-api-service/src/main.ts` - Registered oauth routes under /api/v1
- `openplatform-api-service/tests/unit/app-token-validation.test.ts` - Unit tests (6 tests, all passing)
