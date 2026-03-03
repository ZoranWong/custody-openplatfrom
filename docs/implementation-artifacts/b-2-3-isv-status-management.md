# Story B.2.3: ISV Status Management

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **platform admin**,
I want to manage ISV account status,
So that I can control access to the platform.

## Acceptance Criteria

**Given** ISV detail page with status management
**When** admin changes ISV status
**Then** support status transitions:
- **Activate**: Change from suspended/banned to active (full access)
- **Suspend**: Change from active to suspended (temporary restriction)
- **Ban**: Change from active/suspended to banned (permanent restriction)

**And** require confirmation dialogs:
- For Activate: Warn if re-activating a previously banned ISV
- For Suspend: Require optional suspension reason
- For Ban: Require mandatory ban reason (cannot ban without reason)

**And** log all status changes:
- Record status change in audit trail
- Include admin ID who made the change
- Include timestamp (ISO 8601)
- Include reason/comment provided
- Store previous status for rollback capability

**And** automatically:
- Revoke active tokens when status changes to suspended/banned
- Send notification (placeholder) to ISV when status changes
- Update ISV status in database

## Tasks / Subtasks

- [x] Task 1: Extend KYB service with ISV status management (AC: Status transitions, logging)
  - [x] Subtask 1.1: Add ISVStatus enum (active, suspended, banned)
  - [x] Subtask 1.2: Add ISVAccount interface with status field
  - [x] Subtask 1.3: Implement statusChangeApplication() method with state validation
  - [x] Subtask 1.4: Add token revocation on status change (placeholder)
  - [x] Subtask 1.5: Create audit log entries for status changes
- [x] Task 2: Create backend status management API endpoints (AC: API endpoints)
  - [x] Subtask 2.1: Implement GET /admin/isv/:id/status - Get ISV status
  - [x] Subtask 2.2: Implement POST /admin/isv/:id/activate - Activate ISV
  - [x] Subtask 2.3: Implement POST /admin/isv/:id/suspend - Suspend ISV
  - [x] Subtask 2.4: Implement POST /admin/isv/:id/ban - Ban ISV
  - [x] Subtask 2.5: Apply ISV_STATUS permission guard (new permission)
- [x] Task 3: Create frontend ISV status management page (AC: UI components)
  - [x] Subtask 3.1: Create ISVStatusDetailPage.vue with status display
  - [x] Subtask 3.2: Implement action dialogs (Activate, Suspend, Ban)
  - [x] Subtask 3.3: Add status badge with color coding
  - [x] Subtask 3.4: Add status change history timeline
  - [x] Subtask 3.5: Add confirmation with warnings for sensitive actions
- [x] Task 4: Integrate status management into existing KYB detail (AC: Integration)
  - [x] Subtask 4.1: Add status tab to KYBReviewDetailPage.vue
  - [x] Subtask 4.2: Show status actions based on current status
  - [x] Subtask 4.3: Add status history section to detail view
  - [x] Subtask 4.4: Apply ISV_STATUS permission guard

## Dev Notes

### Project Structure Notes

**Backend Location:**
- `openplatform-api-service/src/controllers/isv-status.controller.ts` - New status controller
- `openplatform-api-service/src/services/kyb-review.service.ts` - Extended with ISV status management methods
- `openplatform-api-service/src/routes/v1/admin.routes.ts` - Add status routes

**Frontend Location:**
- `openplatform-web/admin-portal/src/views/isv/` - New ISV pages
- `openplatform-web/admin-portal/src/services/isv-status-api.ts` - New ISV status API service
- `openplatform-web/admin-portal/src/router/index.ts` - Add ISV routes

**Architecture Alignment:**

| Aspect | Requirement | Implementation |
|--------|-------------|----------------|
| API Format | { code, message, data } | Standard response wrapper (from b-2-1) |
| Authentication | JWT Bearer Token | Existing admin auth middleware (b-0-2) |
| Permission | ISV_STATUS required | New permission to add to Resource enum |
| Validation | Input sanitization | express-validator for status actions |
| Audit | State change logging | admin-audit.middleware.ts |
| Token Revocation | On status change | Invalidate existing JWT tokens |

### Dependencies

- Builds upon: b-2-1 (ISV KYB Review) - Reuses ISV data model
- Builds upon: b-0-3 (admin auth middleware) - Authentication patterns
- New permission: ISV_STATUS - Add to Resource enum in admin-permissions.ts
- UI Library: Element Plus (Vue 3) - Consistent with b-2-1

### UX Design Considerations

- Status badges with colors:
  - Active: Green (success)
  - Suspended: Orange (warning)
  - Banned: Red (danger)
- Confirmation dialogs with warning icons for destructive actions
- Status timeline showing all status changes chronologically
- Toast notifications for action feedback
- Loading states during API calls
- Three-column layout: Status Info (Left) + Actions (Center) + History (Right)

### Code Patterns from b-2-1

**Service Layer Pattern:**
```typescript
// Extend kyb-review.service.ts or create new isv-status.service.ts
export enum ISVStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned'
}

export interface ISVStatusAction {
  status: ISVStatus
  reason?: string
}

export interface ISVStatusHistory {
  id: string
  isvId: string
  previousStatus: ISVStatus
  newStatus: ISVStatus
  adminId: string
  reason?: string
  timestamp: string
}

export const isvStatusService = {
  changeStatus(
    isvId: string,
    adminId: string,
    action: ISVStatusAction
  ): { success: boolean; isv?: ISVAccount; error?: string } {
    // Validate state transitions
    const currentStatus = this.getISVById(isvId)?.status

    // Define allowed transitions
    const allowedTransitions: Record<ISVStatus, ISVStatus[]> = {
      [ISVStatus.ACTIVE]: [ISVStatus.SUSPENDED, ISVStatus.BANNED],
      [ISVStatus.SUSPENDED]: [ISVStatus.ACTIVE, ISVStatus.BANNED],
      [ISVStatus.BANNED]: [ISVStatus.ACTIVE]  // Requires warning
    }

    // Validate transition
    if (!allowedTransitions[currentStatus].includes(action.status)) {
      return { success: false, error: 'Invalid status transition' }
    }

    // Validate reason for ban
    if (action.status === ISVStatus.BANNED && !action.reason) {
      return { success: false, error: 'Ban reason is required' }
    }

    // Update status
    isv.status = action.status

    // Create status history entry
    const historyEntry: ISVStatusHistory = {
      id: uuidv4(),
      isvId,
      previousStatus: currentStatus,
      newStatus: action.status,
      adminId,
      reason: action.reason,
      timestamp: new Date().toISOString()
    }

    // Revoke tokens (placeholder - integrate with token service)
    await this.revokeISVTokens(isvId)

    return { success: true, isv }
  }
}
```

**Frontend API Pattern (from b-2-1 kyb-api.ts):**
```typescript
export interface ISVStatusResponse {
  id: string
  companyName: string
  status: ISVStatus
  statusHistory: ISVStatusHistoryItem[]
  lastStatusChange?: string
}

export interface ISVStatusHistoryItem {
  id: string
  previousStatus: ISVStatus
  newStatus: ISVStatus
  adminId: string
  reason?: string
  timestamp: string
}

class ISVApiService {
  async getISVStatus(id: string): Promise<ApiResponse<ISVStatusResponse>> {
    const response = await this.client.get(`/isv/${id}/status`)
    return response.data
  }

  async activateISV(id: string, reason?: string): Promise<ApiResponse<void>> {
    const response = await this.client.post(`/isv/${id}/activate`, { reason })
    return response.data
  }

  async suspendISV(id: string, reason?: string): Promise<ApiResponse<void>> {
    const response = await this.client.post(`/isv/${id}/suspend`, { reason })
    return response.data
  }

  async banISV(id: string, reason: string): Promise<ApiResponse<void>> {
    const response = await this.client.post(`/isv/${id}/ban`, { reason })
    return response.data
  }
}
```

**TypeScript Types:**
```typescript
export enum ISVStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned'
}

export interface ISVAccount {
  id: string
  developerId: string
  companyName: string
  email: string
  status: ISVStatus
  kybStatus: KYBStatus  // From b-2-1
  createdAt: string
  updatedAt: string
}

export interface ISVStatusHistoryItem {
  id: string
  isvId: string
  previousStatus: ISVStatus
  newStatus: ISVStatus
  adminId: string
  reason?: string
  timestamp: string
}
```

### Important Implementation Notes

1. **State Machine**: Implement proper state transitions with validation
   - Active -> Suspended (allowed)
   - Active -> Banned (allowed)
   - Suspended -> Active (allowed)
   - Suspended -> Banned (allowed)
   - Banned -> Active (allowed with warning)
   - No other transitions

2. **Permission Guard**: Add new ISV_STATUS permission
   - Location: `openplatform-api-service/src/constants/admin-permissions.ts`
   - Add to Resource enum
   - Use in routes: `requirePermission(Resource.ISV_STATUS)`

3. **Token Revocation**: When status changes to suspended/banned
   - Invalidate all active JWT tokens for the ISV
   - Add token to blacklist (Redis-based)
   - Prevent new token generation

4. **Database Integration**: Current implementation uses in-memory storage
   - Ready for PostgreSQL integration
   - Consider adding status_history table for audit

5. **Notification**: Placeholder for future notification service
   - Log notification intent in audit trail
   - Ready for email/SMS webhook integration

6. **Frontend Integration**: Integrate with existing KYB detail page
   - Add status tab in KYBReviewDetailPage.vue
   - Reuse existing action dialog patterns
   - Consistent with b-2-1 UI patterns

### References

- [Source: docs/planning-artifacts/epics.md#B.2 ISV Status Management]
- [Source: docs/implementation-artifacts/b-2-1-isv-kyb-review.md] (patterns, permissions)
- [Source: docs/planning-artifacts/architecture.md#API Response format]
- [Source: docs/planning-artifacts/ux-design-specification.md#Admin Dashboard Layout]
- [Source: docs/implementation-artifacts/b-0-3-admin-auth-middleware.md] (auth patterns)

## Dev Agent Record

### Agent Model Used

claude-code (MiniMax-M2.1)

### Debug Log References

### Completion Notes List

- All tasks completed for b-2-3 ISV Status Management
- TypeScript build passes for all ISV status-related code
- Frontend Resource enum updated to include ISV_STATUS permission
- KYBReviewDetailPage.vue now includes Status tab with full management capabilities
- Token revocation and notifications are placeholders ready for future integration
- State machine implemented: Active -> Suspended/Banned, Suspended -> Active/Banned, Banned -> Active (with warning)

### File List

**Backend:**
- `openplatform-api-service/src/controllers/isv-status.controller.ts` (NEW)
- `openplatform-api-service/src/services/kyb-review.service.ts` (EXTENDED - ISV status types and methods integrated)
- `openplatform-api-service/src/routes/v1/admin.routes.ts` (UPDATED - ISV status routes)
- `openplatform-api-service/src/constants/admin-permissions.ts` (UPDATED - add ISV_STATUS)

**Frontend:**
- `openplatform-web/admin-portal/src/services/isv-status-api.ts` (NEW - renamed from isv-api.ts)
- `openplatform-web/admin-portal/src/views/isv/ISVStatusDetailPage.vue` (NEW)
- `openplatform-web/admin-portal/src/views/kyb/KYBReviewDetailPage.vue` (UPDATED - add Status tab)
- `openplatform-web/admin-portal/src/router/index.ts` (UPDATED - add ISV status route)
- `openplatform-web/admin-portal/src/shared/admin-permissions.ts` (UPDATED - add ISV_STATUS)

## Code Review Fixes Applied

### Review 1 (自动修复)
- [x] 更新 Dev Notes: 移除 `isv-status.service.ts` 引用,改为说明扩展到 `kyb-review.service.ts`
- [x] 更新 File List: 修正 `isv-api.ts` 为 `isv-status-api.ts`
- [x] 确认审计日志通过 `statusHistory` 数组实现,满足 AC 要求
