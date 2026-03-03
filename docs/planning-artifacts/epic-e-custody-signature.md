---
stepsCompleted: []
inputDocuments: []
---

# Epic E: Custody 消息转发签名验证 (Custody Message Forwarding Signature Verification)

**Last Updated:** 2026-03-02
**Status:** In Progress
**依赖:** Epic C (API Gateway) 已完成

---

## Overview

本 Epic 实现 Custody 消息转发的签名验证机制，确保请求者的开发者身份和授权信息得到验证。

### 核心流程

1. **资源验证**: 验证请求者身份和签名 (已合并到 e-1-1)
2. **资源授权检查**: 验证 appId 有权访问 resourceKey (e-4-1)
3. **请求转发**: 验证通过后转发到 Custody 服务 (e-5-1)

### 请求参数规范

**请求格式:**

```json
{
  "basic": {
    "appId": "uuid",
    "resourceKey": "string",
    "timestamp": 1234567890,
    "nonce": "random-string",
    "signature": "md5-hash"
  },
  "business": {
    // 业务数据
  }
}
```

### 签名算法

```
1. 对business JSON按key排序后序列化: JSON.stringify(sortKeys(business))
2. 计算business的MD5: md5 = MD5(序列化后的JSON)
3. 拼接签名字符串: appId + timestamp + nonce + md5(business)
4. 使用appSecret签名: MD5(appSecret + 签名字符串)
5. 将签名结果放入basic.signature字段
```

---

## Stories

### e-1-1: Resource Validation Middleware ✅ DONE

As a **API Gateway**,
I want to verify the developer's identity and signature from request basic info,
so that I can ensure the request is from an authenticated and authorized developer.

**实现:** `src/middleware/resource-validation.middleware.ts`

- [x] Extract appId from body.basic
- [x] Verify all required basic fields exist
- [x] Validate appId format (UUID)
- [x] Verify app exists and is active
- [x] Verify developer account is active
- [x] Validate timestamp (5 minutes)
- [x] Check nonce for replay prevention
- [x] Verify MD5 signature
- [x] Attach developer info to request context

---

### e-4-1: Resource Authorization Service

As a **Authorization Service**,
I want to verify that the appId has permission to access the resourceKey,
so that I can enforce access control.

**Acceptance Criteria:**

- [ ] Query authorization records by appId and resourceKey
- [ ] Check if authorization is active and not expired
- [ ] Verify authorization scope covers the requested operation
- [ ] Return authorization result with details
- [ ] Return 403 if not authorized

**实现位置:** `src/services/resource-authorization.service.ts`

---

### e-4-2: Authorization Cache Layer (Optional)

As a **System**,
I want to cache authorization results,
so that I can improve performance for repeated requests.

**Acceptance Criteria:**

- [ ] Cache authorization check results with TTL
- [ ] Invalidate cache on authorization changes
- [ ] Handle cache misses gracefully

---

### e-5-1: Authorization Forwarding Middleware

As a **API Gateway**,
I want to forward verified requests to the custody service,
so that authorized requests can access custody resources.

**Acceptance Criteria:**

- [ ] Build forwarding request with authorization context
- [ ] Add required headers (authorization info)
- [ ] Forward request to appropriate custody service endpoint
- [ ] Handle service responses and errors
- [ ] Return service response to client

**实现位置:** `src/middleware/custody-forwarding.middleware.ts`

---

### e-5-2: Error Handling and Logging

As a **System**,
I want to properly handle errors and log security events,
so that I can troubleshoot issues and detect attacks.

**Acceptance Criteria:**

- [ ] Log signature verification failures with details
- [ ] Log authorization failures
- [ ] Return appropriate error codes to client
- [ ] Mask sensitive information in logs

---

## Client-Side Stories (SDK)

### e-2-1: Signature Parameter Builder

As a **SDK Client**,
I want to build signed request parameters,
so that I can make authorized requests to the custody platform.

**Acceptance Criteria:**

- [ ] Build base parameters: appId, resourceKey, timestamp, nonce
- [ ] Calculate JSON data MD5 with consistent serialization
- [ ] Generate signature using appSecret
- [ ] Include signature in request

**实现位置:** `openplatform-sdk/src/utils/signature.ts`

---

### e-2-2: JSON Serialization Utility

As a **SDK Client**,
I want to ensure JSON serialization is consistent between frontend and backend,
so that the MD5 hash of business data matches on both sides.

**Acceptance Criteria:**

- [ ] Define JSON serialization rules (key order, number format, date format)
- [ ] Create serializer utility with consistent config
- [ ] Support nested objects and arrays
- [ ] Handle special values (null, undefined, empty strings)

**实现位置:** `openplatform-sdk/src/utils/json-serializer.ts`

---

## Technical Notes

### 文件位置

- API Gateway: `openplatform-api-service/src/middleware/`
- API Gateway Services: `openplatform-api-service/src/services/`
- Client SDK: `openplatform-sdk/`

### 依赖服务

- MySQL (已实现 - Epic D)
- Redis (可选, for caching)
- Custody Services (已实现 - Epic C)

### 环境变量

```bash
# Signature Verification
SIGNATURE_TIMESTAMP_TOLERANCE=300  # 5 minutes in seconds
SIGNATURE_NONCE_TTL=3600           # 1 hour in seconds
```

### 测试策略

- 单元测试: 签名算法, 参数构建
- 集成测试: 完整签名验证流程
- 压力测试: 并发签名验证性能
