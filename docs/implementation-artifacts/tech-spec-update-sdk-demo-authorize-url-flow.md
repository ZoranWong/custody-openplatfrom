---
title: 'Update SDK Demo to New Authorize URL Flow'
slug: 'update-sdk-demo-authorize-url-flow'
created: '2026-04-17'
status: 'Implementation Complete'
stepsCompleted: [1, 2, 3, 4, 5]
tech_stack: ['HTML', 'JavaScript ES Modules', 'MD5 (window.md5)', 'fetch API']
files_to_modify: ['openplatform-sdk/web/sdk-demo.html']
code_patterns: ['ES Module imports', 'postMessage communication', 'Basic signature algorithm', 'Sorted JSON key serialization']
test_patterns: []
---

# Tech-Spec: Update SDK Demo to New Authorize URL Flow

**Created:** 2026-04-17

## Overview

### Problem Statement

`sdk-demo.html` 使用了旧的 appToken 生成流程（前端用 appId + appSecret 本地 MD5 生成 appToken），而最新 SDK 架构已改为：后端通过签名调用开放平台 `/api/thirdparty/oauth/authorizeUrl` 获取 authorizeUrl，前端用 authorizeUrl 调用 Web SDK 完成授权。当前 demo 与 SDK API 完全不匹配。

### Solution

重写 `sdk-demo.html`，改为两步流程：
1. 用户输入 appId + appSecret → 前端用 MD5 签名调用开放平台接口 → 获取 authorizeUrl
2. 用 authorizeUrl 调用 `CregisWebSDK.openAuthorization()` 打开授权页面

Demo 使用 ES Module 导入 SDK，使用最新的事件回调 API。

### Scope

**In Scope:**
- 重写 `sdk-demo.html` 页面 UI 和交互逻辑
- 添加 appId/appSecret/baseUrl 输入字段
- 实现前端 MD5 签名逻辑调用开放平台获取 authorizeUrl
- 集成最新 Web SDK API（popup/tab/window 三种模式）
- 完整的授权结果展示和状态管理

**Out of Scope:**
- 修改 SDK 源码
- 修改后端 API
- 生产环境安全加固（appSecret 不应暴露在前端，此 demo 仅用于测试）

## Context for Development

### Codebase Patterns

- **Web SDK**: ES Module 导出 `CregisWebSDK` 类，位于 `openplatform-sdk/web/src/index.ts`
- **构建产物**: `dist/index.es.js`（ES Module）、`dist/index.umd.js`（UMD）
- **SDK Config**: 只需 `container`, `mode`, `debug` 和回调函数，不再需要 appId/appToken 等
- **事件回调**: `onReady`, `onAuthorizationStarted`, `onAuthorizationComplete`, `onAuthorizationError`, `onAuthorizationCancelled`
- **Demo 已有 md5 依赖**: 页面已引入 `./node_modules/md5/dist/md5.min.js`，通过 `window.md5` 访问
- **Node SDK 参考实现**: `openplatform-sdk/node/src/core/signature.ts` 有完整的签名实现

### 签名算法详情（Basic 签名 - 用于 /oauth/*）

```
signature = MD5(appSecret + appId + timestamp + nonce + MD5(JSON.stringify(sortKeys(business))))
```

**关键细节：**
- `timestamp`: Unix 时间戳（**秒**，不是毫秒），使用 `Math.floor(Date.now() / 1000)`
- `nonce`: 32 位随机字母数字字符串
- `business`: 按 key 排序后 JSON 序列化
- `sortKeys`: 递归排序嵌套对象的 key

### API 接口详情

**端点：** `POST {baseUrl}/api/thirdparty/oauth/authorizeUrl`

**请求格式：**
```json
{
  "basic": {
    "appId": "uuid-string",
    "timestamp": 1742947200,
    "nonce": "random32chars",
    "signature": "32-hex-string"
  },
  "business": {
    "permissions": [],
    "redirectUri": "",
    "state": "random-uuid"
  }
}
```

**响应格式：**
```json
{
  "code": 0,
  "message": "Success",
  "data": {
    "authorizeUrl": "https://.../auth/authorize?appId=xxx&appToken=yyy&...",
    "expiresIn": 7200
  }
}
```

### Files to Reference

| File | Purpose |
|------|---------|
| `openplatform-sdk/web/src/index.ts` | Web SDK 源码，确认最新 API |
| `openplatform-sdk/web/src/types.ts` | SDKConfig 和 AuthorizationResult 类型定义 |
| `openplatform-sdk/web/examples/popup.html` | 最新使用示例参考 |
| `openplatform-sdk/node/src/core/signature.ts` | 签名算法参考实现 |
| `openplatform-sdk/node/src/core/index.ts` | Node SDK getAuthorizationUrl 实现 |
| `docs/signature-spec.md` | 签名算法规范 |

### Technical Decisions

1. **前端签名**: Demo 使用纯前端 `window.md5` 计算签名（生产环境应通过后端代理）
2. **ES Module 导入**: 使用 `<script type="module">` + `import { CregisWebSDK } from '../dist/index.es.js'`
3. **Business 参数**: permissions 空数组，redirectUri 空字符串，state 使用 crypto.randomUUID() 生成
4. **接口路径**: `POST {baseUrl}/api/thirdparty/oauth/authorizeUrl`
5. **md5 库**: 使用 `window.md5` 函数（页面已引入）

## Implementation Plan

### Tasks

- [ ] Task 1: 重写 HTML 表单结构
  - File: `openplatform-sdk/web/sdk-demo.html`
  - Action: 替换整个 `<body>` 内的 `.content` 区域
  - Notes:
    1. 保留 `.header` 区域，标题改为 "Cregis SDK Demo - 授权测试"
    2. 移除旧的 appId、appSecret、appToken（readonly）、appName、appLogoUrl 输入框
    3. 移除旧的 `generateAppTokenBtn` 按钮和 md5 相关逻辑
    4. 移除旧的自定义 `#sdk-container` 和 `#sdk-modal` DOM 元素（SDK 内部已处理）
    5. 新表单包含：
       - `appId` 输入框（text，placeholder: "输入 App ID"）
       - `appSecret` 输入框（password，placeholder: "输入 App Secret"）
       - `baseUrl` 输入框（text，默认值: "http://localhost:1002"）
       - `mode` 选择器（popup/tab/window，默认 popup）
       - "获取 authorizeUrl" 按钮（id: `getAuthUrlBtn`）
       - "打开授权" 按钮（id: `openAuthBtn`，初始 disabled）
       - "关闭授权" 按钮（id: `closeBtn`，初始 disabled）
       - authorizeUrl 展示区域（readonly input，获取成功后填入）
       - 结果展示区域（id: `result`）
       - 状态面板（SDK 状态、授权状态、authorizeId）

- [ ] Task 2: 实现签名工具和获取 authorizeUrl 逻辑
  - File: `openplatform-sdk/web/sdk-demo.html` `<script>` 部分
  - Action: 在 `<script type="module">` 中实现以下函数
  - Notes:
    1. `generateNonce(length = 32)`: 生成 32 位随机字母数字字符串
    2. `sortKeys(obj)`: 递归排序对象 key
    3. `calculateBasicSignature({ appId, appSecret, timestamp, nonce, business })`: 实现 Basic 签名
       - 公式: `MD5(appSecret + appId + timestamp + nonce + MD5(JSON.stringify(sortKeys(business))))`
    4. `getAuthorizeUrl(appId, appSecret, baseUrl)`: 调用开放平台接口
       - 构建 business: `{ permissions: [], redirectUri: "", state: crypto.randomUUID() }`
       - timestamp: `Math.floor(Date.now() / 1000)`（秒级）
       - 计算签名，构建 basic 对象
       - `fetch(`${baseUrl}/api/thirdparty/oauth/authorizeUrl`, { method: 'POST', body: JSON.stringify({ basic, business }) })`
       - 解析响应返回 `authorizeUrl`

- [ ] Task 3: 集成 Web SDK
  - File: `openplatform-sdk/web/sdk-demo.html` `<script type="module">`
  - Action: 使用 ES Module 导入 SDK 并实现授权流程
  - Notes:
    1. 导入: `import { CregisWebSDK } from '../dist/index.es.js'`
    2. 全局变量: `let sdk = null; let currentAuthorizeUrl = null;`
    3. `initSDK(mode)`: 创建 SDK 实例，配置回调
       - `onReady: ({ uuid }) => console.log + 更新状态`
       - `onAuthorizationStarted: () => 更新状态为"授权中"`
       - `onAuthorizationComplete: ({ authorizeId }) => 更新状态 + 展示结果`
       - `onAuthorizationError: (error) => 更新状态 + 展示错误`
       - `onAuthorizationCancelled: () => 更新状态 + 展示取消`
    4. "获取 authorizeUrl" 按钮事件:
       - 校验输入 → 调用 `getAuthorizeUrl()` → 展示 authorizeUrl → 启用"打开授权"按钮
    5. "打开授权" 按钮事件:
       - 调用 `initSDK(mode)` → `sdk.openAuthorization(currentAuthorizeUrl)` → 展示结果

- [ ] Task 4: UI 状态管理和清理
  - File: `openplatform-sdk/web/sdk-demo.html`
  - Action: 完善按钮状态切换和页面生命周期
  - Notes:
    1. 按钮状态逻辑:
       - 获取中: `getAuthUrlBtn` disabled + text "获取中..."
       - 获取成功: `openAuthBtn` enabled
       - 授权中: `openAuthBtn` disabled + `closeBtn` enabled
       - 授权完成: 所有按钮恢复可用状态
    2. `window.addEventListener('beforeunload')` 中调用 `sdk.destroy()`
    3. 移除旧的 `<script src="./node_modules/md5/dist/md5.min.js">`，改为在 module script 中直接使用 `window.md5`
    4. 移除不再需要的 CSS 样式（如旧的 `#sdk-container`、`#sdk-modal` 相关样式）

### Acceptance Criteria

- [ ] AC 1: Given 用户打开页面，When 输入有效的 appId、appSecret 和 baseUrl，点击"获取 authorizeUrl"，Then 页面调用 `POST {baseUrl}/api/thirdparty/oauth/authorizeUrl` 并显示返回的 authorizeUrl
- [ ] AC 2: Given 签名计算正确，When 请求发送到开放平台，Then 响应包含有效的 authorizeUrl 和 expiresIn
- [ ] AC 3: Given 已成功获取 authorizeUrl，When 用户选择 popup 模式并点击"打开授权"，Then SDK 以弹框模式打开授权页面
- [ ] AC 4: Given 已成功获取 authorizeUrl，When 用户选择 tab 模式并点击"打开授权"，Then SDK 在新标签页打开授权页面
- [ ] AC 5: Given 已成功获取 authorizeUrl，When 用户选择 window 模式并点击"打开授权"，Then SDK 在弹窗窗口打开授权页面
- [ ] AC 6: Given 授权流程开始，When 用户完成授权操作，Then 页面显示授权结果（包含 authorizeId）
- [ ] AC 7: Given 用户在授权过程中点击取消，When 授权被取消，Then 页面显示"用户取消了授权"
- [ ] AC 8: Given 签名计算错误或 appId/appSecret 无效，When 调用获取 authorizeUrl 接口，Then 页面显示错误信息
- [ ] AC 9: Given 用户未输入 appId 或 appSecret，When 点击"获取 authorizeUrl"，Then 页面提示"请输入 App ID 和 App Secret"

## Additional Context

### Dependencies

- `md5` 库: 页面需引入 `./node_modules/md5/dist/md5.min.js`（通过 `<script>` 标签加载，在 module script 之前）
- 开放平台服务: 需要运行中的开放平台后端服务（默认 `http://localhost:1002`）
- 浏览器要求: 支持 ES Module 和 `crypto.randomUUID()` 的现代浏览器

### Testing Strategy

- **手动测试**: 打开页面，输入有效凭据，验证完整授权流程
- **签名验证**: 确认签名计算与 Node SDK `calculateBasicSignature` 结果一致
- **三种模式测试**: 分别测试 popup、tab、window 三种授权模式
- **错误场景**: 测试无效凭据、网络错误、授权取消等场景
- 需要有效的 appId 和 appSecret 以及运行中的开放平台服务

### Notes

- **安全风险**: appSecret 在前端暴露仅用于 demo 测试，生产环境必须通过后端代理获取 authorizeUrl
- **demo 定位**: 页面同时作为 SDK 使用示例文档，代码应清晰易读
- **前端签名局限性**: 浏览器端 `window.md5` 与 Node.js `crypto.createHash('md5')` 行为一致，但需注意跨平台兼容性
- **timestamp 精度**: 必须使用秒级时间戳（与 Node SDK 一致），使用 `Math.floor(Date.now() / 1000)`
- **未来改进**: 可考虑添加一个本地代理服务来演示生产环境的安全架构
