# Story E1.1: Admin Login (管理员登录)

**Story ID:** E1.1
**Module:** E (Admin Portal API 集成)
**Priority:** P0
**Estimated Points:** 2
**Status:** done

---

## Story

As an **admin**,
I want to login using email and password,
So that I can access the admin portal with JWT token authentication.

## Acceptance Criteria

### 1. Login Functionality (AC: #1-3)
- [x] Admin can login with email and password
- [x] Login failure shows error message
- [x] Successful login redirects to dashboard `/`

### 2. Token Management (AC: #4)
- [x] JWT tokens stored correctly (localStorage + Cookie)

### 3. Login Validation (AC: #5-7)
- [x] Email format validation
- [x] Password field required
- [x] Loading state during API call

### 4. Error Handling (AC: #8)
- [x] Invalid credentials show specific error
- [x] Network error shows appropriate message
- [x] No sensitive information leakage

## Tasks / Subtasks

- [x] Task 1: API Service Implementation (AC: 1)
  - [x] 1.1 Verify adminLogin method in api.ts
  - [x] 1.2 Add login request/response types
  - [x] 1.3 Implement axios response interceptor

- [x] Task 2: Login Page UI (AC: 1, 3, 5-7)
  - [x] 2.1 Verify LoginPage.vue layout
  - [x] 2.2 Add email and password input fields
  - [x] 2.3 Add login button with loading state
  - [x] 2.4 Add error message display
  - [x] 2.5 Implement form validation

- [x] Task 3: Authentication Flow (AC: 2, 4)
  - [x] 3.1 Verify auth.store.ts integration
  - [x] 3.2 Implement Token storage (localStorage)
  - [x] 3.3 Implement Token storage (Cookie for refreshToken)
  - [x] 3.4 Add redirect to dashboard on success

- [x] Task 4: Backend Verification (AC: 1, 2)
  - [x] 4.1 Verify POST /admin/auth/login implementation
  - [x] 4.2 Verify email/password validation logic
  - [x] 4.3 Verify JWT token issuance

## Dev Notes

### Architecture Patterns

**Authentication Flow:**
```
Login Page → API Service → Backend API → JWT Tokens → Auth Store → Router Guard
     ↓              ↓             ↓            ↓             ↓            ↓
  UI Form     Axios Call   Validation   Storage     State Mgmt   Access Control
```

**Token Storage Strategy:**
- accessToken: localStorage (for API requests)
- refreshToken: Cookie (httpOnly preferred, for automatic refresh)

### Project Structure Notes

Frontend path: `openplatform-web/admin-portal/`
- Views: `src/views/LoginPage.vue`
- Services: `src/services/api.ts`
- Stores: `src/stores/auth.ts`
- Router: `src/router/index.ts`

Backend path: `openplatform-api-service/`
- Routes: `src/routes/v1/admin-auth.routes.ts`
- Controller: `src/controllers/admin-auth.controller.ts`

### References

- Module B Story B0.1-admin-login-page (UI Foundation): [docs/implementation-artifacts/B0.1-admin-login-page.md]
- Module B Story B0.2-admin-jwt-token-management (Token Store): [docs/implementation-artifacts/B0.2-admin-jwt-token-management.md]
- Module C Story C1.2-jwt-token-management (JWT Backend): [docs/implementation-artifacts/C1.2-jwt-token-management.md]
- Sprint Status: [docs/sprint-status.yaml#e1-1-admin-login]

### Testing Standards

- Unit tests for auth store
- Integration tests for login API
- E2E tests for login flow
- Mock backend for frontend development

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A - Implementation already complete

### Completion Notes List

- All tasks verified as complete - code already implemented
- Login page has complete UI with form validation, loading state, error handling
- API service has adminLogin, token refresh, logout methods
- Auth store has login, logout, refreshToken, restoreSession
- Backend has complete admin-auth controller with JWT token issuance
- Rate limiting implemented on backend (5 attempts per 15 min)
- httpOnly cookies for refreshToken security
- Token blacklist for logout/revoke support

### Implementation Summary

**Frontend Implementation:**
- LoginPage.vue: Element Plus form with email/password, validation rules, loading state, error display
- api.ts: Axios client with 401 interceptor, token refresh, logout handling
- auth.ts: Pinia store with login/logout/refreshToken/restoreSession

**Backend Implementation:**
- admin-auth.controller.ts: Login with bcrypt password verify, JWT token generation, rate limiting
- admin-auth.routes.ts: /auth/login, /auth/refresh, /auth/logout, /auth/change-password

**Repository Pattern Implementation:**
- Admin repository: `src/repositories/implementations/admin.repository.ts`
- Admin data stored in: `data/admins.json`
- Seed script: `scripts/seed-admin.ts`

### File List

**Frontend:**
- `openplatform-web/admin-portal/src/views/LoginPage.vue`
- `openplatform-web/admin-portal/src/services/api.ts`
- `openplatform-web/admin-portal/src/stores/auth.ts`
- `openplatform-web/admin-portal/src/router/index.ts`

**Backend:**
- `openplatform-api-service/src/routes/v1/admin-auth.routes.ts`
- `openplatform-api-service/src/controllers/admin-auth.controller.ts`

**Repository:**
- `openplatform-api-service/src/repositories/repository.interfaces.ts`
- `openplatform-api-service/src/repositories/implementations/admin.repository.ts`
- `openplatform-api-service/src/repositories/repository.factory.ts`

**Configuration:**
- `.env` (API endpoints)
- `openplatform-web/admin-portal/src/types/auth.ts`

**Data:**
- `openplatform-api-service/data/admins.json`

## Change Log

- 2026-02-11: Story created with comprehensive context from sprint-status.yaml
- 2026-02-11: Verified complete implementation - all tasks marked done
- 2026-02-11: Status updated to "done", renamed file to E1.1-admin-login.md
