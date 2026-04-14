# 第三方开发者接入指南

**Last Updated:** 2026-04-13
**版本:** v3.0

---

## 概述

本文档描述第三方开发者如何接入开放平台，包含授权流程和接口对接规范。

---

## 接入流程

### 整体交互流程

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           阶段一：获取授权 URL                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   三方平台服务端      三方平台前端          开放平台 API              数据库     │
│        │                   │                      │                       │         │
│        │                   │──── POST /oauth/    │                       │         │
│        │                   │    authorizeUrl      │                       │         │
│        │                   │      (basic +       │                       │         │
│        │                   │       business)     │                       │         │
│        │                   │                      │──验证签名───────────────→│         │
│        │                   │                      │──查询应用配置───────────→│         │
│        │                   │                      │──生成 appToken ─────────→│         │
│        │                   │                      │                       │         │
│        │                   │←─── { authorizeUrl } ───│                       │         │
│        │                   │                      │                       │         │
│        │ 1.获取authorizeUrl│                      │                       │         │
│        │←─────────────────│                      │                       │         │
│        │                   │                      │                       │         │
│        │ 2.返回authorizeUrl│                      │                       │         │
│        │──────────────────→│                      │                       │         │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                           阶段二：发起授权（SDK）                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│      三方平台前端            SDK              授权页面            开放平台       │
│       │                   │                    │                   │            │
│       │ openAuthorization │                    │                   │            │
│       │ (authorizeUrl)    │                    │                   │            │
│       │──────────────────→│                    │                   │            │
│       │                   │ 打开 iframe        │                   │            │
│       │                   │───────────────────→                   │            │
│       │                   │                    │                   │            │
│       │                   │                    │ GET /auth/        │            │
│       │                   │                    │  authorize        │            │
│       │                   │                    │───────────────────→│            │
│       │                   │                    │                   │            │
│       │                   │                    │ 验证 appToken     │            │
│       │                   │                    │                   │            │
│       │                   │←─ postMessage ─────│                   │            │
│       │ 授权结果          │                    │                   │            │
│       │←─────────────────│                    │                   │            │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                           阶段三：验证授权                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│      三方平台前端            Custody 服务          开放平台                    │
│       │                         │                    │                        │
│       │ POST /oauth/verify      │                    │                        │
│       │   (oauthToken)          │                    │                        │
│       │────────────────────────→│                    │                        │
│       │                         │ POST /oauth/verify │                        │
│       │                         │   (oauthToken)     │                        │
│       │                         │───────────────────→│                        │
│       │                         │                    │                        │
│       │                         │                    │ 验证 JWT               │
│       │                         │                    │                        │
│       │                         │                    │ Upsert                │
│       │                         │                    │ OauthResource          │
│       │                         │                    │                        │
│       │                         │←─── { authorizeId } ──│                        │
│       │  { authorizeId }        │                    │                        │
│       │←───────────────────────│                    │                        │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 接入流程说明

| 阶段 | 说明 |
|------|------|
| 获取授权 URL | 三方平台服务端调用 `/oauth/authorizeUrl` 获取授权页面 URL（包含 appToken + appName + appLogoUrl） |
| 发起授权 | 三方平台前端通过 SDK 打开授权页面，用户完成授权 |
| 验证授权 | Custody 调用 `/oauth/verify` 验证 token 并存储授权，返回 authorizeId |
| 业务调用 | 用户通过三方平台前端直接调用开放平台业务接口 |

---

## 一、授权接口

### 1.1 获取授权 URL

用于第三方平台获取授权页面 URL。

**请求**

```
POST /api/thirdparty/oauth/authorizeUrl
Content-Type: application/json
```

**请求体**

```json
{
  "basic": {
    "appId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": 1742947200,
    "nonce": "abc123def456",
    "signature": "md5-hash-signature"
  },
  "business": {
    "permissions": ["read", "write"],
    "redirectUri": "https://example.com/callback",
    "state": "custom-state"
  }
}
```

**响应**

```json
{
  "code": 0,
  "message": "Success",
  "data": {
    "authorizeUrl": "https://openplatform.cregis.com/openplatform/auth/authorize?appId=xxx&appToken=yyy&appName=zzz&appLogoUrl=...&permissions=...&redirectUri=...&state=...",
    "expiresIn": 7200
  }
}
```

**URL 参数说明**

| 参数 | 来源 | 说明 |
|------|------|------|
| appId | 请求传入 | 应用标识 |
| appToken | 后端生成 | JWT token (内含 appId) |
| appName | 平台配置 | 应用名称（不可伪造） |
| appLogoUrl | 平台配置 | 应用 Logo（不可伪造） |
| permissions | 请求 + 平台校验 | 权限列表 |
| redirectUri | 请求传入 | 回调地址 |
| state | 请求传入 | 防 CSRF 状态 |

---

### 1.2 验证授权并存储

用于 Custody 服务验证 Token 并存储授权信息。

**请求**

```
POST /api/thirdparty/oauth/verify
Content-Type: application/json
```

**请求体**

```json
{
  "basic": {
    "appId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": 1742947200,
    "nonce": "random-string",
    "signature": "md5-hash"
  },
  "business": {
    "oauthToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

> 注意：此接口使用 Basic 签名，签名字符串为 `appId + timestamp + nonce + md5(business)`，不包含 authorizationId。

**响应**

```json
{
  "code": 0,
  "message": "Success",
  "data": {
    "authorizeId": "uuid-authorization-id"
  }
}
```

---

## 二、签名算法

### 2.1 签名类型

开放平台使用两种签名算法：

| 签名类型 | 适用接口 | 签名字符串 |
|----------|----------|------------|
| **Basic 签名** | `/oauth/*` | `appId + timestamp + nonce + md5(business)` |
| **Resource 签名** | `/third-party/*` | `appId + authorizationId + timestamp + nonce + md5(business)` |

### 2.2 Basic 签名计算步骤

适用于 `/oauth/*` 接口。

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

### 2.3 Resource 签名计算步骤

适用于 `/third-party/*` 接口。

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

### 2.4 签名示例 (Basic 签名)

假设：

- `appId` = `550e8400-e29b-41d4-a716-446655440000`
- `appSecret` = `secret123`
- `timestamp` = `1742947200`
- `nonce` = `abc123def456`
- `business` = `{"permissions":["read","write"],"redirectUri":"https://example.com/callback","state":"custom-state"}`

计算过程：

```javascript
// 1. business JSON (已排序)
businessJson = '{"permissions":["read","write"],"redirectUri":"https://example.com/callback","state":"custom-state"}'

// 2. business MD5
businessMd5 = MD5('{"permissions":["read","write"],"redirectUri":"https://example.com/callback","state":"custom-state"}')

// 3. 签名字符串 (Basic 签名不包含 authorizationId)
signString = "550e8400-e29b-41d4-a716-446655440000" +
             "1742947200" +
             "abc123def456" +
             businessMd5

// 4. 最终签名
signature = MD5("secret123" + signString)
```

### 2.5 签名验证规则

- **时间戳容差**: 5 分钟（300 秒）
- **Nonce TTL**: 1 小时（3600 秒），防重放
- **appId 格式**: 必须是有效的 UUID
- **authorizationId 格式**: 必须是有效的 UUID（Resource 签名）

### 2.6 请求认证结构

开放平台 API 将开发者请求分为两类，分别使用不同的认证结构：

#### BasicInfo - 基础认证结构

用于不涉及资源操作的接口（如 OAuth 接口）：

| 接口 | 用途 |
|------|------|
| `POST /oauth/token` | 获取访问令牌 |
| `POST /oauth/authorizeUrl` | 获取授权 URL |
| `POST /oauth/verify` | 验证 OAuth Token |

**结构定义：**

```json
{
  "basic": {
    "appId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": 1742947200,
    "nonce": "abc123def456",
    "signature": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| appId | string | 是 | 应用标识，必须是有效的 UUID 格式 |
| timestamp | number | 是 | Unix 时间戳（秒），必须在当前时间 ±5 分钟内 |
| nonce | string | 是 | 随机字符串，用于防重放，不可为空 |
| signature | string | 是 | MD5 签名，32 位十六进制字符串 |

#### BasicInfoWithAuthorization - 资源认证结构

用于涉及资源操作的接口（所有 `/third-party/*` 接口）：

**结构定义：**

```json
{
  "basic": {
    "appId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": 1742947200,
    "nonce": "abc123def456",
    "signature": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
    "authorizationId": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```

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

#### 验证器使用说明

服务端使用继承模式的验证器：

```
BasicValidator          → 验证 BasicInfo（OAuth 接口）
└─ ResourceValidator   → 验证 BasicInfoWithAuthorization（资源操作接口）
```

| 验证器 | 验证字段 | 适用接口 |
|--------|---------|---------|
| BasicValidator | appId, timestamp, nonce, signature | /oauth/* |
| ResourceValidator | BasicInfo + authorizationId | /third-party/* |

---

## 三、财务单元管理接口

### 3.1 接口列表 (Third-Party Treasury Unit Management)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/third-party/create/{resourceAccessKey} | 创建财务单元 |
| POST | /api/third-party/list/{resourceAccessKey} | 查询财务单元列表 |
| POST | /api/third-party/get-unit-address/{resourceAccessKey} | 获取财务单元地址 |
| POST | /api/third-party/payout/{resourceAccessKey} | 出金操作 |
| POST | /api/third-party/submit/task/{resourceAccessKey}/{taskId} | 提交任务审批 |
| POST | /api/third-party/activities/{resourceAccessKey} | 查询活动记录 |
| POST | /api/third-party/transfer-out-orders/{resourceAccessKey} | 查询出金订单 |
| POST | /api/third-party/transfer-in-orders/{resourceAccessKey} | 查询入金订单 |
| POST | /api/third-party/fund-records/{resourceAccessKey} | 查询资金流水 |

### 3.2 通用请求格式

所有接口请求格式统一包含 `basic` 和 `business` 两部分：

```json
{
  "basic": {
    "appId": "550e8400-e29b-41d4-a716-446655440000",
    "authorizationId": "123e4567-e89b-12d3-a456-426614174000",
    "timestamp": 1742947200,
    "nonce": "random-string",
    "signature": "md5-hash"
  },
  "business": {
    // 业务数据
  }
}
```

### 3.3 财务单元管理接口详情

#### 3.3.1 创建财务单元

**POST** `/api/third-party/create/{resourceAccessKey}`

创建新的财务单元。

> Body Parameters

```json
{
  "businessScope": "DEDICATED_ACCOUNT",
  "topology": "ORBIT",
  "coinIds": [{"coinId": "USDT", "network": "TRC20"}],
  "primaryManager": [{"coinId": "USDT", "fundControlRules": [{"guardians": ["user@email.com"], "threshold": "1", "perTransferLimit": "1000", "dailyTransferLimit": "50000"}]}],
  "payoutManager": [{"coinId": "USDT", "fundControlRules": [{"guardians": ["user@email.com"], "threshold": "1", "perTransferLimit": "1000", "dailyTransferLimit": "50000"}]}],
  "riskManager": [{"coinId": "USDT", "fundControlRules": [{"guardians": ["user@email.com"], "threshold": "1", "perTransferLimit": "1000", "dailyTransferLimit": "50000"]]}]
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| businessScope | string | 是 | 业务类型：`DEDICATED_ACCOUNT`(专属账户) / `OMNIBUS_ACCOUNT`( Omnibus账户) / `OPEN_API_PROXY`(开放API代理) |
| topology | string | 是 | 账本拓扑结构：`ORBIT` / `SINGLE_GENERAL` / `QUAD_SMART_ISOLATION` |
| coinIds | array | 是 | 币种信息列表 |
| primaryManager | array | 是 | 资金管理员配置 |
| payoutManager | array | 是 | 出金管理员配置 |
| riskManager | array | 是 | 风控管理员配置 |

**coinIds 子参数说明**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| coinId | string | 是 | 币种 ID，如 `USDT`、`BTC`、`ETH` |
| network | string | 是 | 网络类型，如 `TRC20`、`ERC20`、`BEP20` |

**manager 配置子参数说明 (primaryManager / payoutManager / riskManager)**

每个 manager 配置包含以下字段：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| coinId | string | 是 | 币种 ID |
| fundControlRules | array | 是 | 资金控制规则列表 |

**fundControlRules 子参数说明**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| guardians | array | 是 | 守护人邮箱列表，用于多签审批 |
| threshold | string | 是 | 审批阈值，需要多少位守护人同意才能执行 |
| perTransferLimit | string | 是 | 单笔转账限额，超过此金额需要多签审批 |
| dailyTransferLimit | string | 是 | 每日转账限额，超过此金额需要多签审批 |

**fundControlRules 配置示例**

```json
{
  "coinId": "USDT",
  "fundControlRules": [
    {
      "guardians": ["admin@company.com", "security@company.com"],
      "threshold": "2",
      "perTransferLimit": "1000",
      "dailyTransferLimit": "50000"
    }
  ]
}
```

**响应示例**

```json
{
  "code": 0,
  "message": "Success",
  "data": {
    "id": 1,
    "name": "My Treasury Unit",
    "ecode": "TU-20260413001",
    "vaultCode": "VLT-xxx",
    "groupCode": "GRP-xxx",
    "custodialBusinessScope": "DEDICATED_ACCOUNT",
    "networks": ["TRC20"],
    "status": "ACTIVATED",
    "caaFactoryAddresses": [
      {"network": "TRC20", "address": "0x..."}
    ],
    "factoryStatus": 3,
    "createTime": "2026-04-13T10:00:00Z"
  }
}
```

#### 3.3.2 查询财务单元列表

**POST** `/api/third-party/list/{resourceAccessKey}`

查询当前商户下所有财务单元。

> Body Parameters

```json
{
  "pageSize": 10,
  "pageNum": 1,
  "sortFields": "createTime_d"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| pageSize | integer | 否 | 每页数量，默认 10 |
| pageNum | integer | 否 | 页码，默认 1 |
| sortFields | string | 否 | 排序字段，格式：`字段名_asc/desc`，如 `createTime_d` 表示按创建时间降序 |

**响应示例**

```json
{
  "code": 0,
  "message": "Success",
  "data": [
    {
      "id": 1,
      "ecode": "TU-20260413001",
      "projectId": 100,
      "name": "My Treasury Unit",
      "custodyServiceMode": "DEDICATED_ACCOUNT",
      "coinIds": [{"coinId": "USDT", "network": "TRC20"}],
      "accounts": [
        {"account_name": "PRIMARY", "account_type": "PRIMARY"},
        {"account_name": "PAYOUT", "account_type": "PAYOUT"},
        {"account_name": "QUARANTINE", "account_type": "QUARANTINE"}
      ],
      "status": "Active",
      "creationType": "THIRD_PARTY",
      "createTime": "2026-04-13T10:00:00Z"
    }
  ]
}
```

#### 3.3.3 获取财务单元地址

**POST** `/api/third-party/get-unit-address/{resourceAccessKey}`

获取财务单元下指定账户类型的地址列表。

> Body Parameters

```json
{
  "accountType": "PRIMARY",
  "pageSize": 10,
  "pageNum": 1,
  "coinId": "USDT",
  "network": "TRC20",
  "unitId": 1
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| unitId | integer | 是 | 财务单元ID |
| accountType | string | 否 | 账户类型：`PRIMARY` / `PAYIN` / `PAYOUT` / `QUARANTINE` / `RECEIVABLE` 等 |
| coinId | string | 否 | 币种ID |
| network | string | 否 | 网络 |
| pageSize | integer | 否 | 每页数量 |
| pageNum | integer | 否 | 页码 |

#### 3.3.4 出金操作

**POST** `/api/third-party/payout/{resourceAccessKey}`

发起出金操作。

> Body Parameters

```json
{
  "payTo": [{"to": "0x...", "amount": "100"}],
  "unitId": 1,
  "coinId": "USDT",
  "network": "TRC20",
  "operation": "withdraw",
  "userId": "user-123",
  "orderId": "ORDER-20260413001",
  "note": "Payment for order #12345",
  "merchantType": "NON_FINANCIAL_CORPORATE",
  "travelRule": {
    "referenceId": "TR-REF-001",
    "payload": "{}"
  }
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| unitId | integer | 是 | 财务单元ID |
| payTo | array | 是 | 出金地址列表 |
| coinId | string | 是 | 币种ID |
| network | string | 是 | 网络 |
| operation | string | 否 | 操作类型：`withdraw` / `allocate` / `payout` |
| orderId | string | 否 | 客户业务订单ID |
| userId | string | 否 | 发起用户ID |
| note | string | 否 | 备注 |
| merchantType | string | 是 | 商户类型 |
| travelRule | object | 否 | Travel Rule 信息 |

#### 3.3.5 提交任务审批

**POST** `/api/third-party/submit/task/{resourceAccessKey}/{taskId}`

提交任务审批（签名）。

> Body Parameters

```json
{
  "signatures": {"taskId-1": ["sig1", "sig2"]},
  "confirmed": true
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| signatures | object | 否 | 签名结果，key为taskId，value为签名字符串列表 |
| confirmed | boolean | 是 | 操作确认：`true`同意 / `false`拒绝 |

#### 3.3.6 查询活动记录

**POST** `/api/third-party/activities/{resourceAccessKey}`

分页查询活动记录，包括所有资金操作如入金、出金、转账等。

> Body Parameters

```json
{
  "pageIndex": 0,
  "pageSize": 20,
  "sortFields": "createTime_d",
  "queryList": [
    {"key": "unitId", "value": 1, "oper": "=", "join": "and"},
    {"key": "coinId", "value": "USDT", "oper": "=", "join": "and"},
    {"key": "type", "value": "TRANSFER_OUT", "oper": "=", "join": "and"}
  ]
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| pageIndex | integer | 否 | 页码索引，从 0 开始，默认 0 |
| pageSize | integer | 否 | 每页数量，默认 20 |
| sortFields | string | 否 | 排序字段，格式：`字段名_asc/desc` |
| queryList | array | 否 | 查询条件列表 |
| queryList[].key | string | 否 | 查询字段名，可选值：`unitId` / `coinId` / `type` / `status` / `direction` |
| queryList[].value | string/number | 否 | 查询值 |
| queryList[].oper | string | 否 | 操作符：`=` / `!=` / `>` / `<` / `like` |
| queryList[].join | string | 否 | 连接方式：`and` / `or` |

**响应示例**

```json
{
  "code": 0,
  "message": "Success",
  "data": {
    "records": [
      {
        "id": 1,
        "ecode": "TU-20260413001",
        "treasuryUnitId": 1,
        "accountType": "PRIMARY",
        "coinId": "USDT",
        "network": "TRC20",
        "type": "TRANSFER_OUT",
        "amount": "100",
        "direction": "OUT",
        "orderId": "ORDER-001",
        "status": "SUCCEED",
        "travelRuleStatus": "NOT_REQUIRED",
        "kytStatus": "NOT_REQUIRED",
        "createTime": "2026-04-13T10:00:00Z"
      }
    ],
    "total": 100,
    "size": 20,
    "current": 1
  }
}
```

#### 3.3.7 查询出金订单

**POST** `/api/third-party/transfer-out-orders/{resourceAccessKey}`

分页查询出金订单，包括提现和调拨订单。

> Body Parameters

```json
{
  "pageIndex": 0,
  "pageSize": 20,
  "sortFields": "createTime_d",
  "queryList": [
    {"key": "unitId", "value": 1, "oper": "=", "join": "and"},
    {"key": "coinId", "value": "USDT", "oper": "=", "join": "and"}
  ]
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| pageIndex | integer | 否 | 页码索引，从 0 开始，默认 0 |
| pageSize | integer | 否 | 每页数量，默认 20 |
| sortFields | string | 否 | 排序字段，格式：`字段名_asc/desc` |
| queryList | array | 否 | 查询条件列表 |
| queryList[].key | string | 否 | 查询字段名 |
| queryList[].value | string/number | 否 | 查询值 |
| queryList[].oper | string | 否 | 操作符：`=` / `!=` / `>` / `<` / `like` |
| queryList[].join | string | 否 | 连接方式：`and` / `or` |

**响应示例**

```json
{
  "code": 0,
  "message": "Success",
  "data": {
    "records": [
      {
        "orderId": "ORDER-001",
        "txId": "0x...",
        "coinId": "USDT",
        "network": "TRC20",
        "totalAmount": 100,
        "fee": "1",
        "orderState": "SUCCEED",
        "payToList": [{"to": "0x...", "amount": "100"}],
        "businessId": "EXT-001",
        "createTime": "2026-04-13T10:00:00Z"
      }
    ],
    "total": 50,
    "size": 20,
    "current": 1
  }
}
```

#### 3.3.8 查询入金订单

**POST** `/api/third-party/transfer-in-orders/{resourceAccessKey}`

分页查询入金订单，包括充值和收款订单。

> Body Parameters

```json
{
  "pageIndex": 0,
  "pageSize": 20,
  "sortFields": "createTime_d",
  "queryList": [
    {"key": "unitId", "value": 1, "oper": "=", "join": "and"}
  ]
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| pageIndex | integer | 否 | 页码索引，从 0 开始，默认 0 |
| pageSize | integer | 否 | 每页数量，默认 20 |
| sortFields | string | 否 | 排序字段，格式：`字段名_asc/desc` |
| queryList | array | 否 | 查询条件列表 |
| queryList[].key | string | 否 | 查询字段名 |
| queryList[].value | string/number | 否 | 查询值 |
| queryList[].oper | string | 否 | 操作符：`=` / `!=` / `>` / `<` / `like` |
| queryList[].join | string | 否 | 连接方式：`and` / `or` |

**响应示例**

```json
{
  "code": 0,
  "message": "Success",
  "data": {
    "records": [
      {
        "orderId": "ORDER-002",
        "txId": "0x...",
        "cpAddress": "0x...",
        "amount": "500",
        "coinId": "USDT",
        "network": "TRC20",
        "orderState": "SUCCEED",
        "type": 1,
        "initiator": 1,
        "createTime": "2026-04-13T10:00:00Z"
      }
    ],
    "total": 30,
    "size": 20,
    "current": 1
  }
}
```

#### 3.3.9 查询资金流水

**POST** `/api/third-party/fund-records/{resourceAccessKey}`

分页查询资金流水，记录每笔资金变动明细。

> Body Parameters

```json
{
  "pageIndex": 0,
  "pageSize": 20,
  "sortFields": "createTime_d",
  "queryList": [
    {"key": "unitId", "value": 1, "oper": "=", "join": "and"},
    {"key": "coinId", "value": "USDT", "oper": "=", "join": "and"},
    {"key": "txType", "value": "TRANSFER_OUT", "oper": "=", "join": "and"}
  ]
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| pageIndex | integer | 否 | 页码索引，从 0 开始，默认 0 |
| pageSize | integer | 否 | 每页数量，默认 20 |
| sortFields | string | 否 | 排序字段，格式：`字段名_asc/desc` |
| queryList | array | 否 | 查询条件列表 |
| queryList[].key | string | 否 | 查询字段名，可选值：`unitId` / `coinId` / `network` / `txType` / `accountType` |
| queryList[].value | string/number | 否 | 查询值 |
| queryList[].oper | string | 否 | 操作符：`=` / `!=` / `>` / `<` / `like` |
| queryList[].join | string | 否 | 连接方式：`and` / `or` |

**响应示例**

```json
{
  "code": 0,
  "message": "Success",
  "data": {
    "records": [
      {
        "id": 1,
        "txId": "0x...",
        "coinId": "USDT",
        "network": "TRC20",
        "amount": "100",
        "preBalance": "1000",
        "postBalance": "900",
        "fee": "1",
        "txType": "TRANSFER_OUT",
        "createTime": "2026-04-13T10:00:00Z"
      }
    ],
    "total": 200,
    "size": 20,
    "current": 1
  }
}
```

**txType 枚举值**

| 值 | 说明 |
|---|---|
| TRANSFER_IN | 转入 |
| TRANSFER_OUT | 转出 |
| ALLOCATE_IN | 调拨转入 |
| ALLOCATE_OUT | 调拨转出 |
| POOL_IN | 归集转入 |
| POOL_OUT | 归集转出 |
| GAS_OUT | Gas消耗 |
| FEE_OUT | 手续费 |

---

## 四、错误码

| 错误码 | HTTP状态 | 说明 |
|--------|----------|------|
| 40101 | 401 | 签名验证失败 |
| 40102 | 401 | 时间戳超出容差范围 |
| 40103 | 401 | Nonce 已使用（重放攻击） |
| 40104 | 401 | 缺少必填字段 |
| 40105 | 401 | 应用不存在 |
| 40106 | 401 | 应用未激活 |
| 40107 | 401 | 三方平台账户未激活 |

### 4.2 授权错误

| 错误码 | HTTP状态 | 说明 |
|--------|----------|------|
| 40301 | 403 | 资源未授权 |
| 40901 | 409 | 授权已存在 |

### 4.3 业务错误

| 错误码 | HTTP状态 | 说明 |
|--------|----------|------|
| 40001 | 400 | 缺少必填参数 |
| 40002 | 400 | 参数格式错误 |
| 40401 | 404 | 资源不存在 |
| 42901 | 429 | 请求过于频繁 |
| 50001 | 500 | 服务器内部错误 |

---

## 五、SDK 示例

### 5.1 签名计算

```typescript
import crypto from 'crypto';

/**
 * Basic 签名算法 - 用于 OAuth 接口
 *
 * 适用接口：/oauth/token, /oauth/authorizeUrl, /oauth/verify
 * 公式：signature = MD5(appSecret + appId + timestamp + nonce + MD5(JSON.stringify(sortKeys(business))))
 */
function sortKeys(obj: Record<string, unknown>): Record<string, unknown> {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sortKeys) as unknown as Record<string, unknown>;

  return Object.keys(obj).sort().reduce((result, key) => {
    result[key] = sortKeys((obj as Record<string, unknown>)[key] as Record<string, unknown>);
    return result;
  }, {} as Record<string, unknown>);
}

function calculateBasicSignature(
  appId: string,
  appSecret: string,
  timestamp: number,
  nonce: string,
  business: Record<string, unknown>
): string {
  // 1. Sort and stringify business
  const sortedBusiness = sortKeys(business);
  const businessJson = JSON.stringify(sortedBusiness);

  // 2. Business MD5
  const businessMd5 = crypto.createHash('md5').update(businessJson).digest('hex');

  // 3. Build sign string (Basic: 不包含 authorizationId)
  const signString = appId + timestamp + nonce + businessMd5;

  // 4. Final signature
  return crypto.createHash('md5').update(appSecret + signString).digest('hex');
}

// Usage for OAuth endpoints
const appId = '550e8400-e29b-41d4-a716-446655440000';
const appSecret = 'secret123';
const timestamp = Math.floor(Date.now() / 1000);
const nonce = crypto.randomUUID();
const business = {
  permissions: ['read', 'write'],
  redirectUri: 'https://example.com/callback',
  state: 'custom-state'
};

const signature = calculateBasicSignature(
  appId, appSecret, timestamp, nonce, business
);
```

### 5.2 获取授权 URL 并打开授权页面

```typescript
// 1. 后端：获取授权 URL
async function getAuthorizeUrl(
  appId: string,
  appSecret: string,
  permissions: string[],
  redirectUri: string,
  state: string
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomUUID();
  const business = { permissions, redirectUri, state };

  // 使用 Basic 签名（OAuth 接口不需要 authorizationId）
  const signature = calculateBasicSignature(
    appId, appSecret, timestamp, nonce, business
  );

  const response = await fetch('/api/thirdparty/oauth/authorizeUrl', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      basic: { appId, timestamp, nonce, signature },
      business
    })
  });

  const result = await response.json();
  if (result.code !== 0) {
    throw new Error(result.message);
  }

  return result.data.authorizeUrl;
}

// 2. 前端：使用 SDK 打开授权页面
import { CregisWebSDK } from '@cregis-kit/openplatform-webkit';

const sdk = new CregisWebSDK({
  appId: 'your-app-id',
  container: document.getElementById('auth-container'),
  authUrl: 'https://openplatform.cregis.com/openplatform/auth/authorize',
  mode: 'popup', // popup | tab | window

  // 事件回调
  onReady: ({ uuid }) => {
    console.log('授权页面已就绪, UUID:', uuid);
  },

  onAuthorizationStarted: () => {
    console.log('用户点击了授权按钮');
  },

  onAuthorizationComplete: ({ authorizeId }) => {
    console.log('授权成功, authorizeId:', authorizeId);
  },

  onAuthorizationError: ({ code, message }) => {
    console.error('授权失败:', code, message);
  },

  onAuthorizationCancelled: () => {
    console.log('用户取消授权');
  },
});

async function authorize() {
  // 获取授权 URL（从后端）
  const authorizeUrl = await getAuthorizeUrl(
    'your-app-id',
    'your-app-secret',
    ['read', 'write'],
    'https://yourapp.com/callback',
    'custom-state'
  );

  // 使用 SDK 打开授权页面
  // mode: 'popup' (默认) - iframe 弹窗
  // mode: 'tab' - 新开浏览器标签页
  // mode: 'window' - 浏览器弹窗
  const result = await sdk.openAuthorization(authorizeUrl);

  if (result.status === 'success') {
    console.log('授权成功, authorizeId:', result.authorizeId);
  } else if (result.status === 'cancelled') {
    console.log('用户取消授权');
  } else {
    console.error('授权失败:', result.error);
  }
}
```

### 5.3 打开模式说明

| 模式 | 说明 | 通信方式 |
|------|------|----------|
| `popup` | 在 iframe 弹窗中打开授权页面 | postMessage |
| `tab` | 在新浏览器标签页中打开 | window.opener.postMessage |
| `window` | 在新浏览器窗口中打开 | window.opener.postMessage |

### 5.4 安全机制

SDK 使用 UUID 机制防止跨域消息污染：

1. SDK 初始化时生成唯一 UUID
2. UUID 通过 `sdkUuid` 参数添加到授权 URL
3. SDK 和授权页面之间的所有消息都携带 UUID
4. UUID 不匹配的消息将被拒绝

---

## 六、注意事项

1. **签名时效**: 每次请求需要生成新的 timestamp 和 nonce
2. **Nonce 防重放**: 相同 nonce 在 1 小时内不可重复使用
3. **时间同步**: 确保服务器时间与 UTC 时间同步，误差不超过 5 分钟
4. **敏感信息**: appSecret 仅在服务端使用，切勿暴露在客户端
5. **错误处理**: 收到错误码时应根据文档进行相应处理
6. **UUID 验证**: SDK 与授权页面通过 UUID 进行双向消息验证

---

## 七、联系方式

如有问题，请联系技术支持。
