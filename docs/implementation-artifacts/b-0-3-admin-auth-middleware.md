# Story B.0.3: Admin Auth Middleware

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **platform admin**,
I want to have comprehensive authentication middleware that protects all admin routes and provides role-based access control,
So that only authorized administrators can access sensitive admin functions.

## Acceptance Criteria

**Given** an unauthenticated request to a protected admin route
**When** accessing any admin-protected endpoint
**Then** return 401 Unauthorized
**And** include trace_id for debugging

**Given** an authenticated admin with insufficient permissions
**When** accessing a route requiring higher privileges
**Then** return 403 Forbidden
**And** include error code for frontend handling

**Given** an admin with super_admin role
**When** accessing any admin route
**Then** grant full access to all routes

**Given** an admin with admin role
**When** accessing routes
**Then** grant access based on permission definitions

**Given** an admin request
**When** any protected endpoint is accessed
**Then** log the request with admin ID, action, and timestamp

## Tasks / Subtasks

- [x] Task 1: Implement Role-Based Access Control (AC: Permission checks by role)
  - [x] Subtask 1.1: Define permission constants for admin operations
  - [x] Subtask 1.2: Create permission enum: VIEW, MANAGE, APPROVE, ADMIN
  - [x] Subtask 1.3: Map roles to permissions matrix
  - [x] Subtask 1.4: Implement checkPermission middleware
- [x] Task 2: Create Admin Permission Middleware (AC: Route protection)
  - [x] Subtask 2.1: Create admin-permission.middleware.ts
  - [x] Subtask 2.2: Implement permission checking logic
  - [x] Subtask 2.3: Add permission denied response format
  - [x] Subtask 2.4: Create route protection decorators
- [x] Task 3: Implement Admin Audit Logging (AC: Log admin actions)
  - [x] Subtask 3.1: Create audit-log.service.ts
  - [x] Subtask 3.2: Log admin ID, action, resource, IP, timestamp
  - [x] Subtask 3.3: Add audit middleware for protected routes
  - [x] Subtask 3.4: Implement audit query endpoints for super_admin
- [x] Task 4: Create Admin Rate Limiting Middleware (AC: Security hardening)
  - [x] Subtask 4.1: Implement per-admin rate limiting
  - [x] Subtask 4.2: Configure limits per endpoint type
  - [x] Subtask 4.3: Add rate limit headers to responses
  - [x] Subtask 4.4: Handle rate limit exceeded responses
- [x] Task 5: Implement Frontend Route Guards (AC: Frontend protection)
  - [x] Subtask 5.1: Create auth navigation guard
  - [x] Subtask 5.2: Implement permission-based route guards
  - [x] Subtask 5.3: Create forbidden page (403)
  - [x] Subtask 5.4: Add auth state to Pinia store

## Dev Notes

### Project Structure Notes

- **Backend Middleware Location:** `openplatform-api-service/src/middleware/`
- **Frontend Guard Location:** `openplatform-web/admin-portal/src/router/`
- **Audit Service:** `openplatform-api-service/src/services/admin-audit.service.ts`

### Alignment with Architecture

| Aspect | Architecture Spec | Implementation |
|--------|-------------------|----------------|
| JWT Auth | Already implemented in b-0-1, b-0-2 | Extend with permissions |
| Role Hierarchy | super_admin > admin > operator | Permission matrix |
| Rate Limiting | Already has basic implementation | Extend per-admin |
| Audit Logging | Required for compliance | New implementation |

### Dependencies

- Builds upon: b-0-1 (login), b-0-2 (token management)
- Requires Redis for rate limiting and audit storage
- Frontend: Vue Router navigation guards

### Security Considerations

- All admin endpoints require authentication
- Super_admin bypasses all permission checks
- Audit logs are immutable (write-only)
- Rate limits prevent brute force attacks

### References

- [Source: docs/implementation-artifacts/b-0-1-admin-login-page.md]
- [Source: docs/implementation-artifacts/b-0-2-admin-jwt-token-management.md#Code Review Findings]
- [Source: docs/planning-artifacts/architecture.md#Authentication & Security]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Completed all 5 tasks as specified in the story
- Fixed duplicate Resource import in admin-permission.middleware.ts
- Refactored permission.store.ts to avoid circular store dependencies
- Created shared admin-permissions.ts to synchronize frontend/backend permission types
- All code review issues resolved (5 issues fixed):
  - Created admin.controller.ts for audit query endpoints
  - Added shutdownRateLimitStore() export for graceful shutdown
  - Renamed auditLog interface to AuditLog

### File List

**Backend:**
- `openplatform-api-service/src/middleware/admin-permission.middleware.ts`
- `openplatform-api-service/src/middleware/admin-rate-limit.middleware.ts`
- `openplatform-api-service/src/middleware/admin-audit.middleware.ts`
- `openplatform-api-service/src/services/admin-audit.service.ts`
- `openplatform-api-service/src/constants/admin-permissions.ts`
- `openplatform-api-service/src/controllers/admin.controller.ts` (audit endpoints)

**Frontend:**
- `openplatform-web/admin-portal/src/router/auth-guard.ts`
- `openplatform-web/admin-portal/src/router/permission-guard.ts`
- `openplatform-web/admin-portal/src/views/ForbiddenPage.vue`
- `openplatform-web/admin-portal/src/stores/auth.ts` (updated with permission integration)
- `openplatform-web/admin-portal/src/stores/permission.store.ts`
- `openplatform-web/admin-portal/src/shared/admin-permissions.ts`
