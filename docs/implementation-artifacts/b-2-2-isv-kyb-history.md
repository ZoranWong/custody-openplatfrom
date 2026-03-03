# Story B.2.2: ISV KYB History

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **platform admin**,
I want to view KYB review history,
So that I can track audit records and maintain compliance.

## Acceptance Criteria

**Given** KYB history page
**When** viewing
**Then** display:
- ISV company name
- Reviewer admin identifier
- Decision (approved/rejected/pending_info)
- Reviewer comments
- Review timestamp
- Original submission date

**And** support filtering by:
- Date range (start date, end date)
- Decision status (all, approved, rejected, pending_info)
- ISV company name (search)
- Reviewer (search)

**And** support sorting by:
- Review date (ascending/descending)
- Submission date (ascending/descending)

**And** show pagination:
- Configurable page size (10, 20, 50, 100)
- Total record count
- Current page navigation

## Tasks / Subtasks

- [x] Task 1: Extend KYB service for history queries (AC: #1-3)
  - [x] Subtask 1.1: Add getHistoryApplications() method with filters
  - [x] Subtask 1.2: Add getHistoryApplicationById() method for detail view
  - [x] Subtask 1.3: Support date range and status filtering
- [x] Task 2: Create backend history API endpoints (AC: #1-4)
  - [x] Subtask 2.1: Implement GET /admin/kyb/history - List history with filters
  - [x] Subtask 2.2: Implement GET /admin/kyb/history/:id - Get history detail
  - [x] Subtask 2.3: Apply same ISV_KYB permission guard
  - [x] Subtask 2.4: Add pagination support to history endpoints
- [x] Task 3: Create frontend KYB history page (AC: #1-4)
  - [x] Subtask 3.1: Create KYBHistoryListPage.vue with filters
  - [x] Subtask 3.2: Implement date range picker component
  - [x] Subtask 3.3: Add status filter dropdown
  - [x] Subtask 3.4: Implement search functionality
  - [x] Subtask 3.5: Add pagination component
- [x] Task 4: Integrate history into admin navigation (AC: Navigation)
  - [x] Subtask 4.1: Add History tab next to KYB Review in sidebar
  - [x] Subtask 4.2: Add history routes to router
  - [x] Subtask 4.3: Apply ISV_KYB permission guard

## Dev Notes

### Project Structure Notes

**Backend Location:**
- `openplatform-api-service/src/controllers/kyb-history.controller.ts` - New history controller
- `openplatform-api-service/src/services/kyb-review.service.ts` - Extend existing service
- `openplatform-api-service/src/routes/v1/admin.routes.ts` - Add history routes

**Frontend Location:**
- `openplatform-web/admin-portal/src/views/kyb/` - New history page
- `openplatform-web/admin-portal/src/services/kyb-api.ts` - Add history methods
- `openplatform-web/admin-portal/src/router/index.ts` - Add history routes

**Architecture Alignment:**

| Aspect | Requirement | Implementation |
|--------|-------------|----------------|
| API Format | { code, message, data } | Standard response wrapper (from b-2-1) |
| Authentication | JWT Bearer Token | Existing admin auth middleware (b-0-2) |
| Permission | ISV_KYB required | requirePermission(Resource.ISV_KYB) |
| Pagination | page, limit, total | Consistent with b-2-1 implementation |
| Date Handling | ISO 8601 format | Use consistent format with b-2-1 |

### Dependencies

- Builds upon: b-2-1 (ISV KYB Review) - Reuses audit trail data from existing KYB applications
- UI Library: Element Plus (Vue 3) - Consistent with b-2-1
- Reuses: kyb-review.service.ts, kyb-api.ts from b-2-1

### UX Design Considerations

- Follow same table design as KYBPendingListPage.vue (b-2-1)
- Status badges: pending (orange), approved (green), rejected (red), pending_info (blue)
- Three-column layout: Filters (Left) + Table (Main) + Pagination (Bottom)
- Date range picker with preset options (Today, This Week, This Month)
- Export button for audit compliance (optional future enhancement)
- Toast notifications for filter actions

### Code Patterns from b-2-1

**Service Layer Pattern:**
```typescript
// Extend kyb-review.service.ts
getHistoryApplications(filters: HistoryFilters): KYBApplication[] {
  let apps = this.getAllApplications()

  // Apply status filter (only finalized: approved, rejected)
  if (filters.status) {
    apps = apps.filter(app => app.status === filters.status)
  }

  // Apply date range filter
  if (filters.startDate) {
    apps = apps.filter(app => new Date(app.submittedAt) >= new Date(filters.startDate))
  }
  if (filters.endDate) {
    apps = apps.filter(app => new Date(app.submittedAt) <= new Date(filters.endDate))
  }

  // Apply search
  if (filters.search) {
    const query = filters.search.toLowerCase()
    apps = apps.filter(app =>
      app.companyName.toLowerCase().includes(query) ||
      app.reviewerId?.toLowerCase().includes(query)
    )
  }

  return apps.sort((a, b) => {
    const dateA = new Date(a.reviewedAt || a.submittedAt)
    const dateB = new Date(b.reviewedAt || b.submittedAt)
    return filters.sortOrder === 'asc'
      ? dateA.getTime() - dateB.getTime()
      : dateB.getTime() - dateA.getTime()
  })
}
```

**Frontend API Pattern (from b-2-1 kyb-api.ts):**
```typescript
async getHistoryApplications(filters?: HistoryFilters): Promise<KYBApiResponse<KYBPaginatedResponse<KYBHistoryItem>>> {
  const params: Record<string, string | number> = {}
  if (filters?.status) params.status = filters.status
  if (filters?.startDate) params.startDate = filters.startDate
  if (filters?.endDate) params.endDate = filters.endDate
  if (filters?.search) params.search = filters.search
  if (filters?.page) params.page = filters.page
  if (filters?.limit) params.limit = filters.limit
  if (filters?.sortBy) params.sortBy = filters.sortBy
  if (filters?.sortOrder) params.sortOrder = filters.sortOrder

  const response = await this.client.get('/kyb/history', { params })
  return response.data
}
```

**TypeScript Types:**
```typescript
export interface KYBHistoryItem {
  id: string
  companyName: string
  reviewerId: string
  decision: KYBStatus  // approved, rejected, pending_info
  comments?: string
  reviewedAt: string
  submittedAt: string
}

export interface HistoryFilters {
  status?: KYBStatus  // Only finalized statuses
  startDate?: string
  endDate?: string
  search?: string
  page?: number
  limit?: number
  sortBy?: 'reviewedAt' | 'submittedAt'
  sortOrder?: 'asc' | 'desc'
}
```

### Important Implementation Notes

1. **Data Source**: History data comes from existing KYB applications that have been reviewed (status = approved, rejected, or pending_info). Applications with status = pending should NOT appear in history.

2. **Audit Trail**: The existing audit trail in KYBApplication.auditTrail already contains all review actions. Consider reusing this for detailed history view.

3. **Date Filtering**: Filter based on `reviewedAt` timestamp for review decisions, not `submittedAt`.

4. **Pagination**: Follow the same pagination pattern as b-2-1 with `page`, `limit`, `total`, `totalPages`.

5. **Backend Endpoint Pattern**: Use the same response format as b-2-1:
   ```json
   {
     "code": 0,
     "message": "Success",
     "data": {
       "items": [...],
       "total": 100,
       "page": 1,
       "limit": 20,
       "totalPages": 5
     }
   }
   ```

6. **Frontend State Management**: Use Vue 3 composition API with `ref`, `computed`, `onMounted` as established in b-2-1.

7. **Permission Guard**: Use same ISV_KYB permission as b-2-1 for consistency.

### References

- [Source: docs/planning-artifacts/epics.md#B.2 ISV KYB History]
- [Source: docs/implementation-artifacts/b-2-1-isv-kyb-review.md] (previous story patterns)
- [Source: docs/planning-artifacts/architecture.md#API Response format]
- [Source: docs/planning-artifacts/ux-design-specification.md#Admin Dashboard Layout]

## Dev Agent Record

### Agent Model Used

claude-code (MiniMax-M2.1)

### Debug Log References

### Completion Notes List

- Extended kyb-review.service.ts with HistoryFilters interface and KYBHistoryItem type
- Added getHistoryApplications() method supporting filters (status, date range, search) and sorting
- Added getHistoryApplicationById() method for history detail view
- Created kyb-history.controller.ts with GET /admin/kyb/history and GET /admin/kyb/history/:id endpoints
- Updated admin.routes.ts to include history routes with ISV_KYB permission
- Added HistoryFilters and KYBHistoryItem types to kyb-api.ts
- Created KYBHistoryListPage.vue with:
  - Status filter cards (All, Approved, Pending Info, Rejected)
  - Search by company name or reviewer
  - Date range picker for filtering by review date
  - Sortable columns (Review Date, Submitted Date)
  - Pagination with configurable page size
  - View details navigation
- Added history routes to router with ISV_KYB permission guard

### File List

**Backend:**
- `openplatform-api-service/src/controllers/kyb-history.controller.ts` (NEW)
- `openplatform-api-service/src/services/kyb-review.service.ts` (EXTENDED)
- `openplatform-api-service/src/routes/v1/admin.routes.ts` (UPDATED)

**Frontend:**
- `openplatform-web/admin-portal/src/services/kyb-api.ts` (UPDATED)
- `openplatform-web/admin-portal/src/views/kyb/KYBHistoryListPage.vue` (NEW)
- `openplatform-web/admin-portal/src/router/index.ts` (UPDATED)

## Code Review Fixes Applied

N/A - First version
