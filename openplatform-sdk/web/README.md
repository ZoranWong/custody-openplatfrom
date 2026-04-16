# Cregis OpenPlatform WebKit SDK

Cregis 托管平台 Web SDK - 用于在第三方应用中嵌入授权页面，实现安全的授权功能。

## 安装

```bash
npm install @cregis-kit/openplatform-webkit
```

## 快速开始

### 1. 获取授权 URL

首先从你的后端获取授权 URL：

```typescript
// 后端调用 POST /api/thirdparty/oauth/authorizeUrl
// 返回 { authorizeUrl: "https://...?appId=xxx&appToken=yyy&..." }
```

### 2. 初始化 SDK

```typescript
import { CregisWebSDK } from '@cregis-kit/openplatform-webkit';

const sdk = new CregisWebSDK({
  appId: 'your-app-id',
  authUrl: 'https://openplatform.cregis.com/openplatform/auth/authorize',
  container: '#auth-container',

  // 事件回调
  onReady: ({ uuid }) => {
    console.log('授权页面已就绪, SDK UUID:', uuid);
  },

  onAuthorizationStarted: () => {
    console.log('用户点击了授权按钮');
  },

  onAuthorizationComplete: ({ authorizeId }) => {
    console.log('授权成功, authorizeId:', authorizeId);
  },

  onAuthorizationError: ({ code, message }) => {
    console.error('授权失败:', code, message);
  },

  onAuthorizationCancelled: () => {
    console.log('用户取消授权');
  },
});
```

### 3. 打开授权页面

```typescript
// 直接传入授权 URL
const result = await sdk.openAuthorization(authorizeUrl);

if (result.status === 'success') {
  console.log('授权成功, authorizeId:', result.authorizeId);
} else if (result.status === 'cancelled') {
  console.log('用户取消');
} else {
  console.error('授权失败:', result.error);
}
```

## 配置说明

### SDKConfig

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `appId` | `string` | 是 | 应用ID |
| `authUrl` | `string` | 是 | 授权页面地址 |
| `container` | `HTMLElement \| string` | 是 | DOM 容器 |
| `mode` | `'popup' \| 'tab' \| 'window'` | 否 | 打开模式，默认 `'popup'` |
| `debug` | `boolean` | 否 | 调试模式，默认 `false` |
| `appToken` | `string` | 否 | 应用 Token（已废弃，由后端返回的 authorizeUrl 包含） |
| `appName` | `string` | 否 | 应用名称（已废弃，由后端返回的 authorizeUrl 包含） |
| `appLogoUrl` | `string` | 否 | 应用 Logo（已废弃，由后端返回的 authorizeUrl 包含） |
| `modalStyles` | `object` | 否 | 自定义弹窗样式 |

### 事件回调

| 回调 | 参数 | 说明 |
|------|------|------|
| `onReady` | `{ uuid: string }` | 授权页面加载完成并建立通信 |
| `onAuthorizationStarted` | - | 用户点击授权按钮 |
| `onAuthorizationComplete` | `{ authorizeId: string }` | 授权成功 |
| `onAuthorizationError` | `{ code: string, message: string }` | 授权失败 |
| `onAuthorizationCancelled` | - | 用户取消授权 |

### AuthorizationOptions

```typescript
// 方式1: 直接传入授权 URL 字符串（推荐）
sdk.openAuthorization('https://...?appId=xxx&appToken=yyy&...');

// 方式2: 通过对象传入 oauthUrl
sdk.openAuthorization({ oauthUrl: 'https://...' });

// 方式3: 旧方式（deprecated）- 由 SDK 构建 URL
sdk.openAuthorization({
  permissions: ['read', 'write'],
  state: 'custom-state',
});
```

### AuthorizationResult

```typescript
interface AuthorizationResult {
  status: 'success' | 'error' | 'cancelled';
  authorizeId?: string;  // 授权成功后的授权 ID
  error?: {
    code: string;
    message: string;
  };
}
```

## 打开模式

### popup（默认）

弹窗模式，在 iframe 中打开授权页面。

```typescript
const sdk = new CregisWebSDK({
  // ...
  mode: 'popup',  // 默认
});
```

### tab

新标签页模式，在新浏览器标签页中打开授权页面。

```typescript
const sdk = new CregisWebSDK({
  // ...
  mode: 'tab',
});
```

### window

弹窗窗口模式，在新的浏览器窗口中打开授权页面。

```typescript
const sdk = new CregisWebSDK({
  // ...
  mode: 'window',
});
```

## API 文档

### CregisWebSDK 类

#### 构造函数

```typescript
new CregisWebSDK(config: SDKConfig)
```

#### 方法

| 方法 | 说明 |
|------|------|
| `openAuthorization(options)` | 打开授权页面，返回 Promise |
| `getUUID()` | 获取 SDK 实例 UUID |
| `close()` | 关闭弹窗 |
| `destroy()` | 销毁 SDK 实例 |

### 工具函数

```typescript
import { setAllowedOrigins, getAllowedOrigins } from '@cregis-kit/openplatform-webkit';

// 设置允许的 iframe 来源（增强安全性）
setAllowedOrigins(['https://your-domain.com']);
```

## 安全机制

SDK 使用 UUID 机制防止跨域消息污染：

1. SDK 实例化时生成唯一 UUID
2. UUID 通过 URL 参数传递给授权页面
3. 所有消息都携带 UUID 进行双向验证
4. UUID 不匹配的消息将被拒绝

## 完整示例

```typescript
import { CregisWebSDK } from '@cregis-kit/openplatform-webkit';

// 1. 从后端获取授权 URL
async function getAuthorizeUrl() {
  const response = await fetch('/api/thirdparty/oauth/authorizeUrl', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      basic: { appId, timestamp, nonce, signature },
      business: { permissions: ['read'], redirectUri, state }
    })
  });
  const result = await response.json();
  return result.data.authorizeUrl;
}

// 2. 初始化 SDK
const sdk = new CregisWebSDK({
  appId: 'your-app-id',
  authUrl: 'https://openplatform.cregis.com/openplatform/auth/authorize',
  container: '#auth-container',
  mode: 'popup',

  onReady: ({ uuid }) => {
    console.log('页面就绪:', uuid);
  },

  onAuthorizationComplete: ({ authorizeId }) => {
    console.log('授权成功:', authorizeId);
  },

  onAuthorizationError: ({ code, message }) => {
    console.error('授权失败:', code, message);
  },
});

// 3. 获取授权 URL 并打开授权页面
const authorizeUrl = await getAuthorizeUrl();
const result = await sdk.openAuthorization(authorizeUrl);

// 4. 处理结果
if (result.status === 'success') {
  // 将 authorizeId 发送到你的后端进行后续操作
  await fetch('/api/thirdparty/oauth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      oauthToken: result.authorizeId,  // 这里可能需要根据实际返回调整
    })
  });
}
```

## 转账任务详情弹窗 (TransferTaskDetailDialog)

TransferTaskDetailDialog 是一个嵌入式的转账任务详情展示组件，用于在第三方应用中展示 Cregis 托管平台的转账审批任务详情，让审批人查看交易详情并确认签名。

### 业务背景

在企业级加密资产托管场景中，转账操作通常需要多人审批。TransferTaskDetailDialog 用于：

- 展示转账任务的完整信息（金额、收款方、手续费等）
- 显示资金流向和链上信息
- 展示审批流程进度
- 支持多签审批（可选）

### 安装

```bash
npm install @cregis-kit/openplatform-webkit
```

### 快速开始

```typescript
import { openTransferTaskDetailDialog } from '@cregis-kit/openplatform-webkit';
import type { TransferTaskDetailData } from '@cregis-kit/openplatform-webkit';

// 准备任务数据（通常从后端 API 获取）
const taskData: TransferTaskDetailData = {
  taskId: '#TRX-8829',
  status: 'pending',
  amount: '10000',
  coin: 'USDT',
  network: 'Ethereum',
  from: {
    name: 'Corporate Treasury',
    address: '0x1234...abcd',
    type: 'account',
  },
  to: {
    name: 'Vendor Payment',
    address: '0xabcd...1234',
    type: 'external',
  },
  meta: {
    unit: 'Everypay-Treasury',
    createdAt: '2024-01-15 10:30:00',
    expiresIn: '24h',
  },
  approvalFlow: [
    {
      name: 'Manager Approval',
      status: 'completed',
      actor: 'john@company.com',
      timestamp: '2024-01-15 10:35:00',
    },
    {
      name: 'CFO Approval',
      status: 'current',
    },
    {
      name: 'Final Confirmation',
      status: 'pending',
    },
  ],
};

// 打开弹窗
const dialog = openTransferTaskDetailDialog(taskData, {
  title: 'Review Transfer',
  className: 'my-custom-dialog',
  onClose: () => {
    console.log('Dialog closed');
  },
});
```

### TransferTaskDetailData 类型

```typescript
interface TransferTaskDetailData {
  taskId: string;                              // 任务 ID，如 '#TRX-8829'
  status: 'pending' | 'approved' | 'rejected' | 'wait_for_sign';
  amount: string;                               // 转账金额
  coin: string;                                 // 币种，如 'USDT'、'BTC'
  network: string;                              // 网络，如 'Ethereum'、'Bitcoin'
  contractAddress?: string;                    // 合约地址（代币场景）
  from: TransferParty | TransferParty[];       // 付款方（单笔或批量）
  to: TransferParty | TransferParty[];           // 收款方（单笔或批量）
  proposal?: string;                            // 备注/说明
  meta: TransferTaskMeta;                       // 元信息
  approvalFlow: ApprovalStep[];                 // 审批流程
}

interface TransferParty {
  name: string;                                 // 名称
  alias?: string;                               // 别名
  id?: string;                                  // 身份 ID
  address: string;                              // 钱包地址
  type?: 'account' | 'external';               // 类型
  avatarLetter?: string;                        // 头像字母
  travelRule?: TravelRuleItem;                   // Travel Rule 信息
}

interface TravelRuleItem {
  name: string;                                 // VASPs 名称
  country: string;                              // 国家
  verified: boolean;                            // 是否验证
  vasp?: string;                                // VASP 代码
}

interface TransferTaskMeta {
  unit: string;                                 // 财务单元名称
  createdAt: string;                            // 创建时间
  expiresIn: string;                           // 过期时间
}

interface ApprovalStep {
  name: string;                                 // 审批步骤名称
  status: 'completed' | 'current' | 'pending'; // 状态
  actor?: string;                               // 审批人
  actorAvatar?: string;                         // 审批人头像
  timestamp?: string;                           // 审批时间
  note?: string;                                // 审批备注
}
```

### TransferTaskDetailDialogOptions

```typescript
interface TransferTaskDetailDialogOptions {
  title?: string;       // 弹窗标题，默认 'Review Task'
  className?: string;   // 自定义 CSS 类名
  onClose?: () => void; // 关闭回调
}
```

### 组件 API

#### 构造函数

```typescript
const dialog = new TransferTaskDetailDialog(options?: TransferTaskDetailDialogOptions)
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | `string` | 否 | 弹窗标题，默认 'Review Task' |
| `className` | `string` | 否 | 自定义 CSS 类名 |
| `onClose` | `() => void` | 否 | 关闭回调函数 |

#### 公开方法

| 方法 | 说明 |
|------|------|
| `open(data: TransferTaskDetailData)` | 打开弹窗并展示任务详情 |
| `close()` | 关闭弹窗 |
| `destroy()` | 销毁弹窗实例（关闭后不可再打开） |

#### 便捷函数

```typescript
const dialog = openTransferTaskDetailDialog(
  data: TransferTaskDetailData,
  options?: TransferTaskDetailDialogOptions
): TransferTaskDetailDialog
```

### 状态配置

组件内置了状态显示配置：

```typescript
const StatusConfig = {
  pending: {
    label: 'Pending',
    className: 'bg-gray-50 text-gray-700 border-gray-100',
    dotClass: 'bg-gray-400',
  },
  wait_for_sign: {
    label: 'Wait for Sign',
    className: 'bg-amber-50 text-amber-700 border-amber-100',
    dotClass: 'bg-amber-500 animate-pulse',
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-50 text-green-700 border-green-100',
    dotClass: 'bg-green-500',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-50 text-red-700 border-red-100',
    dotClass: 'bg-red-500',
  },
};
```

### 样式自定义

#### CSS Class 列表

| Class 名称 | 说明 |
|-----------|------|
| `.transfer-task-dialog-overlay` | 全屏遮罩层 |
| `.transfer-task-dialog-container` | 弹窗容器 |
| `.transfer-task-dialog-header` | 头部区域 |
| `.transfer-task-dialog-title` | 标题文字 |
| `.transfer-task-dialog-status-badge` | 状态标签 |
| `.transfer-task-dialog-content` | 内容区域 |
| `.transfer-task-dialog-card` | 信息卡片 |
| `.transfer-task-dialog-amount-box` | 金额展示区 |
| `.transfer-task-dialog-amount-value` | 金额数字 |
| `.transfer-task-dialog-party-card` | 交易方卡片 |
| `.transfer-task-dialog-party-address` | 钱包地址 |
| `.transfer-task-dialog-travel-rule` | Travel Rule 区域 |
| `.transfer-task-dialog-approval-flow` | 审批流程区 |
| `.transfer-task-dialog-approval-step` | 审批步骤 |

#### 自定义示例

```css
/* 自定义弹窗样式 */
.my-custom-dialog .transfer-task-dialog-container {
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

/* 自定义金额样式 */
.my-custom-dialog .transfer-task-dialog-amount-value {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
}
```

```typescript
openTransferTaskDetailDialog(taskData, {
  className: 'my-custom-dialog',
});
```

### 端到端集成示例

以下示例展示如何将 Node.js SDK 后端与 Web SDK 前端配合使用：

#### 1. 后端：创建 Payout 并获取任务信息

```typescript
import { CregisSDK } from '@cregis-kit/openplatform-node';

// 初始化后端 SDK
const sdk = new CregisSDK({
  baseUrl: 'https://api.cregis.com',
  appId: process.env.APP_ID!,
  appSecret: process.env.APP_SECRET!,
});

// 创建 Payout（触发审批流程）
const payout = await sdk.createPayout(authorizeId, {
  unitId: 123,                                // 来自 createTreasuryUnit 的 id
  payTo: [{ address: '0xabcd...', amount: '10000' }],
  coinId: 'USDT',
  network: 'Ethereum',
  merchantType: 'payment',
});

// 查询任务详情
const taskId = payout.orderId; // 作为 taskId 使用

// 返回任务信息给前端
res.json({
  taskId: taskId,
  unitId: payout.unitId,
  // ... 其他必要信息
});
```

#### 2. 前端：展示 TransferTaskDetailDialog

```typescript
import { openTransferTaskDetailDialog } from '@cregis-kit/openplatform-webkit';

// 从后端获取任务数据
const response = await fetch('/api/get-task-details', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ taskId, unitId }),
});
const { taskId, amount, coin, network, ... } = await response.json();

// 构建 TransferTaskDetailData
const taskData = {
  taskId: `#TRX-${taskId}`,
  status: 'pending',
  amount,
  coin,
  network,
  from: { name: 'Corporate Treasury', address: '0x1234...', type: 'account' },
  to: { name: 'Vendor', address: '0xabcd...', type: 'external' },
  meta: {
    unit: 'Everypay-Treasury',
    createdAt: new Date().toISOString(),
    expiresIn: '24h',
  },
  approvalFlow: [
    { name: 'Manager Approval', status: 'completed', actor: 'manager@company.com' },
    { name: 'CFO Approval', status: 'current' },
    { name: 'Final Confirmation', status: 'pending' },
  ],
};

// 打开弹窗
const dialog = openTransferTaskDetailDialog(taskData, {
  onClose: () => {
    console.log('User closed the dialog');
  },
});
```

#### 3. 后端：用户确认后提交审批

```typescript
// 后端接收用户的确认操作
app.post('/api/submit-task', async (req, res) => {
  const { taskId, confirmed, signatures } = req.body;

  const result = await sdk.submitTask(authorizeId, taskId, {
    confirmed,      // true = 确认，false = 拒绝
    signatures,     // 签名信息
  });

  res.json(result);
});
```

## 常见问题

### Q: 授权页面无法显示？

检查以下配置：
1. `authUrl` 是否正确指向授权页面
2. `container` 元素是否存在
3. 浏览器控制台是否有错误信息

### Q: 授权成功后如何获取授权信息？

授权成功后，授权页面会返回 `authorizeId`。你可以通过调用 `/api/thirdparty/oauth/verify` 接口验证并获取完整的授权信息。

### Q: 如何选择打开模式？

- `popup`: 默认模式，适合大多数场景
- `tab`: 用户体验更好，但需要处理标签页通信
- `window`: 类似于 tab，但可以自定义窗口大小

## 许可证

MIT License
