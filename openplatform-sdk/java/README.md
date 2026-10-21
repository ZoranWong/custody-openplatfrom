# Cregis OpenPlatform Java SDK

Cregis 托管开放平台官方 Java SDK，覆盖 **OAuth 授权、财务单元、地址、币种/资金控制/白名单、出金/归集、审批、商户与企业用户、Board、交易记录、回调验签** 全部业务接口。所有接口均提供同步与异步（`CompletableFuture`）两种调用方式。

**当前版本：1.2.2**

---

## 目录

- [环境要求](#环境要求)
- [安装](#安装)
- [快速开始](#快速开始)
- [认证与签名](#认证与签名)
- [API Reference](#api-reference)
  - [OAuth](#oauth)
  - [商户 / 用户 / Board](#商户--用户--board)
  - [财务单元 Treasury](#财务单元-treasury)
  - [地址](#地址)
  - [币种 / 资金控制 / 白名单](#币种--资金控制--白名单)
  - [出金 / 归集 / 审批](#出金--归集--审批)
  - [交易记录](#交易记录)
  - [回调验签](#回调验签)
- [错误处理](#错误处理)
- [环境](#环境)
- [版本与变更](#版本与变更)

---

## 环境要求

- JDK 17+
- Maven 3.8+（仓库内含 `mvnw`）

> 本机若 `JAVA_HOME` 未设置，可使用 VS Code Java 插件自带 JDK：
> `export JAVA_HOME=/Users/wang/.vscode/extensions/redhat.java-1.57.0-darwin-x64/jre/25.0.4.1-macosx-x86_64`

---

## 安装

```xml
<dependency>
    <groupId>com.cregis</groupId>
    <artifactId>cregis-sdk-core</artifactId>
    <version>1.2.2</version>
</dependency>
```

本地构建：

```bash
cd openplatform-sdk/java
./mvnw -pl cregis-sdk-core -am install -DskipTests
```

---

## 快速开始

```java
import com.cregis.sdk.CregisClient;
import com.cregis.sdk.core.config.SdkConfig;
import com.cregis.sdk.dto.request.*;
import com.cregis.sdk.dto.response.*;
import com.cregis.sdk.dto.model.PayTo;

SdkConfig config = SdkConfig.builder()
        .appId("your-app-id")
        .appSecret("your-app-secret")
        .baseUrl("https://custody-sit.cregis.ae/openplatform")
        .build();

CregisClient client = new CregisClient(config);

// 1. 获取授权地址
//    注意：当前网关把 permissions 序列化为 JSON，授权页却按逗号拆分，
//    传入非空列表会导致授权页初始化失败，因此这里不设置 permissions（默认 ['read']）。
AuthorizationResponse auth = client.oauth().getAuthorizationUrl(
        GetAuthorizationUrlRequest.builder()
                .state("random-state")
                .callback("https://your-app.com/oauth/callback")
                .build());

// 2. 前端打开 authorizeUrl 完成授权；Custody 后台会回调网关创建授权记录
//    授权页 / Web SDK 把 authorizeId 返回给前端，再由你的后端保存
String authorizationId = authorizeIdFromFrontend;

// 3. 查询账户并出金
List<UnitAccountResponse> accounts = client.treasury().listUnitAccount(authorizationId, 80L);

AuditTaskResponse task = client.payout().createPayout(authorizationId,
        CreatePayoutRequest.builder()
                .unitId(80L)
                .coinId("CLCC")
                .network("ethereum-sepolia")
                .merchantType("NON_FINANCIAL_CORPORATE")
                .payTo(List.of(PayTo.builder()
                        .to("0x0000000000000000000000000000000000000000")
                        .amount(100)
                        .build()))
                .build());

// 4. 提交审批
client.transaction().submitTask(authorizationId, task.getTaskId(),
        SubmitTaskRequest.builder().confirmed(true).build());
```

---

## 认证与签名

`SdkConfig` 字段：

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `appId` | `String` | — | 应用 ID（UUID），必填 |
| `appSecret` | `String` | — | 应用密钥，必填 |
| `baseUrl` | `String` | — | 网关地址，必填 |
| `httpClientType` | `String` | `okhttp` | HTTP 实现 |
| `connectTimeout` | `int` | `10` | 连接超时（秒） |
| `readTimeout` | `int` | `30` | 读取超时（秒） |
| `maxRetries` | `int` | `3` | 最大重试次数 |
| `webhookEnabled` | `boolean` | `false` | 是否启用 webhook |
| `webhookPath` | `String` | `/cregis/callback` | webhook 路径 |

缺少 `appId` / `appSecret` / `baseUrl` 时构造抛出 `IllegalStateException`。

**签名**（SDK 自动计算）：

| 场景 | 签名串 |
|------|--------|
| Basic | `MD5(appSecret + appId + timestamp + nonce + MD5(business))` |
| Resource | `MD5(appSecret + appId + authorizationId + timestamp + nonce + MD5(business))` |

`business` 序列化时递归排序对象 key，**数组元素顺序保留、数组内对象排序**，与网关校验一致。`timestamp` 为 Unix 秒。

---

## API Reference

所有服务通过 `CregisClient` 获取：`oauth()`、`treasury()`、`payout()`、`transaction()`、`merchant()`、`user()`、`board()`、`fundControl()`、`whitelist()`、`callback()`。

异步版本统一为方法名 + `Async`，返回 `CompletableFuture<T>`。

### OAuth

| 方法 | 说明 |
|------|------|
| `AuthorizationResponse getAuthorizationUrl(GetAuthorizationUrlRequest)` | 获取授权 URL，返回 `authorizeUrl` + `expiresIn` |

`GetAuthorizationUrlRequest`：`permissions: List<String>`、`state`、`callback`、`token`（均为可选；当前请勿设置 `permissions`，见上方注意事项）。

> `POST /api/thirdparty/oauth/verify` 由 Custody 后台在用户授权成功后回调网关，**不是开发者接口**，SDK 不提供对应方法。

### 商户 / 用户 / Board

| 方法 | 说明 |
|------|------|
| `MerchantRegisterResponse registerMerchant(MerchantRegisterRequest)` | 三方平台注册企业，幂等；返回 `ecode` / `vaultCode` / `resourceAccessKey` / `alreadyExists` |
| `Map<String, Object> addUser(String authorizationId, AddUserRequest)` | 添加企业用户，返回如 `{ userId: 99 }` |
| `BoardResponse initBoard(String authorizationId, InitBoardRequest)` | 初始化 Board（护卫队） |

`MerchantRegisterRequest` 必填 `legalName`、`appId`；可选 `alias`、`email`、`jurisdiction`、`registrationNumber`、`taxId`、`entityType`、`networks`、`owner`。

`InitBoardRequest`：`guardians: List<String>`、`threshold: Integer`。

### 财务单元 Treasury

`client.treasury()`：

| 方法 | 返回 |
|------|------|
| `createTreasuryUnit(String, CreateTreasuryUnitRequest)` | `TreasuryUnitResponse`（`id` 即 `unitId`） |
| `createCustomUnit(String, CreateCustomUnitRequest)` | `TreasuryUnitResponse` |
| `listTreasuryUnits(String, ListTreasuryUnitsRequest)` | `List<TreasuryUnitResponse>` |
| `listUnitAccount(String, Long unitId)` | `List<UnitAccountResponse>` |

`CreateTreasuryUnitRequest` 必填 `unitName`、`businessScope`、`topology`、`coinIds`、`primaryManager`、`payoutManager`。

### 地址

| 方法 | 返回 |
|------|------|
| `PageResponse<UnitAddressResponse> getUnitAddress(String, GetUnitAddressRequest)` | 按 unit 查询地址（分页） |
| `PageResponse<UnitAddressResponse> getUnitAddressByAccount(String, Long cusAccountId, GetUnitAddressRequest)` | 按账户查询地址（分页） |
| `void createUnitAddress(String, CreateUnitAddressRequest)` | 按账户类型创建地址 |
| `List<UnitAddressResponse> createUnitAddressByAccount(String, Long cusAccountId, Integer number)` | 按账户创建地址，返回新建地址（1.1.0 起由 `void` 修正） |

`GetUnitAddressRequest` 需同时提供 `unitId`、`accountType`、`coinId`、`network` 才能拿到结果。

### 币种 / 资金控制 / 白名单

| 方法 | 返回 |
|------|------|
| `List<AuditTaskResponse> addCoins(String, AddUnitCoinsRequest)` | 添加币种，返回审批任务 |
| `void updateFundControl(String, FundControlUpdateRequest)` | 更新资金控制 |
| `AuditTaskResponse updateWhitelist(String, WhitelistUpdateRequest)` | 更新白名单，返回审批任务 |

### 出金 / 归集 / 审批

`client.payout()` / `client.transaction()`：

| 方法 | 返回 |
|------|------|
| `AuditTaskResponse createPayout(String, CreatePayoutRequest)` | 发起出金，返回审批任务 |
| `PageResponse<PayoutResponse> listTransferOutOrders(String, QueryRequest)` | 出金订单 |
| `PageResponse<TransferInOrderResponse> listTransferInOrders(String, QueryRequest)` | 入金订单 |
| `void submitTask(String, String taskId, SubmitTaskRequest)` | 提交审批 |
| `PayoutResponse pooling(String, PoolingRequest)` | 发起归集 |

`CreatePayoutRequest` 必填 `payTo`、`unitId`、`coinId`、`network`、`merchantType`。
`SubmitTaskRequest`：`confirmed: boolean`，可选 `signatures: Map<String, List<String>>`。

> 归集仅允许 platform 创建的 acquiring 账户作为来源，否则 custody 返回 `120042 ONLY_ACQUIRING_ACCOUNT_ALLOWED`。

### 交易记录

`client.transaction()`：

| 方法 | 返回 |
|------|------|
| `listActivities(String, QueryRequest)` | `PageResponse<TransactionResponse>` |
| `listFundRecords(String, QueryRequest)` | `PageResponse<FundRecordResponse>` |
| `listUnitFundRecords(String, QueryRequest)` | `PageResponse<UnitFundRecordResponse>` |

`PageResponse<T>`：`records`、`total`、`current`、`size`、`pages`。

### 回调验签

`client.callback()` 提供回调签名校验，算法与 Node SDK 一致：

```
无 event：HMAC-SHA256(appSecret, appId + "." + timestamp + "." + md5(sortedJSON(data)))
有 event：HMAC-SHA256(appSecret, appId + "." + event + "." + timestamp + "." + md5(sortedJSON(data)))
```

---

## 错误处理

所有接口在业务码非成功时抛出 `CregisSdkException`：

```java
try {
    client.treasury().listUnitAccount(authorizationId, 80L);
} catch (CregisSdkException e) {
    System.out.println(e.getErrorCode());        // SdkErrorCode
    System.out.println(e.getServerErrorCode());  // 网关业务码，如 400103
    System.out.println(e.getRequestId());        // traceId
    System.out.println(e.getHttpStatusCode());
}
```

常见网关业务码：

| 业务码 | 含义 |
|--------|------|
| `400` / `400001` / `400006` / `400042` / `400070` | 参数或业务校验失败 |
| `400103` | 资源键在 custody 侧不存在 |
| `120042` | 归集来源账户类型不允许 |
| `40102` / `40110` | 签名失败 / 凭证无效 |
| `42901` | 配额或限流 |
| `500` / `50001` | 服务端错误 |

`CregisClient.toString()` 不会输出 `appSecret`。

---

## 环境

| 环境 | baseUrl |
|------|---------|
| 本地 | `http://127.0.0.1:1000` |
| SIT | `https://custody-sit.cregis.ae/openplatform` |
| 生产 | `https://custody.cregis.ae/openplatform` |

---

## 发布

发布到 Maven Central 通过仓库脚本完成（需要本地 GPG 私钥与 Central Token）：

```bash
./release.sh 1.2.2          # 上传到 Central Portal 并停在 Validated 状态，人工确认后点 Publish
./release.sh 1.2.2 --auto   # 上传后自动发布
```

CI 发布：GitHub Actions → **Release Java SDK** → 输入版本号（需先配置仓库 Secrets，见 `RELEASE.md`）。

## 版本与变更

### 1.2.2

- **`onCallback` 加固**：校验 `appId` 必须与配置一致、`X-Timestamp` 必须落在 `callbackTimestampToleranceMs`（默认 5 分钟）窗口内，再验证 HMAC-SHA256 签名；新增 `SdkConfig.callbackTimestampToleranceMs`，设为 `0` 可关闭时间窗校验。
- **`CallbackHandler` 签名变更**：`handle(Map<String, Object> data)` → `handle(Map<String, Object> data, String event)`。事件名来自 `X-Event`，缺失时为 `null`。这是编译期不兼容改动，升级后需同步修改 handler。
- 请求增加 `User-Agent` 与 `X-SDK-Name` / `X-SDK-Version` / `X-SDK-Language` 头，网关据此在 API 日志中记录 SDK 身份。

### 1.2.1

- 移除 `verifyOAuthToken` / `verifyOAuthTokenAsync`：`oauth/verify` 是 Custody 后台回调网关的内部接口，不属于开发者 SDK 能力。授权页 / Web SDK 返回的 `authorizeId` 可直接作为 `authorizationId` 使用。
- `getAuthorizationUrl` 的 `token` 字段改为必填。

### 1.2.0

- 修正 `createUnitAddressByAccount` 返回类型（`void` → `List<UnitAddressResponse>`），并补充 `createUnitAddressByAccountAsync`。
- Maven Central 发布接入（`release` profile + Central Portal publishing plugin）。

### 1.1.0

- 新增 `createCustomUnit`、`getUnitAddressByAccount`、`createUnitAddressByAccount`（含 Async）、`registerMerchant`、`addUser`、`initBoard`、`addCoins`、`updateFundControl`、`updateWhitelist`。
- **签名**：数组内对象的 key 递归排序，与网关一致（此前含对象数组的请求会验签失败）。
- `getUnitAddress` / `getUnitAddressByAccount` 返回 `PageResponse<UnitAddressResponse>`。
- `createUnitAddressByAccount` 返回 `List<UnitAddressResponse>` 并补充 `createUnitAddressByAccountAsync`。
- 单元测试 22 项通过。

### 1.0.0

首个发布版本。
