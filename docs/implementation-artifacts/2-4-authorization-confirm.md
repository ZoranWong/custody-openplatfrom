# Story 2.4: 授权确认

Status: done

## Story

As an **end user**,
I want to confirm authorization,
So that I grant access to my Custody account.

## Acceptance Criteria

1. Given TOTP verification succeeded, When page loads, Then shows authorization details
2. Given authorization details shown, When user clicks "Authorize", Then authorization is submitted
3. Given authorization details shown, When user clicks "Cancel/Back", Then returns to enterprise selection
4. Given authorization submitted, When complete, Then result is sent to parent via postMessage

## Tasks / Subtasks

- [ ] Task 1: Display authorization details (AC: 1)
  - [ ] Subtask 1.1: Show app name and enterprise name
  - [ ] Subtask 1.2: Display authorization confirmation text
- [ ] Task 2: Handle authorization submission (AC: 2)
  - [ ] Subtask 2.1: Submit authorization to backend
  - [ ] Subtask 2.2: Show loading state during submission
- [ ] Task 3: Handle cancel/back action (AC: 3)
  - [ ] Subtask 3.1: Return to enterprise selection
- [ ] Task 4: Send result via postMessage (AC: 4)
  - [ ] Subtask 4.1: Send success result with authorization ID
  - [ ] Subtask 4.2: Send error result on failure

---

## Story Context

### From Epic 1 (Authorization SDK MVP)

**Epic Goal:** 演示完整的授权流程（开发者集成 → 用户登录 → 授权完成）

**This Story's Role:** Module 2 Story 4 - Final authorization confirmation and submission

### Dependencies

- Story 2.3: TOTP验证 (done)
- Story 3.1: Token校验API (pending)

### Previous Story Context

Story 2.3 已完成:
- 登录页面: LoginForm.vue
- TOTP 验证: TotpForm.vue
- 认证服务: auth.ts
- Token 存储: tokenStorage.ts
- 企业选择: EnterpriseSelector.vue

---

## Technical Requirements

### Project Structure

```
openplatform-web/auth-page/
├── src/
│   ├── components/
│   │   ├── LoginForm.vue        # 登录表单
│   │   ├── TotpForm.vue         # TOTP 验证组件
│   │   ├── EnterpriseSelector.vue # 企业选择组件
│   │   └── SvgIcon.vue          # SVG 图标组件
│   ├── services/
│   │   └── auth.ts              # 认证 API 服务
│   ├── utils/
│   │   ├── tokenStorage.ts       # Token 持久化
│   │   └── postMessage.ts        # postMessage 通信
│   ├── types/
│   │   └── index.ts             # 类型定义
│   ├── App.vue                  # 主应用组件
│   └── main.ts                  # 入口文件
├── vite.config.ts               # Vite 配置
└── .env                         # 环境变量
```

### URL Query Parameters

All authorization data is passed via URL query parameters:

```
?appToken=xxx&appId=xxx&appName=xxx&appLogoUrl=xxx&permissions=read,write&redirectUri=xxx&state=xxx
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| appToken | Yes | Third-party platform token |
| appId | Yes | Developer/APP ID |
| appName | No | Third-party platform name |
| appLogoUrl | No | Developer logo URL |
| permissions | No | Permission list (comma-separated, default: read) |
| redirectUri | No | Callback URL after authorization |
| state | No | State parameter for CSRF protection |

### PostMessage Communication

PostMessage only triggers events, data comes from URL:

**From Parent → Auth Page:**
```typescript
{ action: 'init' }      // Trigger initialization
{ action: 'close' }     // Close authorization
{ action: 'cancel' }    // Cancel authorization
```

**From Auth Page → Parent:**
```typescript
// Success
{
  action: 'authorization_result',
  type: 'success',
  data: 'auth-123456'
}

// Error
{
  action: 'authorization_result',
  type: 'error',
  error: {
    code: 'AUTHORIZATION_FAILED',
    message: 'Failed to complete authorization'
  }
}

// Cancelled
{
  action: 'authorization_result',
  type: 'error',
  error: {
    code: 'USER_CANCELLED',
    message: 'User cancelled authorization'
  }
}
```

### Current Implementation (App.vue)

授权页面已在 App.vue 中实现:

1. **显示企业名称和应用名称**
   - `selectedEnterprise?.name` - 企业名称
   - `appName` - 第三方应用名称

2. **授权按钮**
   - Authorize - 提交授权
   - Back - 返回企业选择

3. **handleAuthorize 函数**
   - 调用 submitAuthorization API
   - 发送 postMessage 到父窗口

---

## Architecture Compliance

### Coding Standards

- 使用 camelCase 命名 (参考 CLAUDE.md)
- Vue 3 Composition API + TypeScript
- 组件命名: PascalCase

### UI/UX Requirements

1. 按钮样式统一:
   - 背景色: #00be78 (绿色)
   - 圆角: 48px (胶囊形)
   - 字体: 16px, font-weight: 500

2. 页面结构:
   - 最大宽度: 400px
   - 圆角: 12px
   - 阴影: 0 4px 20px rgba(0, 0, 0, 0.08)

### Test URL

```
http://localhost:5173/auth/?appToken=test-token-123&appId=app-12345&appName=Test%20App&appLogoUrl=https://via.placeholder.com/64&permissions=read,write
```

---

## References

- [Source: docs/planning-artifacts/epic-auth-sdk-mvp.md#Story-24-授权确认]
- [Source: docs/implementation-artifacts/2-3-totp-verification.md]
- [Source: openplatform-web/auth-page/src/App.vue]
- [Source: openplatform-web/auth-page/src/utils/postMessage.ts]

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List (Actual)

- `openplatform-web/auth-page/src/App.vue` - 授权确认页面逻辑
- `openplatform-web/auth-page/src/utils/postMessage.ts` - postMessage 工具
- `openplatform-web/auth-page/src/services/auth.ts` - 授权提交 API
- `openplatform-web/auth-page/src/types/index.ts` - 类型定义 (AuthInitData)

> Note: init message prepares for KYB (Know Your Business) information transfer in future iterations.
