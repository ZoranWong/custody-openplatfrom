# Cregis OpenPlatform Node.js SDK

Cregis 托管平台 Node.js SDK，用于后端集成加密资产托管服务。

**核心能力：**
- 创建和管理加密资产托管钱包（Treasury Unit）
- 发起和审批加密资产转账（Payout）
- 查询交易记录和资金流水
- 归集资金、创建地址
- OAuth 2.0 授权流程

**技术特性：**
- TypeScript 原生支持，完整类型定义
- 自动签名计算（Basic + Resource）
- 统一错误处理（SDKError）
- 支持 Node.js 18+

---

## 安装

```bash
npm install @cregis-kit/openplatform-node
```

**要求：** Node.js >= 18.0.0

---

## 快速开始

```typescript
import { CregisSDK } from '@cregis-kit/openplatform-node';

const sdk = new CregisSDK({
  baseUrl: 'https://custody-sit.cregis.ae/openplatform/',  // 测试环境
  appId: 'your-app-id-uuid',
  appSecret: 'your-app-secret',
});

// 1. 获取授权 URL
const { authorizeUrl } = await sdk.getAuthorizationUrl({
  permissions: ['treasury:create', 'payout:create'],
  redirectUri: 'https://your-app.com/callback',
  state: 'random-state-string',
});

// 2. 用户授权后，用 oauthToken 换取 authorizeId
const { authorizeId } = await sdk.verifyOAuthToken(oauthToken);

// 3. 创建 Treasury Unit
const unit = await sdk.createTreasuryUnit(authorizeId, {
  unitName: 'My Treasury',
  businessScope: 'DEDICATED_ACCOUNT',
  topology: 'ORBIT',
  coinIds: [{ coinId: 'USDT', network: 'TRC20' }],
  primaryManager: [{ coinId: 'USDT', fundControlRules: [{ guardians: ['admin@company.com'], threshold: '1', perTransferLimit: '1000', dailyTransferLimit: '50000' }] }],
  payoutManager: [{ coinId: 'USDT', fundControlRules: [{ guardians: ['admin@company.com'], threshold: '1', perTransferLimit: '1000', dailyTransferLimit: '50000' }] }],
});

// 4. 创建出金
const payout = await sdk.createPayout(authorizeId, {
  unitId: unit.id,
  payTo: [{ to: '0x...', amount: 100 }],
  coinId: 'USDT',
  network: 'TRC20',
  merchantType: 'NON_FINANCIAL_CORPORATE',
  travelRule: { referenceId: 'TR-001', payload: '{}' },
});
```

---

## 认证流程

```
你的后端 → getAuthorizationUrl() → 获取 authorizeUrl
你的前端 → 打开 authorizeUrl → 用户授权
你的前端 → 回调拿到 oauthToken → 传给后端
你的后端 → verifyOAuthToken(oauthToken) → 获取 authorizeId
你的后端 → 所有业务接口使用 authorizeId
```

---

## API Reference

### 初始化

```typescript
const sdk = new CregisSDK(config: SDKConfig)
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `baseUrl` | `string` | 是 | API 网关地址 |
| `appId` | `string` | 是 | 应用 ID（UUID 格式） |
| `appSecret` | `string` | 是 | 应用密钥 |
| `timeout` | `number` | 否 | 超时时间（毫秒），默认 30000 |
| `debug` | `boolean` | 否 | 调试模式 |

---

### OAuth 授权

#### `getAuthorizationUrl(params)`

获取授权页面 URL。

```typescript
sdk.getAuthorizationUrl(params: {
  permissions: string[];
  redirectUri: string;
  state: string;
}): Promise<{ authorizeUrl: string; expiresIn: number }>
```

#### `verifyOAuthToken(oauthToken)`

验证 OAuth token，获取 authorizeId。

```typescript
sdk.verifyOAuthToken(oauthToken: string): Promise<{ authorizeId: string }>
```

---

### 财务单元管理 (Treasury Unit)

#### `createTreasuryUnit(authorizationId, request)`

创建财务单元。**POST** `/api/thirdparty/treasury/create`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `unitName` | `string` | 是 | 财务单元名称 |
| `businessScope` | `string` | 是 | `DEDICATED_ACCOUNT` / `OMNIBUS_ACCOUNT` / `OPEN_API_PROXY` |
| `topology` | `string` | 是 | `ORBIT` / `SINGLE_GENERAL` / `QUAD_SMART_ISOLATION` |
| `coinIds` | `CoinInfo[]` | 是 | 币种列表 |
| `primaryManager` | `ManagerConfig[]` | 是 | 主账户管理员 |
| `payoutManager` | `ManagerConfig[]` | 是 | 出金管理员 |
| `primaryWhiteList` | `WhiteListCreateRequest[]` | 否 | 白名单地址 |
| `remark` | `string` | 否 | 备注 |

**返回：** `CreateTreasuryUnitResponse` — 包含 `id`, `ecode`, `name`, `networks`, `status`, `createTime`

#### `listTreasuryUnits(authorizationId, options?)`

查询财务单元列表。**POST** `/api/thirdparty/treasury/list`

```typescript
sdk.listTreasuryUnits(authorizationId, {
  pageSize?: number;
  pageNum?: number;
  sortFields?: string;
}): Promise<TreasuryUnit[]>
```

#### `getTreasuryUnitAddress(authorizationId, request)`

获取财务单元地址。**POST** `/api/thirdparty/treasury/address`

```typescript
sdk.getTreasuryUnitAddress(authorizationId, {
  unitId: number;
  accountType?: string;
  coinId?: string;
  network?: string;
  pageSize?: number;
  pageNum?: number;
}): Promise<Array<{ address: string; accountType: string }>>
```

#### `listUnitAccount(authorizationId, unitId)`

查询财务单元账户列表。**POST** `/api/thirdparty/treasury/list-unit-account/{unitId}`

```typescript
sdk.listUnitAccount(authorizationId, unitId: number): Promise<UnitAccount[]>
```

#### `createUnitAddress(authorizationId, request)`

创建财务单元地址。**POST** `/api/thirdparty/treasury/create-unit-address/{unitId}/{accountTypy}/{network}/{coinId}/{number}`

```typescript
sdk.createUnitAddress(authorizationId, {
  unitId: number;
  accountTypy: 'PRIMARY' | 'PAYOUT' | 'PAYIN';
  network: string;
  coinId: string;
  number: number;
}): Promise<{ success: boolean }>
```

---

### 出金操作 (Payout)

#### `createPayout(authorizationId, request)`

创建出金订单。**POST** `/api/thirdparty/treasury/payout`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `payTo` | `PayTo[]` | 是 | 收款地址列表 |
| `unitId` | `number` | 是 | 财务单元 ID |
| `coinId` | `string` | 是 | 币种 ID |
| `network` | `string` | 是 | 网络 |
| `merchantType` | `string` | 是 | `NON_FINANCIAL_CORPORATE` / `REGULATED_VASP` / `INTERNAL_SYSTEM` |
| `travelRule` | `TravelRuleRequest` | 是 | Travel Rule 信息（referenceId + payload） |
| `operation` | `string` | 否 | `withdraw` / `allocate` / `payout` |
| `orderId` | `string` | 否 | 客户业务订单 ID |
| `userId` | `string` | 否 | 发起用户 ID |
| `note` | `string` | 否 | 备注 |

**返回：** `PayoutOrder`

#### `listTransferOutOrders(authorizationId, options?)`

查询出金订单。**POST** `/api/thirdparty/treasury/transfer-out-orders`

```typescript
sdk.listTransferOutOrders(authorizationId, {
  pageIndex?: number;
  pageSize?: number;
  sortFields?: string;
  queryList?: QueryCondition[];
}): Promise<PaginatedResponse<ProjectUnitTransferOutOrder>>
```

#### `listTransferInOrders(authorizationId, options?)`

查询入金订单。**POST** `/api/thirdparty/treasury/transfer-in-orders`

```typescript
sdk.listTransferInOrders(authorizationId, options?): Promise<PaginatedResponse<ProjectUnitTransferInOrder>>
```

#### `pooling(authorizationId, request)`

发起资金归集。**POST** `/api/thirdparty/treasury/pooling`

```typescript
sdk.pooling(authorizationId, {
  unitId: number;
  amount: number;
  coinId: string;
  network: string;
  lang?: string;
  note?: string;
  includes?: string[];  // 包含地址
  excludes?: string[];  // 排除地址
}): Promise<{ success: boolean }>
```

---

### 任务审批

#### `submitTask(authorizationId, taskId, request)`

提交任务审批。**POST** `/api/thirdparty/treasury/submit-task/{taskId}`

```typescript
sdk.submitTask(authorizationId, taskId, {
  signatures?: Record<string, string[]>;
  confirmed: boolean;
}): Promise<WCCIPCmdAuditTask>
```

---

### 交易记录

#### `listActivities(authorizationId, options?)`

查询活动记录。**POST** `/api/thirdparty/treasury/activities`

```typescript
sdk.listActivities(authorizationId, {
  pageIndex?: number;
  pageSize?: number;
  sortFields?: string;
  queryList?: QueryCondition[];
}): Promise<PaginatedResponse<ProjectUnitActivity>>
```

#### `listFundRecords(authorizationId, options?)`

查询资金流水（账户级）。**POST** `/api/thirdparty/treasury/fund-records`

```typescript
sdk.listFundRecords(authorizationId, options?): Promise<PaginatedResponse<ProjectUnitFundRecord>>
```

#### `listUnitFundRecords(authorizationId, options?)`

查询资金流水（财务单元级）。**POST** `/api/thirdparty/treasury/unit-fund-records`

```typescript
sdk.listUnitFundRecords(authorizationId, options?): Promise<PaginatedResponse<ProjectUnitLedgerFundRecord>>
```

---

### Webhook

#### `registerWebhook(request)`

```typescript
sdk.registerWebhook({ url: string; eventTypes: string[] }): Promise<WebhookInfo>
```

#### `listWebhooks()`

```typescript
sdk.listWebhooks(): Promise<WebhookInfo[]>
```

#### `deleteWebhook(id)`

```typescript
sdk.deleteWebhook(id: string): Promise<{ success: boolean }>
```

---

### 回调验证

#### `onCallback(req, callback)`

验证并处理 Cregis 平台回调。

```typescript
app.post('/callback', (req, res) => {
  sdk.onCallback(req, (payload) => {
    console.log('Event:', payload.event, 'Data:', payload.data);
    res.status(200).send('OK');
  });
});
```

---

### 查询条件 (QueryCondition)

```typescript
interface QueryCondition {
  key: string;        // 查询字段名
  value: string | number;  // 查询值
  oper?: '=' | '!=' | '>' | '<' | 'like';  // 操作符
  join?: 'and' | 'or';  // 连接方式
}
```

---

## 分页响应 (PaginatedResponse)

```typescript
interface PaginatedResponse<T> {
  records: T[];   // 记录列表
  total: number;  // 总记录数
  current: number; // 当前页
  size: number;    // 每页大小
  pages: number;   // 总页数
}
```

---

## 错误处理

```typescript
import { SDKError, SDKErrorCode } from '@cregis-kit/openplatform-node';

try {
  const unit = await sdk.createTreasuryUnit(authorizeId, request);
} catch (error) {
  if (error instanceof SDKError) {
    console.error('Code:', error.code, 'Message:', error.message);
    if (error.isRetryable) {
      // 可重试，稍后再试
    }
  }
}
```

| 错误码 | 说明 |
|--------|------|
| `CONFIG_MISSING_BASE_URL` | 缺少 baseUrl |
| `CONFIG_MISSING_APP_ID` | 缺少 appId |
| `CONFIG_INVALID_APP_ID` | appId 格式无效 |
| `SIGNATURE_INVALID` | 签名验证失败 |
| `HTTP_REQUEST_FAILED` | HTTP 请求失败 |
| `HTTP_TIMEOUT` | 请求超时 |
| `API_UNAUTHORIZED` | 认证失败 |
| `API_NOT_FOUND` | 资源未找到 |
| `API_SERVER_ERROR` | 服务器错误 |

---

## 环境

| 环境 | 地址 |
|------|------|
| 测试 (SIT) | `https://custody-sit.cregis.ae/openplatform/` |
| 生产 (BETA) | `https://custody.cregis.ae/openplatform/` |

## 许可证

MIT License