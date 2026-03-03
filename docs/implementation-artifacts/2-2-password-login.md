# Story 2.2: 密码登录验证

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **end user**,
I want to log in with my password,
So that I can authenticate to Custody.

## Acceptance Criteria

1. Given login form is displayed, When user enters valid credentials, Then authentication succeeds
2. Given login form is displayed, When user enters invalid credentials, Then error message is shown
3. Given authentication succeeds, Then user is prompted for TOTP code
4. Given authentication fails 3 times, Then account is locked

## Tasks / Subtasks

- [x] Task 1: Implement password validation (AC: 1, 2)
  - [x] Subtask 1.1: Create API call to validate credentials
  - [x] Subtask 1.2: Handle success response
  - [x] Subtask 1.3: Handle error response
- [x] Task 2: Add retry limiting (AC: 4)
  - [x] Subtask 2.1: Track failed attempts
  - [x] Subtask 2.2: Lock account after 3 failures

---

## Story Context

### From Epic 1 (Authorization SDK MVP)

**Epic Goal:** 演示完整的授权流程（开发者集成 → 用户登录 → 授权完成）

**This Story's Role:** Module 2 Story 2 - After login form, verify password and prompt for TOTP

### Dependencies

- Story 2.1: 登录页面渲染 (ready-for-dev)

---

## Technical Requirements

### API Endpoint

```
POST /v1/auth/first-step-validation
Body: { email, password, loginType: 'PASSWORD' }
Response: { code: 200, data: { token, refreshToken, tempToken?, requiresSecondAuth, ... }, message? }
```

---

## References

- [Source: docs/planning-artifacts/epic-auth-sdk-mvp.md#Story-22-密码登录验证]

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- `openplatform-web/auth-page/src/components/LoginForm.vue` - 密码登录表单组件
- `openplatform-web/auth-page/src/services/auth.ts` - 认证 API 服务 (login, secondAuthenticate)
- `openplatform-web/auth-page/src/components/TotpForm.vue` - TOTP 验证组件
- `openplatform-web/auth-page/src/components/SvgIcon.vue` - SVG 图标组件
- `openplatform-web/auth-page/src/components/EnterpriseSelector.vue` - 企业选择组件
- `openplatform-web/auth-page/src/assets/svgs/logo.svg` - Logo SVG 文件
- `openplatform-web/auth-page/src/assets/svgs/google-auth.svg` - Google Authenticator 图标
- `openplatform-web/auth-page/vite.config.ts` - 添加 vite-plugin-svg-icons 配置和代理
- `openplatform-web/auth-page/.env` - API 基础 URL 配置
- `openplatform-web/auth-page/src/main.ts` - 添加 SVG 注册和全局组件
- `openplatform-web/auth-page/src/utils/tokenStorage.ts` - Token 持久化工具
- `openplatform-web/auth-page/src/types/index.ts` - 类型定义
- `openplatform-web/auth-page/src/vite-env.d.ts` - 环境变量类型定义
