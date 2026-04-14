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
