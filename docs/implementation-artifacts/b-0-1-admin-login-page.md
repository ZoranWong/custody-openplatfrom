# Story B.0.1: Admin Login Page

Status: ready-for-dev

## Story

As a **platform admin**,
I want to login to the admin portal with my credentials,
So that I can access the admin dashboard and manage the platform.

## Acceptance Criteria

**Given** the admin login page
**When** entering valid admin credentials (email/password)
**Then** authenticate successfully
**And** redirect to admin dashboard
**And** set admin JWT token in cookie (2h expiry)

**Given** invalid credentials
**When** attempting to login
**Then** show error message
**And** do not redirect

**Given** already logged in admin
**When** accessing login page directly
**Then** redirect to admin dashboard

## Tasks / Subtasks

- [ ] Task 1: Create Admin Login Page frontend (AC: Login form, error handling)
  - [ ] Subtask 1.1: Create LoginPage.vue with email/password form
  - [ ] Subtask 1.2: Add form validation (Element Plus)
  - [ ] Subtask 1.3: Implement login API call
  - [ ] Subtask 1.4: Handle success/error responses
- [ ] Task 2: Create Admin Login API endpoint (AC: Authentication)
  - [ ] Subtask 2.1: Create admin login controller
  - [ ] Subtask 2.2: Validate admin credentials against database
  - [ ] Subtask 2.3: Issue JWT token on success
- [ ] Task 3: Add Admin Login to router (AC: Redirect logic)
  - [ ] Subtask 3.1: Configure login route
  - [ ] Subtask 3.2: Add auth guard for protected routes
  - [ ] Subtask 3.3: Implement redirect logic

## Dev Notes

### Project Structure Notes

- **Frontend Location:** `openplatform-web/admin-portal/src/views/LoginPage.vue`
- **Backend Location:** `openplatform-api-service/src/controllers/admin-auth.controller.ts`
- **API Route:** `POST /api/v1/admin/auth/login`
- **Router:** `openplatform-web/admin-portal/src/router/index.ts`

### Alignment with Architecture

| Aspect | Architecture Spec | Implementation |
|--------|-------------------|----------------|
| Frontend | Vue 3 + Vite + TypeScript | ✅ Use Vue 3 Composition API |
| UI Framework | Element Plus | ✅ Use Element Plus Form components |
| State Management | Pinia | ✅ Use Pinia for auth state |
| HTTP Client | Axios | ✅ Use Axios for API calls |
| API Format | REST `{ code, message, data }` | ✅ Follow existing pattern |
| JWT Token | 2h expiry | ✅ Same as developer portal |
| Naming | kebab-case files | ✅ Apply consistently |

### Dependencies

- Requires `admins` table in database (to be created)
- Requires JWT configuration (already defined in architecture)
- Follow developer login pattern from `developer-portal/src/views/LoginPage.vue`

### References

- [Source: docs/planning-artifacts/architecture.md#Admin Portal Structure]
- [Source: docs/planning-artifacts/architecture.md#API Response Format]
- [Source: docs/planning-artifacts/architecture.md#Authentication & Security]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- `openplatform-web/admin-portal/src/views/LoginPage.vue`
- `openplatform-web/admin-portal/src/router/index.ts`
- `openplatform-web/admin-portal/src/stores/admin-auth.store.ts`
- `openplatform-web/admin-portal/src/services/admin-auth.service.ts`
- `openplatform-api-service/src/controllers/admin-auth.controller.ts`
- `openplatform-api-service/src/services/admin-auth.service.ts`
- `openplatform-api-service/src/routes/v1/admin-auth.routes.ts`
- `openplatform-api-service/src/middleware/admin-auth.middleware.ts`
