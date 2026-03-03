# Story B.2.1: ISV KYB Review

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **platform admin**,
I want to review ISV KYB applications,
So that I can ensure compliance.

## Acceptance Criteria

**Given** pending ISV KYB applications
**When** reviewing
**Then** display:
- Company name and registration number
- Business license document (with preview)
- UBO (Ultimate Beneficial Owner) information
- Company structure chart
- Contact information
- Submitted timestamp

**And** allow admin to:
- Approve KYB with optional comments (status → approved)
- Reject KYB with required rejection reason (status → rejected)
- Request additional information (status → pending_info)

**And** show audit trail:
- Review history with timestamps
- Admin actions logged

## Tasks / Subtasks

- [x] Task 1: Create backend KYB review API endpoints (AC: API endpoints for KYB data and actions)
  - [x] Subtask 1.1: Create KYB review controller with CRUD operations
  - [x] Subtask 1.2: Implement GET /admin/kyb/pending - List pending KYB applications
  - [x] Subtask 1.3: Implement GET /admin/kyb/:id - Get KYB application details
  - [x] Subtask 1.4: Implement POST /admin/kyb/:id/approve - Approve KYB
  - [x] Subtask 1.5: Implement POST /admin/kyb/:id/reject - Reject KYB with reason
- [x] Task 2: Create KYB service layer (AC: Business logic)
  - [x] Subtask 2.1: Create kyb-review.service.ts
  - [x] Subtask 2.2: Implement validation and state transitions
  - [x] Subtask 2.3: Create audit log entries on state changes
- [x] Task 3: Create frontend KYB review page (AC: UI components)
  - [x] Subtask 3.1: Create KYBPendingListPage.vue with table and filters
  - [x] Subtask 3.2: Create KYBReviewDetailPage.vue with document preview
  - [x] Subtask 3.3: Implement approval/rejection dialogs
  - [x] Subtask 3.4: Add status badges and action buttons
- [x] Task 4: Integrate with admin layout (AC: Navigation)
  - [x] Subtask 4.1: Add KYB Review routes to router
  - [x] Subtask 4.2: Add route for KYB review pages
  - [x] Subtask 4.3: Apply permission guard (ISV_KYB)

## Dev Notes

### Project Structure Notes

**Backend Location:**
- `openplatform-api-service/src/controllers/` - KYB controller
- `openplatform-api-service/src/services/` - KYB service
- `openplatform-api-service/src/routes/v1/` - KYB routes

**Frontend Location:**
- `openplatform-web/admin-portal/src/views/kyb/` - KYB pages
- `openplatform-web/admin-portal/src/components/kyb/` - KYB components

### Architecture Alignment

| Aspect | Requirement | Implementation |
|--------|-------------|----------------|
| API Format | { code, message, data } | Standard response wrapper |
| Authentication | JWT Bearer Token | Existing admin auth middleware |
| Permission | ISV_KYB required | requirePermission(Resource.ISV_KYB) |
| Validation | Input sanitization | express-validator for approve/reject |
| Audit | State change logging | admin-audit.middleware.ts |

### Dependencies

- Builds upon: b-0-3 (admin auth middleware, ISV_KYB permission)
- Integration with: Developer portal KYB submission flow (future)
- UI Library: Element Plus (Vue 3)

### UX Design Considerations

- Three-column layout for admin (Navigation + Main + Right Panel)
- Document preview in modal/side panel
- Status badges: pending (orange), approved (green), rejected (red)
- Toast notifications for action feedback
- Loading states during API calls

### References

- [Source: docs/planning-artifacts/epics.md#B.2 ISV KYB 审核]
- [Source: docs/planning-artifacts/architecture.md#API Response format]
- [Source: docs/planning-artifacts/ux-design-specification.md#Admin Dashboard Layout]
- [Source: docs/implementation-artifacts/b-0-3-admin-auth-middleware.md] (permissions)

## Dev Agent Record

### Agent Model Used

claude-code (MiniMax-M2.1)

### Debug Log References

### Completion Notes List

- Implemented KYB review service with in-memory storage (ready for DB integration)
- Created 6 API endpoints: list pending, list all, get details, approve, reject, request-info, stats
- Frontend includes status tabs, search/filter, and action dialogs
- Routes configured with ISV_KYB permission guard

### File List

**Backend:**
- `openplatform-api-service/src/controllers/kyb-review.controller.ts`
- `openplatform-api-service/src/services/kyb-review.service.ts`
- `openplatform-api-service/src/routes/v1/admin.routes.ts` (updated - added KYB routes)

**Frontend:**
- `openplatform-web/admin-portal/src/services/kyb-api.ts`
- `openplatform-web/admin-portal/src/views/kyb/KYBPendingListPage.vue`
- `openplatform-web/admin-portal/src/views/kyb/KYBReviewDetailPage.vue`
- `openplatform-web/admin-portal/src/router/index.ts` (updated)

## Code Review Fixes Applied

### Fix 1: Document Preview Functionality
- Added `previewDocument()` and `getDocumentUrl()` methods in KYBReviewDetailPage.vue
- Added document preview dialog with open-in-new-tab link
- Added document preview button handlers for business license and UBO documents

### Fix 2: ID Validation
- Added `isValidUUID()` validation function in KYBReviewDetailPage.vue
- Validates UUID format before making API call
- Shows error message and redirects to list if invalid

### Fix 3: Removed Redundant Validation
- Removed duplicate rejection reason validation from kyb-review.service.ts
- Validation now only exists in controller (single source of truth)

### Fix 4: Pagination Support
- Added pagination parameters to backend GET /admin/kyb endpoint
- Added KYBPaginationParams and KYBPaginatedResponse types
- Added pagination component to KYBPendingListPage.vue
- Updated frontend API to pass pagination parameters

### Fix 5: Type Fixes
- Removed unused imports (Check, Close, Warning)
- Fixed statusFilter type to accept string values from UI
- Added typed table row handlers
