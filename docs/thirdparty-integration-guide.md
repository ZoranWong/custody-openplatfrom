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
7. [财务单元](#7-财务单元)
8. [地址](#8-地址)
9. [币种、资金控制与白名单](#9-币种资金控制与白名单)
10. [出金与归集](#10-出金与归集)
11. [任务审批](#11-任务审批)
12. [交易查询](#12-交易查询)

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
        │    授权页 --postMessage--> 你的前端（仅 authorizationId）            │
        │                                 │                                  │
        │ 8. POST /api/thirdparty/oauth/verify                               │
        │    { resourceKey, oauthToken }（oauthToken = 后端保存的 appToken）  │
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
| 创建应用、订阅套餐、选择业务模式 | 提供授权页、签发授权页 JWT（`appToken`，即 `oauthToken`）、维护授权关系 |
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
| 币种 / 规则 / 白名单 | `POST /api/thirdparty/treasury/add-coins`、`POST /api/thirdparty/treasury/fund-control-update`、`POST /api/thirdparty/treasury/whitelist-update` | Resource |
| 商户 / 用户 / Board | `POST /api/thirdparty/merchant/register`、`POST /api/thirdparty/user/add`、`POST /api/thirdparty/board/init` | `merchant/register` 用 Basic，其余用 Resource |
| OAuth | `POST /api/thirdparty/oauth/authorizeUrl`、`POST /api/thirdparty/oauth/token`、`POST /api/thirdparty/oauth/verify` | 前两者用 Basic 签名；`verify` 无需签名 |
| 内部回调 | `POST /api/thirdparty/custody/callback` | 由 Custody 服务调用，开发者无需调用（平台按 `resourceKey` 反查应用并推送事件） |

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

> 另有公开接口 `POST /api/v1/isv/auth/forgot-password` 与 `POST /api/v1/isv/auth/reset-password`。当前实现是演示桩：只做参数校验并返回成功，不会发送邮件，也不校验重置 token。请勿依赖它们找回密码（见 6.8）。

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
- `appSecret` 是敏感凭证，请立即保存到服务端密钥管理系统。创建应用、重置密钥的响应会返回它；应用列表接口不会返回；应用详情接口**会返回完整记录（含 `appSecret`）**，只能在服务端调用。
- 创建应用要求当前开发者 `kybStatus === approved`，且登录用户角色为 `owner`。
- 应用默认状态为 `active`；状态非 `active` 时，OAuth 与业务接口都会被拒绝。

应用创建后可通过以下接口查看：

| 接口 | 说明 |
| --- | --- |
| `GET /api/v1/isv/applications` | 当前用户可访问的应用列表（不含 `appSecret`） |
| `GET /api/v1/isv/applications/:id` | 应用详情。**当前实现直接返回应用记录，包含 `appSecret`**；只能在服务端调用，切勿从浏览器或前端代码调用 |
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

套餐的 `dailyApiLimit` 字段通过 `GET /api/v1/isv/packages` 获取，它决定每日可调用的业务接口次数（见 6.4）；另有独立的限流档位（见 6.5）。若套餐记录缺少 `dailyApiLimit`，配额按 **1000** 计算。未确认订阅前请勿发起生产调用。

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
| **Basic 签名** | 不涉及授权资源的操作 | `oauth/authorizeUrl`、`oauth/token`；`merchant/register`（无 `authorizationId`） | `appSecret + appId + timestamp + nonce + md5(business)` |
| **Resource 签名** | 绑定授权资源的业务操作 | 除 `merchant/register` 外的全部 `/api/thirdparty/*` 转发接口 | `appSecret + appId + authorizationId + timestamp + nonce + md5(business)` |

两者的唯一区别是 Resource 签名在 `appId` 之后插入了 `authorizationId`。`authorizationId` 即 OAuth 流程得到的 `authorizeId`。

> `oauth/verify` **不属于**这两种签名：该路由只做请求体校验（`resourceKey`、`oauthToken` 必填），没有 Basic 签名中间件，见 5.4。

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
3. **`null` 处理（重要）**：网关的 `sortObjectKeys` **不会丢弃 `null`**，`JSON.stringify` 会把 `null` 序列化为 `"key":null` 参与 MD5；只有 `undefined` 会在 `JSON.stringify` 时被丢弃。Node SDK 的 `sortKeys` 会同时丢弃 `null` 和 `undefined`，与网关不同。因此**不要在 `business` 中发送 `null` 值字段**（要么省略字段，要么传业务上的空值如 `""`、`0`），否则自行实现的服务端签名与网关可能不一致。
4. **空对象序列化为 `{}`**：`business` 为空（`{}`、`null` 或 `undefined`）时，统一按字符串 `{}` 计算，`md5("{}") = 99914b932bd37a50b983c5e7c90ae93b`。注意只有**顶层** `business` 会被归一为空对象；嵌套的空对象按 `{}` 正常序列化。
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
        .filter((key) => value[key] !== null && value[key] !== undefined) // 示例按 Node SDK 丢弃 null/undefined；实际请求请勿传 null
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

    /** 递归排序：对象按 key 升序；数组保序；数组内对象同样排序。示例按 Node SDK 丢弃 null；实际请求请勿传 null。 */
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
| `40102`，字段被改写 | 签名后修改了 `business`；序列化时增删字段、数字/字符串互转、`null` 处理不一致（网关保留 `null`、SDK 丢弃 `null`） | 先构造最终 `business` 再签名；请求体原样发送；不要发送值为 `null` 的字段 |
| `40102`，全部请求 | `appSecret` 错误；密钥已重置但环境变量未更新；复制时带入空格或换行 | 与开发者后台核对；重置后同步所有实例；对 secret 做 `trim` 检查 |
| `40102` / `40104`，应用被停用 | 应用状态非 `active` 时，签名中间件以 `AUTH_DUPLICATE_NONCE`（`40104`）返回 `Application is not active`（复用错误码，语义上并非 nonce 问题） | 确认应用状态；联系平台恢复 |
| `40105`，开发者被停用 | 开发者账号状态非 `active` 时返回 `AUTH_APP_NOT_ACTIVE` | 联系平台恢复账号 |
| `40102`，仅 `authorizeUrl` | 误用了 Resource 签名（签名串多了 `authorizationId`） | OAuth 接口使用 Basic 签名；`verify` 不需要签名 |
| `40102`，仅业务接口 | 未传 `basic.authorizationId`，或传入了另一个环境的 `authorizeId` | 使用本环境 `oauth/verify` 返回的 `authorizeId` |
| `40301`（资源未授权） | `authorizationId` 不存在或授权记录状态不是 `active`（当前实现按 ID 查询，不校验应用归属） | 重新走 OAuth 流程并调用 `verify` |
| `400103`（资源键不存在） | `resourceKey` 未在 Custody 侧开通 | 使用 `merchant/register` 返回的 `resourceAccessKey`，或联系平台开通 |
| `40001`（缺少参数） | 缺少 `basic` 或必填字段 | 检查 `basic` 是否完整：Basic 签名 4 个字段（`appId`、`timestamp`、`nonce`、`signature`），Resource 签名 5 个字段（额外 `authorizationId`） |

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
   │◀── 7 前端回传 authorizeId（authorizationId） ───────────────────────────│
   │                        │                        │                     │
   │ 8 POST oauth/verify    │                        │                     │
   │   { resourceKey, oauthToken }（oauthToken = 后端保存的 appToken）    │
   │───────────────────────▶│                        │                     │
   │◀── { authorizeId } ────│                        │                     │
   │                        │── authorization.created（异步回调）─────────▶│
```

关键点：

- 授权页 / Web SDK 只返回 `authorizationId`（授权页内部调用 `/internal/third-party/authorize` 得到，见 5.3），**不会返回 `oauthToken`**。
- `oauthToken` 是网关在 `authorizeUrl` 中签发的 `appToken`（JWT），只有你的后端能拿到它。
- 无论用哪种方式拿到 `authorizationId`，业务接口能用的 `authorizeId` 都必须来自 `oauth/verify`（或签名保护的内部 `POST /api/v1/authorizations`）：业务请求会查询 `oauth_resources` 表，该表只在上述两个接口中被写入。因此 **`verify` 是必需的**，不能只依赖授权页返回的 `authorizationId`。
- 授权页返回的 `authorizationId` 可用于展示或日志；若它与 `verify` 返回的 `authorizeId` 不一致，一律以 `verify` 的返回为准。
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
    "state": "8f2c1d4e-6a7b-4c8d-9e0f-1a2b3c4d5e6f",
    "callback": "https://api.example.com/cregis/oauth/callback",
    "token": "user-42-order-20261019"
  }
}
```

**参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `permissions` | string[] | 否（见下方警告） | 申请的权限列表。控制器不校验该字段，缺省时不写入授权 URL，授权页默认为 `['read']` |
| `state` | string | 否 | 防 CSRF 状态值，原样写入授权 URL 的 `state` 参数。**授权页不会回传 `state`**，请自行通过业务侧记录或 `token` 关联本次授权 |
| `callback` | string | 否 | 授权结果的服务端回调地址；不传则使用应用配置的 `callbackUrl` |
| `token` | string | 否 | 开发者自定义的不透明字符串，写入授权页 JWT，并在授权回调中以 `oauthToken` 字段原样返回（用于身份映射）；不传时回调载荷不含该字段 |

> **`permissions` 序列化陷阱（重要）：** 网关用 `JSON.stringify(permissions)` 写入授权 URL，而授权页用 `permissions.split(',')` 解析。传入非空数组（如 `["read","write"]`）时，授权页实际收到的是 `["read"` 和 `"write"]` 两段，无法通过页面的权限白名单校验，授权页会直接显示失败。**当前可用的做法是省略 `permissions`**（授权页默认 `['read']`）。字符串数组的序列化修复属于平台侧改动。
>
> **没有 `redirectUri` 参数。** 网关只接受上表中的四个字段；需要授权后的服务端通知时请使用 `callback`。`redirectUri` 不是网关参数（见 5.3）。

**响应**

```json
{
  "code": 0,
  "message": "Success",
  "data": {
    "authorizeUrl": "https://custody.cregis.ae/openplatform/auth?appId=550e8400-e29b-41d4-a716-446655440000&appToken=eyJhbGciOi...&appName=Example+Treasury&appLogoUrl=https%3A%2F%2Fexample.com%2Flogo.png&state=8f2c1d4e-6a7b-4c8d-9e0f-1a2b3c4d5e6f",
    "expiresIn": 7200
  }
}
```

说明：

- 若传入 `permissions`，URL 中会出现形如 `permissions=%5B%22read%22%2C%22write%22%5D` 的值，授权页会解析失败（见上方警告）；当前请省略该参数。
- 应用必须存在且状态为 `active`；应用不存在返回 `40102`（`Invalid appId: application not found`），应用未激活返回 `40104`（中间件复用 `AUTH_DUPLICATE_NONCE`，消息为 `Application is not active`）；控制器内对非 `active` 状态的 `40301` 分支实际不可达。
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
| `permissions` | 网关生成（仅当请求传了非空 `permissions`） | `JSON.stringify` 后的权限数组；授权页按英文逗号拆分，非空数组会导致解析失败（见 5.2 警告） |
| `state` | 网关生成（仅当请求传了 `state`） | 防 CSRF 状态值。页面会解析它，但**不会回传**给父窗口或回调 |
| `redirectUri` | 授权页页面参数（可选） | 页面读取并校验协议（http 仅允许 localhost），但**当前没有实际跳转逻辑**，校验后即被忽略；网关也不会生成该参数 |
| `sdkUuid` | Web SDK 自动追加 | 用于校验 postMessage 来源实例，避免多实例串话 |

**交互方式**

授权页有两种初始化路径：

1. **URL 参数模式（`authorizeUrl` 流程，本指南使用的方式）**：页面加载时从查询字符串读取 `appToken` 等参数并自行初始化，随后**直接返回，不注册父窗口消息监听**。因此父窗口发送的 `init` / `cancel` / `close` 消息在该模式下没有任何效果；取消操作只能通过页面内的关闭按钮完成。
2. **postMessage 模式**：仅当 URL 中没有 `appToken` 时，页面才注册消息监听；父窗口发送 `init` 后，页面重新读取 URL 参数初始化。`cancel` / `close` 消息会回报 `authorization_failed`（`USER_CANCELLED`）。标准 `authorizeUrl` 流程不会走到这条路径。

授权页发给父窗口的事件（两种模式一致；所有事件带 `uuid` 与 `timestamp`）：

| `type` | 触发时机 | `data` |
| --- | --- | --- |
| `ready` | 页面初始化完成（参数校验通过） | 无 |
| `authorization_started` | 用户点击“授权”按钮 | 无 |
| `authorization_succeed` | 授权成功 | `{ "authorizationId": "<authorizationId>" }` |
| `authorization_failed` | 参数错误、登录失败、用户取消、授权失败 | `{ "code": "...", "message": "..." }`，同时带 `error: { code, message, details? }` |
| `close` | 授权成功后倒计时结束（约 10 秒）自动关闭 | 无 |

取消授权（页面内关闭按钮）固定使用 `code = "USER_CANCELLED"`。授权页**只返回 `authorizationId`，不返回 `oauthToken`，也不回传 `state`**。该 `authorizationId` 由授权页在用户确认后调用 Custody 的内部授权接口（`POST /internal/third-party/authorize`）获得，不是网关的 `/api/thirdparty/oauth/verify`，因此不会写入平台的 `oauth_resources` 表；业务调用前仍需按 5.4 调用 `verify`。如果授权页没有可用的父窗口（例如直接在新标签页打开且没有 opener），postMessage 没有接收方，请改用服务端 `callback`。

> Web SDK 1.0.5 已封装消息处理，推荐直接使用 `CregisWebSDK.openAuthorization(authorizeUrl)`，它返回 `{ status, authorizeId }`（见第 16 章）。它同样不会返回 `oauthToken`。

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
| `oauthToken` | string | 是 | 网关在 `authorizeUrl` 中签发的 `appToken`（JWT），由你的后端保存后传入；授权页不会返回它 |

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
- **`resourceKey` 不做存在性校验**：本接口会为任意 `resourceKey` 写入（或复用）授权记录，因此不会返回 `400103`。若该键未在 Custody 侧开通，后续转发业务请求时才会由 Custody 返回 `400103`。请使用 `merchant/register` 返回的 `resourceAccessKey` 或平台开通的资源键。
- `resourceKey` 会绑定到授权记录，并决定后续业务请求转发到 Custody 的哪个资源。
- 校验成功后会异步推送 `authorization.created` 回调（见 5.6）。回调是异步的，`verify` 的响应不等待回调结果。
- **业务调用的前提**：业务接口会校验 `basic.authorizationId` 对应的 `oauth_resources` 记录。该表只由本接口和签名保护的内部接口 `POST /api/v1/authorizations`（`/api/v1` 下，不对外推荐）写入；授权页直接返回的 `authorizationId` 不会自动落库。因此 **必须调用 `verify`**，否则业务请求会得到 `40301`。

**关于 `oauthToken`：** 它就是 `authorizeUrl` 响应中 `authorizeUrl` 查询参数里的 `appToken`（JWT，载荷含 `appId`、`callback`、`token`，默认 2 小时有效）。网关不会在授权页或 postMessage 事件中下发它；请在你的后端调用 `authorizeUrl` 时自行保存（或从返回的 URL 中解析），不要下发到浏览器。授权页的 `postMessage` 事件格式见 5.3，Web SDK 用法见第 16 章。

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

- 该接口挂在 Basic 签名中间件下，要求提供 `business.oauthUserId`；**属于平台内部接口，开发者不应调用**。
- 处理逻辑读取 `req.authorizationId`，但 Basic 中间件从不为该字段赋值，因此签发的 JWT 中 `resourceKey` 恒为空字符串 `''`。这属于实现限制，不要依赖该字段。
- 返回的 `access_token` 是 2 小时有效的 JWT，**不能**直接用于 `/api/thirdparty/treasury/*` 等业务接口；业务接口仍要求第 4 章的 Resource 签名。
- **第三方开发者不需要调用此接口。** 正常接入只需 `authorizeUrl` + 授权页 + `verify`。
- 平台侧的 `/api/oauth/appToken/refresh`、`/api/oauth/revoke`、`/api/oauth/appToken/validate` 属于另一套内部令牌体系（`grant_type=client_credentials|refresh_token`），同样不用于本指南的业务调用链。

### 5.6 授权回调

`oauth/verify` 成功后，平台会向回调地址推送 `authorization.created` 事件。

**回调请求头**

| 请求头 | 说明 |
| --- | --- |
| `X-App-Id` | 应用的 `appId`，即请求中 `basic.appId` / `Application.id` |
| `X-Event` | 仅在使用应用默认 `callbackUrl` 时存在，值为 `authorization.created`；使用 `authorizeUrl` 的 `callback` 时**不发送该头** |
| `X-Timestamp` | 推送时的毫秒时间戳（每次重试重新生成） |
| `X-Signature` | `sha256=<HMAC-SHA256>`。签名串为 `appId[.event].timestamp.md5(sortedJSON(data))`：有事件时包含事件段，`authorizeUrl` 的 `callback` 路径下没有事件段，签名串为 `appId.timestamp.md5(...)` |

**回调载荷**

```json
{
  "authorizeId": "123e4567-e89b-12d3-a456-426614174000",
  "oauthToken": "user-42-order-20261019"
}
```

- `authorizeId`：授权记录 ID，用作业务请求的 `basic.authorizationId`。
- `oauthToken`：`authorizeUrl` 请求中传入的 `token` 值（身份映射标识），**不是 JWT**；**未传 `token` 时载荷中没有该字段**。
- 回调地址优先级：`authorizeUrl` 的 `callback` > 应用配置的 `callbackUrl`。两者都没有时不会推送。
- 回调是异步的，失败会重试：初始 1 次 + 3 次重试，实际间隔为 0s / 1s / 5s（配置中的第 4 个 30s 值不可达），仅对 429、5xx 和网络错误重试。请务必对 `authorizeId` 做幂等处理。

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

**错误响应形态（按来源区分）**

| 来源 | 结构 | 说明 |
| --- | --- | --- |
| 转发层错误（`forward.controller.ts` 的 `fail()`） | `{ code, message }` | 路由不存在、缺少 `resourceKey`、配额超限、后端不可用 / 超时。**没有 `data`，也没有 `trace_id`** |
| 验签 / 中间件校验错误 | `{ code, message, errors?, trace_id }` | 参数与签名校验失败附带 `errors` 数组；应用 / 开发者状态错误只带 `trace_id` |
| 全局限流错误 | `{ code, message, trace_id, original_code }` | `original_code` 为映射前的原始业务码 |
| 上游 Custody 响应 | 原样透传 | 结构由上游决定，可能不含 `trace_id` |

**重要：** 业务接口的 HTTP 状态码通常为 `200`，业务失败通过响应体 `code` 表达，请勿仅凭 HTTP 状态判断成败。网关自身产生的错误会使用非 200 状态码（路由不存在 404、缺少 `resourceKey` 400、配额超限 429、后端不可用 503 / 超时 504），但响应体不一定含 `data` 或 `trace_id`，排查时请以响应头 `x-trace-id` 为准。

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

`sortFields` 使用 SDK 与测试中一致的简写形式：字段名 + `_a`（升序）/ `_d`（降序），例如 `createTime_d` 表示按创建时间降序；请统一使用该形式，不要混用 `_asc` / `_desc`。`queryList` 为条件数组，每项形如 `{ "key": "unitId", "value": 80, "oper": "=", "join": "and" }`。

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

- 配额按**开发者（ISV）**维度、按自然日统计，上限来自当前生效订阅套餐的 `dailyApiLimit`；套餐记录缺少该字段时按 **1000** 计算。
- 仅统计通过网关转发的业务接口调用（`/api/thirdparty/*` 中除 `oauth/verify` 等本地接口外的转发请求）。
- 超出配额返回 HTTP `429`，业务码 `42901`，消息形如 `Daily API quota exceeded (1000/1000)`。
- 用量每日 0 点重置（平台定时任务将 `dailyApiUsage` 归零）。当前用量可通过 `GET /api/v1/isv/subscription/current` 的 `dailyApiUsage` 查看。
- **fail-closed**：当配额服务异常（如数据库不可用）时，请求会被拒绝，返回 `42901`；此时消息中的计数为 `(0/0)`，不要据此判断真实额度。这是银行级托管平台的默认安全策略，请把 `42901` 视为“可重试但需退避”的错误。
- 当前实现中，开发者若没有生效中的订阅，配额校验会直接放行；生产环境请始终保持有效订阅，不要依赖该行为。

### 6.5 限流档位

除每日配额外，网关对 `/api` 下的请求执行多窗口限流（分钟 / 小时 / 天）：

| 档位 | 每日 | 每小时 | 每分钟 |
| --- | --- | --- | --- |
| `free` | 1,000 | 100 | 10 |
| `basic` | 10,000 | 1,000 | 100 |
| `pro` | 100,000 | 10,000 | 1,000 |
| `enterprise` | 不限 | 100,000 | 10,000 |

实现现状：

- **档位当前固定为 `basic`。** 中间件按 `req.appid` 或 `req.body.appid` 识别应用（不是 `basic.appId`），且 `getTierForApp` 尚未查询订阅，始终返回默认档；第三方签名请求不带 `appid`，因此同样落在 `basic` 档。`TIER_APP_MAPPING` 未生效。
- 配置中的 `burstSize`（突发桶）字段**未被任何限流逻辑使用**，实际只按分钟 / 小时 / 天三个窗口计数。
- 回环地址 `127.0.0.1`、`::1` 在默认白名单中，使用这两个地址联调时不会触发限流。白名单按字符串精确匹配，配置里的 CIDR 网段字符串（`10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16`）不会匹配普通内网 IP。
- 超限返回 HTTP `429` 与业务码 `42901`，并带有 `Retry-After` 响应头。
- 限流响应头：`X-RateLimit-Limit`、`X-RateLimit-Remaining`、`X-RateLimit-Reset`（Unix 秒）、`X-RateLimit-Policy`（档位名）。
- 每日配额（6.4）与限流（本节）是两套独立机制：前者按订阅套餐的 `dailyApiLimit` 计数，后者按固定 `basic` 档的多窗口规则计算；任一触发都会返回 `42901`。
- 限流存储在内存中（多实例不共享计数）；限流服务异常时同样 fail-closed 拒绝请求。

### 6.6 traceId 与排障

- 网关为每个请求生成或透传追踪 ID，优先级为 **`traceparent`（W3C）> `x-trace-id`**：
  - 请求带合法的 `traceparent` 时，取其 trace-id（32 位十六进制）作为追踪 ID（不使用其中的 span-id）。
  - 否则沿用请求头 `x-trace-id`；两者都没有时生成 UUID v4。
  - 响应同时回写 `x-trace-id` 与新的 `traceparent`（以及请求携带时的 `tracestate`）。
  - 转发到 Custody 时通过 `x-trace-id` 请求头传递。
- 错误响应的 `trace_id` 只出现在网关中间件生成的错误中；转发层 `fail()` 的错误只有 `{ code, message }`。请始终以**响应头 `x-trace-id`** 为准。
- API 日志查询（`GET /api/v1/api-logs`）**不支持按 `traceId` 过滤**，列表也不返回 `traceId`；转发调用的日志把 `x-trace-id` 存在 `requestHeaders` 中，可通过日志详情（`GET /api/v1/api-logs/:id`）的 `requestHeaders['x-trace-id']` 查看。
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
| 401 | `40104` | nonce 重复（重放）；**也被复用于“应用未激活”** | 每次请求生成新 nonce；若消息为 `Application is not active`，请检查应用状态 |
| 401 | `40105` | 开发者账号未激活 | 开发者账号状态不是 `active` |
| 401 | `40110` | 登录凭证无效 | 开发者后台登录邮箱 / 密码错误 |
| 403 | `40301` | 资源未授权 | `authorizeId` 不存在或授权记录状态不是 `active`（当前实现不校验应用归属）；重新授权并调用 `oauth/verify` |
| 403 | `40302` | 权限不足 | 当前凭据无权执行该操作 |
| 403 | `40303` | 操作方不满足条件 | 常见于 KYB 未通过时创建应用 |
| 403 | `40305` | 权限不足 | 应用 / 用户权限配置不满足 |
| 404 | `40401` | 资源不存在 / 路由不存在 | 记录不存在；或网关未匹配到转发路由（转发层返回 `{ code: 40401, message: "Route not found: ..." }`） |
| 409 | `40902` | 冲突 / 重复 | 邮箱已注册、授权记录冲突等 |
| 400 | `400103` | 资源键不存在（上游 Custody） | `resourceKey` 未在 Custody 侧开通；使用 `merchant/register` 的 `resourceAccessKey` |
| 400 | `120042` | 归集来源账户类型不允许（上游 Custody） | 仅允许从收款类账户归集；检查 `fromAccountId` |
| 429 | `42901` | 超出配额或限流 | 退避后重试；检查 `Retry-After` 与订阅套餐 |
| 500 | `50001` | 服务内部错误 | 记录 `x-trace-id` 并联系平台 |
| 503 / 504 / 500 | `503` / `504` / `500` | 转发层返回的原始 HTTP 状态码 | 网关连不上上游（`503`）、上游超时（`504`）或其他转发异常（`500`）时直接返回，响应体只有 `{ code, message }`；按对应语义处理 |
| 5xx | 上游原始 `code` | 上游内部错误 | 透传上游响应体；记录 `x-trace-id` 后联系平台 |

说明：

- 上游 Custody 返回的 `400xxx`、`401xxx`、`403xxx` 业务码会原样透传在响应体 `code` 中；网关日志按码段映射记录 HTTP 状态（`400xxx` → 400、`401xxx` → 401、`403xxx` → 403、`400103` → 404、`409xxx` → 409、`429xxx` → 429、`120xxx` → 400、5xx → 500）。
- `40402`、`50201`、`50301`、`50401`、`50402` 等枚举存在，但当前网关不会主动返回；网关自身的路由错误使用 `40401`，转发层失败使用原始 HTTP 状态码 `500` / `503` / `504`。响应体 `code` 为 `502` 只可能来自上游透传。
- 判断请求是否成功请以响应体 `code` 为准（成功为 `0` 或 `200`），不要只看 HTTP 状态码。
- 错误码的完整定义、各接口的业务码清单与处理建议见 **第 15 章「错误码与排查」**。

### 6.8 已知限制与实现现状

以下为当前代码实现的限制，文档按真实行为描述；如需修复请以平台后续版本为准：

| 限制 | 影响 | 规避方式 |
| --- | --- | --- |
| `authorizeUrl` 的 `permissions` 用 `JSON.stringify` 写入 URL，授权页按逗号拆分 | 传非空权限数组会导致授权页初始化失败 | 省略 `permissions`，授权页默认 `['read']` |
| 限流档位固定为 `basic`，`burstSize` 未生效 | 所有应用（含 enterprise）实际按 `basic` 档限流 | 按 100/分钟、1,000/小时、10,000/天规划调用量 |
| `oauth/token` 读取从未赋值的 `req.authorizationId` | 签发 JWT 的 `resourceKey` 恒为 `''` | 不调用该内部接口 |
| 授权页/Web SDK 只返回 `authorizationId`，不返回 `oauthToken` | `oauthToken` 只能由后端从 `authorizeUrl` 响应中保存 | 后端保存 `appToken`，授权完成后调用 `verify` |
| 授权页不回传 `state` | 无法用 `state` 做前端 CSRF 校验 | 用 `token` 关联业务身份，或业务侧记录授权上下文 |
| 授权记录按 ID 查询，不校验应用归属 | 理论上一个应用可使用另一应用创建的 `authorizeId` | 妥善保护 `authorizeId`，不要跨应用传递 |
| `GET /api/v1/isv/applications/:id` 返回 `appSecret` | 泄露风险 | 仅在服务端调用，禁止浏览器调用 |
| 授权回调 `callback` 路径不带 `X-Event`，签名串也无事件段 | 验签实现需区分两条回调路径 | 优先配置应用默认 `callbackUrl` |
| `forgot-password` / `reset-password` 为演示桩 | 不会真正发信或校验 token | 通过平台运营人工重置 |
| 无有效订阅时配额校验放行 | 可能绕过 `dailyApiLimit` | 保持有效订阅，不依赖该行为 |

## 7. 财务单元

本章至第 12 章描述网关转发到 Custody 的业务接口。所有接口均为 `POST`，请求体为 `{ "basic": {...}, "business": {...} }`，使用 **Resource 签名**（`basic.authorizationId` 必填，见第 4 章）。路径中以 `{...}` 表示的参数（如 `unitId`、`taskId`）不参与签名，其值必须匹配 `^[a-zA-Z0-9_-]{1,64}$`，否则网关在转发前返回 `40001`。

转发行为统一为：网关把 `business` **原样**作为上游请求体发送给 Custody（不增删字段），再把 Custody 的响应体原样返回。因此：

- HTTP 状态通常为 `200`；成功以响应体 `code` 为 `0` 或 `200` 判断。
- 参数校验、业务规则等错误由 Custody 返回，网关透传 `code` 与 `message`；`400xxx`（参数）、`401xxx`（认证）、`403xxx`（授权）、`400103`（资源键不存在）、`120xxx`（业务规则）均属此类。
- 网关自身错误（缺少 `resourceKey`、路由不存在、配额超限、上游不可用）的结构见 6.1。

### 7.1 创建财务单元

**POST** `/api/thirdparty/treasury/create` · 鉴权：Resource 签名
> 网关转发至 custody：`/api/third-party/create/{resourceKey}`，`business` 原样作为上游请求体

**请求参数（business）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `unitName` | string | 是 | 财务单元名称 |
| `businessScope` | string | 是 | 业务类型：`DEDICATED_ACCOUNT` / `OMNIBUS_ACCOUNT` / `OPEN_API_PROXY` |
| `topology` | string | 是 | 账本拓扑：`ORBIT` / `SINGLE_GENERAL` / `QUAD_SMART_ISOLATION` |
| `coinIds` | CoinInfo[] | 是 | 币种与网络，每项 `{ coinId, network }` |
| `primaryManager` | FundControl[] | 是 | 主账户资金管理员，每项 `{ coinId, fundControlRules }` |
| `payoutManager` | FundControl[] | 是 | 出金账户资金管理员，结构同上 |
| `businessPurpose` | string | 否 | 业务用途 |
| `autoSignUrl` | string | 否 | 自动签入地址 |
| `primaryWhiteList` | WhiteListCreateRequest[] | 否 | 主账户出金白名单，每项 `{ network, address, alias? }` |
| `primaryAnycallRules` | AnyCallRule[] | 否 | 主账户通用调用控制，每项 `{ guardians, threshold, allowedCommands }` |
| `payinAnycallRules` | AnyCallRule[] | 否 | 收款账户通用调用控制 |
| `payoutAnycallRules` | AnyCallRule[] | 否 | 付款账户通用调用控制 |
| `thirdPartyEcode` | string | 否 | 三方平台 ecode |
| `remark` | string | 否 | 备注 |

`FundControl` 中的 `fundControlRules` 每项为 `{ guardians: string[], threshold: string, perTransferLimit: string, dailyTransferLimit: string }`，四个字段均必填。`threshold` 与限额均为字符串类型。

**请求示例**

```json
{
  "basic": { "appId": "550e8400-e29b-41d4-a716-446655440000", "authorizationId": "123e4567-e89b-12d3-a456-426614174000", "timestamp": 1742947200, "nonce": "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6", "signature": "c8a4718e976a5f632da56f02cb5b369b" },
  "business": {
    "unitName": "Demo Treasury",
    "businessScope": "DEDICATED_ACCOUNT",
    "topology": "SINGLE_GENERAL",
    "coinIds": [{ "coinId": "USDT", "network": "TRC20" }],
    "primaryManager": [
      { "coinId": "USDT", "fundControlRules": [{ "guardians": ["guardian-1"], "threshold": "1", "perTransferLimit": "100000", "dailyTransferLimit": "1000000" }] }
    ],
    "payoutManager": [
      { "coinId": "USDT", "fundControlRules": [{ "guardians": ["guardian-1"], "threshold": "1", "perTransferLimit": "100000", "dailyTransferLimit": "1000000" }] }
    ],
    "businessPurpose": "payment processing",
    "remark": "created by integration guide"
  }
}
```

**响应示例**

```json
{
  "code": 200,
  "message": "SUCCESS",
  "data": {
    "id": 80,
    "ecode": "EC0000000001",
    "projectId": 10,
    "name": "Demo Treasury",
    "topology": "SINGLE_GENERAL",
    "coinIds": [{ "coinId": "USDT", "network": "TRC20" }],
    "accounts": [{ "account_name": "primary", "account_type": "PRIMARY" }],
    "status": "ACTIVATED",
    "creationType": "THIRD_PARTY",
    "createTime": "2026-10-19 10:00:00",
    "updateTime": "2026-10-19 10:00:00"
  }
}
```

`data.id` 即后续接口使用的 `unitId`。SDK 将该响应映射为 `CreateTreasuryUnitResponse`。

**常见业务码**：`400 请求参数格式错误`（由 custody 返回，网关透传）。**已知问题：** 即使 `business` 结构完整，SIT 环境当前仍会从 custody 收到该错误；原因未在代码中确认，请以 custody 后续版本为准。另有 `400103`（`resourceKey` 未开通）、`401xxx` / `403xxx`（签名与授权问题）。

### 7.2 创建自定义结构财务单元

**POST** `/api/thirdparty/treasury/create-custom` · 鉴权：Resource 签名
> 网关转发至 custody：`/api/third-party/create-custom/{resourceKey}`，`business` 原样作为上游请求体

**请求参数（business）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `unitName` | string | 是 | 财务单元名称 |
| `coinIds` | CoinInfo[] | 是 | 币种与网络，每项 `{ coinId, network }` |
| `fundControls` | FundControl[][] | 是 | 资金管理员，每个账户一组 `FundControl`（二维数组） |
| `topology` | string | 否 | 账本拓扑：`ORBIT` / `SINGLE_GENERAL` / `CUSTOM` / `QUAD_SMART_ISOLATION` |
| `businessScope` | string | 否 | 业务类型：`DEDICATED_ACCOUNT` / `OMNIBUS_ACCOUNT` / `OPEN_API_PROXY` |
| `isSmart` | boolean | 否 | 是否合约账户（custody 描述为“默认是合约账户”） |
| `businessPurpose` | string | 否 | 业务用途 |
| `customUnitDTOs` | CustomUnitDTO[] | 否 | 自定义账户：每项 `{ accountName, accountType }`，`accountType` 取值 `GENERAL_ACQUIRING` / `SMART_ACQUIRING` / `SMART` / `GENERAL` / `GMA`（SDK 类型另含 `TMA`） |
| `whitelistRules` | WhitelistRule[] | 否 | 白名单规则：每项 `{ accounts: string[], addresses: { network, address }[] }` |
| `thirdPartyEcode` | string | 否 | 三方平台 ecode |
| `remark` | string | 否 | 备注 |

**请求示例**

```json
{
  "basic": { "appId": "550e8400-e29b-41d4-a716-446655440000", "authorizationId": "123e4567-e89b-12d3-a456-426614174000", "timestamp": 1742947200, "nonce": "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6", "signature": "c8a4718e976a5f632da56f02cb5b369b" },
  "business": {
    "unitName": "Custom Unit",
    "topology": "CUSTOM",
    "coinIds": [{ "coinId": "USDT", "network": "TRC20" }],
    "customUnitDTOs": [
      { "accountName": "collection", "accountType": "SMART_ACQUIRING" },
      { "accountName": "settlement", "accountType": "SMART" }
    ],
    "fundControls": [
      [{ "coinId": "USDT", "fundControlRules": [{ "guardians": ["guardian-1"], "threshold": "1", "perTransferLimit": "100000", "dailyTransferLimit": "1000000" }] }],
      [{ "coinId": "USDT", "fundControlRules": [{ "guardians": ["guardian-1"], "threshold": "1", "perTransferLimit": "100000", "dailyTransferLimit": "1000000" }] }]
    ]
  }
}
```

**响应示例**

```json
{ "code": 200, "message": "SUCCESS", "data": { "id": 81, "ecode": "EC0000000001", "name": "Custom Unit", "topology": "CUSTOM", "status": "ACTIVATED" } }
```

SDK 将 `data` 映射为 `TreasuryUnit`。上游 YAML 对该响应的 `data` 声明为 `null`，实际字段以 custody 返回为准。

**常见业务码**：`400xxx`（参数）、`400103`（`resourceKey` 未开通）、`401xxx` / `403xxx`（签名与授权）——均由 custody 返回，网关透传。

### 7.3 查询财务单元列表

**POST** `/api/thirdparty/treasury/list` · 鉴权：Resource 签名
> 网关转发至 custody：`/api/third-party/list/{resourceKey}`，`business` 原样作为上游请求体

**请求参数（business）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `pageSize` | number | 否 | 每页数量 |
| `pageNum` | number | 否 | 页码（从 1 开始） |
| `sortFields` | string | 否 | 排序，格式 `字段_类型`：`_d` 降序 / `_a` 升序，如 `createTime_d` |

**请求示例**

```json
{
  "basic": { "appId": "550e8400-e29b-41d4-a716-446655440000", "authorizationId": "123e4567-e89b-12d3-a456-426614174000", "timestamp": 1742947200, "nonce": "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6", "signature": "c8a4718e976a5f632da56f02cb5b369b" },
  "business": { "pageSize": 10, "pageNum": 1, "sortFields": "createTime_d" }
}
```

**响应示例**（`data` 为数组，**不分页包装**）

```json
{
  "code": 200,
  "message": "SUCCESS",
  "data": [
    { "id": 80, "ecode": "EC0000000001", "name": "Demo Treasury", "topology": "SINGLE_GENERAL", "status": "ACTIVATED", "creationType": "THIRD_PARTY", "coinIds": [{ "coinId": "USDT", "network": "TRC20" }], "accounts": [{ "account_name": "primary", "account_type": "PRIMARY" }], "createTime": "2026-10-19 10:00:00", "updateTime": "2026-10-19 10:00:00" }
  ]
}
```

> 虽然接受 `pageSize` / `pageNum`，响应仍是数组；请勿按 `{ records, total, ... }` 解析（见 6.2）。

**常见业务码**：`400xxx`（参数）、`400103`（`resourceKey` 未开通）、`401xxx` / `403xxx`——由 custody 返回，网关透传。

### 7.4 查询财务单元账户列表

**POST** `/api/thirdparty/treasury/list-unit-account/{unitId}` · 鉴权：Resource 签名
> 网关转发至 custody：`/api/third-party/list-unit-account/{resourceKey}/{unitId}`，`business` 原样作为上游请求体

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `unitId` | number | 是 | 财务单元 ID |

**请求参数（business）**

无业务字段；发送空对象 `{}` 即可。

**请求示例**

```json
{
  "basic": { "appId": "550e8400-e29b-41d4-a716-446655440000", "authorizationId": "123e4567-e89b-12d3-a456-426614174000", "timestamp": 1742947200, "nonce": "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6", "signature": "c8a4718e976a5f632da56f02cb5b369b" },
  "business": {}
}
```

**响应示例**（`data` 为数组）

```json
{
  "code": 200,
  "message": "SUCCESS",
  "data": [
    {
      "id": 101,
      "ecode": "EC0000000001",
      "vaultCode": "VAULT001",
      "vaultAccountId": "va-001",
      "projectId": 10,
      "treasuryUnitId": 80,
      "accountName": "primary",
      "balance": 1000000,
      "freezeBalance": 0,
      "holdBalance": 0,
      "coinId": "USDT",
      "network": "TRC20",
      "type": "PRIMARY",
      "accountType": "GENERAL",
      "status": 1,
      "income": 0,
      "outcome": 0,
      "isSmart": false,
      "createTime": "2026-10-19 10:00:00",
      "updateTime": "2026-10-19 10:00:00"
    }
  ]
}
```

`id` 即其他接口使用的 `cusAccountId`；`type` 为账户类型（`PRIMARY` / `PAYIN` / `PAYOUT` / `QUARANTINE` 等），`accountType` 为金库账户类型。后续地址、出金、归集接口的 `coinId` / `network` 建议取自本接口。

**常见业务码**：`400xxx`（参数）、`400103`（`resourceKey` 未开通）、`401xxx` / `403xxx`——由 custody 返回，网关透传。

---

## 8. 地址

地址接口用于查询和批量生成财务单元的收款 / 出金地址。账户类型 `accountType` 的完整取值为：`FREEZE` / `DEPOSIT` / `PRIMARY` / `RECEIVABLE` / `PAYOUT` / `PAYIN` / `GENERAL_GAS` / `QUARANTINE` / `DIRTY`（见 `AccountType`）；上游 YAML 在部分请求中只列出 `FREEZE` / `PRIMARY` / `PAYOUT` / `PAYIN` / `GENERAL_GAS` / `QUARANTINE`，其余取值请以 custody 实际返回为准。

### 8.1 查询财务单元地址（按单元 + 账户类型）

**POST** `/api/thirdparty/treasury/address` · 鉴权：Resource 签名
> 网关转发至 custody：`/api/third-party/get-unit-address/{resourceKey}`，`business` 原样作为上游请求体

**请求参数（business）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `unitId` | number | 是 | 财务单元 ID |
| `accountType` | string | 是 | 账户类型，取值见本章开头 |
| `coinId` | string | 是 | 币种 ID |
| `network` | string | 是 | 网络 |
| `pageSize` | number | 否 | 每页数量 |
| `pageNum` | number | 否 | 页码（从 1 开始） |

> **四个字段必须一起传。** 缺少 `coinId` 或 `network` 时 custody 返回**空分页**（不是错误）；缺少 `accountType` 时 custody 返回 **HTTP 500**。请从 7.4 的账户列表取值。

**请求示例**

```json
{
  "basic": { "appId": "550e8400-e29b-41d4-a716-446655440000", "authorizationId": "123e4567-e89b-12d3-a456-426614174000", "timestamp": 1742947200, "nonce": "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6", "signature": "c8a4718e976a5f632da56f02cb5b369b" },
  "business": { "unitId": 80, "accountType": "PAYIN", "coinId": "USDT", "network": "TRC20", "pageNum": 1, "pageSize": 20 }
}
```

**响应示例**（分页对象）

```json
{
  "code": 200,
  "message": "SUCCESS",
  "data": {
    "records": [
      {
        "id": 9001,
        "address": "TXYZ...",
        "addressIndex": 1,
        "accountType": "PAYIN",
        "coinId": "USDT",
        "network": "TRC20",
        "cusAccountId": 101,
        "treasuryUnitId": 80,
        "available": 1,
        "holdAmount": 0,
        "holdFrozen": 0,
        "status": 1,
        "createTime": "2026-10-19 10:00:00",
        "updateTime": "2026-10-19 10:00:00"
      }
    ],
    "total": 1,
    "current": 1,
    "size": 20,
    "pages": 1
  }
}
```

**常见业务码**：`400xxx`（参数）、`400103`（`resourceKey` 未开通）、`401xxx` / `403xxx`；缺少 `accountType` 时 custody 返回 `500`（上游内部错误，原样透传）——均由 custody 返回，网关透传。

### 8.2 查询财务单元地址（按账户 ID）

**POST** `/api/thirdparty/treasury/address-by-account/{cusAccountId}` · 鉴权：Resource 签名
> 网关转发至 custody：`/api/third-party/get-unit-address/{resourceKey}/{cusAccountId}`，`business` 原样作为上游请求体

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `cusAccountId` | number | 是 | 账户 ID，来自 7.4 账户列表的 `id` |

**请求参数（business）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `unitId` | number | 是 | 财务单元 ID |
| `coinId` | string | 是 | 币种 ID |
| `network` | string | 是 | 网络 |
| `pageSize` | number | 否 | 每页数量 |
| `pageNum` | number | 否 | 页码（从 1 开始） |

> 本接口按账户定位，`accountType` 不需要传。`unitId + coinId + network` 必须一起传：缺少 `coinId` / `network` 时返回**空分页**。

**请求示例**

```json
{
  "basic": { "appId": "550e8400-e29b-41d4-a716-446655440000", "authorizationId": "123e4567-e89b-12d3-a456-426614174000", "timestamp": 1742947200, "nonce": "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6", "signature": "c8a4718e976a5f632da56f02cb5b369b" },
  "business": { "unitId": 80, "coinId": "USDT", "network": "TRC20", "pageNum": 1, "pageSize": 20 }
}
```

**响应示例**（分页对象，结构同 8.1）

```json
{
  "code": 200,
  "message": "SUCCESS",
  "data": {
    "records": [
      { "id": 9001, "address": "TXYZ...", "addressIndex": 1, "accountType": "PAYIN", "coinId": "USDT", "network": "TRC20", "cusAccountId": 101, "treasuryUnitId": 80, "status": 1, "createTime": "2026-10-19 10:00:00", "updateTime": "2026-10-19 10:00:00" }
    ],
    "total": 1,
    "current": 1,
    "size": 20,
    "pages": 1
  }
}
```

**常见业务码**：`400xxx`（参数）、`400103`（`resourceKey` 未开通）、`401xxx` / `403xxx`——由 custody 返回，网关透传。

### 8.3 按账户类型批量创建地址

**POST** `/api/thirdparty/treasury/create-unit-address/{unitId}/{accountType}/{network}/{coinId}/{number}` · 鉴权：Resource 签名
> 网关转发至 custody：`/api/third-party/create-unit-address/{resourceKey}/{unitId}/{accountType}/{network}/{coinId}/{number}`，`business` 原样作为上游请求体

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `unitId` | number | 是 | 财务单元 ID |
| `accountType` | string | 是 | 账户类型，取值见本章开头 |
| `network` | string | 是 | 网络 |
| `coinId` | string | 是 | 币种 ID |
| `number` | number | 是 | 生成数量 |

**请求参数（business）**

无业务字段；发送空对象 `{}` 即可。

**请求示例**

```json
{
  "basic": { "appId": "550e8400-e29b-41d4-a716-446655440000", "authorizationId": "123e4567-e89b-12d3-a456-426614174000", "timestamp": 1742947200, "nonce": "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6", "signature": "c8a4718e976a5f632da56f02cb5b369b" },
  "business": {}
}
```

**响应示例**

```json
{ "code": 200, "message": "SUCCESS", "data": null }
```

该接口不返回新建的地址；需要地址时请调用 8.1 查询。`coinId` / `network` 必须是该财务单元已配置的币种与网络。

**常见业务码**：`400xxx`（参数；币种 / 网络未在单元下配置时由 custody 拒绝）、`400103`（`resourceKey` 未开通）、`401xxx` / `403xxx`——由 custody 返回，网关透传。

### 8.4 按账户 ID 批量创建地址

**POST** `/api/thirdparty/treasury/create-unit-address-by-account/{cusAccountId}/{number}` · 鉴权：Resource 签名
> 网关转发至 custody：`/api/third-party/create-unit-address/{resourceKey}/{cusAccountId}/{number}`，`business` 原样作为上游请求体

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `cusAccountId` | number | 是 | 账户 ID，来自 7.4 账户列表的 `id` |
| `number` | number | 是 | 生成数量 |

**请求参数（business）**

无业务字段；发送空对象 `{}` 即可。

**请求示例**

```json
{
  "basic": { "appId": "550e8400-e29b-41d4-a716-446655440000", "authorizationId": "123e4567-e89b-12d3-a456-426614174000", "timestamp": 1742947200, "nonce": "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6", "signature": "c8a4718e976a5f632da56f02cb5b369b" },
  "business": {}
}
```

**响应示例**（`data` 为本次新建的地址数组）

```json
{
  "code": 200,
  "message": "SUCCESS",
  "data": [
    { "id": 9002, "address": "TABC...", "addressIndex": 2, "accountType": "PAYIN", "coinId": "USDT", "network": "TRC20", "cusAccountId": 101, "treasuryUnitId": 80, "status": 1, "createTime": "2026-10-19 10:05:00", "updateTime": "2026-10-19 10:05:00" }
  ]
}
```

Node SDK `createUnitAddressByAccount` 自 1.1.0 起返回 `UnitAddress[]`；Java SDK 自 1.2.0 起返回 `List<UnitAddressResponse>`（此前为 `void`）。

**常见业务码**：`400xxx`（参数）、`400103`（`resourceKey` 未开通）、`401xxx` / `403xxx`——由 custody 返回，网关透传。

---

## 9. 币种、资金控制与白名单

### 9.1 为财务单元添加币种 / 网络

**POST** `/api/thirdparty/treasury/add-coins` · 鉴权：Resource 签名
> 网关转发至 custody：`/api/third-party/add-coins/{resourceKey}`，`business` 原样作为上游请求体

**请求参数（business）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `treasuryUnitId` | number | 是 | 财务单元 ID |
| `coinIds` | CoinInfo[] | 是 | 新增的币种与网络，每项 `{ coinId, network }` |
| `accountFundControls` | AccountFundControl[] | 否 | 按账户下发的资金流规则：每项 `{ accountId, fundControls }`；不传则只加币种、不改资金流 |
| `note` | string | 否 | 备注 |

`accountFundControls[].accountId` 为本地账户 ID（即 7.4 返回的 `id`），`fundControls` 结构同 `FundControl[]`。

**请求示例**

```json
{
  "basic": { "appId": "550e8400-e29b-41d4-a716-446655440000", "authorizationId": "123e4567-e89b-12d3-a456-426614174000", "timestamp": 1742947200, "nonce": "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6", "signature": "c8a4718e976a5f632da56f02cb5b369b" },
  "business": {
    "treasuryUnitId": 80,
    "coinIds": [{ "coinId": "BTC", "network": "BTC" }],
    "accountFundControls": [
      { "accountId": 101, "fundControls": [{ "coinId": "BTC", "fundControlRules": [{ "guardians": ["guardian-1"], "threshold": "1", "perTransferLimit": "10", "dailyTransferLimit": "100" }] }] }
    ],
    "note": "add BTC"
  }
}
```

**响应示例**（`data` 为审批任务数组）

```json
{
  "code": 200,
  "message": "SUCCESS",
  "data": [
    { "id": 5001, "taskId": "task-20261019-001", "taskOperation": "FUND_FLOW", "state": "AUDITING", "threshold": 1, "total": 1, "signers": ["guardian-1"], "createTime": "2026-10-19 10:10:00", "updateTime": "2026-10-19 10:10:00" }
  ]
}
```

返回的 `taskId` 可用于 11.1 提交审批。

**常见业务码**：`400xxx`（参数）、`400103`（`resourceKey` 未开通）、`401xxx` / `403xxx`——由 custody 返回，网关透传。

### 9.2 更新资金流控制规则

**POST** `/api/thirdparty/treasury/fund-control-update` · 鉴权：Resource 签名
> 网关转发至 custody：`/api/third-party/fundControl/update/{resourceKey}`，`business` 原样作为上游请求体

**请求参数（business）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `treasuryUnitId` | number | 是 | 财务单元 ID（SDK 类型必填） |
| `fundControls` | FundControl[] | 是 | 资金管理员规则，每项 `{ coinId, fundControlRules }` |
| `cusAccountId` | number | 否 | 指定账户 ID；传入时按该账户更新 |
| `note` | string | 否 | 备注 |

**请求示例**

```json
{
  "basic": { "appId": "550e8400-e29b-41d4-a716-446655440000", "authorizationId": "123e4567-e89b-12d3-a456-426614174000", "timestamp": 1742947200, "nonce": "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6", "signature": "c8a4718e976a5f632da56f02cb5b369b" },
  "business": {
    "treasuryUnitId": 80,
    "cusAccountId": 101,
    "fundControls": [
      { "coinId": "USDT", "fundControlRules": [{ "guardians": ["guardian-1", "guardian-2"], "threshold": "2", "perTransferLimit": "50000", "dailyTransferLimit": "500000" }] }
    ],
    "note": "raise threshold"
  }
}
```

**响应示例**

```json
{ "code": 200, "message": "SUCCESS", "data": null }
```

该变更需要 Board 审批，custody 可能异步生成审批任务；本接口不返回任务详情（SDK 返回 `void`）。

**常见业务码**：`400xxx`（参数）、`400103`（`resourceKey` 未开通）、`401xxx` / `403xxx`——由 custody 返回，网关透传。

### 9.3 更新白名单

**POST** `/api/thirdparty/treasury/whitelist-update` · 鉴权：Resource 签名
> 网关转发至 custody：`/api/third-party/whiltlist/update/{resourceKey}`，`business` 原样作为上游请求体
>
> 注意：上游路径中的拼写是 `whiltlist`（custody 侧拼写），网关对开发者暴露的路径是正确的 `whitelist-update`。

**请求参数（business）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `treasuryUnitId` | number | 是 | 财务单元 ID |
| `addItems` | WhiteListCreateRequest[] | 否 | 新增白名单项，每项 `{ network, address, alias? }` |
| `removeItems` | WhiteListCreateRequest[] | 否 | 移除白名单项，结构同上 |
| `cusAccountId` | number | 否 | 指定账户 ID |
| `allowListEnabled` | string | 否 | 是否启用白名单（字段为字符串，取值说明以后端为准（当前文档未能从代码确认）） |
| `lang` | string | 否 | 语言，如 `zh_CN` / `en_US` |
| `note` | string | 否 | 备注 |

**请求示例**

```json
{
  "basic": { "appId": "550e8400-e29b-41d4-a716-446655440000", "authorizationId": "123e4567-e89b-12d3-a456-426614174000", "timestamp": 1742947200, "nonce": "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6", "signature": "c8a4718e976a5f632da56f02cb5b369b" },
  "business": {
    "treasuryUnitId": 80,
    "addItems": [{ "network": "TRC20", "address": "TXYZ...", "alias": "supplier-a" }],
    "removeItems": [{ "network": "TRC20", "address": "TABC..." }],
    "note": "update whitelist"
  }
}
```

**响应示例**（审批任务）

```json
{
  "code": 200,
  "message": "SUCCESS",
  "data": { "id": 5002, "taskId": "task-20261019-002", "taskOperation": "SET_WHITE_LIST", "state": "AUDITING", "threshold": 1, "total": 1, "signers": ["guardian-1"], "createTime": "2026-10-19 10:15:00", "updateTime": "2026-10-19 10:15:00" }
}
```

返回的 `taskId` 可用于 11.1 提交审批。

**常见业务码**：`400xxx`（参数）、`400103`（`resourceKey` 未开通）、`401xxx` / `403xxx`——由 custody 返回，网关透传。

---

## 10. 出金与归集

### 10.1 发起出金

**POST** `/api/thirdparty/treasury/payout` · 鉴权：Resource 签名
> 网关转发至 custody：`/api/third-party/payout/{resourceKey}`，`business` 原样作为上游请求体

**请求参数（business）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `payTo` | PayTo[] | 是 | 收款地址及金额，每项 `{ to, amount, kyaRiskScore?, ruleNames? }` |
| `unitId` | number | 是 | 出金财务单元 ID |
| `coinId` | string | 是 | 币种 ID |
| `network` | string | 是 | 网络 |
| `merchantType` | string | 是 | 业务类型：`NON_FINANCIAL_CORPORATE` / `REGULATED_VASP` / `INTERNAL_SYSTEM`（上游 YAML 将 `merchantType` 列为唯一必填字段） |
| `fromAccountId` | number | 否 | 出金账户 ID |
| `fromAddress` | string | 否 | 出金账户地址 |
| `operation` | string | 否 | 操作类型：`withdraw` / `allocate` / `payout` |
| `toCusAccountId` | number | 否 | 内部转账目标账户 ID；`allocate` 时必填 |
| `username` / `userId` | string | 否 | 三方用户标识 |
| `orderId` | string | 否 | 客户业务订单号；幂等与对账使用（见 6.3） |
| `note` | string | 否 | 备注 |
| `lang` | string | 否 | 语言，如 `zh_CN` / `en_US` |
| `initiator` | string | 否 | 任务发起人（邮箱 / 名称） |
| `travelRule` | TravelRuleRequest | 否 | Travel Rule：`{ referenceId?, payload? }` |

`TravelRulePayload` 字段：`beneficiaryType`（`NATURAL` / `LEGAL`）、`beneficiaryName`、`beneficiaryDob`、`beneficiaryIdNumber`、`beneficiaryIdType`、`beneficiaryNationality`（以上适用于 `NATURAL`）、`beneficiaryLegalName`、`beneficiaryLegalRegistrationNo`、`beneficiaryLegalCountry`（以上适用于 `LEGAL`）。

**请求示例**

```json
{
  "basic": { "appId": "550e8400-e29b-41d4-a716-446655440000", "authorizationId": "123e4567-e89b-12d3-a456-426614174000", "timestamp": 1742947200, "nonce": "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6", "signature": "c8a4718e976a5f632da56f02cb5b369b" },
  "business": {
    "payTo": [{ "to": "0x1234...abcd", "amount": 100 }],
    "unitId": 80,
    "fromAccountId": 101,
    "coinId": "USDT",
    "network": "TRC20",
    "operation": "payout",
    "merchantType": "NON_FINANCIAL_CORPORATE",
    "orderId": "ORDER-20261019-001",
    "note": "supplier payment"
  }
}
```

**响应示例**（审核任务）

```json
{
  "code": 200,
  "message": "SUCCESS",
  "data": {
    "id": 5003,
    "taskId": "task-20261019-003",
    "taskOperation": "PAYOUT",
    "businessId": "ORDER-20261019-001",
    "state": "AUDITING",
    "signContent": "...",
    "threshold": 2,
    "total": 3,
    "signers": ["guardian-1", "guardian-2", "guardian-3"],
    "algoType": "ECDSA",
    "coinId": "USDT",
    "createTime": "2026-10-19 10:20:00",
    "updateTime": "2026-10-19 10:20:00"
  }
}
```

返回的是审核任务（`WCCIPCmdAuditTask`）。`data.taskId` 用于 11.1 提交审批；`state`、`signContent`、`signers` 等字段用于后续签名流程。

**常见业务码**：`400xxx`（参数）、`120xxx`（业务规则，如余额或政策不允许）、`400103`（`resourceKey` 未开通）、`401xxx` / `403xxx`——由 custody 返回，网关透传。

### 10.2 发起归集

**POST** `/api/thirdparty/treasury/pooling` · 鉴权：Resource 签名
> 网关转发至 custody：`/api/third-party/pooling/{resourceKey}`，`business` 原样作为上游请求体

**请求参数（business）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `unitId` | number | 是 | 财务单元 ID |
| `fromAccountId` | number | 是 | 归集来源账户 ID |
| `address` | string | 是 | 归集目标地址 |
| `amount` | number | 是 | 归集门限金额 |
| `coinId` | string | 是 | 币种 ID |
| `network` | string | 是 | 网络 |
| `lang` | string | 否 | 语言，如 `zh_CN` / `en_US` |
| `note` | string | 否 | 备注 |
| `includes` | string[] | 否 | 包含地址列表 |
| `excludes` | string[] | 否 | 排除地址列表 |

> **来源账户限制：** custody 只允许从 platform 创建的 acquiring（收款类）账户归集。其他账户返回 `120042 ONLY_ACQUIRING_ACCOUNT_ALLOWED`。

**请求示例**

```json
{
  "basic": { "appId": "550e8400-e29b-41d4-a716-446655440000", "authorizationId": "123e4567-e89b-12d3-a456-426614174000", "timestamp": 1742947200, "nonce": "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6", "signature": "c8a4718e976a5f632da56f02cb5b369b" },
  "business": {
    "unitId": 80,
    "fromAccountId": 101,
    "address": "TXYZ...",
    "amount": 100,
    "coinId": "USDT",
    "network": "TRC20",
    "note": "daily sweep"
  }
}
```

**响应示例**（出金订单）

```json
{
  "code": 200,
  "message": "SUCCESS",
  "data": {
    "id": 7001,
    "ecode": "EC0000000001",
    "treasuryUnitId": 80,
    "cusAccountId": 101,
    "address": "TXYZ...",
    "coinId": "USDT",
    "network": "TRC20",
    "orderId": "POOL-20261019-001",
    "taskId": "task-20261019-004",
    "txId": "",
    "fee": "0",
    "inputAmount": "100",
    "totalAmount": 100,
    "orderState": "AUDITING",
    "createTime": "2026-10-19 10:25:00",
    "updateTime": "2026-10-19 10:25:00"
  }
}
```

**常见业务码**：`120042 ONLY_ACQUIRING_ACCOUNT_ALLOWED`（来源账户不是 platform 创建的收款类账户）、`400xxx`（参数）、`400103`（`resourceKey` 未开通）、`401xxx` / `403xxx`——由 custody 返回，网关透传。

---

## 11. 任务审批

### 11.1 提交审批任务

**POST** `/api/thirdparty/treasury/submit-task/{taskId}` · 鉴权：Resource 签名
> 网关转发至 custody：`/api/third-party/submit/task/{resourceKey}/{taskId}`，`business` 原样作为上游请求体

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `taskId` | string | 是 | 任务 ID，来自出金 / 归集 / 添加币种 / 白名单等接口返回的 `taskId` |

**请求参数（business）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `confirmed` | boolean | 是 | `true` 同意，`false` 拒绝 |
| `signatures` | Record<string, string[]> | 否 | 多签签名结果：key 为签名人标识（上游描述为 taskId），value 为签名字符串列表 |

**请求示例**

```json
{
  "basic": { "appId": "550e8400-e29b-41d4-a716-446655440000", "authorizationId": "123e4567-e89b-12d3-a456-426614174000", "timestamp": 1742947200, "nonce": "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6", "signature": "c8a4718e976a5f632da56f02cb5b369b" },
  "business": {
    "confirmed": true,
    "signatures": { "guardian-1": ["0xsignature..."] }
  }
}
```

**响应示例**

```json
{ "code": 200, "message": "SUCCESS", "data": null }
```

任务不存在或 `taskId` 无效时由 custody 返回错误（网关透传；`taskId` 还会先经过网关路径参数校验，非法字符返回 `40001`）。

**常见业务码**：`400xxx`（参数）、`120xxx`（业务规则，如任务状态不允许提交）、`400103`（`resourceKey` 未开通）、`401xxx` / `403xxx`——由 custody 返回，网关透传。

---

## 12. 交易查询

本章 5 个查询接口共用一个查询参数结构。分页对象为 `{ records, total, current, size, pages }`（见 6.2）。

### 查询参数（PaginationQuery / QueryCondition）

**POST** 以下接口的 `business` 均使用该结构：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `pageIndex` | number | 否 | 页索引（**从 0 开始**） |
| `pageSize` | number | 否 | 每页数量 |
| `sortFields` | string | 否 | 排序，格式 `字段_类型`：`_d` 降序 / `_a` 升序，如 `createTime_d` |
| `queryList` | QueryCondition[] | 否 | 查询条件数组 |

`QueryCondition`：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `key` | string | 是 | 查询字段名，如 `unitId`、`status` |
| `value` | string \| number \| object | 是 | 查询值 |
| `oper` | string | 否 | 操作符：`=` / `!=` / `>` / `<` / `like`（上游默认等于，并支持冒号表示模糊匹配） |
| `join` | string | 否 | 条件连接方式：`and` / `or` |

**请求片段**

```json
{
  "pageIndex": 0,
  "pageSize": 20,
  "sortFields": "createTime_d",
  "queryList": [{ "key": "unitId", "value": 80, "oper": "=", "join": "and" }]
}
```

### 12.1 查询活动记录

**POST** `/api/thirdparty/treasury/activities` · 鉴权：Resource 签名
> 网关转发至 custody：`/api/third-party/activities/{resourceKey}`，`business` 原样作为上游请求体

**请求参数（business）**：`PaginationQuery`（见本章开头的查询参数定义）

**请求示例**

```json
{
  "basic": { "appId": "550e8400-e29b-41d4-a716-446655440000", "authorizationId": "123e4567-e89b-12d3-a456-426614174000", "timestamp": 1742947200, "nonce": "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6", "signature": "c8a4718e976a5f632da56f02cb5b369b" },
  "business": { "pageIndex": 0, "pageSize": 20, "sortFields": "createTime_d" }
}
```

**响应示例**

```json
{
  "code": 200,
  "message": "SUCCESS",
  "data": {
    "records": [
      { "id": 3001, "ecode": "EC0000000001", "projectId": 10, "treasuryUnitId": 80, "cusAccountId": 101, "accountType": "PAYIN", "coinId": "USDT", "network": "TRC20", "type": "TRANSFER_IN", "amount": 100, "direction": "IN", "orderId": "ORDER-20261019-001", "businessId": "BIZ-001", "status": "COMPLETED", "travelRuleStatus": "NOT_REQUIRED", "kytStatus": "PASSED", "createTime": "2026-10-19 10:30:00", "updateTime": "2026-10-19 10:31:00" }
    ],
    "total": 1,
    "current": 1,
    "size": 20,
    "pages": 1
  }
}
```

关键字段：`direction`（`IN` / `OUT`）、`status`（`SUBMITTING` / `APPROVED` / `REJECTED` / `FAILED` / `CONFIRMING` / `COMPLETED` / `EXPIRED` / `PENDING_COMPLIANCE` / `PENDING_CONFIRMATION` / `PENDING_REVIEW` / `REVIEW_ACCEPTED` / `REVIEW_REJECTED`）、`travelRuleStatus`（`NOT_REQUIRED` / `PENDING` / `PASSED` / `FAILED` / `REVIEW`）、`kytStatus` / `kyaStatus`（风险相关，取值以后端为准）。

**常见业务码**：`400xxx`（参数）、`400103`（`resourceKey` 未开通）、`401xxx` / `403xxx`——由 custody 返回，网关透传。

### 12.2 查询出金订单

**POST** `/api/thirdparty/treasury/transfer-out-orders` · 鉴权：Resource 签名
> 网关转发至 custody：`/api/third-party/transfer-out-orders/{resourceKey}`，`business` 原样作为上游请求体

**请求参数（business）**：`PaginationQuery`（见本章开头的查询参数定义）

**请求示例**

```json
{
  "basic": { "appId": "550e8400-e29b-41d4-a716-446655440000", "authorizationId": "123e4567-e89b-12d3-a456-426614174000", "timestamp": 1742947200, "nonce": "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6", "signature": "c8a4718e976a5f632da56f02cb5b369b" },
  "business": { "pageIndex": 0, "pageSize": 20, "queryList": [{ "key": "treasuryUnitId", "value": 80, "oper": "=", "join": "and" }] }
}
```

**响应示例**

```json
{
  "code": 200,
  "message": "SUCCESS",
  "data": {
    "records": [
      { "id": 7001, "ecode": "EC0000000001", "vaultCode": "VAULT001", "projectId": 10, "treasuryUnitId": 80, "cusAccountId": 101, "address": "TXYZ...", "coinId": "USDT", "network": "TRC20", "orderId": "ORDER-20261019-001", "txId": "0xabc...", "fee": "1", "inputAmount": "100", "totalAmount": 100, "orderState": "SUCCEED", "callbackStatus": "SUCCEED", "taskId": "task-20261019-003", "payToList": [{ "to": "0x1234...abcd", "amount": 100 }], "createTime": "2026-10-19 10:20:00", "updateTime": "2026-10-19 10:35:00" }
    ],
    "total": 1,
    "current": 1,
    "size": 20,
    "pages": 1
  }
}
```

关键字段：`orderState`（`AUDITING` / `SIGNING` / `SIGN_FAILED` / `SIGNING_REJECTED` / `TRANSITING` / `SUCCEED` / `FAILED` / `EXPIRED` / `SUBMIT_FAILED` / `CONFIRMING` / `COMPLIANCE_PENDING` / `TRAVEL_RULE_PENDING` / `MANUAL_REVIEW_PENDING` / `REJECTED` / `CANCELLED`）、`callbackStatus`（`TRANSITING` / `SUCCEED` / `FAILED`）、`taskId`、`txId`、`fee`、`payToList`；`travelRuleStatus` / `travelRuleCheckStatus` / `kytStatus` / `kyaRiskScore` 为合规与风险字段。

**常见业务码**：`400xxx`（参数）、`400103`（`resourceKey` 未开通）、`401xxx` / `403xxx`——由 custody 返回，网关透传。

### 12.3 查询入金订单

**POST** `/api/thirdparty/treasury/transfer-in-orders` · 鉴权：Resource 签名
> 网关转发至 custody：`/api/third-party/transfer-in-orders/{resourceKey}`，`business` 原样作为上游请求体

**请求参数（business）**：`PaginationQuery`（见本章开头的查询参数定义）

**请求示例**

```json
{
  "basic": { "appId": "550e8400-e29b-41d4-a716-446655440000", "authorizationId": "123e4567-e89b-12d3-a456-426614174000", "timestamp": 1742947200, "nonce": "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6", "signature": "c8a4718e976a5f632da56f02cb5b369b" },
  "business": { "pageIndex": 0, "pageSize": 20, "sortFields": "createTime_d" }
}
```

**响应示例**

```json
{
  "code": 200,
  "message": "SUCCESS",
  "data": {
    "records": [
      { "id": 6001, "ecode": "EC0000000001", "projectId": 10, "treasuryUnitId": 80, "cusAccountId": 101, "address": "TXYZ...", "cpAddress": "TABC...", "coinId": "USDT", "network": "TRC20", "amount": 100, "orderId": "ORDER-20261019-001", "txId": "0xdef...", "fee": "1", "orderState": "SUCCEED", "callbackStatus": "SUCCEED", "type": 1, "note": "deposit", "createTime": "2026-10-19 10:30:00", "updateTime": "2026-10-19 10:31:00" }
    ],
    "total": 1,
    "current": 1,
    "size": 20,
    "pages": 1
  }
}
```

关键字段：`orderState`（`PROCESSING` / `CONFIRMING` / `SUCCEED` / `FAILED` / `MISMATCH` / `EXPIRED` / `COMPLIANCE_HOLD` / `PENDING_REVIEW` / `REVIEW_ACCEPTED` / `REVIEW_REJECTED`）、`type`（`1` 充值、`2` 收款）、`initiator`（`1` 商户、`2` 商户的用户）、`cpAddress`、`amount`、`txId`。

**常见业务码**：`400xxx`（参数）、`400103`（`resourceKey` 未开通）、`401xxx` / `403xxx`——由 custody 返回，网关透传。

### 12.4 查询账户资金流水

**POST** `/api/thirdparty/treasury/fund-records` · 鉴权：Resource 签名
> 网关转发至 custody：`/api/third-party/fund-records/{resourceKey}`，`business` 原样作为上游请求体

**请求参数（business）**：`PaginationQuery`（见本章开头的查询参数定义）

**请求示例**

```json
{
  "basic": { "appId": "550e8400-e29b-41d4-a716-446655440000", "authorizationId": "123e4567-e89b-12d3-a456-426614174000", "timestamp": 1742947200, "nonce": "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6", "signature": "c8a4718e976a5f632da56f02cb5b369b" },
  "business": { "pageIndex": 0, "pageSize": 20, "queryList": [{ "key": "cusAccountId", "value": 101, "oper": "=", "join": "and" }] }
}
```

**响应示例**

```json
{
  "code": 200,
  "message": "SUCCESS",
  "data": {
    "records": [
      { "id": 4001, "ecode": "EC0000000001", "projectId": 10, "treasuryUnitId": 80, "cusAccountId": 101, "txId": "0xdef...", "orderId": "ORDER-20261019-001", "coinId": "USDT", "network": "TRC20", "amount": 100, "preBalance": 900, "postBalance": 1000, "fee": "1", "txType": "TRANSFER_IN", "createTime": "2026-10-19 10:30:00" }
    ],
    "total": 1,
    "current": 1,
    "size": 20,
    "pages": 1
  }
}
```

`txType` 取值：`TRANSFER_IN` / `TRANSFER_OUT` / `WITHDRAW` / `ALLOCATE_IN` / `ALLOCATE_OUT` / `POOL_IN` / `POOL_OUT` / `GAS_OUT` / `FEE_OUT` / `DEPLOY`。

**常见业务码**：`400xxx`（参数）、`400103`（`resourceKey` 未开通）、`401xxx` / `403xxx`——由 custody 返回，网关透传。

### 12.5 查询财务单元级资金流水

**POST** `/api/thirdparty/treasury/unit-fund-records` · 鉴权：Resource 签名
> 网关转发至 custody：`/api/third-party/unit-fund-records/{resourceKey}`，`business` 原样作为上游请求体

**请求参数（business）**：`PaginationQuery`（见本章开头的查询参数定义）

**请求示例**

```json
{
  "basic": { "appId": "550e8400-e29b-41d4-a716-446655440000", "authorizationId": "123e4567-e89b-12d3-a456-426614174000", "timestamp": 1742947200, "nonce": "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6", "signature": "c8a4718e976a5f632da56f02cb5b369b" },
  "business": { "pageIndex": 0, "pageSize": 20, "queryList": [{ "key": "treasuryUnitId", "value": 80, "oper": "=", "join": "and" }] }
}
```

**响应示例**

```json
{
  "code": 200,
  "message": "SUCCESS",
  "data": {
    "records": [
      { "id": 4101, "ecode": "EC0000000001", "projectId": 10, "treasuryUnitId": 80, "ledgerId": 20, "txId": "0xdef...", "orderId": "ORDER-20261019-001", "coinId": "USDT", "network": "TRC20", "amount": 100, "preBalance": 900, "postBalance": 1000, "fee": "1", "txType": "TRANSFER_IN", "createTime": "2026-10-19 10:30:00" }
    ],
    "total": 1,
    "current": 1,
    "size": 20,
    "pages": 1
  }
}
```

与 12.4 的区别：本接口按财务单元（`ledgerId`）聚合流水，不返回 `cusAccountId`。

**常见业务码**：`400xxx`（参数）、`400103`（`resourceKey` 未开通）、`401xxx` / `403xxx`——由 custody 返回，网关透传。

<!-- 第 13–17 章（商户/用户/Board、回调、错误码、SDK、附录）由后续任务补充 -->
