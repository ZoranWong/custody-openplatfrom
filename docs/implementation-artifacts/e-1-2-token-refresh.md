# Story e-1-2: Token Auto Refresh (Token 自动刷新)

**Story ID:** e-1-2
**Module:** E (Admin Portal API 集成)
**Priority:** P0
**Estimated Points:** 2
**Status:** review

---

## Story

As an **authenticated admin**,
I want my access token to be automatically refreshed when it expires,
So that I can continue using the admin portal without interruption.

## Acceptance Criteria

### 1. Token Refresh Logic (AC: #1-2)
- [x] Access token automatically refreshed when expired
- [x] Only one refresh request for concurrent API calls

### 2. Error Handling (AC: #3)
- [x] On refresh failure, redirect to login page
- [x] All waiting requests succeed after refresh

### 3. Cookie Management (AC: #4)
- [x] getCookie function implemented
- [x] deleteCookie function implemented

## Tasks / Subtasks

- [x] Task 1: Axios Response Interceptor (AC: 1, 2)
  - [x] 1.1 401 handling logic in response interceptor
  - [x] 1.2 Prevent concurrent refresh with isRefreshing flag

- [x] Task 2: Refresh Queue Management (AC: 2)
  - [x] 2.1 failedRequests queue implementation
  - [x] 2.2 Retry all requests after successful refresh
  - [x] 2.3 Clear queue and logout on refresh failure

- [x] Task 3: Cookie Helper Functions (AC: 4)
  - [x] 3.1 getCookie function implementation
  - [x] 3.2 deleteCookie function implementation

## Dev Notes

### Architecture Patterns

**Token Refresh Flow:**
```
API Request → 401 Response → Check Refresh Token → Refresh API Call → Update Tokens → Retry Original Request
                            ↓
                    Add to Queue (if already refreshing)
```

**Concurrent Request Handling:**
```typescript
// Multiple requests get 401 simultaneously
// Only first request triggers refresh
// Other requests wait for the refresh promise
```

### Project Structure Notes

Frontend path: `openplatform-web/admin-portal/`
- Services: `src/services/api.ts` (lines 123-229)
- Utils: Cookie helpers in api.ts

### Implementation Details

**Refresh Token Storage:**
- Stored in localStorage for API access
- Also set as httpOnly cookie for automatic refresh

**Refresh Failure Handling:**
- Clears all authentication data
- Redirects to login page

### References

- Module B Story b-0-2-admin-jwt-token-management (Token Store): [docs/implementation-artifacts/b-0-2-admin-jwt-token-management.md]
- Module C Story c-1-2-jwt-token-management (JWT Backend): [docs/implementation-artifacts/c-1-2-jwt-token-management.md]
- Sprint Status: [docs/sprint-status.yaml#e-1-2-token-refresh]

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A - Implementation already complete

### Completion Notes List

- Token refresh interceptor already implemented in api.ts
- Uses isRefreshing flag to prevent concurrent refresh
- Handles 401 errors and automatically refreshes tokens
- Failed requests are retried after successful refresh
- Logout handler clears all tokens and redirects

### Implementation Summary

**Interceptor Logic:**
```typescript
// Check for 401 and not already retrying
if (error.response?.status === 401 && !originalRequest._retry) {
  // Prevent multiple refresh attempts
  if (!this.isRefreshing) {
    this.isRefreshing = true
    this.refreshPromise = this.refreshAccessToken(refreshToken)
  }
  // Wait for refresh and retry
}
```

**Cookie Functions:**
- getCookie(): Reads cookie by name
- deleteCookie(): Clears cookie with path=/

### File List

**Frontend:**
- `openplatform-web/admin-portal/src/services/api.ts`

## Change Log

- 2026-02-11: Story created from sprint-status.yaml
- 2026-02-11: Verified implementation - all tasks marked done
