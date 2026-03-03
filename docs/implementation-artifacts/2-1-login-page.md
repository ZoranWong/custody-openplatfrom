# Story 2.1: 登录页面渲染

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **end user**,
I want to see a login form,
So that I can enter my Custody credentials.

## Acceptance Criteria

1. Given authorization page is loaded in iframe, When token is received from parent, Then login form is displayed
2. Given login form is displayed, When user enters username/password, Then credentials can be submitted
3. Given iframe receives postMessage, When token is invalid, Then error message is displayed
4. Given iframe receives postMessage, When token is valid, Then login form is shown with Cregis branding

## Tasks / Subtasks

- [ ] Task 1: Create authorization page project structure (AC: 1)
  - [ ] Subtask 1.1: Set up Vue 3 project for authorization page
  - [ ] Subtask 1.2: Configure iframe communication
- [ ] Task 2: Implement login form UI (AC: 1, 2)
  - [ ] Subtask 2.1: Create login form component
  - [ ] Subtask 2.2: Add username/password input fields
  - [ ] Subtask 2.3: Add submit button
- [ ] Task 3: Handle token from parent (AC: 3, 4)
  - [ ] Subtask 3.1: Set up listenFromParent for token
  - [ ] Subtask 3.2: Validate token format
  - [ ] Subtask 3.3: Show error or login form based on token validity
- [ ] Task 4: Add Cregis branding (AC: 4)
  - [ ] Subtask 4.1: Add Cregis logo
  - [ ] Subtask 4.2: Style login page with Cregis theme

## Story Context

### From Epic 1 (Authorization SDK MVP)

**Epic Goal:** 演示完整的授权流程（开发者集成 → 用户登录 → 授权完成）

**This Story's Role:** Module 2 Story 1 - Authorization page must display login form after receiving token from SDK

### Dependencies

- Story 1.2: 唤起授权页面 (已完成 - SDK打开iframe)

### Technical Context

| Component | Technology |
|-----------|------------|
| Authorization Page | Vue 3 |
| Build Tool | Vite |
| Communication | iframe + postMessage |
| Styling | CSS (Cregis theme) |

---

## Technical Requirements

### Project Structure

```
openplatform-web/src/
├── auth-page/              # Authorization page (iframe)
│   ├── src/
│   │   ├── main.ts        # Vue entry point
│   │   ├── App.vue        # Root component
│   │   ├── components/
│   │   │   └── LoginForm.vue
│   │   └── utils/
│   │       └── postMessage.ts
│   ├── index.html
│   └── vite.config.ts
```

### Token Reception

The iframe receives token via postMessage from parent:

```typescript
// Parent (SDK) sends:
{
  action: 'init',
  data: {
    appId: 'xxx',
    token: 'access-token',
    permissions: ['read', 'write'],
    redirectUri: 'https://...',
    state: 'csrf-token'
  }
}
```

### Login Form Requirements

- Username input (email or user ID)
- Password input (masked)
- Submit button
- Error message display area
- Cregis branding (logo + theme)

---

## Architecture Compliance

### From Architecture Document

| Rule | Compliance |
|------|------------|
| 授权页面 | Vue 3 嵌入式页面 |
| iframe 嵌入式页面 | 使用 iframe + postMessage 通信 |
| 前端框架 | Vue 3 + TypeScript |

### Integration with SDK (Module 1)

- Listens for 'init' postMessage from SDK
- Receives appId, token, permissions, redirectUri, state
- Sends 'authorization_result' postMessage back to SDK on completion

---

## Library/Framework Requirements

### Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| vue | ^3.4 | Frontend framework |
| vite | ^5.0 | Build tool |
| typescript | ^5.0 | Type safety |
| @types/node | ^20 | Node types |

---

## File Structure Requirements

### Files to Create

| File | Purpose |
|------|---------|
| openplatform-web/src/auth-page/index.html | HTML entry point |
| openplatform-web/src/auth-page/src/main.ts | Vue app initialization |
| openplatform-web/src/auth-page/src/App.vue | Root component with token handling |
| openplatform-web/src/auth-page/src/components/LoginForm.vue | Login form component |
| openplatform-web/src/auth-page/src/utils/postMessage.ts | PostMessage utilities |
| openplatform-web/src/auth-page/vite.config.ts | Vite configuration |
| openplatform-web/src/auth-page/tsconfig.json | TypeScript config |

---

## Testing Requirements

### Unit Tests

- Test login form renders with all fields
- Test postMessage listener receives token
- Test error display for invalid token
- Test navigation to password verification on submit

---

## Dev Notes

### Implementation Sequence

1. Set up Vue 3 project for auth-page
2. Configure Vite for iframe deployment
3. Implement postMessage listener for 'init' action
4. Create LoginForm component
5. Add Cregis branding and styling
6. Test end-to-end flow with SDK

### Key Decisions

- Use Vue 3 Composition API
- Single page with conditional rendering (error vs login form)
- Send 'authorization_result' on completion
- Handle errors gracefully with user-friendly messages

---

## References

- [Source: docs/planning-artifacts/prd.md#6-SDK-技术需求]
- [Source: docs/planning-artifacts/epic-auth-sdk-mvp.md#Story-21-登录页面渲染]
- [Source: Story 1.2 implementation - openAuthorization flow]

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Created Vue 3 authorization page project structure
- Implemented login form with username/password inputs
- Added Cregis branding (logo + theme styling)
- Implemented postMessage listener for 'init' from SDK
- Added loading, login, and error view states
- Build passes successfully
- Demo login: username "admin", password "admin" for testing

### Code Review Fixes Applied

- Added origin validation in postMessage listener (setAllowedOrigins/getAllowedOrigins)
- Fixed wildcard origin in sendToParent - now uses stored parentOrigin
- Added token validation before showing login form
- Added setAllowedOrigins, getAllowedOrigins, getParentOrigin exports

### File List

- openplatform-web/auth-page/package.json
- openplatform-web/auth-page/vite.config.ts
- openplatform-web/auth-page/tsconfig.json
- openplatform-web/auth-page/tsconfig.node.json
- openplatform-web/auth-page/index.html
- openplatform-web/auth-page/src/main.ts
- openplatform-web/auth-page/src/App.vue
- openplatform-web/auth-page/src/vite-env.d.ts
- openplatform-web/auth-page/src/components/LoginForm.vue
- openplatform-web/auth-page/src/utils/postMessage.ts
- openplatform-web/auth-page/src/types/index.ts