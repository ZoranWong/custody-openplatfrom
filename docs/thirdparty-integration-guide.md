# Cregis 开放平台 - 第三方开发者接入指南

> **适用 SDK 版本：** Node SDK 1.2.0 / Java SDK 1.2.1 / Web SDK 1.0.5
>
> **发布状态：** 上述版本号对应本仓库源码。npm 上 Node SDK 最新为 `1.0.1`、Web SDK 最新为 `1.1.3`；Java 最新可用的 JitPack tag 为 `java-sdk-v1.2.1`。文中「1.1.0 起 / 1.2.0 起」描述的行为以本仓库源码为准，安装前请先确认目标版本是否已发布。
>
> **接口基数：** 网关对外 22 条转发接口 + 6 条本地接口，共 28 条

本指南面向接入 Cregis 托管能力的第三方平台开发者。第 1–6 章覆盖平台概述、端到端接入流程、开发者入驻、认证与签名、OAuth 授权和通用约定；第 7–12 章为业务接口参考；第 13–17 章覆盖商户 / 用户 / Board、回调、错误码与排查、SDK 集成和附录。

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
13. [商户、用户与 Board](#13-商户用户与-board)
14. [回调](#14-回调)
15. [错误码与排查](#15-错误码与排查)
16. [SDK 集成](#16-sdk-集成)
17. [附录](#17-附录)

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

- 开发者入驻：通过开发者门户完成注册、KYB 审核、创建应用、订阅套餐
- 认证与签名：Basic 签名与 Resource 签名、`business` 规范化、Node.js / Java 计算示例
- OAuth 授权：获取授权地址、授权页交互、由授权页返回 `authorizeId`、授权回调
- 通用约定：请求与响应结构、分页、幂等、每日配额、限流、`traceId`、错误码

---

## 2. 接入总览

### 2.1 端到端流程

```
┌────────────────┐          ┌────────────────────────────┐          ┌──────────────────┐
│   开发者系统   │          │    Cregis 开放平台网关     │          │  Custody 托管服务 │
└───────┬────────┘          └─────────────┬──────────────┘          └────────┬─────────┘
        │                                 │                                  │
        │ 1. 注册开发者账号（通过开发者门户或运营协助）                       │
        │ 2. KYB 审核（运营侧处理，开发者等待或补件）                        │
        │ 3. 登录开发者门户 → 创建应用 → 获取 appId + appSecret              │
        │ 4. 订阅套餐 → dailyApiLimit                                        │
        │────────────────────────────────▶│                                  │
        │                                 │                                  │
        │ 5. POST /api/thirdparty/oauth/authorizeUrl（Basic 签名）           │
        │────────────────────────────────▶│                                  │
        │◀──────────── authorizeUrl ──────│                                  │
        │                                 │                                  │
        │ 6. 前端打开授权页 → 用户登录（captcha + MFA）→ 选择组织 → 确认授权 │
        │                                 │                                  │
        │                                 │ 7. 授权页调用 Custody 内部授权   │
        │                                 │    POST /internal/third-party/   │
        │                                 │ authorize?appId=&ecode=&appToken=│
        │                                 │                                  │
        │                                 │ 8. Custody 内部调用网关 verify   │
        │                                 │ POST /api/thirdparty/oauth/verify│
        │                                 │◀─────────────────────────────────│
        │                                 │    { resourceKey, oauthToken }   │
        │                                 │    写入 oauth_resources          │
        │                                 │─── { authorizeId } ─────────────▶│
        │                                 │                                  │
        │ 9. 授权页 postMessage 返回 authorizeId                             │
        │     你的后端保存该 authorizeId                                     │
        │                                 │                                  │
        │ 10. POST /api/thirdparty/treasury/...（Resource 签名）             │
        │    basic{ authorizationId = 授权页返回的 authorizeId } + business  │
        │────────────────────────────────▶│ 验签 + 校验授权 + 每日配额       │
        │                                 │─────────────────────────────────▶│
        │                                 │◀──────────── 业务结果 ───────────│
        │◀─── 业务响应 + x-trace-id ──────│                                  │
        │                                 │                                  │
        │ 11. 接收授权回调与业务回调（HMAC-SHA256 验签）                     │
        │◀═══════════════════════════════════════════════════════════════════│
```

### 2.2 职责划分

| 你负责 | 平台负责 |
| --- | --- |
| 通过开发者门户完成注册并提交真实、完整的企业与 UBO 资料 | 审核 KYB，维护审核状态与审核记录 |
| 妥善保管 `appSecret`，不写入前端代码或公开仓库 | 按 `appId` 校验签名、应用状态与开发者状态 |
| 在服务端按规范计算 Basic / Resource 签名 | 校验时间戳容差、nonce 唯一性、签名与 `authorizationId` |
| 在门户创建应用、选择业务模式、订阅套餐 | 提供授权页、签发授权页 JWT（`appToken`，即 `oauthToken`）、维护授权关系 |
| 在前端打开授权页，接收并保存授权页返回的 `authorizeId` | 授权页确认后由 Custody 内部调用网关 `POST /api/thirdparty/oauth/verify` 写入 `oauth_resources` 并生成 `authorizeId` |
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
| OAuth | `POST /api/thirdparty/oauth/authorizeUrl`、`POST /api/thirdparty/oauth/verify` | `authorizeUrl` 用 Basic 签名；`verify` 是网关内部接口，由 Custody 调用，开发者不得直接调用 |
| 内部回调 | `POST /api/thirdparty/custody/callback` | 由 Custody 服务调用，开发者无需调用（平台按 `resourceKey` 反查应用并推送事件） |

上表为节选，各接口的完整参数、请求 / 响应示例与业务码见第 7–13 章。

---

## 3. 开发者入驻

入驻流程通过开发者门户完成。除注册和登录外，入驻各环节的操作都需要在请求头携带登录返回的 Bearer JWT（仅用于开发者门户，非业务接口凭证）：

```
Authorization: Bearer <accessToken>
```

### 3.1 注册

注册时需要提交企业与受益所有人（UBO）信息，包括：法定名称（`legalName`）、统一社会信用代码或注册号、注册地、成立日期、注册地址、企业官网，以及至少一位 UBO 的姓名、国籍、持股比例、职位和证件文档链接。密码至少 6 位。

注册成功后：

- `kybStatus` 初始为 `pending`，需要等待平台审核。
- 注册响应包含 `accessToken`，可立即登录开发者门户查看资料，但 **KYB 未通过前不能创建应用**。
- 邮箱重复注册返回 `40902`（Conflict）。

### 3.2 KYB 审核

KYB（Know Your Business）是平台侧的合规审核，**由平台运营管理员操作，开发者不需要也不会调用审核接口**。审核状态流转如下：

| `kybStatus` | 含义 | 开发者动作 |
| --- | --- | --- |
| `pending` | 待审核 | 等待 |
| `pending_info` | 需补充材料 | 按邮件 / 工单指引补充材料后等待复审 |
| `approved` | 审核通过 | 可创建应用并正式接入 |
| `rejected` | 审核拒绝 | 查看拒绝原因，必要时重新提交入驻申请 |

KYB 未通过时创建应用会返回 `40303`（`AUTHZ_OPERATOR_DENIED`，`KYB approval required before creating applications`）。

### 3.3 登录

登录需要先完成滑块验证码：

1. 获取 `captchaId`（验证码挑战 5 分钟内有效）。
2. 用户在页面上完成滑块验证，获取 `captchaToken`。
3. 调用登录接口时携带 `captchaToken`。

登录成功后返回 `accessToken`，用于访问开发者门户相关操作，默认有效期 24 小时。该 JWT **不是**业务接口的凭证，业务接口使用第 4 章的签名机制。

> 另有忘记密码与重置密码功能。当前实现是演示桩：只做参数校验并返回成功，不会发送邮件，也不校验重置 token。请勿依赖它们找回密码（见 6.8）。

### 3.4 创建应用

KYB 审核通过后，可在开发者门户创建应用。需要指定：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `appName` | string | 是 | 应用名称，展示在授权页 |
| `appDescription` | string | 否 | 应用描述 |
| `appType` | string | 是 | `corporate`（企业资金管理）/ `payment`（加密支付）/ `custody`（个人托管） |
| `callbackUrl` | string | 否 | 默认回调地址，接收授权与业务事件；生产环境必须为 HTTPS |

创建成功后返回应用信息，其中的 `id` 就是后续签名使用的 **`appId`**（UUID 格式），以及敏感的 `appSecret`。

关键说明：

- `appSecret` 是敏感凭证，请立即保存到服务端密钥管理系统。创建应用、重置密钥的响应会返回它；应用列表接口不会返回；应用详情接口**会返回完整记录（含 `appSecret`）**，只能在服务端调用。
- 应用默认状态为 `active`；状态非 `active` 时，OAuth 与业务接口都会被拒绝。

应用创建后可在开发者门户查看和管理应用信息（查看列表、修改名称 / 描述 / 回调地址、重置密钥等）。

### 3.5 订阅套餐

业务接口的每日调用配额来自订阅套餐的 `dailyApiLimit`。

可在开发者门户查看可售套餐、创建订阅订单（指定套餐、计费周期和付款方式），并查询订单详情与订阅历史。当前生效订阅可通过查询接口获取当日用量 `dailyApiUsage` 与套餐信息。

若套餐记录缺少 `dailyApiLimit`，配额按 **1000** 计算。未确认订阅前请勿发起生产调用。

### 3.6 凭证安全

| 凭证 | 用途 | 存放位置 |
| --- | --- | --- |
| `appId` | 公开标识，放在 `basic.appId` | 可出现在前端授权 URL 中 |
| `appSecret` | 计算签名，等价于密钥 | **只能存放在服务端**，不得下发到浏览器、移动端或公开仓库 |
| 登录 `accessToken` | 访问开发者门户接口 | 服务端会话或安全存储，默认 24 小时有效 |
| `authorizeId` | 业务接口的授权标识 | 服务端保存，与自身用户 / 企业映射 |

**重置密钥**

可在开发者门户重置应用的 `appSecret`。重置后旧密钥立即失效，所有使用旧签名的请求返回 `40102`。请在低峰期操作，并同步更新所有服务实例的环境变量。

**泄露处置建议**

1. 立即重置密钥吊销旧密钥。
2. 检查 API 日志中是否存在异常调用、异常 IP 或异常 `apiName`。
3. 若出现未授权操作，暂停应用（平台侧可将应用置为 `suspended`）并联系平台安全团队。
4. 排查泄露渠道（前端打包、日志打印、仓库提交记录），补齐密钥管理流程。

---

## 4. 认证与签名

开放平台**不使用** Bearer Token 调用业务接口。开发者调用的所有接口都要求在请求体 `basic` 中携带签名，签名覆盖 `business` 的规范化结果。平台提供两种签名：

| 签名类型 | 用途 | 使用接口 | 签名串（`MD5(...)` 内层） |
| --- | --- | --- | --- |
| **Basic 签名** | 不涉及授权资源的操作 | `oauth/authorizeUrl`；`merchant/register`（无 `authorizationId`） | `appSecret + appId + timestamp + nonce + md5(business)` |
| **Resource 签名** | 绑定授权资源的业务操作 | 除 `merchant/register` 外的全部 `/api/thirdparty/*` 转发接口 | `appSecret + appId + authorizationId + timestamp + nonce + md5(business)` |

两者的唯一区别是 Resource 签名在 `appId` 之后插入了 `authorizationId`。`authorizationId` 即 OAuth 流程得到的 `authorizeId`。

> `oauth/verify` 是 **Custody 内部调用网关**的接口，不属于上表两种签名，也不是开发者步骤：该路由只做请求体校验（`resourceKey`、`oauthToken` 必填），没有 Basic 签名中间件，见 5.4。

推荐直接使用官方 SDK 的签名方法，避免自行实现产生偏差：

- Node SDK：`calculateBasicSignature` / `calculateResourceSignature` / `buildBasicInfoWithAuthorization`（`@cregis-kit/openplatform-node` 的 `core/signature` 子模块；**未从包根导出**，需要时请直接按 4.3 的规则自行实现或从源码引入）
- Java SDK：`Signer.calculateBasicSignature` / `Signer.calculateResourceSignature` / `Signer.buildBasicInfoWithAuthorization`（`com.cregis:cregis-sdk-core`，`com.cregis.sdk.core.sign.Signer`，均为 public static）

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
| `basic.authorizationId` | string | Resource 签名必填 | 授权页返回的 `authorizeId`（由 Custody 内部调用 `oauth/verify` 生成），必须是有效 UUID |
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
| `40102`，仅 `authorizeUrl` | 误用了 Resource 签名（签名串多了 `authorizationId`） | OAuth 接口使用 Basic 签名；`verify` 由 Custody 内部调用，开发者无需签名 |
| `40102`，仅业务接口 | 未传 `basic.authorizationId`，或传入了另一个环境的 `authorizeId` | 使用本环境授权页返回的 `authorizeId`（Custody 内部经 `oauth/verify` 创建） |
| `40301`（资源未授权） | `authorizationId` 不存在或授权记录状态不是 `active`（当前实现按 ID 查询，不校验应用归属） | 重新走 OAuth 流程（授权页重新授权） |
| `400103`（资源键不存在） | `resourceKey` 未在 Custody 侧开通 | 使用 `merchant/register` 返回的 `resourceAccessKey`，或联系平台开通 |
| `40001`（缺少参数） | 缺少 `basic` 或必填字段 | 检查 `basic` 是否完整：Basic 签名 4 个字段（`appId`、`timestamp`、`nonce`、`signature`），Resource 签名 5 个字段（额外 `authorizationId`） |

---

## 5. OAuth 授权流程

### 5.1 流程总览

完整链路如下；`oauth/verify` 是 **Custody → 网关**的内部步骤，不是开发者调用：

1. **你的后端 → 网关**：`POST /api/thirdparty/oauth/authorizeUrl`（Basic 签名），返回 `authorizeUrl`。
2. **你的前端 → 授权页**：前端打开 `authorizeUrl`，用户在授权页登录（captcha + MFA）、选择组织并确认授权。
3. **授权页 → Custody（内部接口）**：授权页调用 Custody 的 `POST /internal/third-party/authorize?appId=&ecode=&appToken=`，提交应用、组织与授权页 JWT。
4. **Custody → 网关（内部步骤）**：Custody 携带 `appToken`（即 `oauthToken`）调用网关 `POST /api/thirdparty/oauth/verify`，请求体 `{ resourceKey, oauthToken }`，写入 / 复用 `oauth_resources` 记录并得到 `authorizeId`。
5. **授权页 → 你的前端**：授权页通过 postMessage 发送 `authorization_succeed`，`data.authorizationId` 即上一步的 `authorizeId`；Web SDK 将其暴露为 `{ status, authorizeId }`。
6. **你的前端 → 你的后端**：把 `authorizeId` 交给后端保存，与自身用户 / 企业建立映射。
7. **你的后端 → 网关**：后续业务接口使用 `basic.authorizationId = authorizeId`（Resource 签名）。

关键点：

- 授权页 / Web SDK 只返回 `authorizationId`（由 Custody 内部调用 `oauth/verify` 生成，见 5.3），**不会返回 `oauthToken`**。
- `oauthToken` 是网关在 `authorizeUrl` 中签发的 `appToken`（JWT），由 Custody 在内部授权流程中消费；开发者后端无需保存它来换取 `authorizeId`。
- 业务接口会查询 `basic.authorizationId` 对应的 `oauth_resources` 记录；该记录由 Custody 内部调用 `oauth/verify` 写入。因此**授权页返回的 `authorizationId` 就是可用的 `authorizeId`，开发者无需也不能调用 `verify`**。
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
| `token` | string | 是 | 开发者自定义的不透明字符串，写入授权页 JWT，并在授权回调中以 `oauthToken` 字段原样返回（用于身份映射） |

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

取消授权（页面内关闭按钮）固定使用 `code = "USER_CANCELLED"`。授权页**只返回 `authorizationId`，不返回 `oauthToken`，也不回传 `state`**。该 `authorizationId` 由授权页在用户确认后调用 Custody 的内部授权接口（`POST /internal/third-party/authorize`）获得；网关的授权记录由 Custody 在内部调用 `POST /api/thirdparty/oauth/verify` 写入 `oauth_resources`（见 5.4），`authorizeId` 即该记录的主键。正常情况下授权页返回时记录已就绪，可直接作为业务请求的 `basic.authorizationId`；若业务接口返回 `40301`，说明记录尚未落库或已失效，请重走授权流程，不要自行调用 `verify`。如果授权页没有可用的父窗口（例如直接在新标签页打开且没有 opener），postMessage 没有接收方，请改用服务端 `callback`。

> Web SDK 1.0.5（仓库版本）已封装消息处理，推荐直接使用 `CregisWebSDK.openAuthorization(authorizeUrl)`，它返回 `{ status, authorizeId }`（见第 16 章）。它同样不会返回 `oauthToken`。npm 上当前可安装的 Web SDK 最新为 `1.1.3`，接口一致。

### 5.4 网关内部接口 `oauth/verify`（由 Custody 调用）

> **内部接口：由 Custody 调用，第三方不得直接调用。**

Custody 收到授权页的 `POST /internal/third-party/authorize?appId=&ecode=&appToken=` 后，会携带该 JWT（`appToken`，即 `oauthToken`）调用网关的本接口，把授权关系写入 `oauth_resources` 并返回 `authorizeId`；授权页随后通过 postMessage 把这个 `authorizeId` 作为 `authorizationId` 返回给前端。**`authorizeId` 的创建发生在 Custody 内部，不需要开发者参与。**

**POST** `/api/thirdparty/oauth/verify` · 无需签名

**请求**（顶层字段，不是 `{ basic, business }` 结构）

```json
{
  "resourceKey": "access-key-d21396c169754470b3cdae0af9b2b8a6",
  "oauthToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `resourceKey` | string | 是 | 资源标识。Custody 使用企业的 `resourceAccessKey`（13.1 返回），或平台为该企业开通的资源键 |
| `oauthToken` | string | 是 | 网关在 `authorizeUrl` 中签发的 `appToken`（JWT）；授权页从 URL 读取后随内部授权请求带给 Custody，不会通过 postMessage 事件下发 |

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

- **幂等**：授权记录以 `(appId, resourceKey)` 唯一。同一应用用同一 `resourceKey` 重复调用不会创建新记录，返回同一个 `authorizeId`，并刷新 `authorizedAt`；不同 `resourceKey` 会得到不同的 `authorizeId`。
- `appId` 取自 `oauthToken` 载荷，不接受调用方另行传入。
- `oauthToken` 无效或过期返回 `40101`；应用不存在返回 `40401`。
- **无需 Basic / Resource 签名**：本接口通过校验 JWT 本身完成认证，请求体是裸的 `{ resourceKey, oauthToken }`，不要包一层 `basic` / `business`。
- **`resourceKey` 不做存在性校验**：本接口会为任意 `resourceKey` 写入（或复用）授权记录，因此不会返回 `400103`。若该键未在 Custody 侧开通，后续转发业务请求时才会由 Custody 返回 `400103`。
- `resourceKey` 会绑定到授权记录，并决定后续业务请求转发到 Custody 的哪个资源。
- **结果落库**：授权记录写入 `oauth_resources`。业务接口会校验 `basic.authorizationId` 对应的记录；授权页返回的 `authorizationId` 可直接使用，正是因为 Custody 已内部调用本接口完成写入。开发者无需也不能调用本接口。
- 校验成功后会异步推送 `authorization.created` 回调（见 5.6）。回调是异步的，`verify` 的响应不等待回调结果。

SDK 不提供该方法：`oauth/verify` 是 Custody 内部接口。Node SDK 1.1.0 与 Java SDK 1.3.0（未发布）已移除 `verifyOAuthToken`；Java SDK 1.2.1（已发布 tag）中仍保留该方法，但请勿使用。

**关于 `oauthToken`：** 它就是 `authorizeUrl` 响应中 `authorizeUrl` 查询参数里的 `appToken`（JWT，载荷含 `appId`、`callback`、`token`，默认 2 小时有效）。网关不会在授权页或 postMessage 事件中下发它；它由授权页随内部授权请求交给 Custody，由 Custody 在调用本接口时消费。开发者不需要保存它来换取 `authorizeId`。

### 5.5 已移除的 `oauth/token` 接口

`/api/thirdparty/oauth/token` 原有的实现只是按 `business.oauthUserId` 现场签发一个无消费方的 JWT（`resourceKey` 恒为 `''`），既不能换取 `authorizationId`，也不能用于业务接口。该路由已从网关移除，请求会落入兜底转发：Basic 签名的旧调用方因缺少 `basic.authorizationId` 被 Resource 校验器拒绝，返回 `40001`（HTTP 400）；携带有效 Resource 签名时才会继续匹配并得到 `40401`（HTTP 404）。请勿在对接代码或旧版文档中引用。

平台另外暴露的 `/api/oauth/appToken/refresh`、`/api/oauth/revoke`、`/api/oauth/appToken/validate` 属于另一套内部令牌体系（`grant_type=client_credentials|refresh_token`），同样不用于本指南的业务调用链。

### 5.6 授权回调

Custody 内部调用 `oauth/verify` 成功后，平台会向回调地址推送 `authorization.created` 事件。

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
- 回调是异步的，失败会重试：初始 1 次 + 最多 4 次重试（间隔 0s / 1s / 5s / 30s），网络错误与 HTTP 429 / 5xx 都会触发重试。**没有持久化队列**，5 次都失败后事件不会补投，请务必对 `authorizeId` 做幂等处理，并通过查询接口对账（见 14.5）。

回调的 HMAC 验签、重试策略、事件列表与响应要求详见 **第 14 章「回调与 Webhook」**。

---

## 6. 通用约定

### 6.1 请求与响应结构

**请求**

- 业务与 OAuth 接口均为 `POST`，`Content-Type: application/json`。
- 开发者调用的接口请求体统一为 `{ "basic": {...}, "business": {...} }`。网关内部的 `oauth/verify` 例外，直接使用 `{ "resourceKey", "oauthToken" }`（该接口由 Custody 调用，见 5.4）。
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
| 上游 Custody 响应（HTTP 2xx） | 原样透传 | 结构由上游决定，可能不含 `trace_id`；上游非 2xx 时网关丢弃响应体并返回 `{ code, message }`（见第 7 章） |

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

> `treasury/list` 的响应**始终是数组**。网关会转发 `pageSize` / `pageNum`，但上游 YAML 未声明该接口的请求体，是否真正分页**未经验证**，请勿按分页对象解析。

### 6.3 幂等

平台不提供统一的 `Idempotency-Key` 请求头，幂等由业务字段保证：

| 场景 | 幂等键 | 行为 |
| --- | --- | --- |
| 出金 `treasury/payout` | `business.orderId`（你的业务订单号） | 建议始终复用同一 `orderId` 以便对账。**Custody 是否按 `orderId` 去重尚未验证**（YAML/SDK 均未声明），重试可能导致重复出金，联调时需确认 |
| 商户注册 `merchant/register` | `business.legalName` | 同一企业重复注册不会重复创建，返回 `alreadyExists: true` 及相同的 `ecode`、`resourceAccessKey` |
| 添加用户 `user/add` | `business.email` | 同一企业下同一邮箱不会重复创建用户 |
| 授权 `oauth/verify`（Custody 内部调用） | `(appId, resourceKey)` | 重复验证返回同一个 `authorizeId`，并刷新授权时间 |
| 授权回调 `authorization.created` | `authorizeId` | 可能重试推送，接收方必须按 `authorizeId` 去重 |

建议：所有写操作在调用方生成稳定的业务单号，重试时复用；收到回调时先按事件主键去重再执行业务。

### 6.4 每日配额

- 配额按**开发者（ISV）**维度、按自然日统计，上限来自当前生效订阅套餐的 `dailyApiLimit`；套餐记录缺少该字段时按 **1000** 计算。
- 仅统计通过网关转发的业务接口调用（`/api/thirdparty/*` 中除 `oauth/verify` 等网关本地接口外的转发请求）。
- 超出配额返回 HTTP `429`，业务码 `42901`，消息形如 `Daily API quota exceeded (1000/1000)`。
- 用量每日 0 点重置（平台定时任务将 `dailyApiUsage` 归零）。当前用量可通过开发者门户的订阅查询获取 `dailyApiUsage`。
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
| 403 | `40301` | 资源未授权 | `authorizeId` 不存在或授权记录状态不是 `active`（当前实现不校验应用归属）；重新走 OAuth 流程（授权页重新授权） |
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
| 5xx | `500` | 网关返回 `{ code: 500, message }`（**上游响应体被丢弃**） | 记录 `x-trace-id` 后联系平台 |

说明：

- 上游 Custody 以 HTTP 2xx 返回时，`400xxx`、`401xxx`、`403xxx` 业务码会原样透传在响应体 `code` 中；上游非 2xx 时网关丢弃上游响应体，统一返回 `{ code, message }`（见第 7 章）。网关日志按码段映射记录 HTTP 状态（`400xxx` → 400、`401xxx` → 401、`403xxx` → 403、`400103` → 404、`409xxx` → 409、`429xxx` → 429、`120xxx` → 400、5xx → 500）。
- `40402`、`50201`、`50301`、`50401`、`50402` 等枚举存在，但当前网关不会主动返回；网关自身的路由错误使用 `40401`，转发层失败使用原始 HTTP 状态码 `500` / `503` / `504`。响应体 `code` 为 `502` 只可能来自上游透传。
- 判断请求是否成功请以响应体 `code` 为准（成功为 `0` 或 `200`），不要只看 HTTP 状态码。
- 错误码的完整定义、各接口的业务码清单与处理建议见 **第 15 章「错误码与排查」**。

### 6.8 已知限制与实现现状

以下为当前代码实现的限制，文档按真实行为描述；如需修复请以平台后续版本为准：

| 限制 | 影响 | 规避方式 |
| --- | --- | --- |
| `authorizeUrl` 的 `permissions` 用 `JSON.stringify` 写入 URL，授权页按逗号拆分 | 传非空权限数组会导致授权页初始化失败 | 省略 `permissions`，授权页默认 `['read']` |
| 限流档位固定为 `basic`，`burstSize` 未生效 | 所有应用（含 enterprise）实际按 `basic` 档限流 | 按 100/分钟、1,000/小时、10,000/天规划调用量 |
| 授权页/Web SDK 只返回 `authorizationId`，不返回 `oauthToken` | 无法从前端拿到 `oauthToken` | 无需处理：`authorizationId` 已由 Custody 内部调用 `verify` 生成，直接作为 `basic.authorizationId` 使用 |
| 授权页不回传 `state` | 无法用 `state` 做前端 CSRF 校验 | 用 `token` 关联业务身份，或业务侧记录授权上下文 |
| 授权记录按 ID 查询，不校验应用归属 | 理论上一个应用可使用另一应用创建的 `authorizeId` | 妥善保护 `authorizeId`，不要跨应用传递 |
| 应用详情接口返回 `appSecret` | 泄露风险 | 仅在服务端调用，禁止浏览器调用 |
| 授权回调 `callback` 路径不带 `X-Event`，签名串也无事件段 | 验签实现需区分两条回调路径 | 优先配置应用默认 `callbackUrl` |
| `forgot-password` / `reset-password` 为演示桩 | 不会真正发信或校验 token | 通过平台运营人工重置 |
| 无有效订阅时配额校验放行 | 可能绕过 `dailyApiLimit` | 保持有效订阅，不依赖该行为 |

## 7. 财务单元

本章至第 12 章描述网关转发到 Custody 的业务接口。所有接口均为 `POST`，请求体为 `{ "basic": {...}, "business": {...} }`，使用 **Resource 签名**（`basic.authorizationId` 必填，见第 4 章）。路径中以 `{...}` 表示的参数（如 `unitId`、`taskId`）不参与签名，其值必须匹配 `^[a-zA-Z0-9_-]{1,64}$`，否则网关在转发前返回 `40001`。

转发行为统一为：网关把 `business` **原样**作为上游请求体发送给 Custody（不增删字段）。**仅当上游返回 HTTP 2xx 时原样返回；上游非 2xx 时网关丢弃上游响应体并返回 `{ code, message }`（上游 4xx 也会被记为 500），且 5xx/超时会被网关自动重试（`maxRetries` 名义为 3，但当前实现存在递归重试，实际调用次数可能远超 3 次，实测在持续 5xx 下会长时间反复请求）——写操作（创建地址、出金、归集、提交审批）存在**重复提交**风险，务必使用业务幂等键并确认上游去重。** 因此：

- 上游返回 2xx 时，HTTP 状态通常为 `200`；成功以响应体 `code` 为 `0` 或 `200` 判断。
- 上游以 2xx 返回参数校验、业务规则等错误时，网关透传 `code` 与 `message`；`400xxx`（参数）、`401xxx`（认证）、`403xxx`（授权）、`400103`（资源键不存在）、`120xxx`（业务规则）均属此类。
- 上游返回非 2xx 时，网关返回 `{ code, message }`（无 `data`、无 `trace_id`），`code` 为网关记录的 HTTP 状态（默认 500；上游 4xx 同样按 500 返回）；连接失败返回 503，超时返回 504（见 6.7）。
- 网关自身错误（缺少 `resourceKey`、路由不存在、配额超限、上游不可用）的结构见 6.1。
- **每日配额在转发前扣减**（`forward.controller.ts` 先校验配额再调用 Custody），被 Custody 拒绝的请求同样消耗配额（见 6.4）。

### 7.1 创建财务单元

**POST** `/api/thirdparty/treasury/create` · 鉴权：Resource 签名
> 网关转发至 custody：`/api/third-party/create/{resourceKey}`，`business` 原样作为上游请求体

**请求参数（business）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `unitName` | string | 是 | 财务单元名称 |
| `businessScope` | string | 是 | 业务类型：`DEDICATED_ACCOUNT` / `OMNIBUS_ACCOUNT` / `OPEN_API_PROXY` |
| `topology` | string | 是 | 账本拓扑：`ORBIT` / `SINGLE_GENERAL` / `CUSTOM` / `QUAD_SMART_ISOLATION`（`CUSTOM` 上游接受，但 Node SDK 的 `Topology` 类型暂未包含，TS 调用需断言 / 等待 SDK 更新） |
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

**常见业务码**：`400 请求参数格式错误`（作为上游 2xx 响应体内的业务码由 custody 返回，网关透传）。**已知问题：** 即使 `business` 结构完整，SIT 环境当前仍会从 custody 收到该错误；原因未在代码中确认，请以 custody 后续版本为准。另有 `400103`（`resourceKey` 未开通）、`401xxx` / `403xxx`（签名与授权问题）。

### 7.2 创建自定义结构财务单元

**POST** `/api/thirdparty/treasury/create-custom` · 鉴权：Resource 签名
> 网关转发至 custody：`/api/third-party/create-custom/{resourceKey}`，`business` 原样作为上游请求体

**请求参数（business）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `unitName` | string | 是 | 财务单元名称 |
| `coinIds` | CoinInfo[] | 是 | 币种与网络，每项 `{ coinId, network }` |
| `fundControls` | FundControl[][] | 是 | 资金管理员，每个账户一组 `FundControl`（二维数组） |
| `topology` | string | 否 | 账本拓扑：`ORBIT` / `SINGLE_GENERAL` / `CUSTOM` / `QUAD_SMART_ISOLATION`（`CUSTOM` 上游接受，但 Node SDK 的 `Topology` 类型暂未包含，TS 调用需断言 / 等待 SDK 更新） |
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

> 虽然网关会把 `pageSize` / `pageNum` 原样转发，但上游 YAML 未为该接口声明请求体，custody 是否真正分页**未经验证**；响应始终是数组，请勿按 `{ records, total, ... }` 解析（见 6.2）。

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

> **四个字段必须一起传。** 缺少 `coinId` 或 `network` 时返回**空分页**（不是错误）。缺少 `accountType` 时观测到的是网关生成的 `500` 响应体 `{ "code": 500, "message": "..." }`：上游返回非 2xx，网关丢弃了上游响应体——具体原因在上游（custody），网关侧看不到。请从 7.4 的账户列表取值。
>
> 若 `unitId` 属于另一个 `resourceKey`，custody 的行为**未经验证**；当前只确认 `resourceKey` 不存在时返回 `400103`。

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

**常见业务码**：`400xxx`（参数）、`400103`（`resourceKey` 未开通）、`401xxx` / `403xxx`。以 2xx 返回时由 custody 产生、网关透传；缺少 `accountType` 时返回的是**网关生成的** `500` `{ code, message }` 响应体（上游非 2xx，网关丢弃上游响应体），原因在上游。

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
>
> 若 `cusAccountId`（或 `unitId`）属于另一个 `resourceKey`，custody 的行为**未经验证**；当前只确认 `resourceKey` 不存在时返回 `400103`。

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
| `number` | number | 是 | 生成数量；单次上限由后端定义，文档未给出 |

**请求参数（business）**

无业务字段；发送空对象 `{}` 即可。

> 本接口是非幂等写操作：网关对上游 5xx / 超时会自动重试（实际次数可能远超 3 次，见本章开头的转发说明），重试可能重复生成地址。

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
| `number` | number | 是 | 生成数量；单次上限由后端定义，文档未给出 |

**请求参数（business）**

无业务字段；发送空对象 `{}` 即可。

> 本接口是非幂等写操作：网关对上游 5xx / 超时会自动重试（实际次数可能远超 3 次），重试可能重复生成地址。

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

该变更的具体效果（是否需要 Board 审批、是否异步生成审批任务）**未经验证**：SDK 返回 `void`，上游 YAML 的响应为 `MessageResult?`，均未描述审批流程。

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
| `fromAccountId` | number | 否 | 出金账户 ID；实际扣款账户的选择规则由后端定义（上游 YAML 与 SDK 均未将其标记为必填） |
| `fromAddress` | string | 否 | 出金账户地址；上游 YAML 与 SDK 均未将其标记为必填 |
| `operation` | string | 否 | 操作类型：`withdraw` / `allocate` / `payout`；默认值由后端定义，文档未给出 |
| `toCusAccountId` | number | 否 | 内部转账目标账户 ID；`allocate` 时必填 |
| `username` / `userId` | string | 否 | 三方用户标识 |
| `orderId` | string | 否 | 客户业务订单号；按 `orderId` 去重属**期望由 custody 保障**的行为，需联调确认（见 6.3） |
| `note` | string | 否 | 备注 |
| `lang` | string | 否 | 语言，如 `zh_CN` / `en_US` |
| `initiator` | string | 否 | 任务发起人（邮箱 / 名称） |
| `travelRule` | TravelRuleRequest | 否 | Travel Rule：`{ referenceId?, payload? }` |

`TravelRulePayload` 字段：`beneficiaryType`（`NATURAL` / `LEGAL`）、`beneficiaryName`、`beneficiaryDob`、`beneficiaryIdNumber`、`beneficiaryIdType`、`beneficiaryNationality`（以上适用于 `NATURAL`）、`beneficiaryLegalName`、`beneficiaryLegalRegistrationNo`、`beneficiaryLegalCountry`（以上适用于 `LEGAL`）。

> 本接口是非幂等写操作：网关对上游 5xx / 超时会自动重试（实际次数可能远超 3 次，见第 7 章开头的转发说明），而 `orderId` 去重尚未验证，重试可能导致重复出金。

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
>
> 本接口是非幂等写操作：网关对上游 5xx / 超时会自动重试（实际次数可能远超 3 次，见第 7 章开头的转发说明），注意重复归集风险。

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
| `signatures` | Record<string, string[]> | 否 | 多签签名结果，value 为签名字符串列表。key 的含义两个来源互相矛盾：上游 YAML 描述为 **taskId**，SDK README 描述为**签名人标识**；**当前未经验证**。 |

> 存在 taskId 的请求示例（按上游 YAML 的形式）；若以签名人标识为 key，请同时调整 `signatures` 的 key。

**请求示例**

```json
{
  "basic": { "appId": "550e8400-e29b-41d4-a716-446655440000", "authorizationId": "123e4567-e89b-12d3-a456-426614174000", "timestamp": 1742947200, "nonce": "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6", "signature": "c8a4718e976a5f632da56f02cb5b369b" },
  "business": {
    "confirmed": true,
    "signatures": { "task-20261019-003": ["0xsignature..."] }
  }
}
```

**响应示例**

```json
{ "code": 200, "message": "SUCCESS", "data": null }
```

任务不存在或 `taskId` 无效时由 custody 返回错误（网关透传；`taskId` 还会先经过网关路径参数校验，非法字符返回 `40001`）。

> 本接口是非幂等写操作：网关对上游 5xx / 超时会自动重试（实际次数可能远超 3 次，见第 7 章开头的转发说明），注意重复提交风险。

**常见业务码**：`400xxx`（参数）、`120xxx`（业务规则，如任务状态不允许提交）、`400103`（`resourceKey` 未开通）、`401xxx` / `403xxx`——由 custody 返回，网关透传。

---

## 12. 交易查询

本章 5 个查询接口共用一个查询参数结构。分页对象为 `{ records, total, current, size, pages }`（见 6.2）。`pages` 由 SDK 类型声明（Java 中为必填），上游 YAML 未声明，以实际响应为准。

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

## 13. 商户、用户与 Board

本章 3 个接口用于把三方平台上的企业、企业用户和签名人（Board）登记到 Custody 侧。它们与其他业务接口一样由网关原样转发 `business`，约束均来自 Custody；其中 `merchant/register` 是唯一使用 **Basic 签名**的转发接口。

### 13.1 注册商户企业

**POST** `/api/thirdparty/merchant/register` · 鉴权：**Basic 签名**（不传 `basic.authorizationId`）
> 网关转发至 custody：`/api/third-party/merchant/register`（无 `{resourceKey}`），`business` 原样作为上游请求体

该接口以 **`legalName` + 企业来源（`source`，本接口固定为 `THIRD_PARTY`）** 幂等：同一企业重复注册不会重复创建金库，返回 `alreadyExists: true` 与相同的 `ecode`。

**请求参数（business）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `legalName` | string | 是 | 企业法定名称，与企业来源共同唯一（幂等键） |
| `appId` | string | 是 | 开发者应用 ID；custody 用它签发企业级访问 key。**必须与 `basic.appId` 一致**（当前网关不校验两者是否相同，见 15.4） |
| `alias` | string | 否 | 三方平台侧的企业外部标识 |
| `email` | string | 否 | 企业联系邮箱 |
| `dbaName` | string | 否 | DBA / 商号 |
| `jurisdiction` | string | 否 | 注册司法辖区，ISO3166-1 |
| `registrationNumber` | string | 否 | 注册号 |
| `dateOfIncorporation` | string | 否 | 注册日期 |
| `taxId` | string | 否 | 税号（TIN / EIN） |
| `entityType` | string | 否 | 实体类型 |
| `networks` | string[] | 否 | 初始化金库的网络列表；不传则使用平台支持的全部网络 |
| `owner` | object | 否 | 内联创建企业负责人；`email`、`password` 必填，可选 `publicKey`。custody 会先建用户再建金库，保证金库签名人可用 |

**请求示例**

```json
{
  "basic": {
    "appId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": 1742947200,
    "nonce": "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6",
    "signature": "<Basic 签名，按第 4 章对上述 business 计算>"
  },
  "business": {
    "legalName": "Example Trading Co.",
    "appId": "550e8400-e29b-41d4-a716-446655440000",
    "alias": "example-trading",
    "email": "ops@example.com",
    "jurisdiction": "AE",
    "registrationNumber": "123456789",
    "taxId": "100000000000003",
    "entityType": "NON_FINANCIAL_CORPORATE",
    "networks": ["ethereum", "tron"],
    "owner": { "email": "owner@example.com", "password": "Str0ng!Passw0rd" }
  }
}
```

**响应示例**（字段结构来自 SDK `MerchantRegisterResult` 与上游 `ThirdMerchantRegisterResult`；值仅作示意）

```json
{
  "code": 200,
  "message": "SUCCESS",
  "data": {
    "ecode": "EC0000000001",
    "vaultCode": "VAULT001",
    "resourceAccessKey": "access-key-d21396c169754470b3cdae0af9b2b8a6",
    "alreadyExists": false,
    "merchant": {
      "id": 1542,
      "code": "M0000001542",
      "merchantName": "Example Trading Co.",
      "source": "THIRD_PARTY",
      "alias": "example-trading",
      "status": "ACTIVE",
      "email": "ops@example.com",
      "jurisdiction": "AE",
      "registrationNumber": "123456789",
      "dateOfIncorporation": "2020-01-15",
      "taxId": "100000000000003",
      "entityType": "NON_FINANCIAL_CORPORATE",
      "dbaName": "Example Trading",
      "creatorId": 0,
      "createTime": "2026-10-19 10:00:00",
      "updateTime": "2026-10-19 10:00:00"
    }
  }
}
```

关键说明：

- **`resourceAccessKey` 是企业级资源键**，也是 Custody → 网关 `oauth/verify`（5.4）使用的 `resourceKey`，以及 `custody/callback` 反查应用的键；平台按该键维护授权记录与应用映射，再推送第 14 章的回调。**该值由 Custody 在内部调用 `verify` 时传入，开发者不需要在 `verify` 请求中传递它。** 请在首次注册成功时持久化保存。
- 重复注册命中幂等时 `alreadyExists: true`；按上游 schema，此时 **`resourceAccessKey` 为 `null`**（避免同名注册换出他人凭据）。不要把重复注册当作重新获取 key 的手段。
- 该接口走 Basic 签名，`basic` 只需要 `appId`、`timestamp`、`nonce`、`signature`；**不要传 `authorizationId`**。
- `owner` 中的用户仍需在 custody 完成二次验证绑定后才能登录 custody；仅作为签名人使用时按 13.2 绑定 `publicKey`。

### 13.2 添加企业用户

**POST** `/api/thirdparty/user/add` · 鉴权：Resource 签名
> 网关转发至 custody：`/api/third-party/user/add/{resourceKey}`，`business` 原样作为上游请求体

`{resourceKey}` 取自 `basic.authorizationId` 对应的授权记录（即 Custody 内部调用 `oauth/verify` 时绑定的 `resourceKey`，通常是 13.1 返回的 `resourceAccessKey`）。**同一邮箱重复调用幂等**，不会重复创建用户。

**请求参数（business）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `email` | string | 是 | 登录邮箱 |
| `password` | string | 是 | 密码，需满足 custody 的密码强度规则 |
| `publicKey` | string | 否 | 公钥；绑定后才能作为金库签名人参与审批签名 |
| `ecode` | string | 否 | 企业 code；不传表示只建用户、不挂企业。传了必须与当前 `resourceKey` 所属企业一致 |
| `role` | string | 否 | 企业角色：`MERCHANT_STAFF` / `MERCHANT_OWNER` / `MERCHANT_ADMIN` / `MERCHANT_FUND_OPERATOR` / `MERCHANT_ANYCALL_OPERATOR`（当前 5 个取值，见 17.1）。传了角色即视为要挂到当前 key 所属企业下 |

**请求示例**

```json
{
  "basic": {
    "appId": "550e8400-e29b-41d4-a716-446655440000",
    "authorizationId": "123e4567-e89b-12d3-a456-426614174000",
    "timestamp": 1742947200,
    "nonce": "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6",
    "signature": "<Resource 签名，按第 4 章计算>"
  },
  "business": {
    "email": "staff@example.com",
    "password": "Str0ng!Passw0rd",
    "publicKey": "0x04...",
    "ecode": "EC0000000001",
    "role": "MERCHANT_ADMIN"
  }
}
```

**响应示例**（`MapObject`，字段名以 custody 实际返回为准）

```json
{ "code": 200, "message": "SUCCESS", "data": { "userId": 99 } }
```

> 新用户若需要登录 custody，仍需在 custody 侧绑定二次验证；仅作为 API 用户 / 签名人时无需登录。

### 13.3 初始化 Board（护卫队）

**POST** `/api/thirdparty/board/init` · 鉴权：Resource 签名
> 网关转发至 custody：`/api/third-party/board/init/{resourceKey}`，`business` 原样作为上游请求体

为企业初始化金库护卫队（board）。后续资金流规则、白名单变更依赖可用的 board（上游描述）。

**请求参数（business）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `guardians` | string[] | 是 | 护卫队成员。上游 schema 描述为**公钥**；SDK README 同时提到邮箱，邮箱形式**未经验证**，请优先传已绑定用户的公钥 |
| `threshold` | number | 是 | 操作门限，需满足 `0 < threshold <= guardians.length` |
| `lang` | string | 否 | 签名语言，如 `zh_CN` / `en_US` |
| `note` | string | 否 | 备注 |

**请求示例**

```json
{
  "basic": {
    "appId": "550e8400-e29b-41d4-a716-446655440000",
    "authorizationId": "123e4567-e89b-12d3-a456-426614174000",
    "timestamp": 1742947200,
    "nonce": "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6",
    "signature": "<Resource 签名，按第 4 章计算>"
  },
  "business": {
    "guardians": ["0x04...owner-public-key", "0x04...staff-public-key"],
    "threshold": 2,
    "note": "initial board"
  }
}
```

**响应示例**（`MerchantBoard`，值仅作示意）

```json
{
  "code": 200,
  "message": "SUCCESS",
  "data": {
    "id": 12,
    "ecode": "EC0000000001",
    "projectId": 10,
    "userInfos": [
      { "userId": 98, "userName": "Owner", "userEmail": "owner@example.com", "publicKey": "0x04...owner-public-key" },
      { "userId": 99, "userName": "Staff", "userEmail": "staff@example.com", "publicKey": "0x04...staff-public-key" }
    ],
    "threshold": 2,
    "status": "ACTIVE",
    "creatorUserId": 98,
    "createTime": "2026-10-19 10:05:00",
    "updateTime": "2026-10-19 10:05:00"
  }
}
```

> **已观测错误 `400070`：** 联调中，当 `guardians` 中的公钥在 custody 侧没有对应用户，或 `threshold` 大于有效签名人数量时，custody 返回业务码 `400070`（随 HTTP 2xx 响应体透传）。该码的精确语义由 custody 定义；请先通过 13.2 建好用户并绑定公钥，再初始化 board。

---

## 14. 回调

平台通过 HTTP POST 把授权与业务事件推送到开发者配置的回调地址。回调体**只有业务数据**，事件元数据全部放在请求头。

### 14.1 事件清单

#### 14.1.1 当前实际会推送的事件

平台当前只有 **2 个事件名**在实际推送，来自 3 条不同路径。接入方只需要处理这 3 种回调：

| # | 事件名（`X-Event`） | 触发路径 | 触发时机 | `data` 顶层字段 | 详见 |
|---|---------------------|----------|----------|----------------|------|
| 1 | `authorization.created` | Custody → 网关 `POST /api/thirdparty/oauth/verify` | 用户在企业授权页完成授权、Custody 内部完成授权记录写入后 | `authorizeId`（必有）<br>`oauthToken`（可选） | 14.2.1 |
| 2 | `authorization.created` | `POST /api/v1/authorizations` | 通过内部授权接口创建授权记录后 | `authorizationId`<br>`resourceKey`<br>`expiresAt` | 14.2.2 |
| 3 | `transaction.completed`<br>`transaction.failed` | Custody → 网关 `POST /api/thirdparty/custody/callback` | Custody 推送链上交易状态变更后，网关按 `resourceKey` 反查应用并转发 | 由 Custody 决定，网关透传 | 14.2.3 |

注意：

- **第 1 种和第 2 种事件名相同，但字段名不同**（`authorizeId` vs `authorizationId`）。接收方必须按字段存在性判断，不能只按事件名分支。
- **第 3 种是两个事件名共用一条推送路径**，事件名由网关按 Custody 请求体映射得出（映射规则见 14.2.3）。
- 路径 1、3 由 Custody/平台内部触发，开发者不能主动调用；路径 2 有签名保护，同样属于平台内部接口。

#### 14.1.2 不支持的事件

平台当前**不推送**以下事件。它们只存在于 SDK 的类型声明（`CallbackEventType`）与网关内部的枚举定义中，但没有任何代码会产生这些事件：

| 事件名 | 状态 |
|--------|------|
| `authorization.revoked` | **不支持** |
| `authorization.expired` | **不支持** |
| `transaction.submitted` | **不支持** |
| `transaction.confirming` | **不支持** |
| `task.approved` | **不支持** |
| `task.rejected` | **不支持** |

具体说明：

- **交易状态只有终态通知**。Custody → 网关的 `custody/callback` 只映射 `transaction.completed` 与 `transaction.failed` 两个事件；不存在 `submitted` / `confirming` 这类中间态推送。需要中间态请通过 12 章的查询接口轮询。
- **没有任务审批事件**。审批结果（`task.approved` / `task.rejected`）不会通过回调下发；请调用 11 章的查询接口或交易查询接口确认任务状态。
- **没有授权撤销 / 过期事件**。授权失效后业务接口会返回 `40301`，请据此处理。

接入建议：不要为这 6 个事件写处理分支。事件入口按事件名做通用分发，遇到未知事件名记录日志后返回 2xx，不要返回 5xx（会触发重试）。

### 14.2 请求头与请求体

| 请求头 | 值 | 说明 |
|--------|----|------|
| `X-App-Id` | 应用 `appId`（`Application.id`，即 `basic.appId`） | 始终存在 |
| `X-Timestamp` | 毫秒时间戳字符串（`Date.now().toString()`） | 每次重试重新生成 |
| `X-Signature` | `sha256=<hex>` | 小写十六进制 HMAC-SHA256 |
| `X-Event` | 事件名，如 `authorization.created` | **仅当事件已设置时存在**；Custody 调用 `oauth/verify` 且使用 `callback` 参数路径时没有事件，因此没有该头 |
| `Content-Type` | `application/json` | — |

请求体是纯业务数据，不含 `appId`、事件名、时间戳等元数据。外层没有 `{ code, message, data }` envelope——**业务数据就是整个请求体**。

#### 14.2.1 `authorization.created`（`oauth/verify` 路径）

字段：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `authorizeId` | string (UUID) | 是 | 授权记录主键，即业务接口的 `basic.authorizationId` |
| `oauthToken` | string | 否 | `authorizeUrl` 请求中传入的 `token` 值，原样回传；未传 `token` 时**没有该字段** |

```json
{
  "authorizeId": "123e4567-e89b-12d3-a456-426614174000",
  "oauthToken": "user-42-order-20261019"
}
```

#### 14.2.2 `authorization.created`（`POST /api/v1/authorizations` 内部接口）

字段与上一小节**不同**，注意区分：

| 字段 | 类型 | 说明 |
|------|------|------|
| `authorizationId` | string (UUID) | 授权记录 ID |
| `resourceKey` | string | 资源键 |
| `expiresAt` | string (ISO 8601) | 授权过期时间 |

```json
{
  "authorizationId": "123e4567-e89b-12d3-a456-426614174000",
  "resourceKey": "access-key-d21396c169754470b3cdae0af9b2b8a6",
  "expiresAt": "2027-10-19T08:00:00.000Z"
}
```

> 两条路径的事件名相同但主键字段名不同（`authorizeId` vs `authorizationId`）。接收方应按字段存在性判断，不要假设只有一种形态。

#### 14.2.3 `transaction.completed` / `transaction.failed`

这两个事件的载荷**完全由 Custody 决定**，网关不做字段映射，透传规则如下：

1. 请求体含 `payload` 字段 → **只转发 `payload` 的内容**；
2. 否则转发整个请求体，但删除 `status`、`resourceKey`、`ecode` 三个字段。

事件名判定顺序：

| 优先级 | 规则 |
|--------|------|
| 1 | 请求体显式提供 `eventType`（只接受 `transaction.completed` / `transaction.failed`） |
| 2 | 否则 `status === 'SUCCEED'` → `transaction.completed` |
| 3 | 其余任何 `status`（包括缺失）→ `transaction.failed` |

典型载荷（`eyJ` 不适用，此处为业务字段，字段随 Custody 版本可能扩展）：

```json
{
  "orderId": "ORDER-20261019-001",
  "unitId": 80,
  "cusAccountId": 101,
  "address": "TXYZ...",
  "cpAddress": "TABC...",
  "coinId": "USDT",
  "network": "TRC20",
  "amount": 100,
  "fee": "1",
  "txId": "0xabc123",
  "taskId": "task-20261019-003",
  "orderState": "SUCCEED",
  "createTime": "2026-10-19 10:20:00",
  "updateTime": "2026-10-19 10:35:00"
}
```

应用侧只能看到**网关转发后**的请求体，看不到 Custody 原始报文；`payload` 是否被包裹、`status` 是否被删除，都由网关在转发前处理完毕。

接入建议：

- 把 `orderId`（或 `taskId`）作为幂等键；两者都缺失时用请求体 `sha256` 兜底。
- 只依赖本节声明的字段存在性，不要把整个载荷结构写死；Custody 新增字段不应导致你的解析失败。
- **不要依赖 HTTP 状态判断事件类型**——`status` 字段可能被上层过滤（见上方透传规则），事件类型以 `X-Event` 头为准。

#### 14.2.4 三种回调的完整报文对照

**① 授权完成（`oauth/verify` 路径）**

```
POST /your/callback HTTP/1.1
Content-Type: application/json
X-App-Id: 550e8400-e29b-41d4-a716-446655440000
X-Event: authorization.created
X-Timestamp: 1792404000000
X-Signature: sha256=<hmac>
```
```json
{
  "authorizeId": "123e4567-e89b-12d3-a456-426614174000",
  "oauthToken": "user-42-order-20261019"
}
```

**② 授权完成（内部接口路径，字段名不同）**

```
X-App-Id: 550e8400-e29b-41d4-a716-446655440000
X-Event: authorization.created
X-Timestamp: 1792404000000
X-Signature: sha256=<hmac>
```
```json
{
  "authorizationId": "123e4567-e89b-12d3-a456-426614174000",
  "resourceKey": "access-key-d21396c169754470b3cdae0af9b2b8a6",
  "expiresAt": "2027-10-19T08:00:00.000Z"
}
```

**③ 交易完成 / 失败**

```
X-App-Id: 550e8400-e29b-41d4-a716-446655440000
X-Event: transaction.completed          ← 也可能是 transaction.failed
X-Timestamp: 1792404000000
X-Signature: sha256=<hmac>
```
```json
{
  "orderId": "ORDER-20261019-001",
  "unitId": 80,
  "coinId": "USDT",
  "network": "TRC20",
  "amount": 100,
  "txId": "0xabc123",
  "orderState": "SUCCEED"
}
```

**注意**：授权回调若来自 `authorizeUrl` 的 `callback` 参数路径，**没有 `X-Event` 头**（见 14.2 表格与 14.3 的签名分支）。

### 14.3 签名算法

```
signData = appId + "." + [event + "."] + timestamp + "." + md5(sortedJSON(data))
X-Signature = "sha256=" + lowerHex(HMAC-SHA256(appSecret, signData))
```

- `sortedJSON(data)`：对象 key 递归排序；数组元素保序，数组内对象同样排序；`null` 保留并参与序列化。
- **有事件**：签名串包含事件段，例如 `appId.event.timestamp.md5`。
- **无事件**：Custody 调用 `oauth/verify` 且 `authorizeUrl` 使用 `callback` 参数时走这条路径，签名串为 `appId.timestamp.md5`，同时 `X-Event` 头不存在。验签实现必须按 `X-Event` 是否存在选择对应拼接方式。
- `appSecret` 是 HMAC 的密钥，不参与字符串拼接。

**计算示例**（固定输入，已实际计算）

请求头：

```
X-App-Id: 550e8400-e29b-41d4-a716-446655440000
X-Event: transaction.completed
X-Timestamp: 1792404000000
X-Signature: sha256=a5579ed42e4dd08de06b58be599b534b1141f70f353affdf292330501acd3ea4
```

请求体（`data`）：

```json
{
  "orderId": "ORDER-20261019-001",
  "unitId": 80,
  "amount": 100,
  "coinId": "USDT",
  "network": "TRC20",
  "status": "SUCCEED",
  "taskId": "task-20261019-003",
  "txId": "0xabc123"
}
```

中间值（`appSecret = sk_demo_secret_9f8e7d6c`）：

> 注：本示例的 `data` 是**验签算法的演示输入**，其中 `status` 字段仅用于展示事件名映射的原始输入。实际由 `custody/callback` 转发时该字段会被网关移除（见 14.2.3），验签对象以你实际收到的请求体为准。

```
sortedJSON(data) = {"amount":100,"coinId":"USDT","network":"TRC20","orderId":"ORDER-20261019-001","status":"SUCCEED","taskId":"task-20261019-003","txId":"0xabc123","unitId":80}
md5(sortedJSON(data)) = bafebc702c519d75e2e3682b72ec2c13
signData = 550e8400-e29b-41d4-a716-446655440000.transaction.completed.1792404000000.bafebc702c519d75e2e3682b72ec2c13
HMAC-SHA256 = a5579ed42e4dd08de06b58be599b534b1141f70f353affdf292330501acd3ea4
```

同一份 `data` 与时间戳、但不带事件时（`callback` 参数路径）：

```
signData = 550e8400-e29b-41d4-a716-446655440000.1792404000000.bafebc702c519d75e2e3682b72ec2c13
HMAC-SHA256 = 27cb791bd95c41922058729f9801eea94de2753ef66662321db8cbd930e30885
```

### 14.4 可运行的验签处理

#### Node.js

使用 `@cregis-kit/openplatform-node@1.2.0` 的 `sdk.onCallback(req, handler)`。SDK 会依次校验：

1. `x-app-id` / `x-timestamp` / `x-signature` 三个头是否存在
2. `x-app-id` 是否与构造 SDK 时的 `appId` 一致
3. `x-timestamp` 是否在允许窗口内（默认 ±5 分钟，可配置）
4. HMAC-SHA256 签名是否匹配

全部通过后才调用 `handler(payload, event)`；`event` 为 `x-event` 头，无该头时为 `undefined`。

```ts
import express from 'express';
import { CregisSDK, SDKError } from '@cregis-kit/openplatform-node';

const sdk = new CregisSDK({
  baseUrl: 'https://custody-sit.cregis.ae/openplatform',
  appId: process.env.APP_ID!,
  appSecret: process.env.APP_SECRET!,
  // 可选：调整重放窗口，默认 5 分钟；设为 0 关闭该检查
  // callbackTimestampToleranceMs: 5 * 60 * 1000,
});

const app = express();
app.use(express.json());   // 不要在验签前做任何 body 改写

app.post('/cregis/callback', async (req, res) => {
  try {
    await sdk.onCallback(req, async (payload, event) => {
      // 事件名由 SDK 传入，无需再读请求头
      // 原子抢占幂等键（SET NX，见 14.6），先持久化 / 入队，返回 2xx 后异步消费
      const primaryKey =
        (payload as any).authorizeId ||
        (payload as any).authorizationId ||
        (payload as any).orderId ||
        (payload as any).taskId;
      if (!primaryKey) throw new Error('callback payload has no primary key');

      await eventStore.saveOnce(`${event ?? 'no-event'}:${primaryKey}`, { event, payload });
    });

    res.status(200).json({ code: 0 });
  } catch (error) {
    if (error instanceof SDKError && error.code === 'SIGNATURE_INVALID') {
      res.status(401).json({ code: 40101, message: 'invalid signature' });
      return;
    }
    // 返回 5xx 会让平台重试该事件（共 5 次尝试）；若确定无法处理，
    // 应记录日志后返回 2xx，交由本地队列 / 对账补偿，避免重复推送。
    res.status(500).json({ code: 50001, message: 'internal error' });
  }
});
```

#### Java

使用 `CregisClient.onCallback(CallbackRequest, CallbackHandler)`（`cregis-sdk-core` 1.2.1+）。校验顺序与 Node SDK 一致，失败时抛 `CregisSdkException`（`SdkErrorCode.WEBHOOK_VERIFY_FAILED`）。

```java
SdkConfig config = SdkConfig.builder()
        .appId(System.getenv("APP_ID"))
        .appSecret(System.getenv("APP_SECRET"))
        .baseUrl("https://custody-sit.cregis.ae/openplatform")
        // 可选：默认 5 分钟；设为 0 关闭重放窗口
        // .callbackTimestampToleranceMs(5 * 60 * 1000L)
        .build();

CregisClient client = new CregisClient(config);

// 在 HTTP 处理中（Spring MVC 示例）
@PostMapping("/cregis/callback")
public ResponseEntity<?> callback(@RequestBody Map<String, Object> body,
                                  @RequestHeader("X-App-Id") String appId,
                                  @RequestHeader("X-Timestamp") String timestamp,
                                  @RequestHeader("X-Signature") String signature,
                                  @RequestHeader(value = "X-Event", required = false) String event) {
    CallbackRequest request = CallbackRequest.builder()
            .appId(appId)
            .timestamp(timestamp)
            .event(event)
            .signature(signature)
            .data(body)
            .build();

    try {
        client.onCallback(request, (data, eventName) -> {
            // eventName 为 null 表示无 X-Event（authorizeUrl 的 callback 路径）
            eventStore.saveOnce((eventName == null ? "no-event" : eventName)
                    + ":" + primaryKeyOf(data), data);
        });
        return ResponseEntity.ok(Map.of("code", 0));
    } catch (CregisSdkException e) {
        return ResponseEntity.status(401).body(Map.of("code", 40101, "message", "invalid signature"));
    }
}
```

注意：

- 两个 SDK 的 handler 都会收到 **event 参数**：Node 为 `string | undefined`，Java 为可空 `String`。无需再自行读取 `X-Event` 头。
- 验签使用解析后的 body 重新排序序列化，因此不需要保留原始请求字节；但**不要在验签前修改 body**（增删字段、`null` 转 `undefined`、数字/字符串互转都会改变 `md5(sortedJSON(data))`）。
- 时间戳窗口只防重放，**不能代替幂等**。平台是「至少一次」投递，同一事件仍可能重复到达，必须按主键去重（见 14.6）。
- 若你的部署存在较大时钟漂移，可调大 `callbackTimestampToleranceMs`；不要长期设为 0。

### 14.5 重试策略

| 项 | 行为 |
|----|------|
| 总尝试次数 | 初始 1 次 + 最多 4 次重试（共 5 次） |
| 重试间隔 | 第 2 次尝试前 0 ms、第 3 次前 1,000 ms、第 4 次前 5,000 ms、第 5 次前 30,000 ms |
| 触发重试 | **HTTP 429 / 5xx**，以及**网络 / 传输错误**（`ECONNABORTED` / `ETIMEDOUT` / 未收到任何 HTTP 响应） |
| 不重试 | HTTP `3xx`、其余 `4xx`（例如 400 / 401 / 404） |
| 成功判定 | 任意 `2xx` |
| 单次超时 | 30 秒 |
| 载荷上限 | `JSON.stringify(data).length > 64 * 1024` 时直接放弃，不发送（按字符数计算，不是 UTF-8 字节数） |
| 未配置回调地址 | 直接跳过，返回 `success: true, error: 'no_callback_url'` |
| URL 校验 | 生产环境必须 HTTPS；非生产环境 HTTP 仅允许 `localhost` / `127.0.0.1` |
| 投递保证 | 尽力而为：内存中重试，无队列 / 持久化 / 死信；耗尽 5 次尝试后事件丢失 |

每次重试都会重新生成 `X-Timestamp` 并重新计算签名，因此接收方不能用第一次的时间戳校验后续尝试，也不能用 `X-Timestamp` 作为幂等键。

> **投递语义是“至少一次”，不是“恰好一次”。** 网络抖动、超时（响应丢失但对方已处理）、重试都会造成重复推送。接收方必须按 14.6 的幂等键去重。

> **没有投递队列。** 若 5 次尝试全部失败（例如接收方长时间宕机），该事件不会补投。请通过业务查询接口（12 章）或对账任务补偿最终状态；关键事件的接收方应在本地持久化后再返回 2xx，避免在事件处理期间返回 5xx 触发无意义重试。

> 这里的重试只属于**回调推送器**（`ApplicationCallbackService`）。第 7 章描述的网关转发客户端重试放大（上游 5xx / 超时被反复重试）发生在业务请求链路上，**不适用于回调推送**。

### 14.6 幂等与响应要求

- **尽快返回 2xx**：单次回调超时为 30 秒，超时会触发重试并可能造成重复处理。建议先把事件写入队列 / 幂等表并立即返回，业务处理异步进行。
- **按事件主键去重**：

  | 事件 | 幂等键 |
  |------|--------|
  | `authorization.created`（`oauth/verify` 路径） | `authorizeId` |
  | `authorization.created`（内部接口路径） | `authorizationId` |
  | `transaction.completed` / `transaction.failed` | `orderId`，缺失时用 `taskId`，再缺失用 `txId` |

  都没有业务主键时用稳定的请求体哈希（`sha256(rawBody)`）兜底；**不要用 `X-App-Id + X-Timestamp`**——时间戳每次重试都会重新生成，无法去重同一事件。
- **原子抢占**：用 Redis `SET NX`（或数据库唯一键）在产生副作用前抢占幂等键，并区分 `processing` / `done` 状态与 TTL，避免「先查后写」的竞态；处理失败时释放键。
- 无论处理结果如何，都不要在响应体里依赖平台读取业务字段；平台只判断 HTTP 状态码。
- 回放防护：签名不含 nonce，请校验 `X-Timestamp` 的时间窗口并配合幂等键去重。
- **返回 5xx 会触发重试**：确认事件本身有问题（签名之外）时应返回 2xx 并记录日志，交由人工处理；返回 5xx 只会让平台重复推送同一事件。

---

## 15. 错误码与排查

### 15.1 平台业务码

下表来自 `openplatform-api-service/src/enums/business-codes.enum.ts`（仅列出该枚举中存在的值）。转发接口的最终响应形态见 15.2：上游 Custody 的业务码通常透传在 HTTP 2xx 的响应体中，网关自身的错误才使用下表中的码与非 200 状态。

| `code` | 枚举名 | 含义 / 触发场景 |
|--------|--------|----------------|
| `40001` | `PARAM_REQUIRED` | 缺少必填参数（如 `basic` 不完整、缺少 `resourceKey`、内部接口 `oauth/verify` 缺字段） |
| `40002` | `PARAM_INVALID_FORMAT` | 参数格式错误 |
| `40003` | `PARAM_BUSINESS_RULE` | 违反业务规则 |
| `40004` | `PARAM_DUPLICATE` | 重复请求 |
| `40005` | `PARAM_INVALID_STATE` | 对象状态不允许该操作 |
| `40101` | `AUTH_MISSING_HEADERS` | 缺少认证信息；`oauthToken` 无效或过期 |
| `40102` | `AUTH_INVALID_SIGNATURE` | 签名验证失败；也用于 `appId` 对应的应用不存在 |
| `40103` | `AUTH_TIMESTAMP_EXPIRED_OR_INVALID_TOKEN` | 时间戳过期或无效（毫秒时间戳、时钟漂移） |
| `40104` | `AUTH_DUPLICATE_NONCE` | nonce 重复（重放）；**也被复用于“应用未激活”**（消息 `Application is not active`） |
| `40105` | `AUTH_APP_NOT_ACTIVE` | 开发者账号未激活（消息 `Developer account is not active`） |
| `40107` | `AUTH_INVALID_REFRESH_TOKEN` | refresh token 无效 |
| `40110` | `AUTH_INVALID_CREDENTIALS` | 登录凭证无效（开发者后台登录） |
| `40301` | `AUTHZ_ACCESS_DENIED` | 资源未授权：`authorizationId` 不存在或授权记录非 `active` |
| `40302` | `AUTHZ_PERMISSION_DENIED` | 权限不足 |
| `40303` | `AUTHZ_OPERATOR_DENIED` | 操作方不满足条件（如 KYB 未通过时创建应用） |
| `40304` | `AUTHZ_SUPER_ADMIN_REQUIRED` | 需要超级管理员 |
| `40305` | `AUTHZ_INSUFFICIENT_PERMISSIONS` | 权限不足 |
| `40306` | `AUTHZ_PERMISSION_CONFIG_NOT_FOUND` | 权限配置不存在 |
| `40401` | `NOT_FOUND_RESOURCE` / `AUTH_TOKEN_NOT_FOUND` | 资源不存在；网关未匹配到转发路由也使用该码 |
| `40402` | `NOT_FOUND_ENDPOINT` | 端点不存在 |
| `40501` | `METHOD_NOT_ALLOWED` | 方法不允许（签名中间件只接受 POST） |
| `40902` | `CONFLICT_DUPLICATE` | 资源冲突 / 重复 |
| `42901` | `RATE_LIMIT_EXCEEDED` | 超出每日配额或限流 |
| `42902` | `RATE_LIMIT_STRICT` | 严格限流档位（枚举定义） |
| `42903` | `RATE_LIMIT_LENIENT` | 宽松限流档位（枚举定义） |
| `50001` | `SERVER_INTERNAL` | 服务内部错误 |
| `50002` | `SERVER_UNAVAILABLE` | 服务暂不可用 |
| `50003` | `SERVER_DATABASE` | 数据库错误 |
| `50004` | `SERVER_CACHE` | 缓存错误 |
| `50201` | `BAD_GATEWAY` | 上游网关错误（枚举定义） |
| `50301` | `SERVICE_UNAVAILABLE` | 服务不可用（枚举定义） |
| `50401` | `GATEWAY_TIMEOUT` | 网关超时 |
| `50402` | `UPSTREAM_TIMEOUT` | 上游超时 |
| `50403` | `API_RATE_LIMITED` | API 限流 |

说明：

- `error-mapper.service.ts` 的码映射只在全局限流中间件与账单等本地接口使用；**转发接口不经过该映射**。该映射表的部分默认消息与码义不一致（例如 `40102` 的默认消息是 `Token expired`，`40103` 是 `Invalid signature`），不要根据这些默认消息判断原因。
- 枚举中存在但当前没有主动返回路径的码（如 `40402`、`42902`、`42903`、`50201`、`50301`、`50402`、`50403`）不应当作稳定的接口契约；转发层失败使用的是原始 HTTP 状态码（见 15.2）。
- 判断业务成败以响应体 `code` 为准（成功为 `0` 或 `200`），不要只看 HTTP 状态码。

### 15.2 Custody 透传码

以下码由 Custody 产生，不在平台枚举中。它们出现的方式取决于上游的 HTTP 状态：

| 上游业务码 | 出现方式 | 含义 |
|------------|----------|------|
| `400` | 上游 HTTP 2xx，网关原样透传响应体，HTTP 200 | Custody 参数 / 请求格式错误（常见于 `treasury/create`） |
| `400001` | 同上 | 参数或业务校验失败（具体语义由 custody 定义） |
| `400006` | 同上 | 参数或业务校验失败（具体语义由 custody 定义） |
| `400042` | 同上 | 参数或业务校验失败（具体语义由 custody 定义） |
| `400070` | 同上 | 参数或业务校验失败；已观测到 `board/init` 护卫队签名人不足时返回（见 13.3） |
| `400103` | 同上 | `THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS`：`resourceKey` 在 custody 侧不存在 |
| `120042` | 同上 | `ONLY_ACQUIRING_ACCOUNT_ALLOWED`：归集来源账户不是 platform 创建的 acquiring 账户 |

当 Custody 返回**非 2xx**（包括 4xx）时，网关丢弃上游响应体，返回 HTTP `500` 与 `{ "code": 500, "message": "..." }`；连接失败返回 `503`，超时返回 `504`（响应体同样只有 `code` 与 `message`）。因此：

- 看到 HTTP 200 + 业务码 ≠ 成功，需要判断响应体 `code`。
- 看到 `500` 且响应体没有上游业务码时，真正原因在上游，网关侧看不到；请记录 `x-trace-id`。
- 网关对上游 5xx / 超时会自动重试（且当前实现存在递归重试，实际次数可能远超 3 次），写操作重试可能导致重复提交（见 15.3、15.4）。

### 15.3 按现象排查

| 现象 | 常见原因 | 排查 / 处理 |
|------|----------|-------------|
| `40102`，含对象数组的请求（`coinIds`、`primaryManager`、`payTo` 等） | 只排序了顶层 key，没有递归排序数组内对象 | 使用 Node SDK 1.1.0+ / Java SDK 1.2.0+，或按 4.3 递归排序 |
| `40102`，所有请求 | `appSecret` 错误；重置密钥后环境变量未更新；空格 / 换行；Basic 与 Resource 签名串混用 | 核对密钥并 `trim`；确认接口对应的签名类型（第 4 章） |
| `40103` | 使用毫秒时间戳；服务器时钟漂移 | 使用 10 位 Unix 秒；开启 NTP |
| `40104`，消息为 `Duplicate nonce detected` | 固定 nonce；重试沿用同一 nonce；并发共享 nonce | 每次请求（含重试）生成新 nonce |
| `40104`，消息为 `Application is not active` | 应用被停用；错误码被复用，并非 nonce 问题 | 检查应用状态并联系平台 |
| `40301` | `authorizeId` 不存在、授权记录非 `active`，或使用了另一环境的 `authorizeId` | 重新走 OAuth 流程（授权页重新授权） |
| `400103` | `resourceKey` 拼写错误、跨环境使用、未在 custody 开通 | 使用 13.1 返回的 `resourceAccessKey`，或联系平台开通；`oauth/verify`（Custody 内部调用）不会提前发现该问题（5.4） |
| 地址查询返回空分页 | 缺少 `coinId` / `network`；`accountType` 与账户不匹配；地址尚未创建 | 从 `list-unit-account`（7.4）取 `coinId` / `network`，四个字段一起传（第 8 章） |
| `42901` | 超出订阅套餐 `dailyApiLimit`，或触发限流；配额服务异常时 fail-closed 也会返回 `42901` | 查看 `Retry-After` 与开发者门户订阅查询的 `dailyApiUsage`；退避重试（6.4、6.5） |
| HTTP `500` / `503` / `504`，响应体只有 `{code,message}` | Custody 返回非 2xx、连接失败或超时；上游响应体被丢弃 | 记录 `x-trace-id` 与请求时间，联系平台；写操作先确认是否已生效再重试 |
| 同一笔出金 / 创建地址重复执行 | 网关对上游 5xx / 超时自动重试，且重试次数可能被放大；Custody 是否按 `orderId` 去重未验证 | 复用稳定业务单号；重试前先查询订单 / 地址；非幂等接口避免盲目重试（第 7、10 章） |
| `400070`（`board/init`） | 护卫队公钥没有对应用户，或 `threshold` 超过有效签名人数 | 先用 13.2 建用户并绑定 `publicKey`，再初始化 board（13.3） |
| 收不到回调 | 应用未配置 `callbackUrl`；生产使用 HTTP；载荷超过 64KB；5 次尝试全部失败（无持久化队列，不补投，见 14.5） | 检查应用回调配置；生产使用 HTTPS；控制载荷大小；通过对账 / 查询接口补偿（14.5） |

### 15.4 已知实现限制

| 限制 | 影响 |
|------|------|
| `authorizationId` 只按 ID 查询，**不校验应用归属**（D2） | 理论上一个应用可以使用另一应用创建的 `authorizeId`；请妥善保护 `authorizeId`，不要跨应用传递 |
| 应用未激活时返回 `40104`（复用 `AUTH_DUPLICATE_NONCE`），消息为 `Application is not active` | 不要仅凭 `40104` 判断 nonce 问题 |
| 每日配额在转发前扣减 | 被 Custody 拒绝的请求同样消耗配额；`merchant/register` 也走转发链路 |
| API 日志不落 `trace_id` | `createApiLog` 的入参没有 `traceId` 字段（模型有该列但未写入）；转发日志可在 `requestHeaders['x-trace-id']` 中找回 |
| `merchant/register` 不校验 `business.appId` 与 `basic.appId` 是否一致 | custody 使用 `business.appId` 签发 key；请确保两者一致，否则 key 可能签发给错误的应用 |
| `custody/callback` 始终返回 HTTP 200 | 缺少 `resourceKey`、资源不存在等错误只体现在响应体 `code`，Custody 侧不会因 HTTP 状态重试 |
| 回调载荷上限按 `JSON.stringify(data).length`（字符数）判断 | 多字节字符可能使实际字节数超过 64KB；请预留余量 |
| 转发客户端对上游 5xx / 超时递归重试 | 实际请求次数可能远超配置的 3 次；非幂等写操作存在重复执行风险 |
| `oauth/verify` 不校验 `resourceKey` 是否存在 | 任意键都会写入授权记录；未开通的键在后续业务请求才由 custody 返回 `400103`（5.4）。该接口由 Custody 内部调用 |

---

## 16. SDK 集成

官方 SDK 封装了签名、请求与错误处理，推荐在服务端直接使用。三端版本与本指南的对应关系见 16.4。

### 16.1 Node.js SDK 1.1.0

**安装**（要求 Node.js >= 18）

```bash
npm install @cregis-kit/openplatform-node@1.1.0
```

**构造与最小端到端示例**

```ts
import { CregisSDK } from '@cregis-kit/openplatform-node';

const sdk = new CregisSDK({
  baseUrl: 'https://custody-sit.cregis.ae/openplatform', // 不要带尾斜杠
  appId: process.env.APP_ID!,
  appSecret: process.env.APP_SECRET!,
  timeout: 30000, // 可选，默认 30000 ms
  debug: false,   // 可选
});

// 1. 获取授权地址（Basic 签名），交给前端打开
const { authorizeUrl } = await sdk.getAuthorizationUrl({
  permissions: [],                // 见 5.2：当前请留空数组或省略
  state: 'random-state-string',
  callback: 'https://your-app.com/oauth/callback',
});

// 2. 前端打开 authorizeUrl，用户在授权页确认后拿到 authorizeId
//    （Web SDK 的 openAuthorization 返回 { status, authorizeId }，见 16.3）
//    该 authorizeId 由 Custody 内部调用 oauth/verify 生成，SDK 不提供 verify 方法。
const authorizeId = await receiveAuthorizeIdFromFrontend(); // 你的前端把 Web SDK 返回的 authorizeId 回传后端

// 3. 后续业务接口使用 authorizeId（Resource 签名）
const accounts = await sdk.listUnitAccount(authorizeId, 80);
const payin = accounts.find((a) => a.type === 'PAYIN')!;

const task = await sdk.createPayout(authorizeId, {
  unitId: 80,
  fromAccountId: payin.id,
  payTo: [{ to: '0x0000000000000000000000000000000000000000', amount: 100 }],
  coinId: payin.coinId,
  network: payin.network,
  merchantType: 'NON_FINANCIAL_CORPORATE',
  orderId: 'ORDER-20261019-001',
});

await sdk.submitTask(authorizeId, task.taskId, { confirmed: true });
```

**完整方法表（23 个业务方法）**

| 领域 | 方法 | 签名 | 返回类型 |
|------|------|------|----------|
| OAuth | `getAuthorizationUrl(params)` | Basic | `{ authorizeUrl, expiresIn }` |
| 商户 / 用户 / Board | `registerMerchant(request)` | Basic | `MerchantRegisterResult` |
| 商户 / 用户 / Board | `addUser(authorizationId, request)` | Resource | `Record<string, unknown>`（如 `{ userId }`） |
| 商户 / 用户 / Board | `initBoard(authorizationId, request)` | Resource | `MerchantBoard` |
| 财务单元 | `createTreasuryUnit(authorizationId, request)` | Resource | `CreateTreasuryUnitResponse` |
| 财务单元 | `createCustomUnit(authorizationId, request)` | Resource | `TreasuryUnit` |
| 财务单元 | `listTreasuryUnits(authorizationId, options?)` | Resource | `TreasuryUnit[]` |
| 财务单元 | `listUnitAccount(authorizationId, unitId)` | Resource | `UnitAccount[]` |
| 地址 | `getTreasuryUnitAddress(authorizationId, request)` | Resource | `PaginatedResponse<UnitAddress>` |
| 地址 | `getUnitAddressByAccount(authorizationId, cusAccountId, request?)` | Resource | `PaginatedResponse<UnitAddress>` |
| 地址 | `createUnitAddress(authorizationId, request)` | Resource | `void` |
| 地址 | `createUnitAddressByAccount(authorizationId, cusAccountId, number)` | Resource | `UnitAddress[]` |
| 币种 / 规则 / 白名单 | `addCoins(authorizationId, request)` | Resource | `WCCIPCmdAuditTask[]` |
| 币种 / 规则 / 白名单 | `updateFundControl(authorizationId, request)` | Resource | `void` |
| 币种 / 规则 / 白名单 | `updateWhitelist(authorizationId, request)` | Resource | `WCCIPCmdAuditTask` |
| 出金 / 归集 | `createPayout(authorizationId, request)` | Resource | `WCCIPCmdAuditTask` |
| 出金 / 归集 | `pooling(authorizationId, request)` | Resource | `ProjectUnitTransferOutOrder` |
| 审批 | `submitTask(authorizationId, taskId, request)` | Resource | `void` |
| 交易查询 | `listTransferOutOrders(authorizationId, options?)` | Resource | `PaginatedResponse<ProjectUnitTransferOutOrder>` |
| 交易查询 | `listTransferInOrders(authorizationId, options?)` | Resource | `PaginatedResponse<ProjectUnitTransferInOrder>` |
| 交易查询 | `listActivities(authorizationId, options?)` | Resource | `PaginatedResponse<ProjectUnitActivity>` |
| 交易查询 | `listFundRecords(authorizationId, options?)` | Resource | `PaginatedResponse<ProjectUnitFundRecord>` |
| 交易查询 | `listUnitFundRecords(authorizationId, options?)` | Resource | `PaginatedResponse<ProjectUnitLedgerFundRecord>` |

另有 `onCallback(req, handler)` 用于回调验签（14.4），以及 `getConfig()` 工具方法。

**错误处理**

```ts
import { CregisSDK, SDKError } from '@cregis-kit/openplatform-node';

try {
  await sdk.listUnitAccount(authorizeId, 80);
} catch (error) {
  if (error instanceof SDKError) {
    console.error(error.code);                 // SDKErrorCode 或 HTTP 状态
    console.error(error.httpStatus);           // HTTP 状态
    console.error(error.details);              // { apiCode, traceId }
    console.error(error.isRetryable);          // 5xx / 网络错误 / 429 为 true
  }
}
```

`error.details.apiCode` 是网关响应体中的业务码（例如 `400103`）；`traceId` 仅在响应体含该字段时存在（转发响应通常没有，请以响应头 `x-trace-id` 为准）。SDK 对 `code !== 0 && code !== 200` 的响应抛 `SDKError`，不会静默返回。

> **OAuth 说明：** Node SDK 只封装 `getAuthorizationUrl`。`authorizeId` 由授权页在 Custody 内部完成 `verify` 后通过 postMessage 返回（见 5.3、16.3），SDK 不提供 verify 方法。`registerMerchant` / `addUser` / `initBoard` 其余字段与网关一致。

### 16.2 Java SDK 1.2.1（JitPack）

**环境要求**：JDK 17+、Maven 3.8+。

**仓库配置**

```xml
<repositories>
    <repository>
        <id>jitpack.io</id>
        <url>https://jitpack.io</url>
    </repository>
</repositories>
```

**依赖坐标**

```xml
<dependency>
    <groupId>com.github.ZoranWong.custody-openplatfrom</groupId>
    <artifactId>cregis-sdk-core</artifactId>
    <version>java-sdk-v1.2.1</version>
</dependency>
```

`java-sdk-v1.2.1` 是仓库中的 Git tag；JitPack 按该 tag 构建。`CregisClient` 的服务入口：

| 入口 | 覆盖 |
|------|------|
| `oauth()` | `getAuthorizationUrl` |
| `treasury()` | 创建 / 自定义创建 / 列表 / 账户列表 |
| `payout()` | 出金、出金订单、归集 |
| `transaction()` | 入金订单、活动 / 流水、`submitTask` |
| `merchant()` | `registerMerchant` |
| `user()` | `addUser` |
| `board()` | `initBoard` |
| `fundControl()` | `updateFundControl` |
| `whitelist()` | `updateWhitelist` |
| `callback()` | 回调验签 |

**同步 / 异步对照**：每个方法都有同名 + `Async` 的版本，返回 `CompletableFuture<T>`，例如：

| 同步 | 异步 |
|------|------|
| `client.treasury().listUnitAccount(authorizationId, 80L)` | `client.treasury().listUnitAccountAsync(authorizationId, 80L)` |
| `client.oauth().getAuthorizationUrl(request)` | `client.oauth().getAuthorizationUrlAsync(request)` |
| `client.merchant().registerMerchant(request)` | `client.merchant().registerMerchantAsync(request)` |
| `client.user().addUser(authorizationId, request)` | `client.user().addUserAsync(authorizationId, request)` |
| `client.board().initBoard(authorizationId, request)` | `client.board().initBoardAsync(authorizationId, request)` |

**最小示例**

```java
import com.cregis.sdk.CregisClient;
import com.cregis.sdk.core.config.SdkConfig;
import com.cregis.sdk.dto.request.*;
import com.cregis.sdk.dto.response.*;

SdkConfig config = SdkConfig.builder()
        .appId("your-app-id")
        .appSecret("your-app-secret")
        .baseUrl("https://custody-sit.cregis.ae/openplatform")
        .build();

CregisClient client = new CregisClient(config);

AuthorizationResponse auth = client.oauth().getAuthorizationUrl(
        GetAuthorizationUrlRequest.builder()
                .permissions(List.of())
                .state("random-state")
                .callback("https://your-app.com/oauth/callback")
                .build());

// authorizeId 来自前端授权页（Web SDK 的 openAuthorization 返回 { status, authorizeId }），
// 由你的后端保存；Custody 已在内部调用 oauth/verify 完成授权记录写入。
List<UnitAccountResponse> accounts = client.treasury().listUnitAccount(authorizeId, 80L);
```

**异常字段**：业务码非成功时抛 `CregisSdkException`。

```java
try {
    client.treasury().listUnitAccount(authorizationId, 80L);
} catch (CregisSdkException e) {
    System.out.println(e.getErrorCode());       // SdkErrorCode
    System.out.println(e.getServerErrorCode()); // 网关业务码，如 400103
    System.out.println(e.getRequestId());       // traceId（若响应提供）
    System.out.println(e.getHttpStatusCode());
}
```

> **OAuth 说明：** Java SDK 的 `oauth()` 只提供 `getAuthorizationUrl`。`authorizeId` 由授权页在 Custody 内部完成 `verify` 后返回（见 5.3），SDK 不提供 verify 方法。

### 16.3 Web SDK 1.0.5

**安装**

```bash
npm install @cregis-kit/openplatform-webkit@1.0.5
```

**职责边界**：Web SDK 只负责在浏览器中嵌入授权页并接收 `postMessage`。它**只返回 `authorizationId`**（即业务接口可用的 `authorizeId`，由 Custody 内部调用 `oauth/verify` 生成），不返回 `oauthToken`，也不回传 `state`。你的后端只需保存这个 `authorizeId` 并在业务请求的 `basic.authorizationId` 中使用；不需要也不能调用 `oauth/verify`。

**嵌入示例**

```ts
import { CregisWebSDK } from '@cregis-kit/openplatform-webkit';

const sdk = new CregisWebSDK({
  container: '#auth-container',   // 必填；popup 模式下作为挂载点（实际弹层挂到 document.body）
  mode: 'popup',                  // 'popup' | 'tab' | 'window'，默认 popup
  allowedOrigins: ['https://custody.cregis.ae'], // 建议配置，用于校验消息来源
  onReady: ({ uuid }) => console.log('ready', uuid),
  onAuthorizationStarted: () => console.log('user clicked authorize'),
  onAuthorizationComplete: ({ authorizeId }) => console.log('authorizeId', authorizeId),
  onAuthorizationError: ({ code, message }) => console.error(code, message),
  onAuthorizationCancelled: () => console.log('cancelled'),
});

const result = await sdk.openAuthorization(authorizeUrlFromBackend);
if (result.status === 'success') {
  // result.authorizeId 即业务接口可用的 authorizeId（Custody 内部已调用 verify）
  // 把它交给你的后端保存，与自身用户关联，作为 basic.authorizationId
}
```

**打开模式**

| `mode` | 行为 |
|--------|------|
| `popup`（默认） | 在 `document.body` 上创建遮罩层，内嵌 iframe 打开授权页；点击遮罩上的关闭按钮会以 `authorization_failed` 结束（`User cancelled authorization`） |
| `tab` | `window.open(url, '_blank')`，依赖授权页 `postMessage` 回传；适合新标签页 |
| `window` | 打开 600×700 弹窗，依赖 `postMessage`；弹窗被拦截时返回 `authorization_failed` |

**postMessage 事件**

| `type` | 触发时机 | `data` | SDK 回调 |
|--------|----------|--------|----------|
| `ready` | 授权页初始化完成 | 无 | `onReady({ uuid })` |
| `authorization_started` | 用户点击授权按钮 | 无 | `onAuthorizationStarted()` |
| `authorization_succeed` | 授权成功 | `{ authorizationId }` | `onAuthorizationComplete({ authorizeId })` |
| `authorization_failed` | 参数错误、登录失败、授权失败、用户取消 | `{ code, message }`（另带 `error`） | `onAuthorizationError({ code, message })` |
| `close` | 授权页关闭（授权成功后约 10 秒自动关闭） | 无 | `onAuthorizationCancelled()`，`openAuthorization` 返回 `{ status: 'cancelled' }` |

补充说明：

- 所有消息都带 `uuid`（即 `sdkUuid`）与 `timestamp`，SDK 会丢弃 UUID 不匹配的消息。
- `allowedOrigins` 未配置时 SDK 接受任意来源的合法消息（向后兼容）；生产环境务必配置。
- 授权页在无父窗口（例如用户直接在新标签页打开且没有 opener）时无法 `postMessage`，请改用服务端 `callback`（5.2）。
- 除授权 SDK 外，包内还导出 `TransferTaskDetailDialog` / `openTransferTaskDetailDialog`，用于展示转账审批任务详情（与本指南的业务接口无直接耦合）。

### 16.4 版本兼容表

| SDK | 版本 | 坐标 / 安装 | 适用场景 | 与网关的已核对结论 |
|-----|------|-------------|----------|--------------------|
| Node.js | **1.2.0** | `npm install @cregis-kit/openplatform-node@1.2.0`（仓库版本；npm 尚未发布时从源码构建） | 服务端调用全部业务接口、回调验签 | 签名（递归排序、Unix 秒）与网关一致 |
| Java | **1.2.1** | `com.github.ZoranWong.custody-openplatfrom:cregis-sdk-core:java-sdk-v1.2.1`（JitPack） | 服务端 Java 接入，全部业务接口、回调验签 | 同上 |
| Web | **1.0.5** | `npm install @cregis-kit/openplatform-webkit@1.0.5` | 浏览器嵌入授权页 | 只返回 `authorizationId`（即 Custody 内部 `verify` 生成的 `authorizeId`） |

- 更早版本（Node 1.0.x、Java 1.0.0）不支持对象数组递归排序，含 `coinIds` / `primaryManager` / `payTo` 的请求会返回 `40102`，不要使用。
- **发布状态提醒**：本表版本号对应本仓库源码。截至本指南编写时，npm 上 Node SDK 最新为 `1.0.1`、Web SDK 最新为 `1.1.3`；Java SDK 最新可用的 JitPack tag 为 `java-sdk-v1.2.1`。若 `npm install` 找不到对应版本，请改用 npm 上的最新版本，或从仓库源码构建。
- 三个 SDK 版本必须与网关的接口路径前缀 `/api/thirdparty/` 配套；`baseUrl` 不要包含该前缀，也不要带尾斜杠。
- 环境地址见 2.3：本地 `http://127.0.0.1:1000`、SIT `https://custody-sit.cregis.ae/openplatform`、生产 `https://custody.cregis.ae/openplatform`。

---

## 17. 附录

### 17.1 枚举

以下类型逐字取自 `openplatform-sdk/node/src/types.ts`。

**BusinessScope**（业务类型）

```ts
type BusinessScope = 'DEDICATED_ACCOUNT' | 'OMNIBUS_ACCOUNT' | 'OPEN_API_PROXY';
```

**Topology**（账本拓扑）

```ts
type Topology = 'ORBIT' | 'SINGLE_GENERAL' | 'QUAD_SMART_ISOLATION';
```

> `CUSTOM` 是上游 custody 接受的取值（7.1、7.2），但**不在 Node SDK 的 `Topology` 类型中**；TypeScript 调用需类型断言，或等待 SDK 更新。

**AccountType**（账户类型）

```ts
type AccountType = 'FREEZE' | 'DEPOSIT' | 'PRIMARY' | 'RECEIVABLE' | 'PAYOUT'
                 | 'PAYIN' | 'GENERAL_GAS' | 'QUARANTINE' | 'DIRTY';
```

**VaultAccountType**（金库账户类型）

```ts
type VaultAccountType = 'GENERAL_ACQUIRING' | 'SMART_ACQUIRING' | 'SMART'
                      | 'GENERAL' | 'GMA' | 'TMA';
```

**MerchantType**

```ts
type MerchantType = 'NON_FINANCIAL_CORPORATE' | 'REGULATED_VASP' | 'INTERNAL_SYSTEM';
```

**PayoutOperation**

```ts
type PayoutOperation = 'withdraw' | 'allocate' | 'payout';
```

**CreationType**

```ts
type CreationType = 'PLATFORM' | 'THIRD_PARTY';
```

**TreasuryUnitStatus**

```ts
type TreasuryUnitStatus = 'ACTIVATED' | 'FROZEN' | 'CLOSED' | 'PENDING';
```

**AuditTaskStatus**

```ts
type AuditTaskStatus =
  | 'AUDITING' | 'REJECTED' | 'AUDIT_REJECTED' | 'AUDIT_PASSED'
  | 'SIGNING' | 'SIGN_FAILED' | 'SIGN_SUCCEED' | 'FAILED' | 'WAITING'
  | 'SIGN_REJECTED' | 'ALL_BROADCAST_SUCCEED' | 'PARTIALLY_BROADCAST_SUCCEED'
  | 'ALL_BROADCAST_FAILED' | 'BROADCAST_FAILED' | 'BROADCAST_EXCEPTION' | 'EXPIRED';
```

**AlgoType**

```ts
type AlgoType = 'ECDSA' | 'EC_SCHNORR' | 'ED_DSA' | 'UNASSIGNED' | 'ED25519';
```

补充：`UserRole` 在 `types.ts` 中为 `'MERCHANT_STAFF' | 'MERCHANT_OWNER' | 'MERCHANT_ADMIN' | 'MERCHANT_FUND_OPERATOR' | 'MERCHANT_ANYCALL_OPERATOR'`（13.2 的 `role` 字段）。

### 17.2 常用结构

以下同取自 `openplatform-sdk/node/src/types.ts`。

**PaginatedResponse**

```ts
interface PaginatedResponse<T = unknown> {
  records: T[];
  total: number;
  current: number;
  size: number;
  pages?: number;
  orders?: OrderItem[];
}

interface OrderItem {
  column: string;
  asc: boolean;
}
```

**CoinInfo**

```ts
interface CoinInfo {
  coinId: string;
  network: string;
}
```

**FundControl / FundControlRule**

```ts
interface FundControlRule {
  guardians: string[];
  threshold: string;          // 注意：字符串
  perTransferLimit: string;   // 注意：字符串
  dailyTransferLimit: string; // 注意：字符串
}

interface FundControl {
  coinId: string;
  fundControlRules: FundControlRule[];
}
```

**AnyCallRule**

```ts
interface AnyCallRule {
  guardians: string[];
  threshold: string;
  allowedCommands: string[];
}
```

**WhiteListCreateRequest**

```ts
interface WhiteListCreateRequest {
  network: string;
  address: string;
  alias?: string;
}
```

**AccountFundControl**

```ts
interface AccountFundControl {
  accountId: number;
  fundControls: FundControl[];
}
```

**UnitAccount**

```ts
interface UnitAccount {
  id: number;                // cusAccountId
  ecode: string;
  vaultCode: string;
  vaultAccountId: string;
  projectId: number;
  treasuryUnitId: number;
  accountName: string;
  fundFlowCode: string;
  anycallCode: string;
  autoSignUrl: string;
  balance: number;
  freezeBalance: number;
  holdBalance: number;
  coinId: string;
  network: string;
  type: AccountType;
  accountType?: VaultAccountType;
  status: number;
  income: number;
  outcome: number;
  isSmart: boolean;
  remark: string;
  createTime: string;
  updateTime: string;
}
```

**UnitAddress**

```ts
interface UnitAddress {
  id: number;
  address: string;
  addressIndex: number;
  accountType: AccountType;
  coinId: string;
  network: string;
  cusAccountId: number;
  treasuryUnitId: number;
  available: number;
  holdAmount: number;
  holdFrozen: number;
  status: number;
  createTime: string;
  updateTime: string;
}
```

### 17.3 FAQ

**Q：`coinId` / `network` 从哪里获取？**

从 `POST /api/thirdparty/treasury/list-unit-account/{unitId}`（7.4）的账户列表取 `coinId` 与 `network`。地址查询、出金、归集都应使用与该账户一致的值；不要从币种名称或链名自行拼接。

**Q：地址列表为什么是空的？**

最常见原因是缺少 `coinId` 或 `network`——缺少时 Custody 返回空分页而不是错误。请确认 `unitId + accountType + coinId + network` 四个字段一起传入，且 `accountType` 与目标账户类型一致；地址尚未生成时同样为空，可用 8.3 / 8.4 创建。

**Q：如何获得 `resourceAccessKey`？**

调用 13.1 `merchant/register` 获取。首次注册返回非空 `resourceAccessKey`，它同时是 Custody 内部调用 `oauth/verify` 时使用的 `resourceKey` 与后续业务请求转发到 Custody 的资源键；开发者不需要在 `verify` 请求中传递它。重复注册时该字段可能为 `null`。若企业由平台侧开通，请向平台索取资源键。

**Q：应该使用哪个环境地址？**

本地 `http://127.0.0.1:1000`、SIT `https://custody-sit.cregis.ae/openplatform`、生产 `https://custody.cregis.ae/openplatform`（见 2.3）。`authorizeUrl` 的域名由平台配置（`OPENPLATFORM_AUTH_URL`），不要自行替换；跨环境混用 `authorizeId` / `appSecret` / `resourceAccessKey` 会得到 `40102`、`40301` 或 `400103`。

**Q：回调验签失败，但签名算法看起来一致？**

先确认走的是哪条回调路径：Custody 内部调用 `oauth/verify` 且使用 `callback` 参数时，回调**没有** `X-Event`，签名串也**没有**事件段；应用默认 `callbackUrl` 路径带事件段。其次确认 `md5(sortedJSON(data))` 使用的是解析后的请求体且递归排序、数组保内对象也排序；最后确认 `X-Signature` 前缀 `sha256=` 已去掉后再比较。

**Q：`oauth/verify` 明明返回了 `authorizeId`，业务接口仍返回 `40301`？**

`oauth/verify` 是 Custody 内部调用的接口，开发者不直接参与。业务接口按 `basic.authorizationId` 查询 `oauth_resources` 表；授权页返回的 `authorizeId` 就是 Custody 内部调用 `verify` 写入的记录 ID。请确认业务请求使用的是授权页返回的 `authorizeId`（而非其他环境或旧值），且该授权记录状态为 `active`；若仍失败，请重新走 OAuth 流程（授权页重新授权）。
