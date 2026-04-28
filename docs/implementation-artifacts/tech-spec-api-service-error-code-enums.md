---
title: 'API Service 错误码统一枚举重构'
slug: 'api-service-error-code-enums'
created: '2026-04-25'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TypeScript', 'Express.js']
files_to_modify:
  - 'openplatform-api-service/src/enums/http-codes.enum.ts'
  - 'openplatform-api-service/src/enums/business-codes.enum.ts'
  - 'openplatform-api-service/src/utils/signature.util.ts'
  - 'openplatform-api-service/src/services/token.service.ts'
  - 'openplatform-api-service/src/services/error-mapper.service.ts'
  - 'openplatform-api-service/src/services/validators/common.validator.ts'
  - 'openplatform-api-service/src/services/validators/resource.validator.ts'
  - 'openplatform-api-service/src/types/permission.types.ts'
  - 'openplatform-api-service/src/services/rate-limit.service.ts'
  - 'openplatform-api-service/src/services/forwarders.ts'
  - 'openplatform-api-service/src/services/validation.service.ts'
  - 'openplatform-api-service/src/middleware/resource-validation.middleware.ts'
  - 'openplatform-api-service/src/middleware/admin-auth.middleware.ts'
  - 'openplatform-api-service/src/middleware/permission-check.middleware.ts'
  - 'openplatform-api-service/src/middleware/signature.middleware.ts'
  - 'openplatform-api-service/src/middleware/admin-permission.middleware.ts'
  - 'openplatform-api-service/src/middleware/admin-rate-limit.middleware.ts'
  - 'openplatform-api-service/src/middleware/jwt-auth.middleware.ts'
  - 'openplatform-api-service/src/middleware/isv-auth.middleware.ts'
  - 'openplatform-api-service/src/middleware/validation.middleware.ts'
  - 'openplatform-api-service/src/middleware/rate-limit.middleware.ts'
  - 'openplatform-api-service/src/routes/v1/isv.routes.ts'
  - 'openplatform-api-service/src/routes/thirdparty.routes.ts'
  - 'openplatform-api-service/src/routes/metrics.routes.ts'
  - 'openplatform-api-service/src/controllers/authorization.controller.ts'
  - 'openplatform-api-service/src/controllers/thirdparty.controller.ts'
  - 'openplatform-api-service/src/controllers/admin-auth.controller.ts'
  - 'openplatform-api-service/src/controllers/isv-auth.controller.ts'
  - 'openplatform-api-service/src/controllers/oauth.controller.ts'
  - 'openplatform-api-service/src/controllers/developer.controller.ts'
  - 'openplatform-api-service/src/controllers/api-stats.controller.ts'
  - 'openplatform-api-service/src/controllers/dashboard.controller.ts'
  - 'openplatform-api-service/src/controllers/trace.controller.ts'
  - 'openplatform-api-service/src/controllers/kyb-history.controller.ts'
  - 'openplatform-api-service/src/controllers/kyb-review.controller.ts'
  - 'openplatform-api-service/src/controllers/isv-status.controller.ts'
  - 'openplatform-api-service/src/controllers/billing.controller.ts'
  - 'openplatform-api-service/src/controllers/revenue-stats.controller.ts'
  - 'openplatform-api-service/src/controllers/admin.controller.ts'
  - 'openplatform-api-service/src/controllers/health.controller.ts'
  - 'openplatform-api-service/src/main.ts'
code_patterns:
  - 'res.status(HTTP_CODE).json({ code: BUSINESS_CODE, message: "..." })'
  - 'throw { code: BUSINESS_CODE, message: "..." }'
test_patterns: []
---

# Tech-Spec: API Service 错误码统一枚举重构

**Created:** 2026-04-25

## Overview

### Problem Statement

HTTP 状态码和业务错误码以字面量和小枚举形式散落在 api-service 多个文件中（`signature.util.ts`, `token.service.ts`, `error-mapper.service.ts`, `common.validator.ts`, `resource.validator.ts`, `permission.types.ts`，以及多个 middleware、routes、controllers），维护成本高，新增错误码时容易遗漏或重复。

### Solution

- 创建 `src/enums/http-codes.enum.ts` — 统一 HTTP 状态码枚举
- 创建 `src/enums/business-codes.enum.ts` — 所有业务错误码枚举（合并 SignatureErrorCode、TokenErrorCode、ValidationErrorCodes、ResourceValidationErrorCodes、PermissionErrorCode 及所有字面量）
- 删除所有旧枚举定义
- 全局替换字面量为枚举引用

### Scope

**In Scope:**
- api-service 模块内所有文件
- 创建两个集中枚举文件
- 删除旧的分散枚举定义
- 更新所有引用处

**Out of Scope:**
- SDK 模块不改动
- 不改变错误响应格式和业务逻辑
- 不修改 `ValidationError.code` 的类型定义（保持 `number`）

## Context for Development

### Codebase Patterns

- **HTTP 响应格式**: `res.status(HTTP_CODE).json({ code: BUSINESS_CODE, message: "...", trace_id: "..." })`
- **错误抛出**: `throw { code: BUSINESS_CODE, message: "..." }`
- **错误码类型**: 5 位数字，前 1-2 位表示 HTTP 类别（40001-参数、401xx-认证、403xx-授权、404xx-未找到、409xx-冲突、429xx-限流、500xx-服务器、502xx-网关、503xx-服务不可用、504xx-网关超时）
- **现有小枚举**: `SignatureErrorCode`, `TokenErrorCode`, `ValidationErrorCodes`, `ResourceValidationErrorCodes`, `PermissionErrorCode`
- **文件命名**: kebab-case + 复数形式，与 `signature.util.ts` 等工具文件风格一致

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/utils/signature.util.ts` | SignatureErrorCode 定义处 |
| `src/services/token.service.ts` | TokenErrorCode 定义处，含字面量 40101/40102/40103 |
| `src/services/error-mapper.service.ts` | 错误映射配置，含大量字面量 |
| `src/services/validators/common.validator.ts` | ValidationErrorCodes 定义处 |
| `src/services/validators/resource.validator.ts` | ResourceValidationErrorCodes 定义处 |
| `src/types/permission.types.ts` | PermissionErrorCode 定义处 |
| `src/services/rate-limit.service.ts` | 字面量 42901 |
| `src/services/forwarders.ts` | 字面量 40101, 50201 |
| `src/services/validation.service.ts` | 字面量 40001, 40002 |
| `src/middleware/resource-validation.middleware.ts` | HTTP 字面量 400/401/405/500，业务码 40001/40103/40104/40105/40109/40501/50001 |
| `src/middleware/admin-auth.middleware.ts` | HTTP 字面量 401/403/500，业务码 40101/40102/40103/40301/50001 |
| `src/middleware/permission-check.middleware.ts` | HTTP 字面量 403，业务码 40305 |
| `src/middleware/signature.middleware.ts` | HTTP 字面量 401，使用 SignatureErrorCode |
| `src/middleware/admin-permission.middleware.ts` | HTTP 字面量 403 |
| `src/middleware/admin-rate-limit.middleware.ts` | HTTP 字面量 429 |
| `src/routes/v1/isv.routes.ts` | 业务码 40001/40002/40301/40303/40401/50001/50101 |
| `src/routes/thirdparty.routes.ts` | 业务码 40001/40002/40401/50001/50301/50401 |
| `src/main.ts` | HTTP 字面量 404/500 |

### Technical Decisions

1. **文件命名**: 使用 kebab-case + 复数形式 `http-codes.enum.ts` 和 `business-codes.enum.ts`，与项目现有 `signature.util.ts` 等工具文件命名风格一致
2. **BusinessCode 合并策略**: 所有旧枚举（SignatureErrorCode、TokenErrorCode 等）全部删除，统一到 BusinessCodes 枚举中
3. **HTTP 状态码**: HttpCodes 枚举使用原始 HTTP 数字值（200, 400, 401 等）
4. **向后兼容**: 不改变 API 响应格式，仅替换字面量为枚举引用；`ValidationError.code` 类型仍为 `number`，暂不改枚举类型
5. **替换范围**: 一次性全部替换，不分阶段，避免留下技术债

## Implementation Plan

### Tasks

- [ ] Task 1: 创建 `src/enums/http-codes.enum.ts`
  - File: `openplatform-api-service/src/enums/http-codes.enum.ts`
  - Action: 创建 HTTP 状态码枚举，包含所有在项目中使用的 HTTP 状态码
  - Notes: 枚举成员包括 OK=200, CREATED=201, BAD_REQUEST=400, UNAUTHORIZED=401, FORBIDDEN=403, NOT_FOUND=404, METHOD_NOT_ALLOWED=405, CONFLICT=409, TOO_MANY_REQUESTS=429, INTERNAL_SERVER_ERROR=500, BAD_GATEWAY=502, SERVICE_UNAVAILABLE=503, GATEWAY_TIMEOUT=504, NOT_IMPLEMENTED=501

- [ ] Task 2: 创建 `src/enums/business-codes.enum.ts`
  - File: `openplatform-api-service/src/enums/business-codes.enum.ts`
  - Action: 创建统一的业务错误码枚举，合并所有现有枚举和字面量
  - Notes: 完整枚举成员列表：
    - **参数错误 (400xx)**: `PARAM_REQUIRED = 40001`, `PARAM_INVALID_FORMAT = 40002`, `PARAM_BUSINESS_RULE = 40003`, `PARAM_DUPLICATE = 40004`, `PARAM_INVALID_STATE = 40005`
    - **认证错误 (401xx)**: `AUTH_MISSING_HEADERS = 40101`, `AUTH_INVALID_SIGNATURE = 40102`, `AUTH_TIMESTAMP_EXPIRED_OR_INVALID_TOKEN = 40103`, `AUTH_DUPLICATE_NONCE = 40104`, `AUTH_APP_NOT_ACTIVE = 40105`, `AUTH_INVALID_CREDENTIALS = 40110`, `AUTH_INVALID_REFRESH_TOKEN = 40107`, `AUTH_TOKEN_NOT_FOUND = 40401`
    - **授权错误 (403xx)**: `AUTHZ_ACCESS_DENIED = 40301`, `AUTHZ_PERMISSION_DENIED = 40302`, `AUTHZ_OPERATOR_DENIED = 40303`, `AUTHZ_SUPER_ADMIN_REQUIRED = 40304`, `AUTHZ_INSUFFICIENT_PERMISSIONS = 40305`, `AUTHZ_PERMISSION_CONFIG_NOT_FOUND = 40306`
    - **未找到 (404xx)**: `NOT_FOUND_RESOURCE = 40401`, `NOT_FOUND_ENDPOINT = 40402`
    - **冲突 (409xx)**: `CONFLICT_DUPLICATE = 40902`
    - **限流 (429xx)**: `RATE_LIMIT_EXCEEDED = 42901`
    - **服务器错误 (500xx)**: `SERVER_INTERNAL = 50001`, `SERVER_UNAVAILABLE = 50002`, `SERVER_DATABASE = 50003`, `SERVER_CACHE = 50004`
    - **网关 (502xx)**: `BAD_GATEWAY = 50201`
    - **超时 (504xx)**: `GATEWAY_TIMEOUT = 50401`, `UPSTREAM_TIMEOUT = 50402`
    - **方法不允许 (405xx)**: `METHOD_NOT_ALLOWED = 40501`
    - **未实现 (501xx)**: `NOT_IMPLEMENTED = 50101`

- [ ] Task 3: 更新 `src/middleware/signature.middleware.ts` 引用
  - File: `openplatform-api-service/src/middleware/signature.middleware.ts`
  - Action: import 改为 `import { BusinessCodes } from '../enums/business-codes'`，替换 `SignatureErrorCode.MISSING_HEADERS` → `BusinessCodes.AUTH_MISSING_HEADERS` 等，替换 `res.status(401)` → `res.status(HttpCodes.UNAUTHORIZED)`
  - Notes: 共 5 处 `res.status(401)` 和 5 处 `SignatureErrorCode.*`

- [ ] Task 4: 删除 `src/utils/signature.util.ts` 中的 SignatureErrorCode
  - File: `openplatform-api-service/src/utils/signature.util.ts`
  - Action: 删除 SignatureErrorCode 枚举定义（第 18-23 行）。**必须在 Task 3 之后执行**
  - Notes: 该文件仍保留 signature 计算和验证函数

- [ ] Task 5: 更新 `src/middleware/admin-auth.middleware.ts`
  - File: `openplatform-api-service/src/middleware/admin-auth.middleware.ts`
  - Action: import HttpCodes 和 BusinessCodes，替换 `res.status(401/403/500)` 和 `code: 40101/40102/40103/40301/50001` 字面量

- [ ] Task 6: 更新 `src/middleware/permission-check.middleware.ts`
  - File: `openplatform-api-service/src/middleware/permission-check.middleware.ts`
  - Action: import HttpCodes 和 BusinessCodes，替换 `res.status(403)` 和 `code: 40305` 字面量

- [ ] Task 7: 更新 `src/middleware/admin-permission.middleware.ts`
  - File: `openplatform-api-service/src/middleware/admin-permission.middleware.ts`
  - Action: import HttpCodes 和 BusinessCodes，替换 `res.status(403)` ×4 处，替换业务码字面量 `code: 40302`（两处）、`code: 40303`、`code: 40304`

- [ ] Task 8: 更新 `src/middleware/admin-rate-limit.middleware.ts`
  - File: `openplatform-api-service/src/middleware/admin-rate-limit.middleware.ts`
  - Action: import HttpCodes 和 BusinessCodes，替换 `res.status(429)` ×3 处，替换业务码字面量 `code: 42901` ×3 处

- [ ] Task 9: 更新 `src/middleware/resource-validation.middleware.ts`
  - File: `openplatform-api-service/src/middleware/resource-validation.middleware.ts`
  - Action: import HttpCodes 和 BusinessCodes，替换 `res.status(400/401/405/500)` 和 `code: 40001/40103/40104/40105/40109/40501/50001` 字面量，替换 `switch` 中的 `ValidationErrorCodes.*` 为 `BusinessCodes.*`
  - Notes: 注意 `sendValidationErrorResponse` 函数中的 switch 语句

- [ ] Task 10: 更新 `src/services/token.service.ts`
  - File: `openplatform-api-service/src/services/token.service.ts`
  - Action: 删除 TokenErrorCode 枚举（第 52-57 行），import BusinessCodes，替换所有 `TokenErrorCode.*` 为 `BusinessCodes.*`，替换字面量 `code: 40101/40102/40103`

- [ ] Task 11: 更新 `src/services/error-mapper.service.ts`
  - File: `openplatform-api-service/src/services/error-mapper.service.ts`
  - Action: import BusinessCodes，将 `DEFAULT_ERROR_MAPPINGS` 数组中所有字面量数字替换为 `BusinessCodes.*` 枚举引用，将 `createNetworkError` 中的 `50401/50402/50001` 替换为枚举，将 `mapCode` 中 fallback 的 `50001/40001` 替换为枚举

- [ ] Task 12: 更新 `src/services/validators/resource.validator.ts`
  - File: `openplatform-api-service/src/services/validators/resource.validator.ts`
  - Action: 删除 `ResourceValidationErrorCodes` 对象（第 39-42 行），删除 `ValidationErrorCodes` re-export（第 34 行），改为 import BusinessCodes，替换 `ResourceValidationErrorCodes.INVALID_AUTHORIZATION` 和 `ValidationErrorCodes.*`
  - Notes: **必须在 Task 13 之前执行**，因为 resource.validator.ts re-exports common.validator.ts 的 `ValidationErrorCodes`，需要先删除 re-export 再删除源定义

- [ ] Task 13: 更新 `src/services/validators/common.validator.ts`
  - File: `openplatform-api-service/src/services/validators/common.validator.ts`
  - Action: 删除 `ValidationErrorCodes` 对象定义（第 14-19 行），注意原来使用的是字符串类型（如 `'40104'`），新枚举使用数字类型（`40104`）。import BusinessCodes，替换所有 `ValidationErrorCodes.*` 为 `BusinessCodes.*`
  - Notes: **关键验证点** — 原类型为 string，改为 number 后，确认所有使用方（如 `switch` 语句、`Number()` 转换、错误比较）仍正常工作。必须在 Task 12 之后执行

- [ ] Task 14: 更新 `src/types/permission.types.ts`
  - File: `openplatform-api-service/src/types/permission.types.ts`
  - Action: 删除 `PermissionErrorCode` 枚举（第 9-12 行）

- [ ] Task 15: 更新 `src/services/rate-limit.service.ts`
  - File: `openplatform-api-service/src/services/rate-limit.service.ts`
  - Action: import BusinessCodes，替换 `code: 42901` 字面量（第 385 行）

- [ ] Task 16: 更新 `src/services/forwarders.ts`
  - File: `openplatform-api-service/src/services/forwarders.ts`
  - Action: import BusinessCodes，替换 `code: 40101` 和 `code: 50201` 字面量

- [ ] Task 17: 更新 `src/services/validation.service.ts`
  - File: `openplatform-api-service/src/services/validation.service.ts`
  - Action: import BusinessCodes，替换所有 `code: 40001` 和 `code: 40002` 字面量

- [ ] Task 18: 更新 `src/routes/v1/isv.routes.ts`
  - File: `openplatform-api-service/src/routes/v1/isv.routes.ts`
  - Action: import HttpCodes 和 BusinessCodes，替换所有 `code: 40001/40002/40301/40303/40401/50001/50101` 字面量和 `res.status(501)` 等 HTTP 状态码

- [ ] Task 19: 更新 `src/routes/thirdparty.routes.ts`
  - File: `openplatform-api-service/src/routes/thirdparty.routes.ts`
  - Action: import HttpCodes 和 BusinessCodes，替换所有 `code: 40001/40002/40401/50001/50301/50401` 字面量

- [ ] Task 20: 更新 `src/main.ts`
  - File: `openplatform-api-service/src/main.ts`
  - Action: import HttpCodes，替换全局错误处理器中的 `res.status(404/500)` 字面量

- [ ] Task 21: 更新 `src/controllers/authorization.controller.ts`
  - File: `openplatform-api-service/src/controllers/authorization.controller.ts`
  - Action: import HttpCodes 和 BusinessCodes，替换所有 `res.status(数字)` 和 `code: 字面量`（40001/40101/40301/40401/50001/200 等）

- [ ] Task 22: 更新 `src/controllers/thirdparty.controller.ts`
  - File: `openplatform-api-service/src/controllers/thirdparty.controller.ts`
  - Action: import HttpCodes 和 BusinessCodes，替换所有 `res.status(400/401/403/404/409/500)` 和对应业务码字面量

- [ ] Task 23: 更新 `src/controllers/admin-auth.controller.ts`
  - File: `openplatform-api-service/src/controllers/admin-auth.controller.ts`
  - Action: import HttpCodes 和 BusinessCodes，替换所有 `res.status(401/500)` 和 `code: 40103` 等字面量

- [ ] Task 24: 更新 `src/controllers/isv-auth.controller.ts`
  - File: `openplatform-api-service/src/controllers/isv-auth.controller.ts`
  - Action: import HttpCodes 和 BusinessCodes，替换所有 HTTP 状态码和业务码字面量

- [ ] Task 25: 更新 `src/controllers/oauth.controller.ts`
  - File: `openplatform-api-service/src/controllers/oauth.controller.ts`
  - Action: import HttpCodes 和 BusinessCodes，替换 `code: 40103` 字面量

- [ ] Task 26: 更新 `src/controllers/developer.controller.ts`
  - File: `openplatform-api-service/src/controllers/developer.controller.ts`
  - Action: import HttpCodes 和 BusinessCodes，替换 `res.status(400/404/500)` 和 `code: 400/404/500` 等字面量（注意部分 `code` 直接使用 HTTP 状态码值，如 `code: 400`，需替换为对应 BusinessCodes）

- [ ] Task 27: 更新 `src/controllers/api-stats.controller.ts`
  - File: `openplatform-api-service/src/controllers/api-stats.controller.ts`
  - Action: import HttpCodes 和 BusinessCodes，替换 `res.status(500)` 和 `code: 50001/50002/50003/50004/50005/50007/50008/50009` 字面量

- [ ] Task 28: 更新 `src/controllers/dashboard.controller.ts`
  - File: `openplatform-api-service/src/controllers/dashboard.controller.ts`
  - Action: import HttpCodes 和 BusinessCodes，替换 `res.status(400/500)` 字面量

- [ ] Task 29: 更新 `src/controllers/trace.controller.ts`
  - File: `openplatform-api-service/src/controllers/trace.controller.ts`
  - Action: import HttpCodes 和 BusinessCodes，替换 `res.status(400/404/500)` 字面量

- [ ] Task 30: 更新 `src/controllers/kyb-history.controller.ts`
  - File: `openplatform-api-service/src/controllers/kyb-history.controller.ts`
  - Action: import HttpCodes 和 BusinessCodes，替换 `res.status(404/500)` 和 `code: 50010/50011` 字面量

- [ ] Task 31: 更新 `src/controllers/kyb-review.controller.ts`
  - File: `openplatform-api-service/src/controllers/kyb-review.controller.ts`
  - Action: import HttpCodes 和 BusinessCodes，替换所有 HTTP 状态码和业务码字面量

- [ ] Task 32: 更新 `src/controllers/isv-status.controller.ts`
  - File: `openplatform-api-service/src/controllers/isv-status.controller.ts`
  - Action: import HttpCodes 和 BusinessCodes，替换所有 HTTP 状态码和业务码字面量

- [ ] Task 33: 更新 `src/controllers/billing.controller.ts`
  - File: `openplatform-api-service/src/controllers/billing.controller.ts`
  - Action: import HttpCodes 和 BusinessCodes，替换所有 HTTP 状态码和业务码字面量

- [ ] Task 34: 更新 `src/controllers/revenue-stats.controller.ts`
  - File: `openplatform-api-service/src/controllers/revenue-stats.controller.ts`
  - Action: import HttpCodes 和 BusinessCodes，替换所有 HTTP 状态码和业务码字面量

- [ ] Task 35: 更新 `src/controllers/admin.controller.ts`
  - File: `openplatform-api-service/src/controllers/admin.controller.ts`
  - Action: import HttpCodes 和 BusinessCodes，替换所有 HTTP 状态码和业务码字面量

- [ ] Task 36: 更新 `src/controllers/health.controller.ts`
  - File: `openplatform-api-service/src/controllers/health.controller.ts`
  - Action: import HttpCodes，替换 HTTP 状态码字面量（如有）

- [ ] Task 37: 更新 `src/middleware/jwt-auth.middleware.ts`
  - File: `openplatform-api-service/src/middleware/jwt-auth.middleware.ts`
  - Action: import HttpCodes 和 BusinessCodes，替换所有 HTTP 状态码和业务码字面量

- [ ] Task 38: 更新 `src/middleware/isv-auth.middleware.ts`
  - File: `openplatform-api-service/src/middleware/isv-auth.middleware.ts`
  - Action: import HttpCodes 和 BusinessCodes，替换 `code: 40103` 字面量

- [ ] Task 39: 更新 `src/middleware/validation.middleware.ts`
  - File: `openplatform-api-service/src/middleware/validation.middleware.ts`
  - Action: import HttpCodes 和 BusinessCodes，替换所有业务码字面量

- [ ] Task 40: 更新 `src/middleware/rate-limit.middleware.ts`
  - File: `openplatform-api-service/src/middleware/rate-limit.middleware.ts`
  - Action: import HttpCodes 和 BusinessCodes，替换所有 HTTP 状态码和业务码字面量

- [ ] Task 41: 更新 `src/routes/metrics.routes.ts`
  - File: `openplatform-api-service/src/routes/metrics.routes.ts`
  - Action: import HttpCodes 和 BusinessCodes，替换所有 HTTP 状态码和业务码字面量

- [ ] AC 1: Given 重构完成，当全局搜索 `res.status(数字)` 和 `code: 数字字面量`，则无残留（仅保留枚举定义处的数值）
- [ ] AC 2: Given 旧枚举已删除，当搜索 `SignatureErrorCode|TokenErrorCode|ValidationErrorCodes|ResourceValidationErrorCodes|PermissionErrorCode`，则无定义处（仅保留对 BusinessCodes 的引用）
- [ ] AC 3: Given 重构完成，当请求触发签名验证失败，则返回的 HTTP 状态码为 401，业务码为对应的 `BusinessCodes.AUTH_*` 值（与重构前行为一致）
- [ ] AC 4: Given 重构完成，当请求触发权限不足或参数验证失败，则返回的 HTTP 状态码和业务码与重构前一致

## Additional Context

### Dependencies

- 无外部依赖，纯内部重构
- 不需要新增任何 npm 包

### Testing Strategy

- 重构完成后运行 `npm run build` 验证 TypeScript 编译通过
- 运行现有测试确保行为不变（如有）
- 手动验证关键端点的错误响应格式：
  - 签名验证失败端点 → 401 + 对应业务码
  - 权限不足端点 → 403 + 对应业务码
  - 参数验证失败端点 → 400 + 对应业务码
  - Token 颁发失败 → 401 + 对应业务码

### Notes

- ValidationErrorCodes 使用字符串类型（'40104'），其他使用数字类型，统一到 BusinessCodes 枚举中使用数字类型
- error-mapper.service.ts 中的 DEFAULT_ERROR_MAPPINGS 数组需改为引用枚举值
- `main.ts` 中的全局 404/500 错误处理器容易被遗漏
- 替换 `res.status(N)` 时要注意某些地方是 `statusCode` 变量赋值而非直接调用
- 如果某个文件没有使用到旧的枚举或字面量，不需要为其添加 import
- 未来考虑：可以将 `ValidationError.code` 的类型从 `number` 改为 `BusinessCodes` 枚举，实现编译期类型安全
