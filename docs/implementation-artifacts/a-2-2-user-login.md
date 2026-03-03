---
story_id: a-2-2
story_key: a-2-2-user-login
epic: Module A (Developer Portal)
sub_item: A.2 账号(KYB)
status: done
author: BMad System
date: 2026-02-09
---

# Story a-2-2: User Login (用户登录)

**Status:** done

## Story

As a **registered developer**,
I want to **log in to my account using email and password**,
so that I can **access the developer portal and manage my applications**.

## Acceptance Criteria

1. [x] **AC-1:** Display login form with email and password fields
2. [x] **AC-2:** Validate email format and password requirements on submit
3. [x] **AC-3:** Show validation errors inline when fields are invalid
4. [x] **AC-4:** Call `POST /api/v1/auth/login` API on form submission
5. [x] **AC-5:** Store access token and refresh token in localStorage on success
6. [x] **AC-6:** Redirect user to dashboard on successful login
7. [x] **AC-7:** Display error message for invalid credentials
8. [x] **AC-8:** Add "Forgot Password?" link for password recovery

## Tasks / Subtasks

- [x] Task 1: Create LoginPage view
  - [x] Subtask 1.1: Create login form layout with email and password fields
  - [x] Subtask 1.2: Add "Forgot Password?" link
  - [x] Subtask 1.3: Add login button with loading state

- [x] Task 2: Implement login form validation
  - [x] Subtask 2.1: Validate email format (regex)
  - [x] Subtask 2.2: Validate password is not empty
  - [x] Subtask 2.3: Show inline error messages

- [x] Task 3: Integrate auth service
  - [x] Subtask 3.1: Call `POST /api/v1/auth/login` API
  - [x] Subtask 3.2: Handle success response (store tokens, redirect)
  - [x] Subtask 3.3: Handle error response (show error message)

- [x] Task 4: Add auth store integration
  - [x] Subtask 4.1: Store user profile in auth store
  - [x] Subtask 4.2: Update authentication state
  - [x] Subtask 4.3: Initialize auth state on app start

- [x] Task 5: Add route guard (future)
  - [x] Subtask 5.1: Protect dashboard route from unauthenticated access
  - [x] Subtask 5.2: Redirect to login if not authenticated

- [x] Task 6: Add unit tests (completed)
  - [x] Subtask 6.1: Test form validation
  - [x] Subtask 6.2: Test login API call
  - [x] Subtask 6.3: Test auth store state changes

## Code Review Findings (2026-02-25)

### Issues Fixed

**1. Login Redirect Uses Query Param**
- **Severity:** Medium
- **Issue:** After login, always redirected to /dashboard, ignoring redirect query param
- **Fix:** Added `getRedirectPath()` function to read `redirect` query param
- **Files:** `src/views/LoginPage.vue:30-34`, `src/views/LoginPage.vue:60`

**2. LoginPage Accessibility**
- **Severity:** Medium
- **Issue:** Form inputs lacked ARIA attributes for screen reader support
- **Fix:** Added `id`, `aria-describedby`, `role="form"`, `aria-label`, `role="alert"` for errors
- **Files:** `src/views/LoginPage.vue:101-159`

**3. Test Mock Fixes**
- **Severity:** High
- **Issue:** API service mocks missing default return values causing test failures
- **Fix:** Added `.mockResolvedValue({ code: 0, data: {} })` to default mocks
- **Files:** `tests/unit/auth.test.ts:11-19`

---

### Previous Code Review Findings (2026-02-11)

### Critical Issues Fixed

**1. Token Not Persisted to localStorage**
- **Severity:** Critical
- **Issue:** Token was only stored in reactive `ref`, lost on page refresh
- **Fix:** Added `localStorage.setItem()` in `login()` and restored in `init()`
- **Files:** `src/stores/auth.ts:76-82`, `src/stores/auth.ts:155-168`

**2. Missing Refresh Token Storage**
- **Severity:** High
- **Issue:** `refreshToken` was not being stored, breaking token refresh flow
- **Fix:** Added `refreshToken` ref, localStorage constants, and persistence logic
- **Files:** `src/stores/auth.ts:27`, `src/stores/auth.ts:36-37`, `src/stores/auth.ts:79-82`

**3. API Service Missing refreshToken Storage**
- **Severity:** Medium
- **Issue:** `api.ts` login() only stored accessToken, not refreshToken
- **Fix:** Added refreshToken localStorage persistence
- **Files:** `src/services/api.ts:337-346`

### Files Modified

| File | Changes |
|------|---------|
| `src/stores/auth.ts` | Added refreshToken ref, localStorage persistence in login/init, cleanup in logout |
| `src/services/api.ts` | Added refreshToken storage in login() |
| `tests/unit/auth.test.ts` | Created comprehensive auth store tests |

### Test Coverage

- Token persistence verification
- Login success/failure handling
- Logout token cleanup
- Profile fetching
- Loading/error states
- Computed property calculations

## Dev Notes

### Technical Requirements

- **Framework:** Vue 3 (Composition API) + Vite + TypeScript
- **UI Library:** Element Plus + Tailwind CSS v3.4
- **State Management:** Pinia
- **Routing:** Vue Router 4

### API Specification

**Endpoint:** `POST /api/v1/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "companyName": "公司名称",
      "status": "pending_kyb_review",
      "kybStatus": "pending",
      "createdAt": "2026-02-09T10:00:00Z",
      "updatedAt": "2026-02-09T10:00:00Z"
    }
  }
}
```

**Error Response:**
```json
{
  "code": 1001,
  "message": "Invalid email or password"
}
```

### Token Storage

- **accessToken:** Store in `localStorage.getItem('accessToken')`
- **refreshToken:** Store in `localStorage.getItem('refreshToken')`

### File Structure Requirements

```
openplatform-web/developer-portal/
├── src/
│   ├── views/
│   │   └── auth/
│   │       └── LoginPage.vue
│   ├── components/
│   │   └── auth/
│   │       └── LoginForm.vue
│   ├── services/
│   │   └── auth.service.ts
│   ├── stores/
│   │   └── auth.store.ts
│   ├── router/
│   │   └── index.ts
│   └── types/
│       └── auth.ts
└── tests/
    └── unit/
        ├── login.spec.ts
        └── auth.spec.ts
```

### Security Considerations

- Never store password in localStorage
- Use HTTPS in production
- Implement proper error messages (don't reveal which field is wrong)
- Set reasonable token expiration times
- Implement refresh token rotation

### Testing Requirements

- Unit tests: >80% coverage
- Component tests: >70% coverage
- Test login form validation
- Test API error handling
- Test token storage

### References

- [Story A.2.1: Developer Registration](./A-2-1-developer-registration.md)
- [Auth API Documentation](../api/auth-api.md)
