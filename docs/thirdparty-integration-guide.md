# Cregis 开放平台 - 第三方开发者接入指南

> **适用 SDK 版本：** Node SDK 1.1.0 / Java SDK 1.2.0 / Web SDK 1.0.5
>
> **接口基数：** 网关对外 22 条业务接口 + 7 条本地接口

本指南面向接入 Cregis 托管能力的第三方平台开发者。第 1–6 章覆盖平台概述、端到端接入流程、开发者入驻、认证与签名、OAuth 授权和通用约定；业务接口参考、回调、错误码详解、SDK 集成与附录见后续章节。

---

## 目录

1. [概述](#1-概述)
2. [接入总览](#2-接入总览)
3. [开发者入驻](#3-开发者入驻)
4. [认证与签名](#4-认证与签名)
5. [OAuth 授权流程](#5-oauth-授权流程)
6. [通用约定](#6-通用约定)

---

## 1. 概述

Cregis 开放平台为银行、支付机构和企业提供银行级的加密货币托管基础设施。第三方平台通过开放平台 API 完成三类业务：创建和管理财务单元（Treasury Unit）、发起出入金与归集、查询资金流水，并通过回调接收状态变更。

平台支持三种业务模式，对应创建应用时的 `appType`：

| 业务模式 | `appType` | 典型场景 | 账户结构 |
| --- | --- | --- | --- |
| Individual Custody（个人托管 / B2B2C） | `custody` | 银行或金融机构为零售用户托管资产 | PRIMARY 主资产钱包、DEPOSIT_IN 入金地址、WITHDRAW_OUT 出金钱包、QUARANTINE 风险隔离钱包 |
| Crypto Payment（加密支付处理） | `payment` | 电商平台收款与付款 | PRIMARY 结算钱包、PAYIN 收款钱包（pending / received）、PAYOUT 付款钱包、QUARANTINE 风险隔离钱包 |
| Corporate Treasury（企业资金管理） | `corporate` | 跨境贸易、企业司库 | PRIMARY 主资金钱包、RECEIVABLE 归集钱包（按标签生成一次性地址）、PAYMENT 付款钱包、QUARANTINE 风险隔离钱包 |

三类模式的底层能力一致，差异主要体现在账户类型的语义和资金流转路径上。

**本指南覆盖范围：**

- 开发者入驻：注册、KYB 审核、登录、创建应用、订阅套餐、凭证管理
- 认证与签名：Basic 签名与 Resource 签名、`business` 规范化、Node.js / Java 计算示例
- OAuth 授权：获取授权地址、授权页交互、换取 `authorizeId`、授权回调
- 通用约定：请求与响应结构、分页、幂等、每日配额、限流、`traceId`、错误码

---

## 2. 接入总览

### 2.1 端到端流程

```
┌────────────────┐          ┌────────────────────────────┐          ┌──────────────────┐
│   开发者系统   │          │    Cregis 开放平台网关     │          │  Custody 托管服务 │
└───────┬────────┘          └─────────────┬──────────────┘          └────────┬─────────┘
        │                                 │                                  │
        │ 1. 注册（/api/v1/isv/auth/register）                               │
        │ 2. KYB 审核（运营侧处理，开发者等待或补件）                        │
        │ 3. 登录（/api/v1/isv/auth/login）→ Bearer JWT                      │
        │ 4. 创建应用（/api/v1/isv/applications）→ appId + appSecret         │
        │ 5. 订阅套餐（/api/v1/isv/packages、/api/v1/isv/orders）            │
        │    → dailyApiLimit                                                │
        │────────────────────────────────▶│                                  │
        │                                 │                                  │
        │ 6. POST /api/thirdparty/oauth/authorizeUrl（Basic 签名）           │
        │────────────────────────────────▶│                                  │
        │◀──────────── authorizeUrl ──────│                                  │
        │                                 │                                  │
        │ 7. 前端打开授权页 → 用户登录 → 选择组织 → 确认授权                 │
        │    授权页 --postMessage--> 你的前端 --> 你的后端                    │
        │                                 │                                  │
        │ 8. POST /api/thirdparty/oauth/verify                               │
        │    { resourceKey, oauthToken }                                     │
        │────────────────────────────────▶│ 校验 oauthToken，写入授权记录    │
        │◀────────── { authorizeId } ─────│ 异步推送 authorization.created   │
        │                                 │                                  │
        │ 9. POST /api/thirdparty/treasury/...（Resource 签名）              │
        │    basic{ authorizationId } + business                             │
        │────────────────────────────────▶│ 验签 + 校验授权 + 每日配额       │
        │                                 │─────────────────────────────────▶│
        │                                 │◀──────────── 业务结果 ───────────│
        │◀─── 业务响应 + x-trace-id ──────│                                  │
        │                                 │                                  │
        │ 10. 接收授权回调与业务回调（HMAC-SHA256 验签）                     │
        │◀═══════════════════════════════════════════════════════════════════│
```

### 2.2 职责划分

| 你负责 | 平台负责 |
| --- | --- |
| 注册开发者账号并提交真实、完整的企业与 UBO 资料 | 审核 KYB，维护审核状态与审核记录 |
| 妥善保管 `appSecret`，不写入前端代码或公开仓库 | 按 `appId` 校验签名、应用状态与开发者状态 |
| 在服务端按规范计算 Basic / Resource 签名 | 校验时间戳容差、nonce 唯一性、签名与 `authorizationId` |
| 创建应用、订阅套餐、选择业务模式 | 提供授权页、签发 `oauthToken`、维护授权关系 |
| 在业务系统中维护 `authorizeId` 与自身用户的映射 | 生成并维护 `authorizeId`（授权记录 ID），校验授权有效性 |
| 接收并验签回调，按业务语义处理幂等 | 推送授权与业务事件，失败时按策略重试 |
| 控制调用量并处理 429 | 执行每日配额与限流，返回标准错误码 |
| 记录 `x-trace-id` 便于双方联合排障 | 生成、透传并回写 `traceId` |

### 2.3 网关地址

| 环境 | 网关地址（baseUrl） |
| --- | --- |
| 本地 | `http://127.0.0.1:1000` |
| SIT | `https://custody-sit.cregis.ae/openplatform` |
| 生产 | `https://custody.cregis.ae/openplatform` |

所有业务接口路径均以 `/api/thirdparty/` 开头，例如 `POST https://custody-sit.cregis.ae/openplatform/api/thirdparty/treasury/list`。SDK 会自动拼接 `/api/thirdparty/...`，`baseUrl` 末尾不要带斜杠。

> 注意：`/api/third-party/` 是网关转发到 Custody 后端时使用的上游路径，不是开发者调用的路径。开发者只使用 `/api/thirdparty/`。

### 2.4 接口地图（节选）

| 领域 | 接口 | 认证 |
| --- | --- | --- |
| 财务单元 | `POST /api/thirdparty/treasury/create`、`POST /api/thirdparty/treasury/create-custom`、`POST /api/thirdparty/treasury/list` | Resource |
| 地址与账户 | `POST /api/thirdparty/treasury/address`、`POST /api/thirdparty/treasury/address-by-account/{cusAccountId}`、`POST /api/thirdparty/treasury/create-unit-address/{unitId}/{accountType}/{network}/{coinId}/{number}`、`POST /api/thirdparty/treasury/create-unit-address-by-account/{cusAccountId}/{number}`、`POST /api/thirdparty/treasury/list-unit-account/{unitId}` | Resource |
| 出金 / 归集 / 审批 | `POST /api/thirdparty/treasury/payout`、`POST /api/thirdparty/treasury/pooling`、`POST /api/thirdparty/treasury/submit-task/{taskId}` | Resource |
| 交易查询 | `POST /api/thirdparty/treasury/activities`、`POST /api/thirdparty/treasury/transfer-out-orders`、`POST /api/thirdparty/treasury/transfer-in-orders`、`POST /api/thirdparty/treasury/fund-records`、`POST /api/thirdparty/treasury/unit-fund-records` | Resource |
| 商户 / 用户 / Board | `POST /api/thirdparty/merchant/register`、`POST /api/thirdparty/user/add`、`POST /api/thirdparty/board/init` | `merchant/register` 用 Basic，其余用 Resource |
| OAuth | `POST /api/thirdparty/oauth/authorizeUrl`、`POST /api/thirdparty/oauth/token`、`POST /api/thirdparty/oauth/verify` | Basic 签名；`verify` 无需签名 |

上表为节选，各接口的完整参数、请求 / 响应示例与业务码见第 7–13 章。

---

## 3. 开发者入驻

入驻流程全部通过开发者门户或 `/api/v1/isv/*` 接口完成。除注册和登录外，`/api/v1/isv/*` 接口都需要在请求头携带登录返回的 Bearer JWT：

```
Authorization: Bearer <accessToken>
```

### 3.1 注册

**POST** `/api/v1/isv/auth/register` · 无需认证

**请求体**

```json
{
  "email": "dev@example.com",
  "password": "Str0ngPassw0rd",
  "legalName": "Example Trading Ltd.",
  "registrationNumber": "91310000XXXXXXXXXX",
  "jurisdiction": "CN",
  "dateOfIncorporation": "2020-01-15",
  "registeredAddress": "Shanghai, China",
  "website": "https://example.com",
  "uboInfo": [
    {
      "name": "Zhang San",
      "nationality": "CN",
      "ownershipPercentage": 60,
      "position": "Director",
      "documentUrl": "https://example.com/ubo-id.pdf"
    }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `email` | string | 是 | 登录邮箱，全局唯一 |
| `password` | string | 是 | 至少 6 位 |
| `legalName` | string | 是 | 企业法定名称 |
| `registrationNumber` | string | 否 | 统一社会信用代码或注册号 |
| `jurisdiction` | string | 否 | 注册地国家 / 地区 |
| `dateOfIncorporation` | string | 否 | 成立日期（`YYYY-MM-DD`） |
| `registeredAddress` | string | 否 | 注册地址 |
| `website` | string | 否 | 企业官网 |
| `uboInfo` | array | 是 | 至少一位受益所有人（UBO）；每项含 `name`、`nationality`、`ownershipPercentage`、`position`，可选 `documentUrl` |

**响应**

```json
{
  "code": 0,
  "message": "Registration successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "0f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e5f",
      "isvDeveloperId": "9a8b7c6d-5e4f-4a3b-2c1d-0e9f8a7b6c5d",
      "email": "dev@example.com",
      "name": "Example Trading Ltd.",
      "role": "owner",
      "status": "active"
    }
  }
}
```

注册成功后：

- 开发者记录的 `kybStatus` 初始为 `pending`，需要等待平台审核。
- 注册响应已包含 `accessToken`，可立即登录开发者后台查看资料，但** KYB 未通过前不能创建应用**。
- 邮箱重复注册返回 `40902`（Conflict）。

### 3.2 KYB 审核

KYB（Know Your Business）是平台侧的合规审核，**由平台运营管理员操作，开发者不需要也不会调用审核接口**。审核状态流转如下：

| `kybStatus` | 含义 | 开发者动作 |
| --- | --- | --- |
| `pending` | 待审核 | 等待 |
| `pending_info` | 需补充材料 | 按邮件 / 工单指引补充材料后等待复审 |
| `approved` | 审核通过 | 可创建应用并正式接入 |
| `rejected` | 审核拒绝 | 查看拒绝原因，必要时重新提交入驻申请 |

运营侧使用的接口（仅列出以便理解流程，开发者无权限调用）：

| 接口 | 说明 |
| --- | --- |
| `POST /api/v1/admin/kyb/:id/approve` | 审核通过 |
| `POST /api/v1/admin/kyb/:id/reject` | 审核拒绝，请求体必须包含 `comment`（拒绝原因） |
| `POST /api/v1/admin/kyb/:id/request-info` | 要求补充材料，状态变为 `pending_info` |

KYB 状态未通过时调用创建应用接口会返回 `40303`（`AUTHZ_OPERATOR_DENIED`，`KYB approval required before creating applications`）。

### 3.3 登录

登录需要先完成滑块验证码，流程如下：

1. `GET /api/v1/captcha/generate` 获取 `captchaId`（验证码挑战 5 分钟内有效）。
2. 用户在页面上完成滑块，前端调用 `POST /api/v1/captcha/verify`，请求体 `{ "captchaId": "...", "x": 123 }`，返回 `captchaToken`。
3. 调用登录接口时携带 `captchaToken`。

**POST** `/api/v1/isv/auth/login`

```json
{
  "email": "dev@example.com",
  "password": "Str0ngPassw0rd",
  "captchaToken": "<captcha verify 返回的 token>"
}
```

**响应**

```json
{
  "code": 0,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "0f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e5f",
      "isvDeveloperId": "9a8b7c6d-5e4f-4a3b-2c1d-0e9f8a7b6c5d",
      "email": "dev@example.com",
      "role": "owner",
      "status": "active"
    }
  }
}
```

| 错误码 | 场景 |
| --- | --- |
| `40002` | 未携带 `captchaToken`（`Captcha verification required`） |
| `40003` | `captchaToken` 无效或已过期 |
| `40110` | 邮箱或密码错误、账号被停用 |

`accessToken` 是访问开发者后台接口（`/api/v1/isv/*`）的 Bearer JWT，默认有效期 24 小时（可由平台通过 `ISV_JWT_EXPIRES_IN` 配置）。注销接口 `POST /api/v1/isv/auth/logout` 仅作客户端登出提示，请自行丢弃 token。该 JWT **不是**业务接口的凭证，业务接口使用第 4 章的签名机制。

### 3.4 创建应用

**POST** `/api/v1/isv/applications` · `Authorization: Bearer <accessToken>` · 仅 owner

**请求体**

```json
{
  "appName": "Example Treasury",
  "appDescription": "Enterprise treasury integration",
  "appType": "corporate",
  "callbackUrl": "https://api.example.com/cregis/callback"
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `appName` | string | 是 | 应用名称，展示在授权页 |
| `appDescription` | string | 否 | 应用描述 |
| `appType` | string | 是 | `corporate`（企业资金管理）/ `payment`（加密支付）/ `custody`（个人托管） |
| `callbackUrl` | string | 否 | 默认回调地址，接收授权与业务事件；生产环境必须为 HTTPS |

**响应**（HTTP 201）

```json
{
  "code": 0,
  "message": "Application created successfully",
  "data": {
    "application": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "isvDeveloperId": "9a8b7c6d-5e4f-4a3b-2c1d-0e9f8a7b6c5d",
      "appName": "Example Treasury",
      "appDescription": "Enterprise treasury integration",
      "appType": "corporate",
      "callbackUrl": "https://api.example.com/cregis/callback",
      "appSecret": "sk_1f2e3d4c5b6a79880a1b2c3d4e5f6789",
      "status": "active",
      "createdAt": "2026-10-19T08:00:00.000Z"
    }
  }
}
```

关键说明：

- 响应中的 `application.id` 就是后续签名使用的 **`appId`**（UUID 格式）。
- `appSecret` 是敏感凭证，请立即保存到服务端密钥管理系统。创建应用、重置密钥的响应会返回它；应用列表接口不会返回；应用详情接口返回的是应用记录，请勿在浏览器或日志中暴露。
- 创建应用要求当前开发者 `kybStatus === approved`，且登录用户角色为 `owner`。
- 应用默认状态为 `active`；状态非 `active` 时，OAuth 与业务接口都会被拒绝。

应用创建后可通过以下接口查看：

| 接口 | 说明 |
| --- | --- |
| `GET /api/v1/isv/applications` | 当前用户可访问的应用列表（不含 `appSecret`） |
| `GET /api/v1/isv/applications/:id` | 应用详情 |
| `PUT /api/v1/isv/applications/:id` | 修改 `appName`、`appDescription`、`callbackUrl`（响应不含 `appSecret`） |

### 3.5 订阅套餐

业务接口的每日调用配额来自订阅套餐的 `dailyApiLimit`。

**GET** `/api/v1/isv/packages` · 返回当前可售套餐数组

**POST** `/api/v1/isv/orders` · 创建订阅订单

```json
{
  "packageId": "b6f1c2d3-e4a5-4b6c-8d7e-9f0a1b2c3d4e",
  "period": "monthly",
  "paymentMethod": "bank_transfer"
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `packageId` | string | 是 | 套餐 ID，来自 `GET /api/v1/isv/packages` |
| `period` | string | 是 | `monthly` 或 `yearly` |
| `paymentMethod` | string | 否 | 默认 `bank_transfer` |

订单创建后状态为 `pending`，平台确认付款后开通订阅。可通过以下接口确认订阅状态：

| 接口 | 说明 |
| --- | --- |
| `GET /api/v1/isv/orders/:id` | 订单详情（`status`、`paidAt`、`confirmedAt`） |
| `GET /api/v1/isv/subscriptions` | 订阅历史（分页：`page`、`pageSize`） |
| `GET /api/v1/isv/subscription/current` | 当前生效订阅，含当日用量 `dailyApiUsage` 与套餐信息 |

套餐的 `dailyApiLimit` 字段通过 `GET /api/v1/isv/packages` 获取，它决定每日可调用的业务接口次数（见 6.4）；另有独立的限流档位（见 6.5）。未确认订阅前请勿发起生产调用。

### 3.6 凭证安全

| 凭证 | 用途 | 存放位置 |
| --- | --- | --- |
| `appId` | 公开标识，放在 `basic.appId` | 可出现在前端授权 URL 中 |
| `appSecret` | 计算签名，等价于密钥 | **只能存放在服务端**，不得下发到浏览器、移动端或公开仓库 |
| 登录 `accessToken` | 访问开发者后台接口 | 服务端会话或安全存储，默认 24 小时有效 |
| `authorizeId` | 业务接口的授权标识 | 服务端保存，与自身用户 / 企业映射 |

**重置密钥**

**POST** `/api/v1/isv/applications/:id/regenerate-secret` · `Authorization: Bearer <accessToken>` · 仅 owner

```json
{
  "code": 0,
  "message": "Secret regenerated successfully",
  "data": {
    "applicationSecret": "sk_9f8e7d6c5b4a39281706f5e4d3c2b1a0"
  }
}
```

重置后旧 `appSecret` 立即失效，所有使用旧密钥的签名请求都会返回 `40102`。请在低峰期操作，并同步更新所有服务实例的环境变量。

**泄露处置建议**

1. 立即调用 `regenerate-secret` 吊销旧密钥。
2. 检查 API 日志（`GET /api/v1/api-logs`）中是否存在异常调用、异常 IP 或异常 `apiName`。
3. 若出现未授权操作，暂停应用（平台侧可将应用置为 `suspended`）并联系平台安全团队。
4. 排查泄露渠道（前端打包、日志打印、仓库提交记录），补齐密钥管理流程。

---

## 4. 认证与签名

开放平台**不使用** Bearer Token 调用业务接口。除 `oauth/verify`（凭 `oauthToken` 自证）外，开发者调用的所有接口都要求在请求体 `basic` 中携带签名，签名覆盖 `business` 的规范化结果。平台提供两种签名：

| 签名类型 | 用途 | 使用接口 | 签名串（`MD5(...)` 内层） |
| --- | --- | --- | --- |
| **Basic 签名** | 不涉及授权资源的操作 | `oauth/authorizeUrl`、`oauth/verify`、`oauth/token`；`merchant/register`（无 `authorizationId`） | `appSecret + appId + timestamp + nonce + md5(business)` |
| **Resource 签名** | 绑定授权资源的业务操作 | 除 `merchant/register` 外的全部 `/api/thirdparty/*` 转发接口 | `appSecret + appId + authorizationId + timestamp + nonce + md5(business)` |

两者的唯一区别是 Resource 签名在 `appId` 之后插入了 `authorizationId`。`authorizationId` 即 OAuth 流程得到的 `authorizeId`。

推荐直接使用官方 SDK 的签名方法，避免自行实现产生偏差：

- Node SDK：`calculateBasicSignature` / `calculateResourceSignature` / `buildBasicInfoWithAuthorization`（`@cregis-kit/openplatform-node`）
- Java SDK：`Signer.calculateBasicSignature` / `Signer.calculateResourceSignature` / `Signer.buildBasicInfoWithAuthorization`（`com.cregis:cregis-sdk-core`）

### 4.1 请求结构

```json
{
  "basic": {
    "appId": "550e8400-e29b-41d4-a716-446655440000",
    "authorizationId": "123e4567-e89b-12d3-a456-426614174000",
    "timestamp": 1742947200,
    "nonce": "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6",
    "signature": "998100de866cc5e065ec2b9a5df908b4"
  },
  "business": {
    "unitId": 80
  }
}
```

Basic 签名接口不传 `basic.authorizationId`。

### 4.2 字段规则

| 字段 | 类型 | 必填 | 规则 |
| --- | --- | --- | --- |
| `basic.appId` | string | 是 | 必须是有效 UUID（应用创建接口返回的 `id`） |
| `basic.timestamp` | number | 是 | **Unix 时间戳（秒）**，与服务器时间偏差不超过 **300 秒**（5 分钟）；使用毫秒时间戳会返回 `40103` |
| `basic.nonce` | string | 是 | 每次请求唯一，不可为空。官方 SDK 生成 **32 位** `A-Za-z0-9` 随机串；服务端按 `appId + nonce` 去重，重复使用返回 `40104` |
| `basic.signature` | string | 是 | 32 位**小写**十六进制 MD5；比较时区分大小写 |
| `basic.authorizationId` | string | Resource 签名必填 | `oauth/verify` 返回的 `authorizeId`，必须是有效 UUID |
| `business` | object | 视接口而定 | 业务参数；参与签名时必须严格按 4.3 规范化 |

服务端校验顺序：appId 存在且应用为 `active` → 开发者账号为 `active` → nonce 未使用 → 时间戳在容差内 → 签名匹配。任一失败均不执行业务逻辑。

### 4.3 business 规范化规则

签名对象是 `business` 的**规范化 JSON**，不是原始请求字符串：

1. **对象 key 递归排序**：所有层级（包括嵌套对象）按 key 的字典序升序排列。
2. **数组元素保序**：数组顺序有业务含义，不能排序；但**数组内的对象同样按 key 排序**。
3. **`null` / `undefined` 不参与**：值为 `null` 或 `undefined` 的字段不应出现在签名内容中。官方 SDK 序列化时会丢弃这类字段；为避免网关与 SDK 行为差异，请在构造 `business` 时直接省略这些字段。
4. **空对象序列化为 `{}`**：`business` 为空（`{}`、`null` 或 `undefined`）时，统一按字符串 `{}` 计算，`md5("{}") = 99914b932bd37a50b983c5e7c90ae93b`。
5. **值类型保持原样**：数字保持 JSON number（不要转成字符串），字符串保持原样，布尔值保持 `true` / `false`；不要对金额、ID 等做额外格式化。
6. **UTF-8 编码**：MD5 输入按 UTF-8 字节计算。

示例输入：

```json
{
  "unitId": 80,
  "name": "Demo Treasury",
  "coinIds": [
    { "network": "TRC20", "coinId": "USDT" },
    { "coinId": "BTC", "network": "BTC" }
  ],
  "meta": { "z": 1, "a": 2 },
  "enabled": true
}
```

规范化后的 JSON（注意顶层与嵌套 key 已排序，数组顺序保持不变，数组内对象已排序）：

```
{"coinIds":[{"coinId":"USDT","network":"TRC20"},{"coinId":"BTC","network":"BTC"}],"enabled":true,"meta":{"a":2,"z":1},"name":"Demo Treasury","unitId":80}
```

### 4.4 计算示例

以下示例使用固定输入。Node.js 示例已在 Node 22 上实际运行，下表输出的中间值与最终签名均来自实际执行结果；Java 示例与 Java SDK `Signer` 算法一致，输出相同。

| 参数 | 值 |
| --- | --- |
| `appId` | `550e8400-e29b-41d4-a716-446655440000` |
| `appSecret` | `sk_demo_secret_9f8e7d6c` |
| `authorizationId` | `123e4567-e89b-12d3-a456-426614174000` |
| `timestamp` | `1742947200` |
| `nonce` | `A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6` |
| `business` | 见 4.3 示例 |

**中间值与最终签名（已实际计算）：**

| 项 | 值 |
| --- | --- |
| 规范化 JSON | `{"coinIds":[{"coinId":"USDT","network":"TRC20"},{"coinId":"BTC","network":"BTC"}],"enabled":true,"meta":{"a":2,"z":1},"name":"Demo Treasury","unitId":80}` |
| `md5(business)` | `455c054f56043be5b467e44b6cbd192d` |
| Basic 签名串（不含密钥） | `550e8400-e29b-41d4-a716-4466554400001742947200A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6455c054f56043be5b467e44b6cbd192d` |
| **Basic 签名** | `59853ffb7f587089820379ea8ee32243` |
| Resource 签名串（不含密钥） | `550e8400-e29b-41d4-a716-446655440000123e4567-e89b-12d3-a456-4266141740001742947200A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6455c054f56043be5b467e44b6cbd192d` |
| **Resource 签名** | `c8a4718e976a5f632da56f02cb5b369b` |

#### Node.js（零依赖，可直接运行）

```js
const crypto = require('node:crypto');
const appId = '550e8400-e29b-41d4-a716-446655440000';
const appSecret = 'sk_demo_secret_9f8e7d6c';
const authorizationId = '123e4567-e89b-12d3-a456-426614174000';
const timestamp = 1742947200; // Unix 秒
const nonce = 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6'; // 32 位

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys); // 数组保序，元素递归处理
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => value[key] !== null && value[key] !== undefined) // 丢弃 null/undefined
        .sort()
        .map((key) => [key, sortKeys(value[key])]),
    );
  }
  return value;
}

const md5 = (input) => crypto.createHash('md5').update(input, 'utf8').digest('hex');

const business = {
  unitId: 80,
  name: 'Demo Treasury',
  coinIds: [
    { network: 'TRC20', coinId: 'USDT' },
    { coinId: 'BTC', network: 'BTC' },
  ],
  meta: { z: 1, a: 2 },
  enabled: true,
};

const businessJson = JSON.stringify(sortKeys(business));
const businessMd5 = md5(businessJson);
const basicSignature = md5(`${appSecret}${appId}${timestamp}${nonce}${businessMd5}`);
const resourceSignature = md5(
  `${appSecret}${appId}${authorizationId}${timestamp}${nonce}${businessMd5}`,
);

console.log(businessJson);
// {"coinIds":[{"coinId":"USDT","network":"TRC20"},{"coinId":"BTC","network":"BTC"}],"enabled":true,"meta":{"a":2,"z":1},"name":"Demo Treasury","unitId":80}
console.log(businessMd5);        // 455c054f56043be5b467e44b6cbd192d
console.log(basicSignature);     // 59853ffb7f587089820379ea8ee32243
console.log(resourceSignature);  // c8a4718e976a5f632da56f02cb5b369b
```

#### Java（Jackson，可直接编译运行）

依赖：`com.fasterxml.jackson.core:jackson-databind`（版本与 Java SDK 一致即可）。

```java
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

public class SignatureDemo {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    /** 递归排序：对象按 key 升序；数组保序；数组内对象同样排序；丢弃 null。 */
    private static Object sort(Object value) {
        if (value instanceof Map<?, ?> map) {
            TreeMap<String, Object> sorted = new TreeMap<>();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (entry.getValue() != null) {
                    sorted.put(String.valueOf(entry.getKey()), sort(entry.getValue()));
                }
            }
            return sorted;
        }
        if (value instanceof List<?> list) {
            List<Object> result = new ArrayList<>(list.size());
            for (Object item : list) result.add(sort(item));
            return result;
        }
        return value;
    }

    private static String md5(String input) throws Exception {
        byte[] digest = MessageDigest.getInstance("MD5")
                .digest(input.getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder();
        for (byte b : digest) hex.append(String.format("%02x", b));
        return hex.toString();
    }

    public static void main(String[] args) throws Exception {
        String appId = "550e8400-e29b-41d4-a716-446655440000";
        String appSecret = "sk_demo_secret_9f8e7d6c";
        String authorizationId = "123e4567-e89b-12d3-a456-426614174000";
        long timestamp = 1742947200L; // Unix 秒
        String nonce = "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6"; // 32 位

        Map<String, Object> business = new LinkedHashMap<>();
        business.put("unitId", 80);
        business.put("name", "Demo Treasury");
        business.put("coinIds", List.of(
                Map.of("network", "TRC20", "coinId", "USDT"),
                Map.of("coinId", "BTC", "network", "BTC")));
        business.put("meta", Map.of("z", 1, "a", 2));
        business.put("enabled", true);

        String businessJson = MAPPER.writeValueAsString(sort(business));
        String businessMd5 = md5(businessJson);
        String basicSignature = md5(appSecret + appId + timestamp + nonce + businessMd5);
        String resourceSignature =
                md5(appSecret + appId + authorizationId + timestamp + nonce + businessMd5);

        System.out.println(businessJson);
        // {"coinIds":[{"coinId":"USDT","network":"TRC20"},{"coinId":"BTC","network":"BTC"}],"enabled":true,"meta":{"a":2,"z":1},"name":"Demo Treasury","unitId":80}
        System.out.println(businessMd5);       // 455c054f56043be5b467e44b6cbd192d
        System.out.println(basicSignature);    // 59853ffb7f587089820379ea8ee32243
        System.out.println(resourceSignature); // c8a4718e976a5f632da56f02cb5b369b
    }
}
```

> Java 的 `String.format("%02x", b)` 对 `byte` 按无符号十六进制输出，结果与 Node 的 `digest('hex')` 一致。

### 4.5 验签失败排查

| 现象 / 错误码 | 常见原因 | 排查方式 |
| --- | --- | --- |
| `40103`（时间戳过期） | 使用了毫秒时间戳；服务器时钟漂移；请求重放 | 确认是 10 位 Unix 秒；开启 NTP 同步；每次请求重新取时间 |
| `40104`（nonce 重放） | 固定 nonce；失败重试沿用同一 nonce；并发请求共享 nonce | 每次请求（含重试）生成新 nonce；nonce 在 1 小时内不可重复 |
| `40102`（签名错误），含对象数组的请求 | 只排序了顶层 key，没有排序数组内的对象 | 使用 1.1.0+ Node SDK / 1.2.0+ Java SDK，或按 4.3 递归排序 |
| `40102`，字段被改写 | 签名后修改了 `business`；序列化时增删字段、数字/字符串互转、`null` 处理不一致 | 先构造最终 `business` 再签名；请求体原样发送；省略值为 `null` 的字段 |
| `40102`，全部请求 | `appSecret` 错误；密钥已重置但环境变量未更新；复制时带入空格或换行 | 与开发者后台核对；重置后同步所有实例；对 secret 做 `trim` 检查 |
| `40102`，仅 OAuth 接口 | 误用了 Resource 签名（签名串多了 `authorizationId`） | OAuth 接口使用 Basic 签名 |
| `40102`，仅业务接口 | 未传 `basic.authorizationId`，或传入了另一个环境的 `authorizeId` | 使用本环境 `oauth/verify` 返回的 `authorizeId` |
| `40301`（资源未授权） | `authorizationId` 不存在、已撤销，或不属于当前 `appId` | 重新走 OAuth 流程；确认应用与授权记录一致 |
| `400103`（资源键不存在） | `resourceKey` 未在 Custody 侧开通 | 使用 `merchant/register` 返回的 `resourceAccessKey`，或联系平台开通 |
| `40001`（缺少参数） | 缺少 `basic` 或必填字段 | 检查 `basic` 五项（Resource 为六项）是否完整 |

---

## 5. OAuth 授权流程

### 5.1 流程总览

```
你的后端                 Cregis 网关               授权页                你的前端
   │                        │                        │                     │
   │ 1 POST oauth/authorizeUrl（Basic 签名）           │                     │
   │───────────────────────▶│                        │                     │
   │◀── authorizeUrl ───────│                        │                     │
   │                        │                        │                     │
   │ 2 返回 authorizeUrl 给前端 ───────────────────────────────────────────▶│
   │                        │                        │  3 打开授权页        │
   │                        │                        │◀────────────────────│
   │                        │                        │  4 用户登录/选择组织 │
   │                        │                        │  5 确认授权          │
   │                        │                        │                     │
   │                        │                        │ 6 postMessage       │
   │                        │                        │   authorization_succeed
   │                        │                        │────────────────────▶│
   │◀── 7 前端回传授权结果（authorizationId / oauthToken） ────────────────│
   │                        │                        │                     │
   │ 8 POST oauth/verify    │                        │                     │
   │   { resourceKey, oauthToken }                    │                     │
   │───────────────────────▶│                        │                     │
   │◀── { authorizeId } ────│                        │                     │
   │                        │── authorization.created（异步回调）─────────▶│
```

关键点：

- 授权结果有两种落地方式：授权页 / Web SDK 直接返回 `authorizationId`（推荐，见第 16 章），或服务端用 `oauthToken` 调用 `oauth/verify` 换取 `authorizeId`。
- 业务接口使用的是 `authorizeId`（即 `basic.authorizationId`），不是 `oauthToken`。
- `oauthToken` 是 JWT，默认 2 小时有效；`authorizeId` 是持久化的授权记录 ID。

### 5.2 获取授权地址

**POST** `/api/thirdparty/oauth/authorizeUrl` · Basic 签名

**请求**

```json
{
  "basic": {
    "appId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": 1742947200,
    "nonce": "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6",
    "signature": "0123456789abcdef0123456789abcdef"
  },
  "business": {
    "permissions": ["read", "write"],
    "state": "8f2c1d4e-6a7b-4c8d-9e0f-1a2b3c4d5e6f",
    "callback": "https://api.example.com/cregis/oauth/callback",
    "token": "user-42-order-20261019"
  }
}
```

**参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `permissions` | string[] | 是 | 申请的权限列表；授权页支持 `read`、`write`、`admin`、`transfer`、`view` |
| `state` | string | 是 | 防 CSRF 状态值，原样写入授权 URL，授权完成后由你的系统校验 |
| `callback` | string | 否 | 授权完成后的回调地址；不传则使用应用配置的 `callbackUrl` |
| `token` | string | 否 | 开发者自定义的不透明字符串，用于将授权结果映射到自身用户身份；会原样出现在授权回调载荷中 |

> **没有 `redirectUri` 参数。** 网关只接受上表中的四个字段；需要授权后的服务端通知时请使用 `callback`。`redirectUri` 不是网关参数，它最多只是授权页自身的页面级参数（见 5.3）。

**响应**

```json
{
  "code": 0,
  "message": "Success",
  "data": {
    "authorizeUrl": "https://custody.cregis.ae/openplatform/auth?appId=550e8400-e29b-41d4-a716-446655440000&appToken=eyJhbGciOi...&appName=Example+Treasury&appLogoUrl=https%3A%2F%2Fexample.com%2Flogo.png&permissions=%5B%22read%22%2C%22write%22%5D&state=8f2c1d4e-6a7b-4c8d-9e0f-1a2b3c4d5e6f",
    "expiresIn": 7200
  }
}
```

说明：

- 应用必须存在且状态为 `active`；应用不存在或签约校验失败返回 `40102`，应用未激活返回 `40301`。
- `authorizeUrl` 的域名由平台配置（`OPENPLATFORM_AUTH_URL`），生产环境默认 `https://custody.cregis.ae/openplatform/auth`。
- `appToken` 是网关签发的 JWT（内含 `appId`、`callback`、`token`，有效期 2 小时），不要把 `appSecret` 放进 URL。
- 请把 `authorizeUrl` 原样交给前端打开，不要自行拼接或删改查询参数。

### 5.3 授权页

授权页是一个独立的前端应用（`openplatform-web/auth-page`），可被 iframe、弹窗或新标签页打开。

**URL 参数**

| 参数 | 来源 | 说明 |
| --- | --- | --- |
| `appId` | 网关生成 | 应用标识 |
| `appToken` | 网关生成 | 授权 JWT，内含 `appId`、`callback`、`token` |
| `appName` | 网关生成 | 应用名称，展示在授权页 |
| `appLogoUrl` | 网关生成（应用配置了 Logo 时） | 应用 Logo |
| `permissions` | 网关生成 | 权限列表的序列化结果，原样透传，不要修改 |
| `state` | 网关生成 | 原样回传给你的前端，用于 CSRF 校验 |
| `redirectUri` | 授权页页面级参数（可选） | **仅由授权页解析和校验，用于页面跳转，不是网关参数。** 网关生成的 `authorizeUrl` 不会包含它；需要服务端回调请使用 `callback`。 |
| `sdkUuid` | Web SDK 自动追加 | 用于校验 postMessage 来源实例，避免多实例串话 |

**iframe / 弹窗交互（postMessage）**

授权页与父窗口的消息格式如下。父窗口通过 `init` 建立通道；授权页发出的所有事件都带有 `uuid`（即 `sdkUuid`）和 `timestamp`，并在收到父窗口消息后把目标 origin 固定为父窗口的 origin。

父窗口发给授权页：

| `action` | 说明 |
| --- | --- |
| `init` | 建立通信通道（建议在 iframe `load` 后发送，可携带 `uuid`） |
| `cancel` | 请求取消授权，授权页回报 `authorization_failed`（`USER_CANCELLED`） |
| `close` | 关闭授权页；若正在等待结果，按取消处理 |

授权页发给父窗口：

| `type` | 触发时机 | `data` |
| --- | --- | --- |
| `ready` | 页面初始化完成（参数校验通过） | 无 |
| `authorization_started` | 用户点击“授权”按钮 | 无 |
| `authorization_succeed` | 授权成功 | `{ "authorizationId": "<authorizeId>" }` |
| `authorization_failed` | 参数错误、登录失败、用户取消、授权失败 | `{ "code": "...", "message": "..." }`，同时带 `error: { code, message, details? }` |
| `close` | 授权成功后倒计时结束（约 10 秒）自动关闭 | 无 |

取消授权固定使用 `code = "USER_CANCELLED"`。授权页成功视图会显示成功信息并在倒计时后自动关闭；如果你的授权页不是通过 iframe / 弹窗打开（例如直接新标签页且没有 opener），postMessage 没有接收方，请改用服务端 `callback` 或轮询自身业务状态。

> Web SDK 1.0.5 已封装上述消息处理，推荐直接使用 `CregisWebSDK.openAuthorization(authorizeUrl)`，它会返回 `{ status, authorizeId }`（见第 16 章）。

### 5.4 验证授权（换取 authorizeId）

**POST** `/api/thirdparty/oauth/verify` · 无需签名

**请求**

```json
{
  "resourceKey": "access-key-d21396c169754470b3cdae0af9b2b8a6",
  "oauthToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `resourceKey` | string | 是 | 资源标识。可使用 `merchant/register` 返回的 `resourceAccessKey`，或平台为你的企业开通的资源键 |
| `oauthToken` | string | 是 | 授权流程产生的 JWT（由授权页 / Web SDK 交给你的后端） |

**响应**

```json
{
  "code": 0,
  "message": "Success",
  "data": {
    "authorizeId": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```

行为说明：

- **幂等**：授权记录以 `(appId, resourceKey)` 唯一。同一应用用同一 `resourceKey` 重复调用 `verify` 不会创建新记录，返回同一个 `authorizeId`，并刷新 `authorizedAt`；不同 `resourceKey` 会得到不同的 `authorizeId`。
- `appId` 取自 `oauthToken` 载荷，不接受调用方另行传入。
- `oauthToken` 无效或过期返回 `40101`；应用不存在返回 `40401`。
- **无需 Basic / Resource 签名**：本接口通过校验 JWT 本身完成认证，请求体是裸的 `{ resourceKey, oauthToken }`，不要再包一层 `basic` / `business`。
- `resourceKey` 会绑定到授权记录，并决定后续业务请求转发到 Custody 的哪个资源；使用未开通的键会得到 `400103`。
- 校验成功后会异步推送 `authorization.created` 回调（见 5.6）。回调是异步的，`verify` 的响应不等待回调结果。

**关于 `oauthToken` 的来源：** `oauthToken` 是授权流程返回的 JWT（载荷中带 `appId`、`callback`、`token`，默认 2 小时有效），由你的前端在授权完成后交给后端。当前版本的 Web SDK 直接返回 `authorizationId`，此时可以跳过 `verify`；若你的架构需要在服务端换取授权记录、或需要平台推送 `authorization.created`，则用 `oauthToken` 调用本接口。两种方式得到的 `authorizeId` 都可用于业务接口。授权页的 `postMessage` 事件格式见 5.3，Web SDK 用法见第 16 章。

### 5.5 签发 OAuth Token（受限接口）

**POST** `/api/thirdparty/oauth/token` · Basic 签名

**请求**

```json
{
  "basic": {
    "appId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": 1742947200,
    "nonce": "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6",
    "signature": "0123456789abcdef0123456789abcdef"
  },
  "business": {
    "oauthUserId": "user-42"
  }
}
```

**响应**

```json
{
  "code": 0,
  "message": "Success",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 7200,
    "token_type": "Bearer"
  }
}
```

实现现状与使用建议：

- 该接口当前挂载在 Basic 签名中间件下，但处理逻辑会从请求上下文读取 `req.authorizationId` 作为资源标识，并要求提供 `business.oauthUserId`；它属于平台内部 / 受限接口。
- 返回的 `access_token` 是 2 小时有效的 JWT，**不能**直接用于 `/api/thirdparty/treasury/*` 等业务接口；业务接口仍要求第 4 章的 Resource 签名。
- **第三方开发者一般不需要调用此接口。** 正常接入只需 `authorizeUrl` + 授权页 + `verify`（或 Web SDK 返回的 `authorizationId`）。
- 平台侧的 `/api/oauth/appToken/refresh`、`/api/oauth/revoke`、`/api/oauth/appToken/validate` 属于另一套内部令牌体系（`grant_type=client_credentials|refresh_token`），同样不用于本指南的业务调用链。

### 5.6 授权回调

`oauth/verify` 成功后，平台会向回调地址推送 `authorization.created` 事件。

**回调请求头**

| 请求头 | 说明 |
| --- | --- |
| `X-App-Id` | 应用的 `appId` |
| `X-Event` | `authorization.created` |
| `X-Timestamp` | 推送时的毫秒时间戳（每次重试重新生成） |
| `X-Signature` | `sha256=<HMAC-SHA256>`，签名串为 `appId.event.timestamp.md5(sortedJSON(data))` |

**回调载荷**

```json
{
  "authorizeId": "123e4567-e89b-12d3-a456-426614174000",
  "oauthToken": "user-42-order-20261019"
}
```

- `authorizeId`：本次授权的授权记录 ID，用作业务请求的 `basic.authorizationId`。
- `oauthToken`：这里是 `authorizeUrl` 请求中传入的 `token` 值（身份映射标识），**不是** JWT。
- 回调地址优先级：`authorizeUrl` 的 `callback` > 应用配置的 `callbackUrl`。两者都没有时不会推送。
- 注意：通过 `authorizeUrl` 的 `callback` 指定地址时，当前实现的推送不携带 `X-Event` 头；通过应用默认 `callbackUrl` 推送时携带 `X-Event: authorization.created`。请以请求体内容为准判断事件类型。
- 回调是异步的，失败会重试（初始 + 3 次，间隔 0s / 1s / 5s / 30s，仅对 429、5xx 和网络错误重试）。请务必对 `authorizeId` 做幂等处理。

回调的 HMAC 验签、重试策略、事件列表与响应要求详见 **第 14 章「回调与 Webhook」**。

---

## 6. 通用约定

### 6.1 请求与响应结构

**请求**

- 业务与 OAuth 接口均为 `POST`，`Content-Type: application/json`。
- 除 `oauth/verify` 外，请求体统一为 `{ "basic": {...}, "business": {...} }`；`verify` 直接使用 `{ "resourceKey", "oauthToken" }`。
- 业务接口不使用 `Authorization: Bearer`；认证信息全部在 `basic` 中。
- URL 路径参数（如 `unitId`、`taskId`、`cusAccountId`）不参与签名；参与签名的只有 `business` 和 `basic` 中的签名字段。

**统一响应 envelope**

```json
{
  "code": 0,
  "message": "Success",
  "data": {},
  "trace_id": "6f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e5f"
}
```

| 字段 | 说明 |
| --- | --- |
| `code` | 业务码。`0`（部分上游接口为 `200`）表示成功；其他值见 6.7 |
| `message` | 可读描述，不保证稳定，请以 `code` 判断 |
| `data` | 业务数据；可能为对象、数组、分页对象或 `null` |
| `trace_id` | 请求追踪 ID；部分上游透传响应可能不含该字段，此时以响应头为准 |

**重要：** 业务接口的 HTTP 状态码通常为 `200`，业务失败通过响应体 `code` 表达，请勿仅凭 HTTP 状态判断成败。网关自身产生的错误（路由不存在、缺少 `resourceKey`、配额超限、验签失败、上游不可用）会使用非 200 状态码，并返回同样结构的 envelope；参数校验失败还会附带 `errors` 数组。

### 6.2 分页

**响应形态**

| 接口 | 返回形态 |
| --- | --- |
| `treasury/list` | **数组**（`data` 直接是财务单元数组，不分页包装） |
| `treasury/list-unit-account/{unitId}` | 数组（账户列表） |
| `treasury/create-unit-address-by-account/{cusAccountId}/{number}` | 数组（新生成的地址） |
| `treasury/address`、`treasury/address-by-account/{cusAccountId}` | 分页对象 |
| `treasury/activities`、`transfer-out-orders`、`transfer-in-orders`、`fund-records`、`unit-fund-records` | 分页对象 |

分页对象结构：

```json
{
  "records": [],
  "total": 120,
  "current": 1,
  "size": 20,
  "pages": 6
}
```

| 字段 | 说明 |
| --- | --- |
| `records` | 当前页数据 |
| `total` | 总记录数 |
| `current` | 当前页码（从 1 开始） |
| `size` | 每页条数 |
| `pages` | 总页数 |

**两种查询参数**

| 参数风格 | 参数 | 适用接口 |
| --- | --- | --- |
| 页码从 1 开始 | `pageSize`、`pageNum`、`sortFields` | `treasury/list`、`treasury/address`、`treasury/address-by-account/{cusAccountId}` |
| 页索引从 0 开始 | `pageIndex`、`pageSize`、`sortFields`、`queryList` | `treasury/activities`、`treasury/transfer-out-orders`、`treasury/transfer-in-orders`、`treasury/fund-records`、`treasury/unit-fund-records` |

`sortFields` 格式为 `字段名_asc` / `字段名_desc`，例如 `createTime_d`。`queryList` 为条件数组，每项形如 `{ "key": "unitId", "value": 80, "oper": "=", "join": "and" }`。

> `treasury/list` 虽然接受 `pageSize` / `pageNum`，但**响应仍是数组**，请勿按分页对象解析。

### 6.3 幂等

平台不提供统一的 `Idempotency-Key` 请求头，幂等由业务字段保证：

| 场景 | 幂等键 | 行为 |
| --- | --- | --- |
| 出金 `treasury/payout` | `business.orderId`（你的业务订单号） | 同一 `orderId` 重复提交时，Custody 侧按同一笔业务识别，避免重复出金；请在重试时复用原 `orderId` |
| 商户注册 `merchant/register` | `business.legalName` | 同一企业重复注册不会重复创建，返回 `alreadyExists: true` 及相同的 `ecode`、`resourceAccessKey` |
| 添加用户 `user/add` | `business.email` | 同一企业下同一邮箱不会重复创建用户 |
| 授权 `oauth/verify` | `(appId, resourceKey)` | 重复验证返回同一个 `authorizeId`，并刷新授权时间 |
| 授权回调 `authorization.created` | `authorizeId` | 可能重试推送，接收方必须按 `authorizeId` 去重 |

建议：所有写操作在调用方生成稳定的业务单号，重试时复用；收到回调时先按事件主键去重再执行业务。

### 6.4 每日配额

- 配额按**开发者（ISV）**维度、按自然日统计，上限来自当前生效订阅套餐的 `dailyApiLimit`。
- 仅统计通过网关转发的业务接口调用（`/api/thirdparty/*` 中除 `oauth/verify` 等本地接口外的转发请求）。
- 超出配额返回 HTTP `429`，业务码 `42901`，消息形如 `Daily API quota exceeded (1000/1000)`。
- 用量每日 0 点重置（平台定时任务将 `dailyApiUsage` 归零）。当前用量可通过 `GET /api/v1/isv/subscription/current` 的 `dailyApiUsage` 查看。
- **fail-closed**：当配额服务异常、无法确认剩余额度时，请求会被拒绝（同样表现为 `42901`），而不是放行。这是银行级托管平台的默认安全策略，请在你的系统中把 `42901` 视为“可重试但需退避”的错误。
- 当前实现中，开发者若没有生效中的订阅，配额校验会直接放行；生产环境请始终保持有效订阅，不要依赖该行为。

### 6.5 限流档位

除每日配额外，网关对 `/api` 下的请求执行多窗口限流（分钟 / 小时 / 天 + 突发桶）：

| 档位 | 每日 | 每小时 | 每分钟 | 突发（burst） |
| --- | --- | --- | --- | --- |
| `free` | 1,000 | 100 | 10 | 20 |
| `basic` | 10,000 | 1,000 | 100 | 200 |
| `pro` | 100,000 | 10,000 | 1,000 | 2,000 |
| `enterprise` | 不限 | 100,000 | 10,000 | 20,000 |

- 档位由平台按应用 / 套餐配置；当前版本的默认实现统一使用 `basic` 档，平台侧可按应用调整。
- 超限返回 HTTP `429` 与业务码 `42901`，并带有 `Retry-After` 响应头。
- 限流响应头：`X-RateLimit-Limit`、`X-RateLimit-Remaining`、`X-RateLimit-Reset`（Unix 秒）、`X-RateLimit-Policy`（档位名）。
- 每日配额（6.4）与限流（本节）是两套独立机制：前者按订阅套餐的 `dailyApiLimit` 计数，后者按档位的多窗口规则计算；任一触发都会返回 `42901`。
- 限流存储默认在内存中；限流服务异常时同样 fail-closed 拒绝请求。

### 6.6 traceId 与排障

- 网关为每个请求生成或透传 `x-trace-id`：
  - 请求头已带 `x-trace-id` 时沿用，否则生成 UUID。
  - 响应头回写 `x-trace-id`。
  - 转发到 Custody 时通过 `x-trace-id` 请求头传递。
- 网关本地的错误响应（如参数校验失败、验签失败）会包含 `trace_id` 字段；上游透传的响应体不保证包含该字段，请以**响应头 `x-trace-id`** 为准。
- 在开发者门户的 API 日志（`GET /api/v1/api-logs`）中可按 `traceId` 检索调用记录。
- 提交工单或联调排障时，请提供：`x-trace-id`、`appId`、请求时间（含时区）、接口路径、业务码与完整响应体（请先脱敏 `appSecret`、`oauthToken`）。

### 6.7 错误码速查

| HTTP | `code` | 含义 | 典型场景 / 处理建议 |
| --- | --- | --- | --- |
| 400 | `40001` | 缺少必填参数 | `basic` 不完整、缺少 `appId`；补齐后重试 |
| 400 | `40002` | 参数格式错误 | 格式不符合要求；按文档修正 |
| 400 | `40003` | 违反业务规则 | 请求合法但当前状态不允许 |
| 400 | `40004` | 重复请求 | 业务字段重复 |
| 400 | `40005` | 状态无效 | 对象当前状态不允许该操作 |
| 401 | `40101` | 缺少认证信息 / token 无效 | `basic` 缺失；`oauthToken` 无效或过期 |
| 401 | `40102` | 签名验证失败 | 见 4.5 排查表 |
| 401 | `40103` | 时间戳过期或无效 | 使用 Unix 秒并校准时钟 |
| 401 | `40104` | nonce 重复（重放） | 每次请求生成新 nonce |
| 401 | `40105` | 应用或开发者未激活 | 应用状态不是 `active`，或开发者账号被停用 |
| 401 | `40110` | 登录凭证无效 | 开发者后台登录邮箱 / 密码错误 |
| 403 | `40301` | 资源未授权 | `authorizeId` 无效、已撤销或不属于当前应用；重新授权 |
| 403 | `40302` | 权限不足 | 当前凭据无权执行该操作 |
| 403 | `40303` | 操作方不满足条件 | 常见于 KYB 未通过时创建应用 |
| 403 | `40305` | 权限不足 | 应用 / 用户权限配置不满足 |
| 404 | `40401` | 资源不存在 | 记录不存在，或网关未匹配到路由 |
| 404 | `40402` | 接口不存在 | 检查路径是否使用 `/api/thirdparty/` 前缀 |
| 409 | `40902` | 冲突 / 重复 | 邮箱已注册、授权记录冲突等 |
| 400 | `400103` | 资源键不存在（上游 Custody） | `resourceKey` 未在 Custody 侧开通；使用 `merchant/register` 的 `resourceAccessKey` |
| 400 | `120042` | 归集来源账户类型不允许（上游 Custody） | 仅允许从收款类账户归集；检查 `fromAccountId` |
| 429 | `42901` | 超出配额或限流 | 退避后重试；检查 `Retry-After` 与订阅套餐 |
| 500 | `50001` | 服务内部错误 | 记录 `x-trace-id` 并联系平台 |
| 502 | `50201` | 上游网关错误 | 上游返回异常；稍后重试 |
| 503 | `50301` | 服务不可用 | 上游不可达；稍后重试 |
| 504 | `50401` | 网关超时 | 上游超时；确认业务是否已受理后再决定是否重试 |
| 504 | `50402` | 上游超时 | 同上 |
| 5xx | `500` / `502` / `503` / `504` | 转发层返回的原始 HTTP 风格错误 | 网关在无法连接上游或上游超时时直接返回；按对应语义处理 |

说明：

- 上游 Custody 返回的 `400xxx`、`401xxx`、`403xxx` 业务码会原样透传在响应体 `code` 中；网关日志按码段映射记录 HTTP 状态（`400xxx` → 400、`401xxx` → 401、`403xxx` → 403、`400103` → 404、`409xxx` → 409、`429xxx` → 429、`120xxx` → 400、5xx → 500）。
- 判断请求是否成功请以响应体 `code` 为准（成功为 `0` 或 `200`），不要只看 HTTP 状态码。
- 错误码的完整定义、各接口的业务码清单与处理建议见 **第 15 章「错误码与排查」**。

<!-- 第 7–17 章（API 参考、回调、错误码详解、SDK 集成、附录）由后续任务补充 -->
