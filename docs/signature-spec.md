---
title: 消息签名规范
description: 开发者与开放平台交互的通用消息签名机制
---

# 消息签名规范 (Message Signature)

**Last Updated:** 2026-10-19
**Status:** Active

---

## 概述

消息签名是开发者与开放平台交互的通用安全机制，确保请求者的身份和数据的完整性得到验证。

开放平台使用两种签名算法：
- **Basic 签名**：用于不涉及授权资源的接口
- **Resource 签名**：用于资源操作接口（与 authorizationId 绑定）

> 本文与《第三方开发者接入指南》第 4 章保持一致。`business` 规范化的完整示例及 Node.js / Java 计算示例见该指南 4.3 / 4.4。

---

## 请求认证结构

业务接口统一以 `/api/thirdparty/` 开头，例如 `POST /api/thirdparty/treasury/list`；入驻（开发者后台）接口使用 `/api/v1/isv/*`；`oauth/verify` 虽同为 `/api/thirdparty/` 前缀，但为网关内部接口，由 Custody 调用，开发者无需也不会直接使用。

> `/api/third-party/`（连字符）是网关转发到 Custody 后端时使用的上游路径，不是开发者调用的路径。

URL 路径参数（如 `unitId`、`taskId`、`cusAccountId`）不参与签名；参与签名的只有 `business` 与 `basic` 中的签名字段。

### BasicInfo - 基础认证结构

用于不涉及授权资源的接口：

**适用接口：**
- `POST /api/thirdparty/oauth/authorizeUrl` - 获取授权 URL
- `POST /api/thirdparty/merchant/register` - 注册商户企业（`openplatform-api-service/src/config/forward-routes.ts` 中唯一使用 Basic 签名的转发路由）

> `POST /api/thirdparty/oauth/verify` 是**网关内部接口，由 Custody 调用**，不属于 Basic 签名：它不携带 `basic`，只校验请求体 `{ resourceKey, oauthToken }`，开发者不得直接调用。
>
> `POST /api/thirdparty/oauth/token` **已从网关移除**，请勿在对接代码或旧版文档中引用。该路径会落入兜底路由 `router.post('*', resourceValidationMiddleware, forwardRequest)`：旧的 Basic 签名调用方（`basic` 中没有 `authorizationId`）会先被 Resource 验证器拒绝，返回 `40001`（HTTP 400）；只有携带有效 Resource 签名的请求才会继续转发匹配并得到 `40401`（HTTP 404）。
>
> `/api/oauth/appToken/refresh`、`/api/oauth/revoke`、`/api/oauth/appToken/validate` 属于另一套内部令牌体系，同样不使用本文的 Basic 签名。

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

用于 `forward-routes.ts` 中除 `merchant/register` 外的全部转发路由：

**适用接口：**
- `POST /api/thirdparty/treasury/create` - 创建财务单元
- `POST /api/thirdparty/treasury/create-custom` - 创建自定义结构财务单元
- `POST /api/thirdparty/treasury/list` - 查询财务单元列表
- `POST /api/thirdparty/treasury/list-unit-account/{unitId}` - 查询财务单元账户列表
- `POST /api/thirdparty/treasury/address` - 查询地址（按单元 + 账户类型）
- `POST /api/thirdparty/treasury/address-by-account/{cusAccountId}` - 查询地址（按账户 ID）
- `POST /api/thirdparty/treasury/create-unit-address/{unitId}/{accountType}/{network}/{coinId}/{number}` - 按账户类型批量创建地址
- `POST /api/thirdparty/treasury/create-unit-address-by-account/{cusAccountId}/{number}` - 按账户 ID 批量创建地址
- `POST /api/thirdparty/treasury/add-coins` - 添加币种 / 网络
- `POST /api/thirdparty/treasury/fund-control-update` - 更新资金流控制规则
- `POST /api/thirdparty/treasury/whitelist-update` - 更新白名单
- `POST /api/thirdparty/treasury/payout` - 发起出金
- `POST /api/thirdparty/treasury/pooling` - 发起归集
- `POST /api/thirdparty/treasury/submit-task/{taskId}` - 提交审批任务
- `POST /api/thirdparty/treasury/activities` - 查询活动记录
- `POST /api/thirdparty/treasury/transfer-out-orders` - 查询出金订单
- `POST /api/thirdparty/treasury/transfer-in-orders` - 查询入金订单
- `POST /api/thirdparty/treasury/fund-records` - 查询账户资金流水
- `POST /api/thirdparty/treasury/unit-fund-records` - 查询财务单元级资金流水
- `POST /api/thirdparty/user/add` - 添加企业用户
- `POST /api/thirdparty/board/init` - 初始化 Board

完整清单以 `openplatform-api-service/src/config/forward-routes.ts` 与《第三方开发者接入指南》2.4 为准；本文件只负责 Basic / Resource 的划分。

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
- 授权页返回 `authorizeId`（即 authorizationId），该值由 Custody 在内部调用网关 `POST /api/thirdparty/oauth/verify` 时创建（见指南 5.4，开发者无需调用）
- 签名与 authorizationId 绑定，防止签名被用于其他授权资源

---

## 签名算法

### Basic 签名算法

适用于 `/api/thirdparty/oauth/authorizeUrl` 与 `/api/thirdparty/merchant/register`。

**计算步骤：**

```
1. 按 business 序列化规则规范化并序列化:
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

适用于 `/api/thirdparty/*` 中需要 Resource 签名的转发接口（见上文适用接口列表）。

**计算步骤：**

```
1. 按 business 序列化规则规范化并序列化:
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

| 签名类型 | 适用接口 | 内层 `signString`（不含 appSecret） |
|----------|----------|----------------|
| **Basic 签名** | `oauth/authorizeUrl`、`merchant/register` | `appId + timestamp + nonce + md5(business)` |
| **Resource 签名** | 其余 `/api/thirdparty/*` 转发接口 | `appId + authorizationId + timestamp + nonce + md5(business)` |

**关键区别：** Resource 签名在签名字符串中包含 `authorizationId`，与授权资源绑定。

### business 序列化规则（与网关实现一致）

签名对象是 `business` 的**规范化 JSON**，不是原始请求字符串：

1. **对象 key 递归排序**：所有层级对象的 key 按字典序升序排列（递归）。
2. **数组元素保序**：数组顺序有业务含义，保持原顺序，不排序。
3. **数组内的对象同样递归排序**：数组元素为对象或嵌套数组时递归应用本规则；只对对象 key 排序，不改变元素顺序。
4. **`null` / `undefined` 字段的处理**：Node SDK 与 Java SDK 会丢弃对象中值为 `null` / `undefined` 的字段；网关的 `sortObjectKeys` **会保留 `null`**（`JSON.stringify` 输出 `"key":null` 并参与 MD5），`undefined` 则被 `JSON.stringify` 丢弃。因此**不要发送值为 `null` / `undefined` 的字段**，数组元素也不要为 `null`。
5. **空 business 统一序列化为 `{}`**：`business` 为 `null` / `undefined` / `{}` 时，规范化结果均为字符串 `{}`，`MD5("{}") = 99914b932bd37a50b983c5e7c90ae93b`。只有**顶层** `business` 会归一为空对象；嵌套的空对象按 `{}` 正常序列化。
6. **`business` 必须是 JSON 对象**：网关通过 `Object.keys(business).length === 0` 判断空值，顶层数组 `[]` 会被归一为 `{}`；而 Node SDK 的 `sortKeys` 会保留 `[]`，与网关的 MD5 不同（Java SDK 的签名 API 只接受 `Map`，无法表达顶层数组）。请勿把 `business` 传成数组、字符串或数字。

> 反例：`{"coinIds":[{"network":"TRC20","coinId":"USDT"}]}` 若不排序数组内对象，
> MD5 与网关不一致，会得到 `40102 Invalid signature`。

完整输入 / 输出示例见《第三方开发者接入指南》4.3、4.4。

### 跨语言实现一致性

> 本节为实现维护者参考，面向开发者的行为约定以上文公式为准；下文行号基于当前 `main` 分支，可能随代码演进而漂移。

三个实现使用同一组签名公式，`sortKeys` / `sortObjectKeys` 的位置如下：

| 实现 | 文件 | 函数（行号） |
|------|------|--------------|
| Node SDK | `openplatform-sdk/node/src/core/signature.ts` | `sortKeys` (L19)、`serializeWithSortedKeys` (L49) |
| Java SDK | `openplatform-sdk/java/cregis-sdk-core/src/main/java/com/cregis/sdk/core/sign/Signer.java` | `sortKeys` (L60)、`serializeWithSortedKeys` (L104) |
| 网关 | `openplatform-api-service/src/services/validators/common.validator.ts` | `sortObjectKeys` (L150)、`calculateBusinessMd5` (L176) |

网关验签入口为 `common.validator.ts` 中的 `verifyBasicSignature` (L213) 与 `verifyResourceSignature` (L235)，其内层公式见上文「Basic 签名算法」与「Resource 签名算法」。

**序列化行为对齐情况（逐项核对代码）：**

| 场景 | 网关 `sortObjectKeys` | Node SDK `sortKeys` | Java SDK `sortKeys` | 结论 |
|------|----------------------|---------------------|---------------------|------|
| 对象 key 递归排序 | 是 | 是 | 是 | 一致 |
| 数组元素保序、递归处理 | 是 | 是 | 是 | 一致 |
| 数组内对象的 key 排序 | 是 | 是 | 是 | 一致 |
| 对象字段值为 `null` | **保留**，参与 MD5 | 签名计算时丢弃 | 签名计算时丢弃 | **不一致**：请求中不要传 `null` 字段 |
| 对象字段值为 `undefined` | `JSON.stringify` 时丢弃 | 丢弃 | 无 `undefined` 类型 | 实际一致 |
| 数组元素为 `null` | 保留 `null` | 转为 `{}` | 保留 `null` | **不一致**：请求中不要传 `null` 数组元素 |
| 空 business | `{}` | `{}` | `{}` | 一致 |
| 顶层 `business` 为 `[]` | 归一为 `{}` | 保留 `[]` | 不适用（签名 API 仅接受 `Map`） | **不一致**：`business` 必须是 JSON 对象 |
| 纯数字 key（如 `"10"`、`"2"`） | 按数值升序输出 | 按数值升序输出 | 按字典序输出 | **不一致**：避免使用纯数字 key |

> 因此，“所有实现完全一致”仅在 `business` 为 JSON 对象、且不含 `null` 字段、`null` 数组元素和纯数字 key 时成立。官方 SDK 的签名计算会丢弃这些字段，但请注意：**Java SDK 通过 `ObjectMapper.convertValue` 序列化 DTO 时，未赋值的可选字段可能以 `null` 出现在请求体中（签名计算已丢弃），调用此类方法前请显式省略或过滤 `null` 字段。** 自行实现签名时也请遵守上述规则。

---

## 签名验证规则

- **时间戳容差**: 5 分钟（300 秒）
- **时间戳格式**: Unix 秒（10 位）；毫秒时间戳会被判定为超出容差
- **Nonce TTL**: 1 小时（3600 秒），防重放；按 `appId + nonce` 去重。nonce 仅在**全部校验通过后**才写入缓存，校验失败的请求不会消耗该 nonce（重试可在修正后复用，但仍建议每次重试都生成新 nonce）
- **appId 格式**: 必须是有效的 UUID
- **authorizationId 格式**: 必须是有效的 UUID（Resource 签名）

---

## 安全要求

1. **appId**: 必须是有效的 UUID 格式
2. **appSecret**: 不得在客户端暴露，需安全存储
3. **timestamp**: 服务端验证请求时间在允许范围内
4. **nonce**: 每次请求必须唯一（含重试请求），服务端记录已使用的 nonce
5. **signature**: 根据接口类型使用不同的签名算法
6. **authorizationId**: `authorizationId` 仅 Resource 签名需要，必须为有效的授权记录 ID；当前实现按 ID 查询，不校验应用归属（见指南 15.4），请妥善保管。

---

## 错误码

### 认证错误

| 错误码 | HTTP状态 | 说明 |
|--------|----------|------|
| 40101 | 401 | 缺少认证信息（OAuth 端点：`oauthToken` 无效 / 过期，或缺少 appId 上下文）；已签名路由缺少 `basic` 时返回 `40001`（HTTP 400），不是 40101 |
| 40102 | 401 | 签名验证失败；也包括 appId 对应的应用不存在（`Invalid appId: application not found`） |
| 40103 | 401 | 时间戳超出容差范围 |
| 40104 | 401 | Nonce 已使用（重放攻击）；也被复用于“应用未激活”（`Application is not active`） |
| 40105 | 401 | 开发者账号未激活 |

### 授权错误

| 错误码 | HTTP状态 | 说明 |
|--------|----------|------|
| 40301 | 403 | 资源未授权（authorizationId 不存在或授权记录状态不是 `active`；当前实现不校验应用归属） |

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

> 本节为实现维护者参考，面向开发者的行为约定以上文公式为准。

服务端使用继承模式的验证器：

```
IRequestValidator (接口)
├── BasicValidator → 验证 BasicInfo
│   └── ResourceValidator → 验证 BasicInfoWithAuthorization（资源操作接口）
```

| 验证器 | 验证字段 | 适用接口 |
|--------|---------|---------|
| BasicValidator | appId, timestamp, nonce, signature | `POST /api/thirdparty/oauth/authorizeUrl`、`POST /api/thirdparty/merchant/register` |
| ResourceValidator | BasicInfo + authorizationId + 授权验证 | 其余 `/api/thirdparty/*` 转发接口 |

> `POST /api/thirdparty/oauth/verify` 只做请求体校验（`resourceKey`、`oauthToken` 必填），没有签名中间件，由 Custody 内部调用。

---

## 实现位置

> 本节为实现维护者参考，面向开发者的行为约定以上文公式为准；文件位置可能随代码演进而变化。

| 组件 | 文件 |
|------|------|
| 路由 | `openplatform-api-service/src/routes/thirdparty.routes.ts` |
| 转发路由表 | `openplatform-api-service/src/config/forward-routes.ts` |
| 统一中间件 | `openplatform-api-service/src/middleware/resource-validation.middleware.ts` |
| 验证器接口 | `openplatform-api-service/src/services/validators/interfaces.ts` |
| 基础验证器 | `openplatform-api-service/src/services/validators/basic.validator.ts` |
| 资源验证器 | `openplatform-api-service/src/services/validators/resource.validator.ts` |
| 公共验证函数 | `openplatform-api-service/src/services/validators/common.validator.ts` |
| Nonce 缓存 | `openplatform-api-service/src/middleware/nonce-cache.ts` |

---

## 固定参数

> 本节为实现维护者参考，面向开发者的行为约定以上文公式为准。

以下参数在当前实现中为代码内的固定值，不能通过环境变量调整：

| 参数 | 值 | 位置 |
|------|-----|------|
| 时间戳容差 | 300 秒（±5 分钟） | `openplatform-api-service/src/services/validators/common.validator.ts` 中的 `TIMESTAMP_TOLERANCE` |
| Nonce TTL | 3600 秒（1 小时） | `openplatform-api-service/src/middleware/nonce-cache.ts` 中 `NonceCache` 的默认 `ttlSeconds` |
