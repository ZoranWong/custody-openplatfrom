# 三方平台接口异常码清单

> 范围：`custody-backend` 模块 `ThirdPartyApiController` 暴露的全部 `/api/third-party/**` 接口，以及其实际调用链（`custody-common` 下的 handler / service）。
> 口径：只列**代码里真实会抛给调用方**的错误码；上游 TrustVault 透传码、非业务码兜底单独成节。
> 生成日期：2026-10-30
> 相关文档：[三方平台对接接口文档（v1）](third-party-api-v1.md)

---

## 0. 读取约定

### 0.1 响应形态

统一为 `MessageResult`：

```json
{ "code": 400030, "message": "BOARD_NOT_EXIST", "data": null }
```

业务错误码以 `SparkException` 形式抛出，`code` 为数值，`message` 为错误码符号名（无中文翻译）。

需要区分三种「失败」：

| 形态 | 表现 | 举例 |
|---|---|---|
| 抛 `SparkException(MessageResult)` | 带固定业务码 | `BOARD_NOT_EXIST` |
| 直接返回上游 `MessageResult` | HTTP 200，body 里是上游的 code/message | `/fundControl/update`、`/whiltlist/update` |
| 返回成功但 `data` 为空 | HTTP 200，`code=200`，`data=null` | 账户不存在时 `/create-unit-address/.../{cusAccountId}/...` |

### 0.2 不包含的内容

- **登录态异常（`LOGIN_EXPIRED` / 403）已从三方链路移除**，不在本清单内。
- 数据库、Redis、Kafka、HTTP 超时等基础设施异常，除被业务代码显式包装成固定码以外，不逐一列举。

---

## 1. 错误码总表

| code | 常量 | 含义 / 触发条件 |
|---|---|---|
| 300004 | `ACCOUNT_BALANCE_NOT_ENOUGH` | 出金账户余额不足；账户冻结行更新影响行数为 0；归集时无可用地址或预估金额不足 |
| 400001 | `TASK_NOT_FOUND` | `taskId` 为空、按 taskId / 主键都查不到、或任务 ecode 与当前 key 不一致 |
| 400005 | `INIT_BOARD_FAILED` | 初始化 Board 时门限非法（≤0 或 > 守护人数），或 TrustVault `initBoard` 非 200 |
| 400006 | `ACCOUNT_NOT_EXIST` | 账户不存在或不属于当前企业：加币种引用外部账户、创建地址、出金、归集、修改资金流、修改白名单 |
| 400008 | `BOARD_EXIST` | 企业已有 `AVAILABLE` 或 `PENDING` 的 Board，不允许重复初始化 |
| 400011 | `OPERATION_NOT_SUPPORT` | 添加用户时 ecode 与 key 所属企业不一致；地址查询的 accountType 非 PAYIN/PAYOUT/PRIMARY；出金 operation 非 payout/withdraw/allocate |
| 400012 | `CREATE_ADDRESS_FAILED` | 加币种新增网络、或按账户创建地址时，TrustVault `getAddress` 非 200 |
| 400013 | `UPDATE_ACCOUNT_FAILED` | 出金、提交任务的兜底 catch：任何非 `SparkException` 的异常 |
| 400026 | `MERCHANT_ACCOUNT_NOT_EXIST`（CRM 错误码） | 白名单变更时账户不属于当前 ecode / unit |
| 400027 | `WHITELIST_UPDATE_IN_PROGRESS` | 同账户已有 `PENDING` 的白名单变更 |
| 400030 | `BOARD_NOT_EXIST` | 修改 Board、资金流、白名单时企业没有 `AVAILABLE` 的 Board |
| 400036 | `CREATE_VAULT_FAILED` | 三方注册企业时建项目返回 null，或 `ProjectInitHandler` 创建金库失败 |
| 400042 | `ACCOUNT_UNIT_NOT_EXIST` | unit 不存在、不属于当前企业，或不是当前开发者创建的 |
| 400048 | `ACCOUNT_GROUP_NOT_ACTIVATED` | 出金账户 `status = 0`（未激活） |
| 400056 | `CONTRACT_FACTORY_DEPLOY_FAILED` | 创建 unit、加币种时新网络的合约工厂部署失败 |
| 400062 | `ACCOUNT_UNIT_NAME_EXIST` | 自定义 unit 名称在企业内已存在 |
| 400067 | `PUBLIC_KEY_EXIST` | 公钥已被其他用户占用；或同一邮箱试图更换公钥 |
| 400070 | `SIGNER_NOT_EXIST_OR_NOT_ENOUGH` | 初始化 Board 时 guardians 为空；加币种下发资金流任务时 TrustVault 未返回签名人 |
| 400083 | `ACCOUNT_POOLING` | 该账户正在归集中（Redis 归集锁被占用） |
| 400099 | `PASSWORD_FORMAT_ERROR` | 密码为空、长度不足 8 位，或大小写/数字/特殊字符不足 3 类 |
| 400101 | `INVALID_PAYOUT_AMOUNT` | 出金 payTo 按地址聚合后总金额 ≤ 0 |
| 400102 | `ENERGY_PERIOD_NOT_START` | 归集时 TRON 能量租赁失败 |
| 400103 | `THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS` | `resourceAccessKey` 为空、不存在或状态非 `ACTIVE`（除注册企业外所有接口） |
| 400109 | `MERCHANT_NOT_EXIST` | 企业 ecode 为空或企业不存在（注册企业的入驻编排链路） |
| 400112 | `INIT_TREASURY_UNIT_FAILED` | TrustVault 初始化 unit 非 200，或返回账户数与请求不一致 |
| 400119 | `BOARD_UPDATE_IN_PROGRESS` | 已有 `PENDING` 的 Board 变更 |
| 400120 | `FUNDFLOW_UPDATE_IN_PROGRESS` | 同金库账户已有 `PENDING` 的资金流变更 |
| 400127 | `MERCHANT_PROJECT_NOT_EXIST` | 按 key 的企业找不到项目；出金时按 unit 找不到项目 |
| 400214 | `PAY_TO_ADDRESS_EXCEED_LIMIT` | 出金付款地址数超过网络上限（默认 150）；Travel Rule 开启时一对多付款 |
| 400215 | `COIN_ACCOUNT_ALREADY_EXISTS` | 加币种时该币种 + 网络已存在 |
| 400216 | `NETWORK_NOT_SUPPORT` | 加币种的新网络不在项目支持网络内 |
| 400438 | `CREATE_MERCHANT_FAILED` | 三方注册企业时企业落库返回 null |
| 400440 | `ADDRESS_BALANCE_NOT_ENOUGH` | 出金来源地址为空；或地址可用额（扣除隔离资金与其他在途出金）不足以覆盖本单 |
| 400441 | `ADDRESS_BALANCE_CHECK_FAILED` | 出金地址锁获取失败、被其他请求持有，或 Redis 不可用（fail-closed） |
| 500 | `MessageResult.error(message)` | 提交系统命令时框架内部失败，返回 500 + 异常 message |

> 错误码定义位置：`custody-common/src/main/java/com/cregis/custody/common/errCodes/CustodyErrorCodes.java`、`CRMErrorCodes.java`。

---

## 2. 按接口归属

### 2.0 接口索引

| # | 方法 | 路径 | 说明 |
|---|---|---|---|
| 1 | POST | `/create/{key}` | 创建通用 unit |
| 2 | POST | `/create-custom/{key}` | 创建自定义结构 unit |
| 3 | POST | `/merchant/register` | 注册企业（不鉴权） |
| 4 | POST | `/user/add/{key}` | 添加用户 |
| 5 | POST | `/board/init/{key}` | 初始化 Board |
| 6 | POST | `/resetBoard/{key}` | 修改 Board |
| 7 | POST | `/add-coins/{key}` | 加币种 / 网络 |
| 8 | POST | `/payout/{key}` | 付款 / 提现 / 拨款 |
| 9 | POST | `/pooling/{key}` | 归集 |
| 10 | POST | `/submit/task/{key}/{taskId}` | 提交签名任务 |
| 11 | POST | `/fundControl/update/{key}` | 修改资金流规则 |
| 12 | POST | `/whiltlist/update/{key}` | 白名单设置 |
| 13 | POST | `/list/{key}` 等查询类 | unit / 账户 / 地址 / 活动 / 订单 / 流水查询 |

### 2.1 创建通用 unit `POST /create/{key}`

| code | 触发点 |
|---|---|
| 400103 | key 无效（`checkProject`） |
| 400127 | 企业没有项目 |
| 400056 | 合约工厂部署失败 |
| 400112 | TrustVault 初始化 unit 失败或账户数不一致 |

> ⚠️ 请求拓扑不是 `QUAD_SMART_ISOLATION` 时，`TreasureUnitHandler.createSingleTreasureUnitForThird` 返回 `null`，控制器随后 `unit.getId()` 触发 NPE，最终表现为**裸 500**，不是业务码。

### 2.2 创建自定义 unit `POST /create-custom/{key}`

| code | 触发点 |
|---|---|
| 400103 | key 无效 |
| 400127 | 企业没有项目 |
| 400062 | unit 名称重复 |
| 400056 | 非智能 unit 的合约工厂部署失败 |
| 400112 | TrustVault 初始化 unit 失败或账户数不一致 |

> ⚠️ `isSmart` 为 null 会拆箱 NPE；`accountType` 非法会抛 `IllegalArgumentException`，均为裸 500。

### 2.3 注册企业 `POST /merchant/register`

| code | 触发点 |
|---|---|
| 400099 | owner 密码不符合规则 |
| 400067 | owner 公钥已被占用 |
| 400438 | 企业落库返回 null |
| 400109 | 企业 ecode 为空 / 企业不存在 |
| 400036 | 建项目返回 null 或创建金库失败 |

> 本接口不鉴权，因此没有 400103。

### 2.4 添加用户 `POST /user/add/{key}`

| code | 触发点 |
|---|---|
| 400103 | key 无效 |
| 400011 | 请求 ecode 与 key 所属企业不一致（不允许跨企业加人） |
| 400099 | 密码不符合规则 |
| 400067 | 公钥重复，或同邮箱更换公钥 |

### 2.5 初始化 Board `POST /board/init/{key}`

| code | 触发点 |
|---|---|
| 400103 | key 无效 |
| 400127 | 企业没有项目 |
| 400070 | guardians 为空 |
| 400005 | threshold 非法，或 TrustVault `initBoard` 非 200 |
| 400008 | 已有 `AVAILABLE` / `PENDING` 的 Board |

### 2.6 修改 Board `POST /resetBoard/{key}`

| code | 触发点 |
|---|---|
| 400103 | key 无效 |
| 400127 | 企业没有项目 |
| 400119 | 已有 `PENDING` 的 Board 变更 |
| 400030 | 没有 `AVAILABLE` 的 Board |
| 上游透传 | TrustVault `prepareResetBoard` 非 200 时 `throw new SparkException(result)`，原样透传上游 code |

### 2.7 加币种 / 网络 `POST /add-coins/{key}`

| code | 触发点 |
|---|---|
| 400103 | key 无效 |
| 400127 | 企业没有项目 |
| 400042 | unit 不存在、不属于当前企业，或 developerId 不匹配 |
| 400215 | 币种 + 网络已存在 |
| 400216 | 新网络不在项目支持网络内 |
| 400056 | 新网络合约工厂部署失败 |
| 400006 | `accountFundControls` 引用了不属于该 unit 的账户 |
| 400012 | 新增网络创建地址失败 |
| 400070 | 资金流任务没有签名人（企业用户未在建金库前绑定公钥） |
| 无码透传 | TrustVault `edit` / `prepareModifyFundFlow` 失败时 `throw new SparkException(message)`，`code` 为空 |

### 2.8 付款 / 提现 / 拨款 `POST /payout/{key}`

| code | 触发点 |
|---|---|
| 400103 | key 无效 |
| 400042 | unit 不存在或不属于当前企业 |
| 400006 | 出金账户不存在 |
| 400011 | operation 不是 payout / withdraw / allocate |
| 400214 | 付款地址数超上限；Travel Rule 开启时一对多 |
| 400101 | 聚合后总金额 ≤ 0 |
| 400048 | 账户未激活 |
| 300004 | 账户余额不足；冻结行更新失败 |
| 400127 | 项目不存在 |
| 400441 | 地址锁获取失败 / 被占用 / Redis 不可用 |
| 400440 | 来源地址为空；地址可用额不足 |
| 400013 | `applyTransfer` 或控制器兜底 catch |
| 上游透传 | `preparePayment` 非 200；自动签名失败 |

> ⚠️ `payTo` 为空时，`PayToUtil.sumAmount` 在进入 handler 之前就 NPE，表现为裸 500。`allocate` 还要求 `toCusAccountId` 等字段，缺失时同样可能在构建请求阶段 NPE。

### 2.9 归集 `POST /pooling/{key}`

| code | 触发点 |
|---|---|
| 400103 | key 无效 |
| 400042 | unit 不存在或不属于当前企业 |
| 400006 | 归集账户不存在 |
| 400083 | 该账户正在归集中（Redis 锁） |
| 300004 | 无可用地址，或预估金额低于请求金额 |
| 400102 | TRON 能量租赁失败 |
| 无码透传 | `estimatePooling` 非 200 时 `throw new SparkException(message)`，`code` 为空 |
| 上游透传 | TrustVault `pooling` 非 200 时 `throw new SparkException(result)` |

> ⚠️ 预估接口返回 `data=null` 时，控制器对 `estimate.getTotalAmount()` 取值会 NPE，表现为裸 500。

### 2.10 提交签名 `POST /submit/task/{key}/{taskId}`

| code | 触发点 |
|---|---|
| 400103 | key 无效 |
| 400001 | taskId 为空、任务查不到、任务 ecode 与 key 不一致 |
| 400013 | 提交过程中的意外异常（含 cmdType 为 null、confirmed 为 null 等） |
| 500 | 系统命令提交内部失败，`SystemCommandSubmitHandler` 返回 `MessageResult.error(e.getMessage())` |
| 200 + 上游 code | 链上命令提交结果（如 130017 gas 不足）以正常返回体透出，不抛异常 |

### 2.11 修改资金流规则 `POST /fundControl/update/{key}`

| code | 触发点 |
|---|---|
| 400103 | key 无效 |
| 400030 | 没有 `AVAILABLE` 的 Board |
| 400006 | 账户不存在或不属于当前企业 |
| 400120 | 同金库账户已有 `PENDING` 的资金流变更 |
| 200 + 上游 code | `prepareModifyFundFlow` 非 200 时**原样返回**上游结果 |

### 2.12 白名单设置 `POST /whiltlist/update/{key}`

| code | 触发点 |
|---|---|
| 400103 | key 无效 |
| 400030 | 没有 `AVAILABLE` 的 Board |
| 400026 | 账户不存在或不属于当前 ecode / unit |
| 400027 | 同账户已有 `PENDING` 的白名单变更 |
| 200 + 上游 code | `prepareEditAllowList` 非 200 时**原样返回**上游结果 |

### 2.13 查询类接口

| 接口 | 错误码 |
|---|---|
| `/list/{key}` | 400103 |
| `/list-unit-account/{key}/{unitId}` | 400103 |
| `/get-unit-address/{key}/{cusAccountId}` | 400103、400042 |
| `/get-unit-address/{key}` | 400103、400011（accountType 非 PAYIN/PAYOUT/PRIMARY） |
| `/activities/{key}` | 400103 |
| `/transfer-out-orders/{key}` | 400103 |
| `/transfer-in-orders/{key}` | 400103 |
| `/fund-records/{key}` | 400103 |
| `/unit-fund-records/{key}` | 400103 |

> ⚠️ `/get-unit-address/{key}` 的 `accountType` 为 null 时会在 `accountType.equals(...)` 处 NPE，表现为裸 500。

### 2.14 创建地址

| 接口 | 错误码 |
|---|---|
| `/create-unit-address/{key}/{cusAccountId}/{number}` | 400103、400012 |
| `/create-unit-address/{key}/{unitId}/{accountTypy}/{network}/{coinId}/{number}` | 400103、400006、400012 |

> 按 `cusAccountId` 创建时，账户不存在会返回 `200 + data:null`，不报错。

---

## 3. 上游透传码

以下失败**没有本地固定错误码**，调用方看到的是 TrustVault 返回的 code/message：

| 场景 | 形式 |
|---|---|
| `preparePayment` 非 200 | `SparkException(MessageResult)`，保留上游 code |
| 自动签名失败 | `SparkException(MessageResult)`，保留上游 code |
| `pooling` 非 200 | `SparkException(MessageResult)`，保留上游 code |
| `estimateEnergyPoolingTRON` 非 200 | `SparkException(MessageResult)`，保留上游 code |
| `prepareResetBoard` 非 200 | `SparkException(MessageResult)`，保留上游 code |
| `vault edit` 非 200 | `SparkException(message)`，**code 为空** |
| `prepareModifyFundFlow` 非 200 | `SparkException(message)`，**code 为空** |
| `estimatePooling` 非 200 | `SparkException(message)`，**code 为空** |
| `prepareEditAllowList` 非 200 | 直接返回上游 `MessageResult` |
| `prepareModifyFundFlow`（fundControl）非 200 | 直接返回上游 `MessageResult` |

对接方应将「code 非 200」统一按失败处理，不要只匹配本文档列出的常量。

---

## 4. 非业务码兜底

| 场景 | 表现 |
|---|---|
| 请求体 `@Valid` 校验失败 | 本仓没有全局参数异常处理器，实际响应以部署环境的全局处理为准（v1 对接文档记为 `PARAM_ERROR`） |
| 参数为 null 导致的 NPE（见各接口 ⚠️） | 裸 500 |
| 枚举 `valueOf` 非法值 | `IllegalArgumentException`，裸 500 |
| 数据库 / Redis / Kafka 异常 | 未被业务代码包装时，裸 500 |
| 系统命令提交内部异常 | 500 + 异常 message（唯一显式返回 500 的业务路径） |

---

## 5. 已定义但三方链路不可达的错误码

排查日志时如果看到下列码，说明调用来自**内部链路或旧代码**，不是三方接口产生：

| code | 常量 | 原因 |
|---|---|---|
| 320000 | `ROLE_PERMISSION_NOT_ENOUGH` | 仅 `resumePayout` / `terminatePayout` 使用，三方接口不调用 |
| 400128 | `TREASURY_UNIT_NOT_FOUND` | 仅 `applyPayout(ecode, ...)` 重载使用，控制器走的是 unit 重载 |
| 400051 | `GAS_ACCOUNT_BALANCE_NOT_ENOUGH` | 仅归集重提/广播重试路径使用 |
| 400058 | `PRIMARY_ADDRESS_NOT_EXIST` | 三方归集路径中已被注释 |
| 400029 | `ACCOUNT_CONFIG_STATUS_ERROR` | 仅 `checkAccount` 使用，三方出金未调用 |

---

## 6. 易混淆点

1. **`NETWORK_NOT_SUPPORT` vs `NETWORK_NOT_SUPPORTED`**
   - 三方链路实际使用 `400216 NETWORK_NOT_SUPPORT`；
   - `300001 NETWORK_NOT_SUPPORTED` 是另一个常量，三方链路**未使用**。

2. **数值撞号**
   - `CRMErrorCodes.CREATE_VAULT_FAILED = 400030` 与 `CustodyErrorCodes.BOARD_NOT_EXIST = 400030` 数值相同；
   - 三方注册链路使用的是 `CustodyErrorCodes.CREATE_VAULT_FAILED = 400036`，不受影响。

3. **同名不同码**
   - `MERCHANT_NOT_EXIST`：Custody 为 `400109`，CRM 为 `320006`；三方链路使用 Custody 版本。
   - `CREATE_ADDRESS_FAILED`：Custody 为 `400012`，CRM 为 `320009`；三方链路使用 Custody 版本。

4. **`300004` 不在 4xxxx 段**
   - 余额不足是唯一的 3xxxx 业务码，客户端不要用「code 以 4 开头」判断是否为业务错误。
