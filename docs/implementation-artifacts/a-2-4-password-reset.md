---
story_id: a-2-4
story_key: a-2-4-password-reset
epic: Module A (Developer Portal)
sub_item: A.2 账号(KYB)
status: done
author: BMad System
date: 2026-02-09
---

# Story a-2-4: Password Reset (密码重置)

**Status:** done (code review passed)

## Story

As a **registered developer who has forgotten their password**,
I want to **reset my password using my email address**,
so that I can **regain access to my account**.

## Acceptance Criteria

1. [x] **AC-1:** Display "Forgot Password" form with email field
2. [x] **AC-2:** Validate email format before submission
3. [x] **AC-3:** Call `POST /api/v1/auth/forgot-password` API
4. [x] **AC-4:** Show success message after email sent
5. [x] **AC-5:** Display password reset form with token validation
6. [x] **AC-6:** Validate new password meets requirements (8+ chars, mixed case, number, special char)
7. [x] **AC-7:** Validate password confirmation matches
8. [x] **AC-8:** Call `POST /api/v1/auth/reset-password` API
9. [x] **AC-9:** Redirect to login page after successful reset
10. [x] **AC-10:** Show error for invalid/expired token

## Tasks / Subtasks

- [x] Task 1: Create ForgotPasswordPage view
  - [x] Subtask 1.1: Create email input form
  - [x] Subtask 1.2: Add submit button with loading state
  - [x] Subtask 1.3: Display success message after email sent

- [x] Task 2: Create ResetPasswordPage view
  - [x] Subtask 2.1: Create password and confirm password fields
  - [x] Subtask 2.2: Add password strength indicator
  - [x] Subtask 2.3: Add token validation from URL query param

- [x] Task 3: Implement password validation
  - [x] Subtask 3.1: Validate password requirements
  - [x] Subtask 3.2: Validate password confirmation match
  - [x] Subtask 3.3: Show inline validation errors

- [x] Task 4: Integrate auth service
  - [x] Subtask 4.1: Call forgot password API
  - [x] Subtask 4.2: Call reset password API
  - [x] Subtask 4.3: Handle error responses

- [x] Task 5: Add route configuration
  - [x] Subtask 5.1: Configure /forgot-password route
  - [x] Subtask 5.2: Configure /reset-password route with token param

- [x] Task 6: Add unit tests
  - [x] Subtask 6.1: Test form validation
  - [x] Subtask 6.2: Test API integration
  - [x] Subtask 6.3: Test navigation flow

## Dev Notes

### Technical Requirements

- **Framework:** Vue 3 (Composition API) + Vite + TypeScript
- **UI Library:** Element Plus + Tailwind CSS v3.4
- **State Management:** Pinia
- **Routing:** Vue Router 4

### API Specifications

**Endpoint 1: POST /api/v1/auth/forgot-password**

Request:
```json
{
  "email": "user@example.com"
}
```

Response:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

**Endpoint 2: POST /api/v1/auth/reset-password**

Request:
```json
{
  "token": "reset_token_from_email",
  "password": "NewPassword123!"
}
```

Response:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

### Token Storage

Reset token will be received via email and passed via URL query parameter:
```
/reset-password?token={reset_token}
```

### File Structure Requirements

```
openplatform-web/developer-portal/
├── src/
│   ├── views/
│   │   └── auth/
│   │       ├── ForgotPasswordPage.vue
│   │       └── ResetPasswordPage.vue
│   ├── services/
│   │   └── auth.service.ts (update)
│   ├── router/
│   │   └── index.ts (update)
│   └── types/
│       └── auth.ts (update)
└── tests/
    └── unit/
        ├── forgot-password.spec.ts
        └── reset-password.spec.ts
```

### Security Considerations

- Reset tokens should have limited expiration time
- Implement rate limiting for forgot password endpoint
- Never reveal if email exists in the system
- Clear sensitive data after password reset
- Use HTTPS in production

### Testing Requirements

- Unit tests: >80% coverage
- Component tests: >70% coverage
- Test form validation
- Test API error handling
- Test navigation flow

### References

- [Story a-2-2: User Login](./a-2-2-user-login.md)
- [Auth API Documentation](../api/auth-api.md)

---

## Dev Agent Record

### Agent Model Used

Claude Mini (MiniMax-M2.1)

### Implementation Summary

Story a-2-4 Password Reset 实现完成。页面已存在（已由之前的开发创建），本次添加了单元测试。

### Files Created

| File | Description |
|------|-------------|
| `tests/unit/forgot-password.test.ts` | 忘记密码页面 Vue 组件测试 (17 tests) |
| `tests/unit/reset-password.test.ts` | 重置密码页面 Vue 组件测试 (31 tests) |

### Test Coverage

- **Email Validation**: Empty, format, subdomain, plus sign handling
- **Password Validation**: Length, uppercase, lowercase, number, special character
- **Password Strength**: Calculation and UI mapping (弱/一般/中等/较强/强)
- **Confirm Password**: Matching validation
- **Token Extraction**: Query parameter parsing
- **API Integration**: Mocked API calls verification
- **Component Rendering**: Full Vue component mount tests
- **Security**: Email existence disclosure prevention

### Code Review Fixes Applied

| Issue | Severity | Fix Applied |
|-------|----------|-------------|
| 邮箱存在性信息泄露 | HIGH | 错误时也显示成功消息，防止枚举攻击 |
| 测试未测试实际组件 | HIGH | 重写测试使用 Vue Test Utils mount |
| 缺少 API 集成测试 | MEDIUM | 添加 API mock 和调用验证 |
| Token 验证时机 | MEDIUM | 已在 mount 和 submit 时验证 |

### Notes

- 页面使用 Element Plus 组件库
- 密码强度显示：5级进度条 + 文字标签
- 密码可见性切换功能 (Show/Hide)
- API 集成使用现有的 apiService.forgotPassword 和 apiService.resetPassword
- 路由已配置: /forgot-password, /reset-password?token={token}

### Completion Date

2026-02-12 (Initial)
2026-02-12 (Code Review Fixes)

---

*Story implemented by BMAD workflow - Context-driven implementation engine*
