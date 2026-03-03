# Story 2.3: TOTP验证

Status: done

## Story

As an **end user**,
I want to enter my Google Authenticator code,
So that I can complete two-factor authentication.

## Acceptance Criteria

1. Given password verification succeeded, When user enters valid TOTP code, Then verification succeeds
2. Given password verification succeeded, When user enters invalid TOTP code, Then error message is shown
3. Given TOTP verification succeeds, Then authorization proceeds to confirmation
4. Given TOTP fails 3 times, Then user must restart login

## Tasks / Subtasks

- [x] Task 1: Implement TOTP input validation (AC: 1, 2)
  - [x] Subtask 1.1: Validate 6-digit numeric code format
  - [x] Subtask 1.2: Display countdown timer for code refresh
  - [x] Subtask 1.3: Handle verification API response
- [x] Task 2: Handle TOTP success flow (AC: 3)
  - [x] Subtask 2.1: Store token in localStorage after successful verification
  - [x] Subtask 2.2: Navigate to enterprise selection
- [x] Task 3: Handle TOTP failure (AC: 4)
  - [x] Subtask 3.1: Track failed attempts
  - [x] Subtask 3.2: Show error message after failed attempt
  - [x] Subtask 3.3: Lock after 3 failures

---

## Story Context

### From Epic 1 (Authorization SDK MVP)

**Epic Goal:** 演示完整的授权流程（开发者集成 → 用户登录 → 授权完成）

**This Story's Role:** Module 2 Story 3 - Complete TOTP verification after password login

### Dependencies

- Story 2.2: 密码登录验证 (done)
- Story 2.4: 授权确认 (depends on this)

### Previous Story Context

Story 2.2 已完成以下实现:
- 登录页面: `LoginForm.vue`
- 认证服务: `auth.ts` (login, secondAuthenticate)
- TOTP 组件: `TotpForm.vue` (已创建但需完善)
- Token 存储: `tokenStorage.ts`

---

## Technical Requirements

### Project Structure

```
openplatform-web/auth-page/
├── src/
│   ├── components/
│   │   ├── LoginForm.vue        # 登录表单
│   │   ├── TotpForm.vue         # TOTP 验证组件 (需完善)
│   │   ├── EnterpriseSelector.vue # 企业选择
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
├── vite.config.ts               # Vite 配置 (含代理)
└── .env                         # 环境变量
```

### API Endpoints

#### TOTP 验证
```
POST /v1/auth/login
Body: {
  tempToken: string,      // 登录成功后返回的临时 token
  verifyCode: string,     // 用户输入的 6 位 TOTP 码
  email: string,          // 用户邮箱
  secondStepType: 'GOOGLE_CODE' | 'RECOVERY_CODE'
}
Response: {
  code: 200,
  data: {
    token: string,
    refreshToken: string,
    tokenTimeout: number,
    refreshTokenTimeout: number,
    userId: string,
    email: string,
    role: string[],
    permission: string[]
  }
}
```

#### 企业列表
```
GET /v1/merchant/member/list
Headers: Authorization: Bearer {token}
Response: {
  code: 200,
  data: [{
    ecode: string,
    merchantName: string,
    state: 'ACTIVE' | 'INACTIVE' | 'PENDING'
  }]
}
```

### Vite 代理配置

```typescript
// vite.config.ts
proxy: {
  '/v1': {
    target: 'http://api.vaulink.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/v1/, '/custody'),
  },
}
```

### Component: TotpForm.vue

已存在的组件，需要完善以下功能:

1. **TOTP 输入框**
   - 6 位数字输入
   - 自动聚焦
   - 自动提交（输入完成 6 位后）

2. **倒计时显示**
   - 显示 TOTP 码剩余有效时间（30 秒周期）
   - 不足 10 秒时警告颜色

3. **返回按钮**
   - 返回登录页面重新输入凭证

### Token 存储

使用 localStorage 存储:
- `auth_token`: 访问令牌
- `auth_token_expiry`: 令牌过期时间
- `auth_user_info`: 用户信息 JSON

---

## Architecture Compliance

### Coding Standards

- 使用 camelCase 命名 (参考 CLAUDE.md)
- Vue 3 Composition API + TypeScript
- 组件命名: PascalCase (如 LoginForm.vue)
- 工具函数: camelCase (如 tokenStorage.ts)

### UI/UX Requirements

1. 按钮样式统一:
   - 背景色: #00be78
   - 圆角: 48px (胶囊形)
   - 字体: 16px, font-weight: 500

2. 页面结构:
   - 最大宽度: 400px
   - 圆角: 12px
   - 阴影: 0 4px 20px rgba(0, 0, 0, 0.08)

### Error Handling

1. 登录失败: 显示错误信息，保留输入
2. TOTP 失败: 显示错误信息，清除输入
3. 3 次失败: 锁定账户，显示锁定信息

---

## References

- [Source: docs/planning-artifacts/epic-auth-sdk-mvp.md#Story-23-TOTP-验证]
- [Source: docs/implementation-artifacts/2-2-password-login.md]
- [Source: openplatform-web/auth-page/src/components/TotpForm.vue]
- [Source: openplatform-web/auth-page/src/services/auth.ts]
- [Source: openplatform-web/auth-page/src/utils/tokenStorage.ts]

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List (Actual)

- `openplatform-web/auth-page/src/App.vue` - 添加 TOTP 失败追踪和锁定逻辑
- `openplatform-web/auth-page/src/components/TotpForm.vue` - 添加失败后清除输入框逻辑
