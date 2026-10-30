# Cregis OpenPlatform Java SDK

Cregis 托管开放平台官方 Java SDK，覆盖 **OAuth 授权、财务单元、地址、币种/资金控制/白名单、出金/归集、审批、商户与企业用户、Board、交易记录、回调验签** 全部业务接口。所有接口均提供同步与异步（`CompletableFuture`）两种调用方式。

**当前版本：1.2.6**

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
    <version>1.2.6</version>
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

| 方法 | 说明 | 返回字段要点 | 可能业务码 |
|------|------|------|------|
| `AuthorizationResponse getAuthorizationUrl(GetAuthorizationUrlRequest)` | 获取授权 URL，返回 `authorizeUrl` + `expiresIn` |

`GetAuthorizationUrlRequest`：`permissions: List<String>`、`state`、`callback`、`token`（均为可选；当前请勿设置 `permissions`，见上方注意事项）。

> `POST /api/thirdparty/oauth/verify` 由 Custody 后台在用户授权成功后回调网关，**不是开发者接口**，SDK 不提供对应方法。

### 商户 / 用户 / Board

| 方法 | 说明 | 返回字段要点 | 可能业务码 |
|------|------|------|------|
| `MerchantRegisterResponse registerMerchant(MerchantRegisterRequest)` | 三方平台注册企业，幂等；返回 `ecode` / `vaultCode` / `authorizedId`（首次注册，等同 `authorizeId`）/ `alreadyExists` | `ecode` / `vaultCode` / `authorizedId` / `alreadyExists` | `400036`、`400067`、`400099`、`400103`、`400109`、`400438` |
| `ConsoleUserResponse addUser(String authorizationId, AddUserRequest)` | 添加企业用户（1.2.6 起返回用户详情，此前为 `Map<String, Object>`） | `ConsoleUserResponse`：`id` / `email` / `pk` / `state` / `ecode` | `400011`、`400067`、`400099`、`400103` |
| `BoardResponse initBoard(String authorizationId, InitBoardRequest)` | 初始化 Board（护卫队） | `BoardResponse`：`id` / `userInfos` / `threshold` / `status` | `400005`、`400008`、`400070`、`400103`、`400127` |
| `AuditTaskResponse updateBoard(String authorizationId, UpdateBoardRequest)` | 修改 Board；返回审批任务，改动需按门限签名后生效 | `AuditTaskResponse`：`taskId` / `state` / `signers` | `400030`、`400103`、`400119`、`400127` |

`MerchantRegisterRequest` 必填 `legalName`、`appId`；可选 `alias`、`email`、`jurisdiction`、`registrationNumber`、`taxId`、`entityType`、`networks`、`owner`。

`InitBoardRequest`：`guardians: List<String>`、`threshold: Integer`。

`UpdateBoardRequest`：可选 `guardians`、`threshold`、`lang`、`note`、`validUntilTime`（签名有效期，单位分钟，custody 默认 1440）。

### 财务单元 Treasury

`client.treasury()`：

| 方法 | 说明 | 返回字段要点 | 可能业务码 |
|------|------|------|------|
| `createTreasuryUnit(String, CreateTreasuryUnitRequest)` | `TreasuryUnitResponse`（`id` 即 `unitId`） | `TreasuryUnitResponse`：`id`（= `unitId`）/ `ecode` / `status` | `400056`、`400103`、`400112`、`400127` |
| `createCustomUnit(String, CreateCustomUnitRequest)` | `TreasuryUnitResponse` | `TreasuryUnitResponse`：`id` / `accounts` / `status` | `400056`、`400062`、`400103`、`400112`、`400127` |
| `listTreasuryUnits(String, ListTreasuryUnitsRequest)` | `List<TreasuryUnitResponse>` | `List<TreasuryUnitResponse>`：数组，不分页包装 | `400103` |
| `listUnitAccount(String, Long unitId)` | `List<UnitAccountResponse>` | `List<UnitAccountResponse>`：`id`（= `cusAccountId`）/ `type` / `coinId` / `network` | `400103` |

`CreateTreasuryUnitRequest` 必填 `unitName`、`businessScope`、`topology`、`coinIds`、`primaryManager`、`payoutManager`。

### 地址

| 方法 | 说明 | 返回字段要点 | 可能业务码 |
|------|------|------|------|
| `PageResponse<UnitAddressResponse> getUnitAddress(String, GetUnitAddressRequest)` | 按 unit 查询地址（分页） | `PageResponse<UnitAddressResponse>`：`status` / `available` / `holdFrozen` / `address` | `400011`、`400103` |
| `PageResponse<UnitAddressResponse> getUnitAddressByAccount(String, Long cusAccountId, GetUnitAddressRequest)` | 按账户查询地址（分页） | 同上 | `400042`、`400103` |
| `AccountAddressResponse[] createUnitAddress(String, CreateUnitAddressRequest)` | 按账户类型创建地址，返回新建地址（1.2.6 起由 `void` 修正） | `AccountAddressResponse[]`：`address` / `status` / `cusAccountId` | `400006`、`400012`、`400103` |
| `List<AccountAddressResponse> createUnitAddressByAccount(String, Long cusAccountId, Integer number)` | 按账户创建地址，返回新建地址（1.2.6 起元素类型改为 `AccountAddressResponse`） | `List<AccountAddressResponse>`：同上 | `400012`、`400103` |

`GetUnitAddressRequest` 需同时提供 `unitId`、`accountType`、`coinId`、`network` 才能拿到结果。

### 币种 / 资金控制 / 白名单

| 方法 | 说明 | 返回字段要点 | 可能业务码 |
|------|------|------|------|
| `List<AuditTaskResponse> addCoins(String, AddUnitCoinsRequest)` | 添加币种，返回审批任务 | `List<AuditTaskResponse>`：审批任务数组 | `400006`、`400012`、`400042`、`400056`、`400070`、`400103`、`400127`、`400215`、`400216` |
| `AuditTaskResponse updateFundControl(String, FundControlUpdateRequest)` | 更新资金控制，返回审批任务（1.2.6 起由 `void` 修正） | `AuditTaskResponse`：`taskId` / `taskOperation: FUND_FLOW` | `400006`、`400030`、`400103`、`400120` |
| `AuditTaskResponse updateWhitelist(String, WhitelistUpdateRequest)` | 更新白名单，返回审批任务 | `AuditTaskResponse`：`taskId` / `taskOperation: SET_WHITE_LIST` | `400026`、`400027`、`400030`、`400103` |

### 出金 / 归集 / 审批

`client.payout()` / `client.transaction()`：

| 方法 | 说明 | 返回字段要点 | 可能业务码 |
|------|------|------|------|
| `AuditTaskResponse createPayout(String, CreatePayoutRequest)` | 发起出金，返回审批任务 | `AuditTaskResponse`：`taskId` / `state` / `signContent` / `signers` | `300004`、`400006`、`400011`、`400013`、`400042`、`400048`、`400101`、`400103`、`400127`、`400214`、`400440`、`400441` |
| `PageResponse<PayoutResponse> listTransferOutOrders(String, QueryRequest)` | 出金订单 | `PageResponse<PayoutResponse>`：`orderState` / `payToList` / `txId` | `400103` |
| `PageResponse<TransferInOrderResponse> listTransferInOrders(String, QueryRequest)` | 入金订单 | `PageResponse<TransferInOrderResponse>`：`orderState` / `cpAddress` / `amount` | `400103` |
| `void submitTask(String, String taskId, SubmitTaskRequest)` | 提交审批 | `void`（成功时 `data` 为 `null`） | `400001`、`400013`、`400103` |
| `PayoutResponse pooling(String, PoolingRequest)` | 发起归集 | `PayoutResponse`：`orderId` / `orderState` / `taskId` | `300004`、`400006`、`400042`、`400083`、`400102`、`400103` |

`CreatePayoutRequest` 必填 `payTo`、`fromAccountId`、`unitId`、`coinId`、`network`、`fromAddress`、`orderId`、`merchantType`（前 7 项为上游 `ThirdPayoutRequest` 的必填字段）。
`SubmitTaskRequest`：`confirmed: boolean`，可选 `signatures: Map<String, List<String>>`。

> 归集仅允许 platform 创建的 acquiring 账户作为来源，否则 custody 返回 `120042 ONLY_ACQUIRING_ACCOUNT_ALLOWED`。

### 交易记录

`client.transaction()`：

| 方法 | 说明 | 返回字段要点 | 可能业务码 |
|------|------|------|------|
| `listActivities(String, QueryRequest)` | `PageResponse<TransactionResponse>` | `PageResponse<TransactionResponse>`：`direction` / `status` / `travelRuleStatus` | `400103` |
| `listFundRecords(String, QueryRequest)` | `PageResponse<FundRecordResponse>` | `PageResponse<FundRecordResponse>`：`txType` / `direction` / `fromAddr` / `toAddr` | `400103` |
| `listUnitFundRecords(String, QueryRequest)` | `PageResponse<UnitFundRecordResponse>` | `PageResponse<UnitFundRecordResponse>`：`txType` / `ledgerId` | `400103` |

`PageResponse<T>`：`records`、`total`、`current`、`size`、`pages`。

### 回调验签

`client.callback()` 提供回调签名校验，算法与 Node SDK 一致：

```
无 event：HMAC-SHA256(appSecret, appId + "." + timestamp + "." + md5(sortedJSON(data)))
有 event：HMAC-SHA256(appSecret, appId + "." + event + "." + timestamp + "." + md5(sortedJSON(data)))
```

---

## 错误处理

业务码非成功时抛出 `CregisSdkException`，异常同时携带 SDK 分类、原始业务码、custody 常量与中文含义。

```java
try {
    client.treasury().listUnitAccount(authorizationId, 80L);
} catch (CregisSdkException e) {
    e.getErrorCode();             // SdkErrorCode（分类）
    e.getServerErrorCode();       // 400103  ← 原始业务码
    e.getCustodyError();          // CustodyErrorCodes.THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS
    e.getCustodyErrorName();      // "THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS"
    e.getCustodyErrorMeaning();   // English meaning
    e.getCustodyErrorRetryable(); // 该业务码是否可重试
    e.isRetryable();              // custody 标记优先，否则按 HTTP 状态 / 错误码
    e.getRequestId();             // traceId
    e.getHttpStatusCode();
}
```

### 错误码 → SDK 分类

| 业务码来源 | `serverErrorCode` | `errorCode`（`SdkErrorCode`） | `isRetryable()` |
|------------|-------------------|-------------------------------|-----------------|
| 网关 | `40001` / `40002` | `API_VALIDATION_ERROR` | 否 |
| 网关 | `40101`–`40107` / `40301` / `40401` | `API_UNAUTHORIZED` | 否 |
| 网关 | `42901` | `API_RATE_LIMITED` | 是 |
| 网关 | `500` / `50001` / `50201` / `50301` / `50401` / `50402` | `API_SERVER_ERROR` | 是 |
| Custody | `400103` | `CUSTODY_RESOURCE_NOT_EXISTS` | 否 |
| Custody | `300004` / `400440` | `CUSTODY_INSUFFICIENT_FUNDS` | 否 |
| Custody | 分类 `VALIDATION` | `CUSTODY_VALIDATION_ERROR` | 否 |
| Custody | 分类 `STATE` | `CUSTODY_STATE_ERROR` | 否 |
| Custody | 分类 `INFRA` / 其他已登记码 | `CUSTODY_BUSINESS_ERROR` | 见下表 |
| 未知 | 其他 | `API_ERROR` | 否 |

### 辅助 API

| 方法 | 说明 | 返回字段要点 | 可能业务码 |
|------|------|------|------|
| `CustodyErrorCodes.fromCode(int)` | 业务码 → 枚举，未登记返回 `null` |
| `CustodyErrorCodes#getCategory()` | `VALIDATION` / `AUTH` / `STATE` / `CAPACITY` / `INFRA` |
| `CustodyErrorCodes#isRetryable()` | 该业务码是否可重试 |
| `CustodyErrorCodes#getMeaning()` | 英文含义（javadoc 保留中文触发条件） |
| `SdkErrorCode#getDefaultMessage()` | 分类的默认说明 |
| `SdkErrorCode#apiCodes()` | 所有「API 响应类」分类 |

### Custody 业务码总表（35 个）

来源：[`docs/third-party-api-error-codes.md`](../docs/third-party-api-error-codes.md)。分类与「可重试」为 SDK 侧约定。

| `code` | 常量 | 分类 | 可重试 | 含义 / 触发条件 |
|--------|------|------|--------|----------------|
| `120042` | `ONLY_ACQUIRING_ACCOUNT_ALLOWED` | VALIDATION | 否 | 归集来源账户不是 platform 创建的 acquiring 账户 |
| `300004` | `ACCOUNT_BALANCE_NOT_ENOUGH` | CAPACITY | 否 | 出金账户余额不足；账户冻结行更新影响行数为 0；归集时无可用地址或预估金额不足 |
| `400001` | `TASK_NOT_FOUND` | STATE | 否 | `taskId` 为空、按 taskId / 主键都查不到、或任务 ecode 与当前 key 不一致 |
| `400005` | `INIT_BOARD_FAILED` | STATE | 否 | 初始化 Board 时门限非法（≤0 或 > 守护人数），或 TrustVault `initBoard` 非 200 |
| `400006` | `ACCOUNT_NOT_EXIST` | STATE | 否 | 账户不存在或不属于当前企业：加币种引用外部账户、创建地址、出金、归集、修改资金流、修改白名单 |
| `400008` | `BOARD_EXIST` | STATE | 否 | 企业已有 `AVAILABLE` 或 `PENDING` 的 Board，不允许重复初始化 |
| `400011` | `OPERATION_NOT_SUPPORT` | VALIDATION | 否 | 添加用户时 ecode 与 key 所属企业不一致；地址查询的 accountType 非 PAYIN/PAYOUT/PRIMARY；出金 operation 非 payout/withdraw/allocate |
| `400012` | `CREATE_ADDRESS_FAILED` | INFRA | 是 | 加币种新增网络、或按账户创建地址时，TrustVault `getAddress` 非 200 |
| `400013` | `UPDATE_ACCOUNT_FAILED` | INFRA | 是 | 出金、提交任务的兜底 catch：任何非 `SparkException` 的异常 |
| `400026` | `MERCHANT_ACCOUNT_NOT_EXIST` | STATE | 否 | CRM 错误码：白名单变更时账户不属于当前 ecode / unit |
| `400027` | `WHITELIST_UPDATE_IN_PROGRESS` | STATE | 否 | 同账户已有 `PENDING` 的白名单变更 |
| `400030` | `BOARD_NOT_EXIST` | STATE | 否 | 修改 Board、资金流、白名单时企业没有 `AVAILABLE` 的 Board |
| `400036` | `CREATE_VAULT_FAILED` | INFRA | 是 | 三方注册企业时建项目返回 null，或 `ProjectInitHandler` 创建金库失败 |
| `400042` | `ACCOUNT_UNIT_NOT_EXIST` | STATE | 否 | unit 不存在、不属于当前企业，或不是当前开发者创建的 |
| `400048` | `ACCOUNT_GROUP_NOT_ACTIVATED` | STATE | 否 | 出金账户 `status = 0`（未激活） |
| `400056` | `CONTRACT_FACTORY_DEPLOY_FAILED` | INFRA | 是 | 创建 unit、加币种时新网络的合约工厂部署失败 |
| `400062` | `ACCOUNT_UNIT_NAME_EXIST` | STATE | 否 | 自定义 unit 名称在企业内已存在 |
| `400067` | `PUBLIC_KEY_EXIST` | STATE | 否 | 公钥已被其他用户占用；或同一邮箱试图更换公钥 |
| `400070` | `SIGNER_NOT_EXIST_OR_NOT_ENOUGH` | STATE | 否 | 初始化 Board 时 guardians 为空；加币种下发资金流任务时 TrustVault 未返回签名人 |
| `400083` | `ACCOUNT_POOLING` | STATE | 否 | 该账户正在归集中（Redis 归集锁被占用） |
| `400099` | `PASSWORD_FORMAT_ERROR` | VALIDATION | 否 | 密码为空、长度不足 8 位，或大小写/数字/特殊字符不足 3 类 |
| `400101` | `INVALID_PAYOUT_AMOUNT` | VALIDATION | 否 | 出金 payTo 按地址聚合后总金额 ≤ 0 |
| `400102` | `ENERGY_PERIOD_NOT_START` | INFRA | 是 | 归集时 TRON 能量租赁失败 |
| `400103` | `THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS` | AUTH | 否 | `resourceAccessKey` 为空、不存在或状态非 `ACTIVE`（除注册企业外所有接口） |
| `400109` | `MERCHANT_NOT_EXIST` | STATE | 否 | 企业 ecode 为空或企业不存在（注册企业的入驻编排链路） |
| `400112` | `INIT_TREASURY_UNIT_FAILED` | INFRA | 是 | TrustVault 初始化 unit 非 200，或返回账户数与请求不一致 |
| `400119` | `BOARD_UPDATE_IN_PROGRESS` | STATE | 否 | 已有 `PENDING` 的 Board 变更 |
| `400120` | `FUNDFLOW_UPDATE_IN_PROGRESS` | STATE | 否 | 同金库账户已有 `PENDING` 的资金流变更 |
| `400127` | `MERCHANT_PROJECT_NOT_EXIST` | STATE | 否 | 按 key 的企业找不到项目；出金时按 unit 找不到项目 |
| `400214` | `PAY_TO_ADDRESS_EXCEED_LIMIT` | VALIDATION | 否 | 出金付款地址数超过网络上限（默认 150）；Travel Rule 开启时一对多付款 |
| `400215` | `COIN_ACCOUNT_ALREADY_EXISTS` | STATE | 否 | 加币种时该币种 + 网络已存在 |
| `400216` | `NETWORK_NOT_SUPPORT` | VALIDATION | 否 | 加币种的新网络不在项目支持网络内 |
| `400438` | `CREATE_MERCHANT_FAILED` | INFRA | 是 | 三方注册企业时企业落库返回 null |
| `400440` | `ADDRESS_BALANCE_NOT_ENOUGH` | CAPACITY | 否 | 出金来源地址为空；或地址可用额（扣除隔离资金与其他在途出金）不足以覆盖本单 |
| `400441` | `ADDRESS_BALANCE_CHECK_FAILED` | INFRA | 是 | 出金地址锁获取失败、被其他请求持有，或 Redis 不可用（fail-closed） |

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
./release.sh 1.2.6          # 上传到 Central Portal 并停在 Validated 状态，人工确认后点 Publish
./release.sh 1.2.6 --auto   # 上传后自动发布
```

CI 发布：GitHub Actions → **Release Java SDK** → 输入版本号（需先配置仓库 Secrets，见 `RELEASE.md`）。

## 版本与变更

### 1.2.6

**错误码**

- 新增 `CustodyErrorCodes` 枚举（35 个业务码，含 `getCategory()` / `isRetryable()` / `getMeaning()`（英文）/ `fromCode(int)`），由 `docs/scripts/generate-error-codes.mjs` 生成。
- `SdkErrorCode` 新增 `API_UNAUTHORIZED` / `API_VALIDATION_ERROR` / `API_RATE_LIMITED` / `API_SERVER_ERROR` / `CUSTODY_VALIDATION_ERROR` / `CUSTODY_STATE_ERROR` / `CUSTODY_RESOURCE_NOT_EXISTS` / `CUSTODY_INSUFFICIENT_FUNDS` / `CUSTODY_BUSINESS_ERROR` 与 `fromServerCode(int)`；`VALIDATION_ERROR` / `TOKEN_EXPIRED` 标为 `@Deprecated`。
- `CregisSdkException` 新增 `getCustodyError()` / `getCustodyErrorName()` / `getCustodyErrorMeaning()` / `getCustodyErrorRetryable()` / `isRetryable()`；业务码确实按类别映射（此前全部落到 `API_ERROR`）。

对齐 2026-10 上游 API（`docs/custody-openplatform-api.yaml`）：

- **地址查询**：`UnitAddressResponse` 补齐 `ProjectUnitAccountAddress` 全部字段（`id`、`ecode`、`vaultCode`、`projectId`、`vaultAccountId`、`series`、`alias`、`isSmart`、`isContract`、`status`、`available`、`holdAmount`、`holdFrozen`、`riskLevel`、`riskScore`、`riskCheckTime`、`expireTime`、`userId`、`lastUsedTime`、`coolingEndTime`、`createTime`、`updateTime`）。
- **创建地址**：`createUnitAddress` / `createUnitAddressByAccount` 由 `void` / `List<UnitAddressResponse>` 改为返回 `AccountAddressResponse[]` / `List<AccountAddressResponse>`（上游 `AccountAddressVO`）。
- **资金流水**：`FundRecordResponse` 新增 `fromAddr`、`toAddr`、`direction`。
- **出金订单**：`PayoutResponse` 新增 `vaspDid`、`vaspName`、`vaspReviewStatus`、`vaspReviewedBy`、`vaspReviewedAt`。
- **用户**：`UserService.addUser` 返回 `ConsoleUserResponse`（此前为 `Map<String, Object>`）。
- **资金流规则**：`FundControlService.updateFundControl` 返回 `AuditTaskResponse`（审批任务，此前为 `void`）。
- **Travel Rule**：`TravelRulePayload` 新增 `beneficiaryVaspDid`、`beneficiaryVaspName`。
- **财务单元**：`TreasuryUnitResponse` 与上游 `ProjectUnit` 对齐（create / create-custom / list 共用同一结构）；`networks`、`sort` 在上游 schema 中未声明、SIT 实测不返回，保留字段仅为二进制兼容。

### 1.2.5

- 新增 `BoardService.updateBoard` / `updateBoardAsync`（`UpdateBoardRequest` → `AuditTaskResponse`），对应网关 `POST /api/thirdparty/board/update`。修改 Board 会生成审批任务，需按门限签名后生效。

### 1.2.4

- **`MerchantRegisterResponse` 新增 `authorizedId` 字段**：网关在首次注册成功后返回授权记录 ID（等同于 `authorizeId`），可直接作为后续请求的 `basic.authorizationId`。`resourceAccessKey` 为上游字段，经网关调用时会被剥离。

### 1.2.3

- **`onCallback` 入参改为 `HttpServletRequest` + 业务数据 `Map`**，与 Node.js SDK 保持一致：不再要求调用方自行组装 `CallbackRequest` POJO，而是直接传入原始 HTTP 请求对象和反序列化后的 body。

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
