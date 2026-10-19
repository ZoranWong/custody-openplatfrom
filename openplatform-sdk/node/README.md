# Cregis OpenPlatform Node.js SDK

Cregis 托管开放平台官方 Node.js SDK（服务端），覆盖 **OAuth 授权、财务单元（Treasury Unit）、出金/归集、审批、商户与企业用户管理、交易记录查询、回调验签** 全部 24 个业务接口。

**当前版本：1.1.0**

> 1.1.0 变更摘要见文末 [版本与变更](#版本与变更)。

**技术特性**

- TypeScript 原生类型（请求/响应全量定义）
- 自动签名：Basic（OAuth）与 Resource（业务接口，含 `authorizationId`）
- 嵌套对象/数组内的 key 递归排序，与网关校验逻辑完全一致
- 统一错误模型 `SDKError`，保留网关业务码 `apiCode` 与 `traceId`
- 分页响应统一为 `PaginatedResponse<T>`
- Node.js >= 18

---

## 目录

- [安装](#安装)
- [快速开始](#快速开始)
- [认证与签名](#认证与签名)
- [API Reference](#api-reference)
  - [OAuth 授权](#oauth-授权)
  - [商户 / 用户 / Board](#商户--用户--board)
  - [财务单元 (Treasury Unit)](#财务单元-treasury-unit)
  - [地址管理](#地址管理)
  - [币种 / 资金控制 / 白名单](#币种--资金控制--白名单)
  - [出金与归集](#出金与归集)
  - [任务审批](#任务审批)
  - [交易记录](#交易记录)
  - [回调验签](#回调验签)
- [数据类型](#数据类型)
- [错误处理](#错误处理)
- [环境](#环境)
- [版本与变更](#版本与变更)

---

## 安装

```bash
npm install @cregis-kit/openplatform-node
```

要求 Node.js >= 18.0.0。

---

## 快速开始

```typescript
import { CregisSDK } from '@cregis-kit/openplatform-node';

const sdk = new CregisSDK({
  baseUrl: 'https://custody-sit.cregis.ae/openplatform', // SIT
  appId: 'your-app-id-uuid',
  appSecret: 'your-app-secret',
});

// 1. 获取授权地址，交给前端打开
const { authorizeUrl } = await sdk.getAuthorizationUrl({
  permissions: ['read', 'write'],
  state: 'random-state-string',
  callback: 'https://your-app.com/oauth/callback',
});

// 2. 用户授权后前端拿到 oauthToken，后端换取 authorizeId
const { authorizeId } = await sdk.verifyOAuthToken(oauthToken);

// 3. 后续所有业务接口都使用 authorizeId
const accounts = await sdk.listUnitAccount(authorizeId, 80);
const payin = accounts.find(a => a.type === 'PAYIN')!;

const addresses = await sdk.getUnitAddressByAccount(authorizeId, payin.id, {
  unitId: 80,
  coinId: payin.coinId,
  network: payin.network,
});

// 4. 发起出金（返回审批任务，需签名后提交）
const task = await sdk.createPayout(authorizeId, {
  unitId: 80,
  fromAccountId: payin.id,
  payTo: [{ to: '0x0000000000000000000000000000000000000000', amount: 100 }],
  coinId: payin.coinId,
  network: payin.network,
  merchantType: 'NON_FINANCIAL_CORPORATE',
});

await sdk.submitTask(authorizeId, task.taskId, { confirmed: true });
```

---

## 认证与签名

### 初始化配置

```typescript
new CregisSDK(config: SDKConfig)
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `baseUrl` | `string` | 是 | 网关地址，如 `https://custody-sit.cregis.ae/openplatform` |
| `appId` | `string` | 是 | 应用 ID（UUID） |
| `appSecret` | `string` | 是 | 应用密钥 |
| `timeout` | `number` | 否 | 请求超时（毫秒），默认 `30000` |
| `debug` | `boolean` | 否 | 打印调试信息 |

无效配置会在构造时抛出 `SDKError`（`CONFIG_*`）。

### 两类签名

SDK 自动计算，无需手动处理：

| 场景 | 签名串 | 使用接口 |
|------|--------|----------|
| Basic | `MD5(appSecret + appId + timestamp + nonce + MD5(business))` | OAuth、商户注册 |
| Resource | `MD5(appSecret + appId + authorizationId + timestamp + nonce + MD5(business))` | 所有业务接口 |

`business` 序列化前会**递归排序**（对象 key 排序；数组元素顺序保留，但数组内的对象同样排序），与网关校验规则一致。含对象数组的请求（`coinIds`、`primaryManager`、`payTo` 等）必须依赖这一行为才能通过验签。

`timestamp` 为 Unix **秒**，网关容差 ±5 分钟；`nonce` 每次请求随机生成。

---

## API Reference

### OAuth 授权

#### `getAuthorizationUrl(params)`

```typescript
sdk.getAuthorizationUrl(params: {
  permissions: string[];
  state: string;
  callback?: string;   // 授权完成后的回调通知地址
  token?: string;      // 开发者自定义 token，回调时原样带回
}): Promise<{ authorizeUrl: string; expiresIn: number }>
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `permissions` | `string[]` | 是 | 申请的权限列表 |
| `state` | `string` | 是 | 防 CSRF 状态值，回调时带回 |
| `callback` | `string` | 否 | 授权成功后的回调通知地址 |
| `token` | `string` | 否 | 业务侧身份映射 token |
| `redirectUri` | `string` | 否 | **已废弃（1.1.0）**，不会发送；请改用 `callback` |

返回的 `authorizeUrl` 交给前端打开；`expiresIn` 单位秒（默认 7200）。

#### `verifyOAuthToken(oauthToken, resourceKey?)`

```typescript
sdk.verifyOAuthToken(oauthToken: string, resourceKey?: string): Promise<{ authorizeId: string }>
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `oauthToken` | `string` | 是 | 授权页签发的 token（即授权 URL 中的 `appToken`） |
| `resourceKey` | `string` | 否 | 需要把授权绑定到某个资源键时传入（如 `registerMerchant` 返回的 `resourceAccessKey`）。不传则不绑定资源键 |

`authorizeId` 即后续所有业务接口的 `authorizationId`。同一 `appId + resourceKey` 重复调用会返回同一条授权记录（upsert）。

---

### 商户 / 用户 / Board

#### `registerMerchant(request)`

无需 `authorizeId`，使用 Basic 签名。

```typescript
sdk.registerMerchant(request: MerchantRegisterRequest): Promise<MerchantRegisterResult>
```

```typescript
const result = await sdk.registerMerchant({
  legalName: 'Example Trading Co.',
  appId: 'your-app-id-uuid',
  alias: 'example-trading',
  email: 'ops@example.com',
  jurisdiction: 'AE',
  entityType: 'NON_FINANCIAL_CORPORATE',
  networks: ['ethereum', 'tron'],
  owner: { email: 'owner@example.com', password: 'Str0ng!Passw0rd' },
});
// result.ecode / result.resourceAccessKey / result.vaultCode / result.alreadyExists
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `legalName` | `string` | 是 | 企业法定名称（与来源共同唯一，幂等） |
| `appId` | `string` | 是 | 开发者应用 ID |
| `alias` | `string` | 否 | 三方侧企业标识 |
| `email` | `string` | 否 | 企业联系邮箱 |
| `dbaName` | `string` | 否 | 商号 |
| `jurisdiction` | `string` | 否 | ISO3166-1 司法辖区 |
| `registrationNumber` | `string` | 否 | 注册号 |
| `dateOfIncorporation` | `string` | 否 | 注册日期 |
| `taxId` | `string` | 否 | 税号 |
| `entityType` | `string` | 否 | 实体类型 |
| `networks` | `string[]` | 否 | 初始化金库的网络；不传使用平台支持的全部网络 |
| `owner` | `OwnerUser` | 否 | 内联创建企业负责人（`email` + `password` 必填） |

返回 `MerchantRegisterResult`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `ecode` | `string` | 企业 code |
| `vaultCode` | `string` | 金库 code |
| `resourceAccessKey` | `string \| null` | 企业级访问 key，用于 `verifyOAuthToken` / `custody/callback` |
| `alreadyExists` | `boolean` | 是否命中幂等（已存在） |
| `merchant` | `Merchant` | 企业详情 |

#### `addUser(authorizationId, request)`

```typescript
sdk.addUser(authorizationId: string, request: {
  email: string;
  password: string;
  publicKey?: string;   // 绑定后可作为金库签名人
  ecode?: string;       // 不传仅建用户；传则须与当前 key 所属企业一致
  role?: UserRole;
}): Promise<Record<string, unknown>>   // 例如 { userId: 99 }
```

同邮箱重复调用幂等。

#### `initBoard(authorizationId, request)`

```typescript
sdk.initBoard(authorizationId: string, request: {
  guardians: string[];   // 护卫队成员（邮箱或公钥）
  threshold: number;     // 操作门限，0 < threshold <= guardians.length
  lang?: LangCode;
  note?: string;
}): Promise<MerchantBoard>
```

`MerchantBoard` 包含 `id`、`ecode`、`projectId`、`userInfos`（`StaffDTO[]`）、`threshold`、`status`、`creatorUserId`、`createTime`。

---

### 财务单元 (Treasury Unit)

#### `createTreasuryUnit(authorizationId, request)`

```typescript
sdk.createTreasuryUnit(authorizationId, request: CreateTreasuryUnitRequest): Promise<CreateTreasuryUnitResponse>
```

```typescript
const unit = await sdk.createTreasuryUnit(authorizeId, {
  unitName: 'Payment Unit',
  businessScope: 'DEDICATED_ACCOUNT',   // DEDICATED_ACCOUNT | OMNIBUS_ACCOUNT | OPEN_API_PROXY
  topology: 'SINGLE_GENERAL',           // ORBIT | SINGLE_GENERAL | QUAD_SMART_ISOLATION
  businessPurpose: 'payment processing',
  coinIds: [{ coinId: 'CLCC', network: 'ethereum-sepolia' }],
  primaryManager: [{ coinId: 'CLCC', fundControlRules: [rule] }],
  payoutManager:  [{ coinId: 'CLCC', fundControlRules: [rule] }],
  thirdPartyEcode: '1542',
});
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `unitName` | `string` | 是 | 单元名称 |
| `businessScope` | `BusinessScope` | 是 | 业务类型 |
| `topology` | `Topology` | 是 | 账本拓扑 |
| `coinIds` | `CoinInfo[]` | 是 | 币种与网络 |
| `primaryManager` | `FundControl[]` | 是 | 主账户资金管理员 |
| `payoutManager` | `FundControl[]` | 是 | 出金账户资金管理员 |
| `businessPurpose` | `string` | 否 | 业务用途 |
| `autoSignUrl` | `string` | 否 | 自动签入地址 |
| `primaryWhiteList` | `WhiteListCreateRequest[]` | 否 | 主账户出金白名单 |
| `primaryAnycallRules` / `payinAnycallRules` / `payoutAnycallRules` | `AnyCallRule[]` | 否 | 通用调用控制 |
| `thirdPartyEcode` | `string` | 否 | 三方平台 ecode |
| `remark` | `string` | 否 | 备注 |

返回 `CreateTreasuryUnitResponse`，其中 `id` 即后续接口的 `unitId`。

> 若该接口返回 `400 请求参数格式错误`，说明 custody 后端对 `coinIds` / manager 的校验未通过。该错误由 custody 服务产生，网关与 SDK 原样透传，请对照后端最新入参要求调整。

#### `createCustomUnit(authorizationId, request)`

```typescript
sdk.createCustomUnit(authorizationId, request: {
  unitName: string;
  coinIds: CoinInfo[];
  fundControls: FundControl[][];      // 每个账户一组资金控制
  topology?: Topology;
  businessScope?: BusinessScope;
  isSmart?: boolean;
  businessPurpose?: string;
  customUnitDTOs?: CustomUnitDTO[];   // { accountName, accountType }
  whitelistRules?: WhitelistRule[];
  thirdPartyEcode?: string;
  remark?: string;
}): Promise<TreasuryUnit>
```

#### `listTreasuryUnits(authorizationId, options?)`

```typescript
sdk.listTreasuryUnits(authorizationId, options?: {
  pageSize?: number;
  pageNum?: number;
  sortFields?: string;
}): Promise<TreasuryUnit[]>
```

返回数组（**不分页包装**），`TreasuryUnit` 含 `id`、`ecode`、`name`、`topology`、`coinIds`、`accounts`、`status`、`creationType` 等。

#### `listUnitAccount(authorizationId, unitId)`

```typescript
sdk.listUnitAccount(authorizationId, unitId: number): Promise<UnitAccount[]>
```

`UnitAccount` 关键字段：`id`（`cusAccountId`）、`type`（`PRIMARY` / `PAYIN` / `PAYOUT` / `QUARANTINE` …）、`coinId`、`network`、`balance`、`freezeBalance`、`holdBalance`、`income`、`outcome`、`accountType`（金库账户类型）、`vaultAccountId`。

> 后续调用地址、出金等接口时，`coinId` / `network` 应取自这里的账户列表。

---

### 地址管理

#### `getTreasuryUnitAddress(authorizationId, request)`

```typescript
sdk.getTreasuryUnitAddress(authorizationId, request: GetUnitAddressRequest)
  : Promise<PaginatedResponse<UnitAddress>>
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `unitId` | `number` | 是 | 财务单元 ID |
| `accountType` | `AccountType` | 见注 | 账户类型；不传后端返回 500 |
| `coinId` | `string` | 见注 | 币种；不传返回空分页 |
| `network` | `string` | 见注 | 网络；不传返回空分页 |
| `pageNum` / `pageSize` | `number` | 否 | 分页 |

> 实际使用中 `accountType + coinId + network` 务必一起传入，值取自 `listUnitAccount`。

#### `getUnitAddressByAccount(authorizationId, cusAccountId, request?)`

```typescript
sdk.getUnitAddressByAccount(authorizationId, cusAccountId: number, request?: GetUnitAddressRequest)
  : Promise<PaginatedResponse<UnitAddress>>
```

按账户 ID 查询地址。同样需要 `unitId + coinId + network`。

#### `createUnitAddress(authorizationId, request)`

```typescript
sdk.createUnitAddress(authorizationId, request: {
  unitId: number;
  accountType: AccountType;
  network: string;
  coinId: string;
  number: number;      // 生成数量
}): Promise<void>
```

#### `createUnitAddressByAccount(authorizationId, cusAccountId, number)`

```typescript
sdk.createUnitAddressByAccount(authorizationId, cusAccountId: number, number: number)
  : Promise<UnitAddress[]>
```

返回本次新建的地址列表（1.1.0 起类型由 `void` 修正为 `UnitAddress[]`）。

---

### 币种 / 资金控制 / 白名单

#### `addCoins(authorizationId, request)`

```typescript
sdk.addCoins(authorizationId, request: {
  treasuryUnitId: number;
  coinIds: CoinInfo[];
  accountFundControls?: AccountFundControl[];
  note?: string;
}): Promise<WCCIPCmdAuditTask[]>
```

#### `updateFundControl(authorizationId, request)`

```typescript
sdk.updateFundControl(authorizationId, request: {
  treasuryUnitId: number;
  fundControls: FundControl[];
  cusAccountId?: number;   // 指定账户时优先
  note?: string;
}): Promise<void>
```

#### `updateWhitelist(authorizationId, request)`

```typescript
sdk.updateWhitelist(authorizationId, request: {
  treasuryUnitId: number;
  addItems?: WhiteListCreateRequest[];
  removeItems?: WhiteListCreateRequest[];
  cusAccountId?: number;
  allowListEnabled?: string;
  lang?: LangCode;
  note?: string;
}): Promise<WCCIPCmdAuditTask>
```

---

### 出金与归集

#### `createPayout(authorizationId, request)`

```typescript
sdk.createPayout(authorizationId, request: CreatePayoutRequest): Promise<WCCIPCmdAuditTask>
```

```typescript
const task = await sdk.createPayout(authorizeId, {
  unitId: 80,
  fromAccountId: payin.id,
  payTo: [{ to: '0x...', amount: 100 }],
  coinId: 'CLCC',
  network: 'ethereum-sepolia',
  merchantType: 'NON_FINANCIAL_CORPORATE',
  operation: 'payout',           // withdraw | allocate | payout
  orderId: 'ORDER-20261019-001',
  note: 'supplier payment',
  travelRule: { referenceId: 'TR-1', payload: { beneficiaryType: 'LEGAL', beneficiaryLegalName: 'Example Ltd' } },
});
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `payTo` | `PayTo[]` | 是 | 收款列表：`{ to, amount, kyaRiskScore?, ruleNames? }` |
| `unitId` | `number` | 是 | 财务单元 ID |
| `coinId` | `string` | 是 | 币种 |
| `network` | `string` | 是 | 网络 |
| `merchantType` | `MerchantType` | 是 | `NON_FINANCIAL_CORPORATE` / `REGULATED_VASP` / `INTERNAL_SYSTEM` |
| `fromAccountId` | `number` | 否 | 出金账户 ID |
| `fromAddress` | `string` | 否 | 出金地址 |
| `operation` | `PayoutOperation` | 否 | 出金类型 |
| `toCusAccountId` | `number` | 否 | 内部转账目标账户 |
| `orderId` | `string` | 否 | 业务订单号（幂等 & 对账） |
| `username` / `userId` | `string` | 否 | 三方用户标识 |
| `note` / `lang` / `initiator` | `string` | 否 | 备注 / 语言 / 发起人 |
| `travelRule` | `TravelRuleRequest` | 否 | 旅行规则信息 |

返回的 `WCCIPCmdAuditTask.taskId` 用于 `submitTask`。

#### `pooling(authorizationId, request)`

```typescript
sdk.pooling(authorizationId, request: {
  unitId: number;
  fromAccountId: number;   // 归集来源账户
  address: string;         // 归集目标地址
  amount: number;          // 归集门限金额
  coinId: string;
  network: string;
  lang?: LangCode;
  note?: string;
  includes?: string[];
  excludes?: string[];
}): Promise<ProjectUnitTransferOutOrder>
```

> custody 后端对来源账户有限制（仅允许 platform 创建的 acquiring 账户），否则返回 `120042 ONLY_ACQUIRING_ACCOUNT_ALLOWED`。

---

### 任务审批

#### `submitTask(authorizationId, taskId, request)`

```typescript
sdk.submitTask(authorizationId, taskId: string, request: {
  confirmed: boolean;
  signatures?: Record<string, string[]>;   // 签名人 -> 签名列表
}): Promise<void>
```

`taskId` 来自 `createPayout` / `pooling` / `addCoins` / `updateWhitelist` 的返回值。

---

### 交易记录

#### `listTransferOutOrders(authorizationId, options?)`

```typescript
sdk.listTransferOutOrders(authorizationId, options?: PaginationQuery)
  : Promise<PaginatedResponse<ProjectUnitTransferOutOrder>>
```

#### `listTransferInOrders(authorizationId, options?)`

```typescript
sdk.listTransferInOrders(authorizationId, options?: PaginationQuery)
  : Promise<PaginatedResponse<ProjectUnitTransferInOrder>>
```

#### `listActivities(authorizationId, options?)`

```typescript
sdk.listActivities(authorizationId, options?: PaginationQuery)
  : Promise<PaginatedResponse<ProjectUnitActivity>>
```

#### `listFundRecords(authorizationId, options?)`

```typescript
sdk.listFundRecords(authorizationId, options?: PaginationQuery)
  : Promise<PaginatedResponse<ProjectUnitFundRecord>>
```

#### `listUnitFundRecords(authorizationId, options?)`

```typescript
sdk.listUnitFundRecords(authorizationId, options?: PaginationQuery)
  : Promise<PaginatedResponse<ProjectUnitLedgerFundRecord>>
```

**PaginationQuery**

```typescript
interface PaginationQuery {
  pageIndex?: number;
  pageSize?: number;
  sortFields?: string;
  queryList?: QueryCondition[];
}

interface QueryCondition {
  key: string;
  value: string | number | object;
  oper?: '=' | '!=' | '>' | '<' | 'like';
  join?: 'and' | 'or';
}
```

---

### 回调验签

#### `onCallback(req, handler)`

```typescript
await sdk.onCallback(req, async (payload) => {
  // 业务处理
});
```

`req` 需包含：

```typescript
{
  headers: {
    'x-app-id': string;
    'x-timestamp': string;      // 毫秒时间戳
    'x-signature': string;      // "sha256=<hex>"
    'x-event'?: string;         // 全局事件回调时存在
  },
  body: Record<string, unknown>;
}
```

签名算法：

```
无 event：HMAC-SHA256(appSecret, appId + "." + timestamp + "." + md5(sortedJSON(data)))
有 event：HMAC-SHA256(appSecret, appId + "." + event + "." + timestamp + "." + md5(sortedJSON(data)))
```

校验失败抛 `SDKError(SIGNATURE_INVALID)`；校验通过才调用 `handler(payload)`，支持异步处理器。

---

## 数据类型

### 通用

```typescript
interface PaginatedResponse<T> {
  records: T[];
  total: number;
  current: number;
  size: number;
  pages?: number;
  orders?: OrderItem[];
}
```

### 枚举

```typescript
type BusinessScope = 'DEDICATED_ACCOUNT' | 'OMNIBUS_ACCOUNT' | 'OPEN_API_PROXY';
type Topology      = 'ORBIT' | 'SINGLE_GENERAL' | 'QUAD_SMART_ISOLATION';
type AccountType   = 'FREEZE' | 'DEPOSIT' | 'PRIMARY' | 'RECEIVABLE' | 'PAYOUT'
                   | 'PAYIN' | 'GENERAL_GAS' | 'QUARANTINE' | 'DIRTY';
type VaultAccountType = 'GENERAL_ACQUIRING' | 'SMART_ACQUIRING' | 'SMART'
                      | 'GENERAL' | 'GMA' | 'TMA';
type MerchantType  = 'NON_FINANCIAL_CORPORATE' | 'REGULATED_VASP' | 'INTERNAL_SYSTEM';
type PayoutOperation = 'withdraw' | 'allocate' | 'payout';
type CreationType  = 'PLATFORM' | 'THIRD_PARTY';
type TreasuryUnitStatus = 'ACTIVATED' | 'FROZEN' | 'CLOSED' | 'PENDING';
```

### 财务单元

```typescript
interface CoinInfo { coinId: string; network: string; }

interface FundControlRule {
  guardians: string[];
  threshold: string;
  perTransferLimit: string;
  dailyTransferLimit: string;
}

interface FundControl { coinId: string; fundControlRules: FundControlRule[]; }

interface AnyCallRule {
  guardians: string[];
  threshold: string;
  allowedCommands: string[];
}

interface WhiteListCreateRequest { network: string; address: string; alias?: string; }

interface AccountFundControl { accountId: number; fundControls: FundControl[]; }
```

### 地址与账户

```typescript
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

interface UnitAccount {
  id: number;                // cusAccountId
  ecode: string;
  vaultCode: string;
  vaultAccountId: string;
  projectId: number;
  treasuryUnitId: number;
  accountName: string;
  type: AccountType;
  accountType?: VaultAccountType;
  coinId: string;
  network: string;
  balance: number;
  freezeBalance: number;
  holdBalance: number;
  income: number;
  outcome: number;
  isSmart: boolean;
  status: number;
  createTime: string;
  updateTime: string;
}
```

### 审批任务

```typescript
interface WCCIPCmdAuditTask {
  id: number;
  taskId: string;
  state: AuditTaskStatus | string;
  taskOperation: TaskOperation | string;
  signContent: string;
  total: number;
  threshold: number;
  signers: string[];
  algoType: AlgoType;
  coinId: string;
  unitName: string;
  accountName: string;
  createTime: string;
  updateTime: string;
  // ...
}

type AuditTaskStatus =
  | 'AUDITING' | 'REJECTED' | 'AUDIT_REJECTED' | 'AUDIT_PASSED'
  | 'SIGNING' | 'SIGN_FAILED' | 'SIGN_SUCCEED' | 'FAILED' | 'WAITING'
  | 'SIGN_REJECTED' | 'ALL_BROADCAST_SUCCEED' | 'PARTIALLY_BROADCAST_SUCCEED'
  | 'ALL_BROADCAST_FAILED' | 'BROADCAST_FAILED' | 'BROADCAST_EXCEPTION' | 'EXPIRED';

type AlgoType = 'ECDSA' | 'EC_SCHNORR' | 'ED_DSA' | 'UNASSIGNED' | 'ED25519';
```

---

## 错误处理

```typescript
import { CregisSDK, SDKError, SDKErrorCode } from '@cregis-kit/openplatform-node';

try {
  await sdk.listUnitAccount(authorizeId, unitId);
} catch (error) {
  if (error instanceof SDKError) {
    console.error(error.code);          // SDK 错误码或 HTTP 状态
    console.error(error.details);       // { apiCode, traceId } —— 网关返回的业务码
    console.error(error.isRetryable);   // 5xx / 网络错误为 true
  }
}
```

### SDK 错误码

| `SDKErrorCode` | 触发场景 |
|----------------|----------|
| `CONFIG_MISSING_BASE_URL` / `CONFIG_MISSING_APP_ID` / `CONFIG_MISSING_APP_SECRET` | 初始化缺少必填项 |
| `CONFIG_INVALID_APP_ID` | `appId` 非 UUID |
| `SIGNATURE_INVALID` | 回调验签失败 |
| `HTTP_REQUEST_FAILED` / `HTTP_NETWORK_ERROR` / `HTTP_TIMEOUT` | 传输层错误 |
| `API_ERROR` | 未归类的业务错误 |
| `API_UNAUTHORIZED` | 认证失败（401xx） |
| `API_FORBIDDEN` | 无权限（403xx） |
| `API_NOT_FOUND` | 资源不存在（404xx） |
| `API_CONFLICT` | 冲突（409xx） |
| `API_RATE_LIMITED` | 限流（429xx） |
| `API_SERVER_ERROR` | 服务端错误（5xx） |
| `VALIDATION_MISSING_REQUIRED` / `VALIDATION_INVALID_FORMAT` | 参数校验失败 |

### 常见网关业务码

| `apiCode` | 含义 |
|-----------|------|
| `400` / `400001` / `400006` / `400042` / `400070` | 参数或业务校验失败 |
| `400103` | `THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS`：资源键在 custody 侧不存在 |
| `120042` | `ONLY_ACQUIRING_ACCOUNT_ALLOWED`：归集来源账户类型不允许 |
| `40102` / `40110` | 签名失败 / 凭证无效 |
| `40301` | 资源未授权 |
| `42901` | 超出配额或限流 |
| `500` / `50001` | 服务端内部错误 |

---

## 环境

| 环境 | baseUrl |
|------|---------|
| 本地 | `http://127.0.0.1:1000` |
| SIT | `https://custody-sit.cregis.ae/openplatform` |
| 生产 | `https://custody.cregis.ae/openplatform` |

SDK 会自行拼接 `/api/thirdparty/...` 路径，`baseUrl` 不要带尾斜杠。

---

## 版本与变更

### 1.1.0

**新增接口**

- `createCustomUnit` — 创建自定义结构财务单元
- `getUnitAddressByAccount` — 按账户查询地址
- `createUnitAddressByAccount` — 按账户创建地址
- `registerMerchant` — 三方平台注册企业（幂等）
- `addUser` — 添加企业用户
- `initBoard` — 初始化 Board（护卫队）
- `addCoins` — 为财务单元添加币种
- `updateFundControl` — 更新资金控制规则
- `updateWhitelist` — 更新白名单

**修复**

- **签名**：`sortKeys` 现在递归排序数组内对象，与网关校验逻辑一致。旧版本在所有含对象数组的请求（如 `primaryManager`、`payTo`）上会得到 `40102 Invalid signature`。
- `getTreasuryUnitAddress` / `getUnitAddressByAccount` 返回类型由 `UnitAddress[]` 修正为 `PaginatedResponse<UnitAddress>`。
- `createUnitAddressByAccount` 返回类型由 `void` 修正为 `UnitAddress[]`。
- `getAuthorizationUrl`：新增官方 `callback` 参数；`redirectUri` 标记废弃（1.0.x 传入的 `redirectUri` 从未被网关使用）。
- `verifyOAuthToken` 支持可选 `resourceKey` 参数。

**测试**

- 单元测试 102 项；集成测试覆盖全部 24 个接口（本地与 SIT 双环境）。

### 1.0.1

首个发布版本（OAuth + Treasury + Payout + Transaction 基础能力）。

---

## 许可证

MIT License
