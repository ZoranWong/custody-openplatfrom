# Cregis OpenPlatform Node.js SDK

Cregis 托管开放平台官方 Node.js SDK（服务端），覆盖 **OAuth 授权、财务单元（Treasury Unit）、出金/归集、审批、商户与企业用户管理、交易记录查询、回调验签** 全部 25 个业务接口。

**当前版本：1.4.0**

> 1.4.0 变更摘要见文末 [版本与变更](#版本与变更)。

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
//    注意：当前网关把 permissions 序列化为 JSON，授权页却按逗号拆分，
//    传入非空数组会导致授权页初始化失败，因此这里省略 permissions（默认 ['read']）。
const { authorizeUrl } = await sdk.getAuthorizationUrl({
  state: 'random-state-string',
  callback: 'https://your-app.com/oauth/callback',
});

// 2. 把 authorizeUrl 交给前端打开授权页
//    用户授权成功后，Custody 后台会回调网关并创建授权记录
//    授权页 / Web SDK 会把 authorizeId 返回给你的前端
const authorizeId = '<authorizeId 由授权页返回，请在你的后端保存>';

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
  permissions?: string[];
  state?: string;
  callback?: string;   // 授权完成后的回调通知地址
  token?: string;      // 开发者自定义 token，回调时原样带回
}): Promise<{ authorizeUrl: string; expiresIn: number }>
```

**返回**

| 项 | 类型 / 取值 | 说明 |
|----|------------|------|
| `data` | `GetAuthorizationUrlResult` | `authorizeUrl` / `expiresIn` |
| 可能业务码 | — | 业务码明细见 [错误处理](#错误处理) |



| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `permissions` | `string[]` | 否 | 申请的权限列表。**当前实现下请省略**：网关用 `JSON.stringify` 写入 URL，授权页却按逗号拆分，非空数组会导致授权页初始化失败 |
| `state` | `string` | 否 | 防 CSRF 状态值，写入授权 URL。**授权页不会回传 `state`** |
| `callback` | `string` | 否 | 授权成功后的回调通知地址 |
| `token` | `string` | 否 | 业务侧身份映射 token |
| `redirectUri` | `string` | 否 | **已废弃（1.1.0）**，不会发送；请改用 `callback` |

返回的 `authorizeUrl` 交给前端打开；`expiresIn` 单位秒（默认 7200）。

#### 关于 `oauth/verify`

`POST /api/thirdparty/oauth/verify` **不是开发者接口**，SDK 不提供对应方法。

调用链路是：授权页调用 Custody 内部接口完成授权 → **Custody 后台回调网关的 `/oauth/verify`** → 网关写入授权记录 → 授权页把 `authorizeId`（`authorization_succeed` 事件 / Web SDK 返回值）交给你的前端。

你的后端只需保存该 `authorizeId`，并在后续业务接口中作为 `authorizationId` 使用。

---

### 商户 / 用户 / Board

#### `registerMerchant(request)`

无需 `authorizeId`，使用 Basic 签名。

```typescript
sdk.registerMerchant(request: MerchantRegisterRequest): Promise<MerchantRegisterResult>
```

**返回**

| 项 | 类型 / 取值 | 说明 |
|----|------------|------|
| `data` | `MerchantRegisterResult` | `ecode` / `vaultCode` / `authorizedId`（首次）/ `alreadyExists` / `merchant` |
| 可能业务码 | `400036` CREATE_VAULT_FAILED、`400067` PUBLIC_KEY_EXIST、`400099` PASSWORD_FORMAT_ERROR、`400103` THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS、`400109` MERCHANT_NOT_EXIST、`400438` CREATE_MERCHANT_FAILED | 业务码明细见 [错误处理](#错误处理) |



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
// result.ecode / result.authorizedId / result.vaultCode / result.alreadyExists
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
| `authorizedId` | `string \| undefined` | 网关授权记录 ID，等同于 `authorizeId`，可直接作为后续请求的 `authorizationId`。仅首次注册（未命中幂等）时返回 |
| `resourceAccessKey` | `string \| null \| undefined` | 企业级访问 key（上游字段）；经网关调用时会被剥离，通常拿到的是 `authorizedId` |
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
}): Promise<ConsoleUser>   // 1.4.0 起：用户详情（id/email/pk/state/ecode…）
```

**返回**

| 项 | 类型 / 取值 | 说明 |
|----|------------|------|
| `data` | `ConsoleUser` | `id` / `email` / `pk` / `state` / `ecode` |
| 可能业务码 | `400011` OPERATION_NOT_SUPPORT、`400067` PUBLIC_KEY_EXIST、`400099` PASSWORD_FORMAT_ERROR、`400103` THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS | 业务码明细见 [错误处理](#错误处理) |



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

**返回**

| 项 | 类型 / 取值 | 说明 |
|----|------------|------|
| `data` | `MerchantBoard` | `id` / `userInfos` / `threshold` / `status` |
| 可能业务码 | `400005` INIT_BOARD_FAILED、`400008` BOARD_EXIST、`400070` SIGNER_NOT_EXIST_OR_NOT_ENOUGH、`400103` THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS、`400127` MERCHANT_PROJECT_NOT_EXIST | 业务码明细见 [错误处理](#错误处理) |



`MerchantBoard` 包含 `id`、`ecode`、`projectId`、`userInfos`（`StaffDTO[]`）、`threshold`、`status`、`creatorUserId`、`createTime`。

#### `updateBoard(authorizationId, request)`

```typescript
sdk.updateBoard(authorizationId: string, request: {
  guardians?: string[];      // 成员公钥；不传则保持原成员
  threshold?: number;        // 操作门限
  lang?: LangCode;
  note?: string;
  validUntilTime?: number;   // 签名有效期，单位分钟（custody 默认 1440）
}): Promise<WCCIPCmdAuditTask>
```

**返回**

| 项 | 类型 / 取值 | 说明 |
|----|------------|------|
| `data` | `WCCIPCmdAuditTask` | `taskId` / `state` / `signers` / `threshold` |
| 可能业务码 | `400030` BOARD_NOT_EXIST、`400103` THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS、`400119` BOARD_UPDATE_IN_PROGRESS、`400127` MERCHANT_PROJECT_NOT_EXIST | 业务码明细见 [错误处理](#错误处理) |



修改已初始化的 board。与 `initBoard` 不同，本接口返回**审批任务**而非 board：改动需按 board 门限收集签名后才生效。响应结构与 `createPayout` / `updateWhitelist` 相同。

---

### 财务单元 (Treasury Unit)

#### `createTreasuryUnit(authorizationId, request)`

```typescript
sdk.createTreasuryUnit(authorizationId, request: CreateTreasuryUnitRequest): Promise<CreateTreasuryUnitResponse>
```

**返回**

| 项 | 类型 / 取值 | 说明 |
|----|------------|------|
| `data` | `TreasuryUnit` | `id`（即 `unitId`）/ `ecode` / `status` |
| 可能业务码 | `400056` CONTRACT_FACTORY_DEPLOY_FAILED、`400103` THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS、`400112` INIT_TREASURY_UNIT_FAILED、`400127` MERCHANT_PROJECT_NOT_EXIST | 业务码明细见 [错误处理](#错误处理) |



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

**返回**

| 项 | 类型 / 取值 | 说明 |
|----|------------|------|
| `data` | `TreasuryUnit` | `id`（即 `unitId`）/ `accounts` / `status` |
| 可能业务码 | `400056` CONTRACT_FACTORY_DEPLOY_FAILED、`400062` ACCOUNT_UNIT_NAME_EXIST、`400103` THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS、`400112` INIT_TREASURY_UNIT_FAILED、`400127` MERCHANT_PROJECT_NOT_EXIST | 业务码明细见 [错误处理](#错误处理) |



#### `listTreasuryUnits(authorizationId, options?)`

```typescript
sdk.listTreasuryUnits(authorizationId, options?: {
  pageSize?: number;
  pageNum?: number;
  sortFields?: string;
}): Promise<TreasuryUnit[]>
```

**返回**

| 项 | 类型 / 取值 | 说明 |
|----|------------|------|
| `data` | `TreasuryUnit[]` | 数组，不分页包装 |
| 可能业务码 | `400103` THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS | 业务码明细见 [错误处理](#错误处理) |



返回数组（**不分页包装**），`TreasuryUnit` 含 `id`、`ecode`、`name`、`topology`、`coinIds`、`accounts`、`status`、`creationType` 等。

#### `listUnitAccount(authorizationId, unitId)`

```typescript
sdk.listUnitAccount(authorizationId, unitId: number): Promise<UnitAccount[]>
```

**返回**

| 项 | 类型 / 取值 | 说明 |
|----|------------|------|
| `data` | `UnitAccount[]` | `id`（= `cusAccountId`）/ `type` / `coinId` / `network` / 余额字段 |
| 可能业务码 | `400103` THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS | 业务码明细见 [错误处理](#错误处理) |



`UnitAccount` 关键字段：`id`（`cusAccountId`）、`type`（`PRIMARY` / `PAYIN` / `PAYOUT` / `QUARANTINE` …）、`coinId`、`network`、`balance`、`freezeBalance`、`holdBalance`、`income`、`outcome`、`accountType`（金库账户类型）、`vaultAccountId`。

> 后续调用地址、出金等接口时，`coinId` / `network` 应取自这里的账户列表。

---

### 地址管理

#### `getTreasuryUnitAddress(authorizationId, request)`

```typescript
sdk.getTreasuryUnitAddress(authorizationId, request: GetUnitAddressRequest)
  : Promise<PaginatedResponse<ProjectUnitAccountAddress>>
```

**返回**

| 项 | 类型 / 取值 | 说明 |
|----|------------|------|
| `data` | `PaginatedResponse<ProjectUnitAccountAddress>` | `records[]`：`status` / `available` / `holdFrozen` / `address` |
| 可能业务码 | `400011` OPERATION_NOT_SUPPORT、`400103` THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS | 业务码明细见 [错误处理](#错误处理) |



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
  : Promise<PaginatedResponse<ProjectUnitAccountAddress>>
```

**返回**

| 项 | 类型 / 取值 | 说明 |
|----|------------|------|
| `data` | `PaginatedResponse<ProjectUnitAccountAddress>` | 同上 |
| 可能业务码 | `400042` ACCOUNT_UNIT_NOT_EXIST、`400103` THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS | 业务码明细见 [错误处理](#错误处理) |



按账户 ID 查询地址。同样需要 `unitId + coinId + network`。

#### `createUnitAddress(authorizationId, request)`

```typescript
sdk.createUnitAddress(authorizationId, request: {
  unitId: number;
  accountType: AccountType;
  network: string;
  coinId: string;
  number: number;      // 生成数量
}): Promise<AccountAddressVO[]>   // 1.4.0 起：返回本次新建的地址
```

**返回**

| 项 | 类型 / 取值 | 说明 |
|----|------------|------|
| `data` | `AccountAddressVO[]` | 新建地址：`address` / `status` / `cusAccountId` / `balance` |
| 可能业务码 | `400006` ACCOUNT_NOT_EXIST、`400012` CREATE_ADDRESS_FAILED、`400103` THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS | 业务码明细见 [错误处理](#错误处理) |



#### `createUnitAddressByAccount(authorizationId, cusAccountId, number)`

```typescript
sdk.createUnitAddressByAccount(authorizationId, cusAccountId: number, number: number)
  : Promise<AccountAddressVO[]>
```

**返回**

| 项 | 类型 / 取值 | 说明 |
|----|------------|------|
| `data` | `AccountAddressVO[]` | 同上；账户不存在时返回空数组（上游 `data:null`） |
| 可能业务码 | `400012` CREATE_ADDRESS_FAILED、`400103` THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS | 业务码明细见 [错误处理](#错误处理) |



返回本次新建的地址列表（1.4.0 起元素类型由 `UnitAddress` 改为 `AccountAddressVO`，对应上游 `AccountAddressVO`）。

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

**返回**

| 项 | 类型 / 取值 | 说明 |
|----|------------|------|
| `data` | `WCCIPCmdAuditTask[]` | 审批任务数组，逐个 `taskId` 提交审批 |
| 可能业务码 | `400006` ACCOUNT_NOT_EXIST、`400012` CREATE_ADDRESS_FAILED、`400042` ACCOUNT_UNIT_NOT_EXIST、`400056` CONTRACT_FACTORY_DEPLOY_FAILED、`400070` SIGNER_NOT_EXIST_OR_NOT_ENOUGH、`400103` THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS、`400127` MERCHANT_PROJECT_NOT_EXIST、`400215` COIN_ACCOUNT_ALREADY_EXISTS、`400216` NETWORK_NOT_SUPPORT | 业务码明细见 [错误处理](#错误处理) |



#### `updateFundControl(authorizationId, request)`

```typescript
sdk.updateFundControl(authorizationId, request: {
  treasuryUnitId: number;
  cusAccountId: number;    // 必填（1.4.0 起）
  fundControls: FundControl[];
  note?: string;
}): Promise<WCCIPCmdAuditTask>   // 1.4.0 起：返回审批任务
```

**返回**

| 项 | 类型 / 取值 | 说明 |
|----|------------|------|
| `data` | `WCCIPCmdAuditTask` | `taskId` / `state` / `taskOperation: FUND_FLOW` |
| 可能业务码 | `400006` ACCOUNT_NOT_EXIST、`400030` BOARD_NOT_EXIST、`400103` THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS、`400120` FUNDFLOW_UPDATE_IN_PROGRESS | 业务码明细见 [错误处理](#错误处理) |



规则变更走审批流程，返回的 `taskId` 可交给 `submitTask` 完成签名。

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

**返回**

| 项 | 类型 / 取值 | 说明 |
|----|------------|------|
| `data` | `WCCIPCmdAuditTask` | `taskId` / `state` / `taskOperation: SET_WHITE_LIST` |
| 可能业务码 | `400026` MERCHANT_ACCOUNT_NOT_EXIST、`400027` WHITELIST_UPDATE_IN_PROGRESS、`400030` BOARD_NOT_EXIST、`400103` THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS | 业务码明细见 [错误处理](#错误处理) |



---

### 出金与归集

#### `createPayout(authorizationId, request)`

```typescript
sdk.createPayout(authorizationId, request: CreatePayoutRequest): Promise<WCCIPCmdAuditTask>
```

**返回**

| 项 | 类型 / 取值 | 说明 |
|----|------------|------|
| `data` | `WCCIPCmdAuditTask` | `taskId` / `state` / `signContent` / `signers` |
| 可能业务码 | `300004` ACCOUNT_BALANCE_NOT_ENOUGH、`400006` ACCOUNT_NOT_EXIST、`400011` OPERATION_NOT_SUPPORT、`400013` UPDATE_ACCOUNT_FAILED、`400042` ACCOUNT_UNIT_NOT_EXIST、`400048` ACCOUNT_GROUP_NOT_ACTIVATED、`400101` INVALID_PAYOUT_AMOUNT、`400103` THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS、`400127` MERCHANT_PROJECT_NOT_EXIST、`400214` PAY_TO_ADDRESS_EXCEED_LIMIT、`400440` ADDRESS_BALANCE_NOT_ENOUGH、`400441` ADDRESS_BALANCE_CHECK_FAILED | 业务码明细见 [错误处理](#错误处理) |



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

**返回**

| 项 | 类型 / 取值 | 说明 |
|----|------------|------|
| `data` | `ProjectUnitTransferOutOrder` | `orderId` / `orderState` / `taskId` / `totalAmount` |
| 可能业务码 | `300004` ACCOUNT_BALANCE_NOT_ENOUGH、`400006` ACCOUNT_NOT_EXIST、`400042` ACCOUNT_UNIT_NOT_EXIST、`400083` ACCOUNT_POOLING、`400102` ENERGY_PERIOD_NOT_START、`400103` THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS | 业务码明细见 [错误处理](#错误处理) |



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

**返回**

| 项 | 类型 / 取值 | 说明 |
|----|------------|------|
| `data` | `void` | 成功时 `data` 为 `null` |
| 可能业务码 | `400001` TASK_NOT_FOUND、`400013` UPDATE_ACCOUNT_FAILED、`400103` THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS | 业务码明细见 [错误处理](#错误处理) |



`taskId` 来自 `createPayout` / `pooling` / `addCoins` / `updateWhitelist` 的返回值。

---

### 交易记录

#### `listTransferOutOrders(authorizationId, options?)`

```typescript
sdk.listTransferOutOrders(authorizationId, options?: PaginationQuery)
  : Promise<PaginatedResponse<ProjectUnitTransferOutOrder>>
```

**返回**

| 项 | 类型 / 取值 | 说明 |
|----|------------|------|
| `data` | `PaginatedResponse<ProjectUnitTransferOutOrder>` | `orderState` / `payToList` / `txId` / `totalAmount` |
| 可能业务码 | `400103` THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS | 业务码明细见 [错误处理](#错误处理) |



#### `listTransferInOrders(authorizationId, options?)`

```typescript
sdk.listTransferInOrders(authorizationId, options?: PaginationQuery)
  : Promise<PaginatedResponse<ProjectUnitTransferInOrder>>
```

**返回**

| 项 | 类型 / 取值 | 说明 |
|----|------------|------|
| `data` | `PaginatedResponse<ProjectUnitTransferInOrder>` | `orderState` / `cpAddress` / `amount` / `txId` |
| 可能业务码 | `400103` THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS | 业务码明细见 [错误处理](#错误处理) |



#### `listActivities(authorizationId, options?)`

```typescript
sdk.listActivities(authorizationId, options?: PaginationQuery)
  : Promise<PaginatedResponse<ProjectUnitActivity>>
```

**返回**

| 项 | 类型 / 取值 | 说明 |
|----|------------|------|
| `data` | `PaginatedResponse<ProjectUnitActivity>` | `direction` / `status` / `travelRuleStatus` / `kytStatus` |
| 可能业务码 | `400103` THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS | 业务码明细见 [错误处理](#错误处理) |



#### `listFundRecords(authorizationId, options?)`

```typescript
sdk.listFundRecords(authorizationId, options?: PaginationQuery)
  : Promise<PaginatedResponse<ProjectUnitFundRecord>>
```

**返回**

| 项 | 类型 / 取值 | 说明 |
|----|------------|------|
| `data` | `PaginatedResponse<ProjectUnitFundRecord>` | `txType` / `direction` / `fromAddr` / `toAddr`（后三项目前不一定返回） |
| 可能业务码 | `400103` THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS | 业务码明细见 [错误处理](#错误处理) |



#### `listUnitFundRecords(authorizationId, options?)`

```typescript
sdk.listUnitFundRecords(authorizationId, options?: PaginationQuery)
  : Promise<PaginatedResponse<ProjectUnitLedgerFundRecord>>
```

**返回**

| 项 | 类型 / 取值 | 说明 |
|----|------------|------|
| `data` | `PaginatedResponse<ProjectUnitLedgerFundRecord>` | `txType` / `ledgerId` / 余额字段 |
| 可能业务码 | `400103` THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS | 业务码明细见 [错误处理](#错误处理) |



**PaginationQuery**

**`PaginationQuery`**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `pageIndex` | `number` | 否 | — |
| `pageSize` | `number` | 否 | — |
| `sortFields` | `string` | 否 | — |
| `queryList` | `QueryCondition[]` | 否 | — |

**`QueryCondition`**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `key` | `string` | 是 | — |
| `value` | `string / number / object` | 是 | — |
| `oper` | `'=' / '!=' / '>' / '<' / 'like'` | 否 | — |
| `join` | `'and' / 'or'` | 否 | — |

---

### 回调验签

#### `onCallback(req, handler)`

```typescript
await sdk.onCallback(req, async (payload) => {
  // 业务处理
});
```

**返回**

| 项 | 类型 / 取值 | 说明 |
|----|------------|------|
| `data` | `Promise<R>`（handler 的返回值） | 验签失败抛 `SDKError(SIGNATURE_INVALID)` |
| 可能业务码 | — | 业务码明细见 [错误处理](#错误处理) |



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

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `records` | `T[]` | 是 | — |
| `total` | `number` | 是 | — |
| `current` | `number` | 是 | — |
| `size` | `number` | 是 | — |
| `pages` | `number` | 否 | — |
| `orders` | `OrderItem[]` | 否 | — |

### 枚举

| 类型 | 取值 |
|------|------|
| `BusinessScope` | `'DEDICATED_ACCOUNT' / 'OMNIBUS_ACCOUNT' / 'OPEN_API_PROXY' |
| `Topology` | `'ORBIT' / 'SINGLE_GENERAL' / 'QUAD_SMART_ISOLATION' |
| `AccountType` | `'FREEZE' / 'DEPOSIT' / 'PRIMARY' / 'RECEIVABLE' / 'PAYOUT' / 'PAYIN' / 'GENERAL_GAS' / 'QUARANTINE' / 'DIRTY' |
| `VaultAccountType` | `'GENERAL_ACQUIRING' / 'SMART_ACQUIRING' / 'SMART' / 'GENERAL' / 'GMA' / 'TMA' |
| `MerchantType` | `'NON_FINANCIAL_CORPORATE' / 'REGULATED_VASP' / 'INTERNAL_SYSTEM' |
| `PayoutOperation` | `'withdraw' / 'allocate' / 'payout' |
| `CreationType` | `'PLATFORM' / 'THIRD_PARTY' |
| `TreasuryUnitStatus` | `'ACTIVATED' / 'FROZEN' / 'CLOSED' / 'PENDING' |

### 财务单元

**`CoinInfo`**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `coinId` | `string` | 是 | 币种 ID |
| `network` | `string` | 是 | 网络 |

**`FundControlRule`**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `guardians` | `string[]` | 是 | — |
| `threshold` | `string` | 是 | — |
| `perTransferLimit` | `string` | 是 | — |
| `dailyTransferLimit` | `string` | 是 | — |

**`FundControl`**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `coinId` | `string` | 是 | 币种 ID |
| `fundControlRules` | `FundControlRule[]` | 是 | 门限与限额规则 |

**`AnyCallRule`**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `guardians` | `string[]` | 是 | — |
| `threshold` | `string` | 是 | — |
| `allowedCommands` | `string[]` | 是 | — |

**`WhiteListCreateRequest`**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `network` | `string` | 是 | 网络 |
| `address` | `string` | 是 | 地址 |
| `alias` | `string` | 否 | 别名 |

**`AccountFundControl`**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `accountId` | `number` | 是 | 账户 ID（7.4 的 `id`） |
| `fundControls` | `FundControl[]` | 是 | 该账户的资金流规则 |


### 地址与账户

**`ProjectUnitAccountAddress`**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `number` | 是 | — |
| `ecode` | `string` | 是 | 企业code |
| `vaultCode` | `string` | 是 | vault code |
| `projectId` | `number` | 是 | — |
| `address` | `string` | 是 | 地址 |
| `vaultAccountId` | `string` | 是 | trustVault账户ID |
| `cusAccountId` | `number` | 是 | 商户账户ID |
| `treasuryUnitId` | `number` | 是 | — |
| `coinId` | `string` | 是 | 币种ID |
| `network` | `string` | 是 | 网络 |
| `series` | `AddressSeries / string` | 否 | 系列 |
| `addressIndex` | `number` | 是 | 地址索引 |
| `alias` | `string` | 否 | 别名 |
| `isSmart` | `number` | 是 | — |
| `isContract` | `number` | 是 | 是smart账户地址,是否部署地址合约:1.是,0.否 |
| `status` | `AddressStatus / number` | 是 | 地址状态:1:待部署合约,2:部署合约中;3:部署成功可用;4:冻结 |
| `accountType` | `AccountType` | 是 | 账户类型 |
| `available` | `number` | 是 | 是否可用:1.可用,0.不可用 |
| `holdAmount` | `number` | 是 | 该地址当前被隔离(hold)的合计金额，>0 时禁止归集 |
| `holdFrozen` | `number` | 是 | 是否因存在隔离资金而禁止归集:1.禁止,0.允许 |
| `riskLevel` | `RiskLevel / string` | 否 | 风险等级 |
| `riskScore` | `string` | 否 | 风险评分 |
| `riskCheckTime` | `string` | 否 | 风险校验时间 |
| `expireTime` | `number` | 否 | 有效时间,单位:小时 |
| `userId` | `string` | 否 | 关联用户ID |
| `lastUsedTime` | `string` | 否 | 最后使用时间 |
| `coolingEndTime` | `string` | 否 | 冷静期结束时间 |
| `createTime` | `string` | 是 | 创建时间 |
| `updateTime` | `string` | 是 | 创建时间 |

**`AccountAddressVO`**（创建地址返回）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `number` | 是 | — |
| `ecode` | `string` | 是 | 企业code |
| `vaultCode` | `string` | 是 | vault code |
| `projectId` | `number` | 是 | — |
| `address` | `string` | 是 | 地址 |
| `alias` | `string` | 否 | 别名 |
| `accountId` | `string` | 否 | trustVault账户ID |
| `cusAccountId` | `number` | 是 | 商户账户ID |
| `treasuryUnitId` | `number` | 是 | — |
| `coinId` | `string` | 是 | 币种ID |
| `network` | `string` | 是 | 网络 |
| `isSmart` | `number` | 是 | — |
| `isContract` | `number` | 是 | 是smart账户地址,是否部署地址合约:1.是,0.否 |
| `status` | `AddressStatus / number` | 是 | 地址状态:1:待部署合约,2:部署合约中;3:部署成功可用;4:冻结 |
| `holdAmount` | `number` | 是 | 该地址当前被隔离(hold)的合计金额，>0 时禁止归集 |
| `riskLevel` | `RiskLevel / string` | 否 | 风险等级 |
| `riskScore` | `string` | 否 | 风险评分 |
| `accountType` | `AccountType` | 是 | 账户类型 |
| `createTime` | `string` | 是 | 创建时间 |
| `updateTime` | `string` | 是 | 更新时间 |
| `balance` | `string` | 是 | — |

**`UnitAccount`**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `number` | 是 | id |
| `ecode` | `string` | 是 | 企业code |
| `vaultCode` | `string` | 是 | vault code |
| `vaultAccountId` | `string` | 是 | 对应trustVault账户id |
| `projectId` | `number` | 是 | 所属项目ID |
| `treasuryUnitId` | `number` | 是 | 所属财务单元id |
| `accountName` | `string` | 是 | 账户名称 |
| `fundFlowCode` | `string` | 否 | fundFlow code |
| `anycallCode` | `string` | 是 | anycall code |
| `autoSignUrl` | `string` | 否 | auto_sign_url 自动签入地址 |
| `balance` | `number` | 是 | 主账户余额 |
| `freezeBalance` | `number` | 是 | 冻结余额 |
| `holdBalance` | `number` | 是 | 隔离余额（合规待确认/待复核的入金隔离资金） |
| `coinId` | `string` | 是 | 管理的资产类型 |
| `network` | `string` | 是 | 网络 |
| `type` | `AccountType` | 是 | 账户类型 |
| `accountType` | `VaultAccountType` | 否 | 金库账户类型 |
| `status` | `number` | 是 | 状态:0不可用,1可用 |
| `income` | `number` | 是 | 账户总入金 |
| `outcome` | `number` | 是 | 账户总出金 |
| `isSmart` | `boolean` | 是 | 是否是智能账户 |
| `remark` | `string` | 否 | 备注 |
| `createTime` | `string` | 是 | 创建时间 |
| `updateTime` | `string` | 是 | 创建时间 |

> `UnitAddress` 为 `ProjectUnitAccountAddress` 的兼容别名。标注 `series` / `alias` / `riskLevel` 等字段在 SIT 实测中可能不返回。


### 审批任务

**`WCCIPCmdAuditTask`**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `number` | 是 | id |
| `taskId` | `string` | 是 | 任务ID |
| `vaultCode` | `string` | 是 | vault code |
| `projectId` | `number` | 是 | — |
| `accountId` | `string` | 是 | 金库的账户ID |
| `accountType` | `VaultAccountType` | 是 | 金库的账户类型 |
| `submitter` | `string` | 是 | 提交人:在三方模式时是customer code/两方模式时是guard squad id |
| `ecode` | `string` | 是 | 企业code |
| `cmdType` | `string` | 是 | 命令类型 |
| `cmdBasic` | `Record<string, unknown>` | 否 | 命令 |
| `cmdForm` | `Record<string, unknown>` | 否 | 命令参数 |
| `businessId` | `string` | 是 | 业务id:主要是订单id |
| `state` | `AuditTaskStatus / string` | 是 | 任务状态 |
| `businessType` | `string` | 是 | 业务类型:SYSTEM/BTC_TRANSFER等等 |
| `taskType` | `string` | 是 | 任务类型,用于前端判断是资金还是系统操作:orders/issues |
| `createTime` | `string` | 是 | 任务创建时间 |
| `updateTime` | `string` | 是 | 任务更新时间 |
| `signContent` | `string` | 是 | 签名内容 |
| `signContentKeyMapping` | `string` | 是 | 签名内容的映射 |
| `total` | `number` | 是 | 总参与审批数量 |
| `threshold` | `number` | 是 | 门限 |
| `signers` | `string[]` | 是 | 任务参与者、审核人、审批人等 |
| `algoType` | `AlgoType` | 是 | — |
| `initiator` | `string` | 是 | 任务发起人 |
| `taskOperation` | `TaskOperation / string` | 是 | 任务操作,如转账,设置board等等 |
| `signersLevel` | `number` | 是 | — |
| `coinId` | `string` | 是 | — |
| `unitName` | `string` | 是 | — |
| `accountName` | `string` | 是 | — |
| `includes` | `string[]` | 是 | — |
| `sponsored` | `boolean` | 是 | — |
| `remark` | `string` | 是 | — |


---

## 错误处理

所有失败的调用都抛 `SDKError`。业务码（网关码或 custody 码）在 `error.apiCode` 中原样保留，SDK 另外把它归类到 `error.code`，并附带常量名、含义、分类与是否可重试。

```typescript
import { CregisSDK, SDKError, SDKErrorCode, isCustodyError } from '@cregis-kit/openplatform-node';

try {
  await sdk.createPayout(authorizeId, request);
} catch (error) {
  if (error instanceof SDKError) {
    error.code;        // SDKErrorCode（分类）
    error.apiCode;     // 400030  ← 原始业务码
    error.apiConstant; // 'BOARD_NOT_EXIST'
    error.category;    // 'STATE' | 'VALIDATION' | 'CAPACITY' | 'INFRA' | ...
    error.isRetryable; // 是否可重试
    error.httpStatus;  // HTTP 状态
    error.details;     // { apiCode, traceId }
  }
}
```

### 错误码 → SDK 分类

| 业务码来源 | `apiCode` | `code`（`SDKErrorCode`） | `isRetryable` |
|------------|-----------|--------------------------|---------------|
| 网关 | `40001` / `40002` | `VALIDATION_MISSING_REQUIRED` / `VALIDATION_INVALID_FORMAT` | 否 |
| 网关 | `40101`–`40107` | `API_UNAUTHORIZED` | 否 |
| 网关 | `40301` | `API_FORBIDDEN` | 否 |
| 网关 | `40401` | `API_NOT_FOUND` | 否 |
| 网关 | `40901` / `40902` | `API_CONFLICT` | 否 |
| 网关 | `42901` | `API_RATE_LIMITED` | 是（按 `Retry-After`） |
| 网关 | `500` | `API_SERVER_ERROR`（上游非 2xx，网关丢弃了上游响应体） | 是 |
| 网关 | `50001` / `50301` | `API_SERVER_ERROR` | 是 |
| Custody | `400103` | `CUSTODY_RESOURCE_NOT_EXISTS` | 否 |
| Custody | `300004` / `400440` | `CUSTODY_INSUFFICIENT_FUNDS` | 否 |
| Custody | 分类 `VALIDATION`（如 `400216`、`120042`） | `CUSTODY_VALIDATION_ERROR` | 否 |
| Custody | 分类 `STATE`（如 `400030`、`400006`） | `CUSTODY_STATE_ERROR` | 否 |
| Custody | 分类 `INFRA`（如 `400441`、`400012`） | `CUSTODY_BUSINESS_ERROR` | **是** |
| Custody | 其他已登记码 | `CUSTODY_BUSINESS_ERROR` | 见下表 |
| 未知 | 其他 `4xxxx` | `API_ERROR` | 否 |
| 传输层 | —（无 `apiCode`） | `HTTP_TIMEOUT` / `HTTP_NETWORK_ERROR` / `HTTP_REQUEST_FAILED` | 是 |

> 分类不是按码段推断的：`300004` 是唯一的 3xxxx 业务码，`120042` 是上游规则码。需要精确判断时请用 `error.apiConstant`（如 `'BOARD_NOT_EXIST'`）或 `CustodyErrorCode` 常量。

### 辅助函数

| 函数 | 说明 |
|------|------|
| `isCustodyError(error)` | 是否为已登记的 custody 业务码 |
| `isRetryableError(error)` | `error.isRetryable` 的安全封装（非 `SDKError` 返回 `false`） |
| `getCustodyErrorInfo(code)` | 返回 `{ constant, meaning（英文）, meaningZh（中文原文）, category, retryable }` |
| `CustodyErrorsByRoute[routeId]` | 某个网关接口可能返回的业务码列表（`routeId` 见 `forward-routes.ts`） |

### SDK 内部错误码（无业务响应时）

| `SDKErrorCode` | 触发场景 |
|----------------|----------|
| `CONFIG_MISSING_BASE_URL` / `CONFIG_MISSING_APP_ID` / `CONFIG_MISSING_APP_SECRET` | 初始化缺少必填项 |
| `CONFIG_INVALID_APP_ID` | `appId` 非 UUID |
| `SIGNATURE_INVALID` | 回调验签失败 |
| `HTTP_REQUEST_FAILED` / `HTTP_NETWORK_ERROR` / `HTTP_TIMEOUT` | 传输层错误 |
| `TOKEN_NOT_FOUND` / `TOKEN_EXPIRED` / `TOKEN_REFRESH_FAILED` | OAuth 令牌问题 |
| `SIGNATURE_TIMESTAMP_INVALID` / `SIGNATURE_NONCE_MISSING` | 回调时间戳 / nonce 校验 |

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

SDK 会自行拼接 `/api/thirdparty/...` 路径，`baseUrl` 不要带尾斜杠。

---

## 版本与变更

### 1.4.0

**错误码**

- 新增 `CustodyErrorCode` / `CustodyErrorInfo` / `CustodyErrorsByRoute`（由 `docs/scripts/generate-error-codes.mjs` 从 `docs/third-party-api-error-codes.md` 生成）。`CustodyErrorInfo.meaning` 为英文说明（`SDKError.message` 也使用英文），中文原文保留在 `meaningZh`。
- `SDKError` 新增 `apiCode` / `apiConstant` / `apiMeaning` / `category` / `constant`；新增分类 `CUSTODY_VALIDATION_ERROR` / `CUSTODY_STATE_ERROR` / `CUSTODY_RESOURCE_NOT_EXISTS` / `CUSTODY_INSUFFICIENT_FUNDS` / `CUSTODY_BUSINESS_ERROR`，`isRetryable` 改为按登记表判断（INFRA 类才可重试）。
- 新增辅助函数 `isCustodyError` / `isRetryableError` / `getCustodyErrorInfo`。
- 网关 `500`（上游非 2xx、网关丢弃响应体）消息改为明确提示上游失败。

**响应类型修正**

- `createTreasuryUnit` 的返回类型 `CreateTreasuryUnitResponse` 改为 `TreasuryUnit` 的别名：上游 `POST /treasury/create` 返回的是 `ProjectUnit`（与 `create-custom`、`list` 相同），旧类型里的 `vaultCode` / `groupCode` / `gmaId` / `caaFactoryAddresses` 等字段在实际响应中不存在（旧结构保留为 `LegacyCreateTreasuryUnitResponse`，仅供迁移参考）。
- 依据 SIT 实测，下列字段改为可选：`ProjectUnitActivity` 的 `ledgerId` / `cpAccountId` / `businessId` / `kyaStatus`；`ProjectUnitTransferOutOrder` 的 `ledgerId` / `address` / `businessScope` / `travelRule*` / `kyt*` / `fee` / `callbackStatus` / `taskId` / `txId` / `note` / `businessId` / `vasp*` 等；`ProjectUnitTransferInOrder` 的 `treasuryUnitId` / `ledgerId` / `travelRule*` / `kyt*` / `note` 等；`UnitAccount` 的 `fundFlowCode` / `autoSignUrl` / `remark`；`TreasuryUnit.sort`。

**与网关 2026-10 修订后的响应保持一致**

- **地址**：新增 `ProjectUnitAccountAddress`（地址列表，8.1/8.2）替换旧的精简 `UnitAddress`（`UnitAddress` 保留为类型别名）；新增 `AccountAddressVO`（创建地址返回，8.3/8.4）。`createUnitAddress` 由 `void` 改为返回 `AccountAddressVO[]`，`createUnitAddressByAccount` 的元素类型同步改为 `AccountAddressVO`。
- **资金流水**：`ProjectUnitFundRecord` 新增 `fromAddr`、`toAddr`、`direction`。
- **出金订单**：`ProjectUnitTransferOutOrder` 新增 `vaspDid`、`vaspName`、`vaspReviewStatus`、`vaspReviewedBy`、`vaspReviewedAt`；`TransferOutOrderStatus` 新增 `BROADCAST_SUCCESS`、`VASP_MISMATCH_PENDING`。
- **活动记录**：`ActivityStatus` 新增 `BROADCAST_SUCCESS`。
- **用户**：`addUser` 返回 `ConsoleUser`（此前为 `Record<string, unknown>`）。
- **资金流规则**：`updateFundControl` 返回 `WCCIPCmdAuditTask`（此前为 `void`），`cusAccountId` 改为必填。
- **出金请求**：`CreatePayoutRequest` 的 `fromAccountId`、`fromAddress`、`orderId` 改为必填（上游 `ThirdPayoutRequest` 同步收紧）。
- **Travel Rule**：`TravelRulePayload` 新增 `beneficiaryVaspDid`、`beneficiaryVaspName`。
- **白名单**：`WhitelistUpdateRequest.cusAccountId` 改为必填。

### 1.3.0

**新增接口**

- `updateBoard(authorizationId, request)` — 修改 Board（护卫队），转发至 `POST /api/thirdparty/board/update`。返回审批任务 `WCCIPCmdAuditTask`，与 `initBoard` 的 `MerchantBoard` 不同。

### 1.2.0

**回调验签加固（不兼容变更）**

- `onCallback` 现在强制校验 `X-App-Id` 必须与配置的 `appId` 一致，`X-Timestamp` 必须落在 `callbackTimestampToleranceMs` 窗口内（默认 5 分钟，设为 `0` 关闭窗口校验），再验证 HMAC-SHA256 签名。
- 回调 handler 签名由 `(payload) => void` 改为 `(payload, event) => void | Promise<void>`，事件名来自 `X-Event`，缺失时为 `undefined`。升级后需同步修改 handler。

**其他**

- `merchant/register` 响应的 `authorizedId` 字段（等同 `authorizeId`，首次注册时返回）；`resourceAccessKey` 经网关调用时会被剥离，改为可选。
- 请求携带 `User-Agent` 与 `X-SDK-Name` / `X-SDK-Version` / `X-SDK-Language`，网关据此记录 SDK 身份。

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
- **移除 `verifyOAuthToken`**：`oauth/verify` 是 Custody 后台回调网关的内部接口，不属于开发者 SDK 能力。

**测试**

- 单元测试 100 项；集成测试覆盖全部 24 个接口（本地与 SIT 双环境）。

### 1.0.1

首个发布版本（OAuth + Treasury + Payout + Transaction 基础能力）。

---

## 许可证

MIT License
