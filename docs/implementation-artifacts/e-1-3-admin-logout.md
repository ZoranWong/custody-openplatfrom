# Story e-1-3: Admin Logout (管理员登出)

**Story ID:** e-1-3
**Module:** E (Admin Portal API 集成)
**Priority:** P0
**Estimated Points:** 0.5
**Status:** review

---

## Story

As an **authenticated admin**,
I want to logout from the admin portal,
So that my session is securely terminated.

## Acceptance Criteria

### 1. Logout Functionality (AC: #1)
- [x] Clicking logout clears all authentication information
- [x] Redirects to `/login` page

### 2. API Integration (AC: #2)
- [x] Backend logout API is called

### 3. Cleanup (AC: #3)
- [x] localStorage cleanup (accessToken, role)
- [x] Cookie cleanup
- [x] Pinia store state cleared
- [x] Permissions cleared

## Tasks / Subtasks

- [x] Task 1: API Service Implementation (AC: 2)
  - [x] 1.1 adminLogout method in api.ts
  - [x] 1.2 POST /admin/auth/logout endpoint

- [x] Task 2: Auth Store Cleanup (AC: 1, 3)
  - [x] 2.1 localStorage cleanup
  - [x] 2.2 Cookie cleanup
  - [x] 2.3 Pinia store state reset
  - [x] 2.4 Permission store clear

- [x] Task 3: Navigation (AC: 1)
  - [x] 3.1 Redirect to login page after logout

## Dev Notes

### Architecture Patterns

**Logout Flow:**
```
Logout Button → Auth Store Logout → API Call → Clear Local Data → Redirect to Login
```

### Project Structure Notes

Frontend path: `openplatform-web/admin-portal/`
- Stores: `src/stores/auth.ts`
- Views: `src/views/layout/Header.vue`

Backend path: `openplatform-api-service/`
- Routes: `src/routes/v1/admin-auth.routes.ts`
- Controller: `src/controllers/admin-auth.controller.ts`

### Implementation Details

**Cleanup Items:**

| Item | Storage |
|------|---------|
| accessToken | localStorage |
| refreshToken | Cookie + localStorage |
| userInfo | Pinia Store |
| role | localStorage |
| permissions | Permission Store |

### References

- Module B Story b-0-1-admin-login-page (UI Foundation): [docs/implementation-artifacts/b-0-1-admin-login-page.md]
- Sprint Status: [docs/sprint-status.yaml#e-1-3-admin-logout]

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A - Implementation already complete

### Completion Notes List

- Logout implementation verified in auth.ts
- Calls POST /admin/auth/logout endpoint
- Clears all local storage and cookies
- Uses router.push() for navigation
- Clears permission store

### Implementation Summary

**Auth Store Logout:**
- Clears user, token, tokenExpiry refs
- Removes localStorage items (accessToken, role)
- Clears permission store
- Calls router.push('/login')

**Backend Logout:**
- Blacklists refresh token
- Clears httpOnly cookies

### File List

**Frontend:**
- `openplatform-web/admin-portal/src/stores/auth.ts`
- `openplatform-web/admin-portal/src/views/layout/Header.vue`

**Backend:**
- `openplatform-api-service/src/routes/v1/admin-auth.routes.ts`
- `openplatform-api-service/src/controllers/admin-auth.controller.ts`

## Change Log

- 2026-02-11: Story created from sprint-status.yaml
- 2026-02-11: Verified implementation - marked for review
