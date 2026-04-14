---
title: 消息签名规范
description: 开发者与开放平台交互的通用消息签名机制
---

# 消息签名规范 (Message Signature)

**Last Updated:** 2026-04-14
**Status:** Active

---

## 概述

消息签名是开发者与开放平台交互的通用安全机制，确保请求者的身份和数据的完整性得到验证。

开放平台使用两种签名算法：
- **Basic 签名**：用于 OAuth 接口（不涉及资源操作）
- **Resource 签名**：用于资源操作接口（与 authorizationId 绑定）

---

## 请求认证结构

开放平台 API 将开发者请求分为两类，分别使用不同的认证结构：

### BasicInfo - 基础认证结构

用于不涉及资源操作的接口（如 OAuth 接口）：

**适用接口：**
- `POST /oauth/token` - 获取访问令牌
- `POST /oauth/authorizeUrl` - 获取授权 URL
- `POST /oauth/verify` - 验证 OAuth Token

**请求格式：**

```json
{
  "basic": {
    "appId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": 1742947200,
    "nonce": "abc123def456",
    "signature": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
  },
  "business": {
    // 业务数据
  }
}
```

**BasicInfo 字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| appId | string | 是 | 应用标识，必须是有效的 UUID 格式 |
| timestamp | number | 是 | Unix 时间戳（秒），必须在当前时间 ±5 分钟内 |
| nonce | string | 是 | 随机字符串，用于防重放，不可为空 |
| signature | string | 是 | MD5 签名，32 位十六进制字符串 |

### BasicInfoWithAuthorization - 资源认证结构

用于涉及资源操作的接口（所有 `/third-party/*` 接口）：

**适用接口：**
- `POST /third-party/create/*` - 创建资源
- `POST /third-party/list/*` - 查询列表
- `POST /third-party/get-unit-address/*` - 获取地址
- `POST /third-party/payout/*` - 出金操作
- `POST /third-party/submit/task/*` - 提交任务
- `POST /third-party/activities/*` - 查询活动
- `POST /third-party/transfer-out-orders/*` - 查询出金订单
- `POST /third-party/transfer-in-orders/*` - 查询入金订单
- `POST /third-party/fund-records/*` - 查询资金流水

**请求格式：**

```json
{
  "basic": {
    "appId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": 1742947200,
    "nonce": "abc123def456",
    "signature": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
    "authorizationId": "123e4567-e89b-12d3-a456-426614174000"
  },
  "business": {
    // 业务数据
  }
}
```

**BasicInfoWithAuthorization 字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| appId | string | 是 | 应用标识，必须是有效的 UUID 格式 |
| timestamp | number | 是 | Unix 时间戳（秒），必须在当前时间 ±5 分钟内 |
| nonce | string | 是 | 随机字符串，用于防重放，不可为空 |
| signature | string | 是 | MD5 签名，32 位十六进制字符串 |
| authorizationId | string | 是 | 授权标识，必须是有效的 UUID 格式，用于绑定签名与特定授权资源 |

**authorizationId 说明：**

- 开发者发起资源操作前，需要先通过 OAuth 流程获取授权
- 授权成功后，开放平台会返回 `authorizeId`（即 authorizationId）
- 签名与 authorizationId 绑定，防止签名被用于其他授权资源

---

## 签名算法

### Basic 签名算法

适用于 `/oauth/*` 接口。

**计算步骤：**

```
1. 对 business JSON 按 key 排序后序列化:
   JSON.stringify(sortKeys(business))

2. 计算 business 的 MD5:
   md5 = MD5(序列化后的 JSON)

3. 拼接签名字符串:
   signString = appId + timestamp + nonce + md5(business)

4. 使用 appSecret 签名:
   signature = MD5(appSecret + signString)

5. 将签名结果放入 basic.signature 字段
```

**公式：**

```
signature = MD5(appSecret + appId + timestamp + nonce + MD5(JSON.stringify(sortKeys(business))))
```

### Resource 签名算法

适用于 `/third-party/*` 接口。

**计算步骤：**

```
1. 对 business JSON 按 key 排序后序列化:
   JSON.stringify(sortKeys(business))

2. 计算 business 的 MD5:
   md5 = MD5(序列化后的 JSON)

3. 拼接签名字符串:
   signString = appId + authorizationId + timestamp + nonce + md5(business)

4. 使用 appSecret 签名:
   signature = MD5(appSecret + signString)

5. 将签名结果放入 basic.signature 字段
```

**公式：**

```
signature = MD5(appSecret + appId + authorizationId + timestamp + nonce + MD5(JSON.stringify(sortKeys(business))))
```

### 两种签名算法对比

| 签名类型 | 适用接口 | 签名字符串构成 |
|----------|----------|----------------|
| **Basic 签名** | `/oauth/*` | `appId + timestamp + nonce + md5(business)` |
| **Resource 签名** | `/third-party/*` | `appId + authorizationId + timestamp + nonce + md5(business)` |

**关键区别：** Resource 签名在签名字符串中包含 `authorizationId`，与授权资源绑定。

---

## 签名验证规则

- **时间戳容差**: 5 分钟（300 秒）
- **Nonce TTL**: 1 小时（3600 秒），防重放
- **appId 格式**: 必须是有效的 UUID
- **authorizationId 格式**: 必须是有效的 UUID（Resource 签名）

---

## 安全要求

1. **appId**: 必须是有效的 UUID 格式
2. **appSecret**: 不得在客户端暴露，需安全存储
3. **timestamp**: 服务端验证请求时间在允许范围内
4. **nonce**: 每次请求必须唯一，服务端记录已使用的 nonce
5. **signature**: 根据接口类型使用不同的签名算法
6. **authorizationId**: 仅 Resource 签名需要，必须与 appId 关联的授权资源匹配

---

## 错误码

### 认证错误

| 错误码 | HTTP状态 | 说明 |
|--------|----------|------|
| 40101 | 401 | 签名验证失败 |
| 40102 | 401 | 时间戳超出容差范围 |
| 40103 | 401 | Nonce 已使用（重放攻击） |
| 40104 | 400 | 缺少必填字段 |
| 40105 | 401 | 应用不存在 |
| 40106 | 401 | 应用未激活 |
| 40107 | 401 | 三方平台账户未激活 |

### 授权错误

| 错误码 | HTTP状态 | 说明 |
|--------|----------|------|
| 40301 | 403 | 资源未授权（authorizationId 无效或不属于当前应用） |

### 业务错误

| 错误码 | HTTP状态 | 说明 |
|--------|----------|------|
| 40001 | 400 | 缺少必填参数 |
| 40002 | 400 | 参数格式错误 |
| 40401 | 404 | 资源不存在 |
| 42901 | 429 | 请求过于频繁 |
| 50001 | 500 | 服务器内部错误 |

---

## 验证器架构

服务端使用继承模式的验证器：

```
IRequestValidator (接口)
├── BasicValidator → 验证 BasicInfo（OAuth 接口）
│   └── ResourceValidator → 验证 BasicInfoWithAuthorization（资源操作接口）
```

| 验证器 | 验证字段 | 适用接口 |
|--------|---------|---------|
| BasicValidator | appId, timestamp, nonce, signature | `/oauth/*` |
| ResourceValidator | BasicInfo + authorizationId + 授权验证 | `/third-party/*` |

---

## 实现位置

| 组件 | 文件 |
|------|------|
| 统一中间件 | `src/middleware/resource-validation.middleware.ts` |
| 验证器接口 | `src/services/validators/interfaces.ts` |
| 基础验证器 | `src/services/validators/basic.validator.ts` |
| 资源验证器 | `src/services/validators/resource.validator.ts` |
| 公共验证函数 | `src/services/validators/common.validator.ts` |

---

## 环境变量

```bash
SIGNATURE_TIMESTAMP_TOLERANCE=300  # 5 minutes
SIGNATURE_NONCE_TTL=3600           # 1 hour
```
