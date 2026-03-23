# Cregis OpenPlatform WebKit SDK

Cregis 托管平台 Web SDK - 用于在第三方应用中嵌入授权页面，实现安全的钱包授权功能。

## 安装

```bash
npm install @cregis-kit/openplatform-webkit
```

## 快速开始

### 1. HTML 中引入容器

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>授权示例</title>
  <style>
    #auth-container {
      width: 100%;
      height: 600px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div id="auth-container"></div>

  <script type="module">
    import { CregisWebSDK } from '@cregis-kit/openplatform-webkit';

    // 初始化 SDK
    const sdk = new CregisWebSDK({
      appId: 'app_d871206a-7477-4c',
      authUrl: 'http://api.vaulink.com/openplatform/oauth/',
      container: '#auth-container',
      appName: '测试应用',
      appLogoUrl: 'https://example.com/logo.png',
    });

    // 监听授权事件
    sdk.onEvent = (event) => {
      console.log('SDK Event:', event);
    };

    // 打开授权弹窗
    document.getElementById('authorize-btn').addEventListener('click', async () => {
      const result = await sdk.openAuthorization({
        permissions: ['wallet:read', 'wallet:transfer'],
        state: 'custom-state-123',
      });

      console.log('授权结果:', result);
      if (result.status === 'success') {
        console.log('资源访问密钥:', result.resourceKey);
      }
    });
  </script>
</body>
</html>
```

### 2. React 中使用

```jsx
import { useEffect, useRef } from 'react';
import { CregisWebSDK } from '@cregis-kit/openplatform-webkit';

function AuthButton() {
  const containerRef = useRef(null);
  const sdkRef = useRef(null);

  useEffect(() => {
    // 初始化 SDK
    sdkRef.current = new CregisWebSDK({
      appId: 'app_d871206a-7477-4c',
      authUrl: 'http://api.vaulink.com/openplatform/oauth/',
      container: containerRef.current,
      appName: '测试应用',
    });

    // 设置事件监听
    sdkRef.current.onEvent = (event) => {
      console.log('SDK Event:', event);
    };

    return () => {
      sdkRef.current?.destroy();
    };
  }, []);

  const handleAuthorize = async () => {
    const result = await sdkRef.current?.openAuthorization({
      permissions: ['wallet:read', 'wallet:transfer'],
      state: 'custom-state-123',
    });

    if (result?.status === 'success') {
      console.log('授权成功，resourceKey:', result.resourceKey);
      // 将 resourceKey 发送到后端进行后续操作
    }
  };

  return (
    <div>
      <button onClick={handleAuthorize}>授权钱包</button>
      <div ref={containerRef} style={{ width: '100%', height: '600px' }} />
    </div>
  );
}
```

## 配置说明

### SDKConfig

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `appId` | `string` | 是 | 应用ID，从 Cregis 平台获取 |
| `authUrl` | `string` | 是 | 授权页面地址，如 `http://api.vaulink.com/openplatform/oauth/` |
| `container` | `HTMLElement \| string` | 是 | DOM 容器，用于渲染授权 iframe |
| `appName` | `string` | 否 | 应用名称，显示在授权页面 |
| `appLogoUrl` | `string` | 否 | 应用 Logo URL |
| `appToken` | `string` | 否 | 应用 Token |
| `mode` | `'inline' \| 'popup'` | 否 | 显示模式，`inline` 为内联iframe，`popup` 为弹窗模式，默认 `inline` |
| `debug` | `boolean` | 否 | 调试模式，开启后输出详细日志，默认 `false` |
| `modalStyles` | `object` | 否 | 自定义弹窗样式 |

### AuthorizationOptions

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `permissions` | `string[]` | 否 | 请求的权限列表 |
| `state` | `string` | 否 | 自定义状态，用于回调验证 |
| `redirectUri` | `string` | 否 | 授权完成后的跳转地址 |

### AuthorizationResult

```typescript
interface AuthorizationResult {
  status: 'success' | 'error' | 'cancelled';
  resourceKey?: string;  // 授权成功后返回的资源访问密钥
  error?: {
    code: string;
    message: string;
  };
}
```

## 测试说明

### 测试环境

- **授权页面地址**: http://api.vaulink.com/openplatform/oauth/
- **测试 App ID**: `app_d871206a-7477-4c`
- **测试 App Secret**: `sk_d871206a74774ca4890d57eb0ddff009`

### 测试账号

授权页面支持以下测试登录方式：

1. **邮箱密码登录**: 使用 Cregis 平台的注册账号登录
2. **二次验证**: 支持 Google Authenticator 验证码或恢复码

### 测试步骤

1. 在页面中初始化 SDK，使用上述测试 App ID
2. 点击授权按钮，打开授权 iframe
3. 使用测试账号登录（如需二次验证，输入 Google Authenticator 验证码）
4. 选择授权的钱包和企业
5. 确认授权，iframe 将发送授权结果到父窗口

### 注意事项

- 测试环境仅用于开发调试，请勿用于生产环境
- 测试 App Secret 请妥善保管，不要暴露在前端代码中
- 生产环境请替换为正式的 App ID 和 App Secret

## API 文档

### CregisWebSDK 类

#### 构造函数

```typescript
new CregisWebSDK(config: SDKConfig)
```

#### 方法

| 方法 | 说明 |
|------|------|
| `openAuthorization(options?)` | 打开授权页面，返回 Promise |
| `setToken(token: TokenInfo)` | 设置访问令牌 |
| `getToken()` | 获取当前令牌 |
| `closeModal()` | 关闭弹窗 |
| `destroy()` | 销毁 SDK 实例 |
| `isInitialized()` | 检查 SDK 是否已初始化 |
| `getConfig()` | 获取当前配置 |

#### 事件类型

| 事件 | 说明 |
|------|------|
| `ready` | SDK 初始化完成 |
| `authorization_started` | 开始授权流程 |
| `authorization_complete` | 授权完成 |
| `authorization_error` | 授权失败 |
| `message_received` | 收到消息 |

### 工具函数

```typescript
import { setAllowedOrigins, getAllowedOrigins } from '@cregis-kit/openplatform-webkit';

// 设置允许的 iframe 来源（增强安全性）
setAllowedOrigins(['https://your-domain.com']);
```

## postMessage 通信

SDK 通过 `postMessage` 与 iframe 内的授权页面进行双向通信。

### 接收授权页面消息

```javascript
import { listenFromParent } from '@cregis-kit/openplatform-webkit';

// 监听来自授权页面的消息
const unsubscribe = listenFromParent((data) => {
  console.log('Received from iframe:', data);

  switch (data.action) {
    case 'ready':
      console.log('授权页面已准备好');
      break;
    case 'authorization_result':
      if (data.type === 'success') {
        console.log('授权成功，resourceKey:', data.data);
      } else {
        console.error('授权失败:', data.error);
      }
      break;
  }
});

// 取消监听
unsubscribe();
```

### 完整示例

```javascript
import { CregisWebSDK, listenFromParent } from '@cregis-kit/openplatform-webkit';

// 从后端获取 appToken（生产环境必须从后端获取，不要硬编码在前端）
async function getAppToken() {
  // 后端生成算法：md5(appId + appSecret + timestamp + nonce) + '-' + timestamp + '-' + nonce
  // 后端示例（Node.js）：
  // const crypto = require('crypto');
  // function generateAppToken(appId, appSecret) {
  //   const timestamp = Date.now();
  //   const nonce = Math.random().toString(36).substring(2, 15);
  //   const hash = crypto.createHash('md5').update(appId + appSecret + timestamp + nonce).digest('hex');
  //   return `${hash}-${timestamp}-${nonce}`;
  // }

  const response = await fetch('/api/oauth/app-token');
  const data = await response.json();
  return data.appToken;
}

async function initSDK() {
  const appToken = await getAppToken();

  const sdk = new CregisWebSDK({
    appId: 'app_d871206a-7477-4c',
    authUrl: 'http://api.vaulink.com/openplatform/oauth/',
    appToken: appToken,  // 从后端获取
    container: '#auth-container',
    appName: '测试应用',
  });

  // 设置用户 token（如果已有登录态，可跳过登录步骤）
  sdk.setToken({
    accessToken: 'user-access-token',
    expiresAt: Date.now() + 3600000,
    tokenType: 'Bearer'
  });

  // 监听授权页面消息
  listenFromParent((message) => {
    if (message.action === 'authorization_result') {
      if (message.type === 'success') {
        console.log('授权成功，resourceKey:', message.data);
      }
    }
  });

  // 打开授权
  sdk.openAuthorization({
    permissions: ['wallet:read', 'wallet:transfer']
  });

  return sdk;
}

initSDK();
```

> **安全提示**:
> - `appToken` 是应用密钥，请勿暴露在前端代码中。必须从后端接口获取 appToken 后再传递给 SDK。
> - 后端生成算法：`md5(appId + appSecret + timestamp + nonce) + '-' + timestamp + '-' + nonce`
> - Token 有效期为 1 小时，超时后需要重新生成

### 消息类型参考

#### iframe → 父窗口

| action | 说明 | data |
|--------|------|------|
| `ready` | 授权页面加载完成 | - |
| `authorization_result` | 授权结果 | `{ resourceKey }` 或 `{ error }` |

#### 父窗口 → iframe

| action | 说明 |
|--------|------|
| `init` | SDK 触发授权页面初始化（SDK 自动发送） |

## 示例代码

更多示例请参考 `examples/` 目录：

- `examples/simple.html` - 简单的内联授权示例
- `examples/popup.html` - 弹窗模式授权示例

## 常见问题

### Q: 授权页面无法显示？

检查以下配置：
1. `authUrl` 是否正确指向授权页面
2. `container` 元素是否存在
3. 浏览器控制台是否有错误信息

### Q: 授权成功后无法获取结果？

确保正确监听了授权事件，或使用 `openAuthorization()` 返回的 Promise。

### Q: 如何实现单点登录？

使用 `setToken()` 方法设置已有的访问令牌，跳过登录步骤。

## 许可证

MIT License
