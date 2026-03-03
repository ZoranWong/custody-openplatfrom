# Story B.3.1: API Statistics Dashboard

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **platform admin**,
I want to view API usage statistics in detail,
So that I can monitor platform health and identify usage patterns.

## Acceptance Criteria

**Given** the API Statistics Dashboard page
**When** viewing the page
**Then** display the following statistics:

- **Total API Calls**: Show today, this week, and this month totals with comparison percentages
- **Top Applications**: List top 10 applications by API usage with call counts and error rates
- **Response Time Trends**: Show average response time over selected time period (hourly/daily)
- **Error Rate Trends**: Show error rate percentage over selected time period with breakdown by error type

**And** provide the following interactions:

- Time range selector (24h, 7d, 30d, 90d)
- Export data to CSV/Excel
- Auto-refresh capability (configurable interval)
- Drill-down into individual application statistics

## Tasks / Subtasks

- [x] Task 1: Extend dashboard-stats.service.ts with API-specific metrics (AC: #1-4)
  - [x] Subtask 1.1: Add response time tracking methods (avg, p50, p95, p99)
  - [x] Subtask 1.2: Add error type categorization (400, 401, 403, 404, 500, etc.)
  - [x] Subtask 1.3: Implement top applications by usage with pagination
  - [x] Subtask 1.4: Add application-specific statistics endpoint
- [x] Task 2: Create API statistics backend controller (AC: #1-4)
  - [x] Subtask 2.1: Implement GET /admin/stats/api/summary - API usage summary
  - [x] Subtask 2.2: Implement GET /admin/stats/api/top-apps - Top applications
  - [x] Subtask 2.3: Implement GET /admin/stats/api/response-times - Response time trends
  - [x] Subtask 2.4: Implement GET /admin/stats/api/errors - Error rate trends
  - [x] Subtask 2.5: Apply ANALYTICS_VIEW permission guard
- [x] Task 3: Create frontend API Statistics page (AC: #1-4)
  - [x] Subtask 3.1: Create APIStatsPage.vue with statistics display
  - [x] Subtask 3.2: Implement time range selector with data refresh
  - [x] Subtask 3.3: Add TopApplicationsTable component with sorting
  - [x] Subtask 3.4: Add ResponseTimeChart component
  - [x] Subtask 3.5: Add ErrorRateChart component
  - [x] Subtask 3.6: Implement CSV export functionality
- [x] Task 4: Update frontend API service (AC: #1-4)
  - [x] Subtask 4.1: Add API statistics service methods
  - [x] Subtask 4.2: Add response types for API statistics

## Dev Notes

### Architecture Alignment

| Aspect | Requirement | Implementation |
|--------|-------------|----------------|
| API Format | { code, message, data } | Standard response wrapper |
| Authentication | JWT Bearer Token | Existing admin auth middleware |
| Permission | ANALYTICS_VIEW required | Reuse from b-1-1 |
| Caching | 1-minute TTL | Consistent with dashboard |
| Charts | ECharts or Chart.js | Match DashboardPage patterns |

### Project Structure Notes

**Backend Location:**
- `openplatform-api-service/src/services/dashboard-stats.service.ts` - Extended with API metrics
- `openplatform-api-service/src/controllers/api-stats.controller.ts` - New API statistics controller
- `openplatform-api-service/src/routes/v1/admin.routes.ts` - Add API stats routes

**Frontend Location:**
- `openplatform-web/admin-portal/src/services/api-stats-api.ts` - New API statistics service
- `openplatform-web/admin-portal/src/views/stats/APIStatsPage.vue` - New API statistics page
- `openplatform-web/admin-portal/src/components/stats/` - New chart components
- `openplatform-web/admin-portal/src/router/index.ts` - Add API stats route

### Dependencies

- Builds upon: B.1.1 (Admin Dashboard Overview) - Reuses patterns
- Reuses: `dashboard-stats.service.ts` - Extend with API-specific metrics
- Reuses: `DashboardPage.vue` - UI patterns and components
- Reuses: `TrendChart.vue` - Chart component pattern
- Charts Library: ECharts (consistent with existing implementation)

### UI/UX Design Considerations

- Consistent with DashboardPage.vue layout and styling
- Use same color scheme and iconography
- Implement responsive grid layout
- Loading states for all async operations
- Error handling with retry options
- Export button with format options (CSV, Excel)

### Code Patterns from Existing Dashboard

**Service Layer Pattern (dashboard-stats.service.ts):**
```typescript
// Extend with API-specific metrics
interface APIStats {
  summary: {
    totalCalls: number
    todayCalls: number
    weekCalls: number
    monthCalls: number
    avgResponseTime: number
    p50ResponseTime: number
    p95ResponseTime: number
    p99ResponseTime: number
    errorRate: number
  }
  topApplications: {
    appId: string
    appName: string
    calls: number
    errorRate: number
    avgResponseTime: number
  }[]
  responseTimeTrend: {
    timestamp: string
    avg: number
    p50: number
    p95: number
    p99: number
  }[]
  errorTrend: {
    timestamp: string
    total: number
    byType: { [key: string]: number }
  }[]
}
```

**Frontend API Pattern (from api.ts):**
```typescript
// API Statistics service methods
async getAPIStatsSummary(timeRange: string): Promise<ApiResponse<APIStatsSummary>>
async getAPITopApps(limit: number, timeRange: string): Promise<ApiResponse<APITopApp[]>>
async getAPIResponseTimeTrend(days: number): Promise<ApiResponse<ResponseTimeData[]>>
async getAPIErrorTrend(days: number): Promise<ApiResponse<ErrorData[]>>
async exportAPIStats(format: 'csv' | 'excel', timeRange: string): Promise<Blob>
```

### Important Implementation Notes

1. **Caching Strategy**: Reuse 1-minute TTL from existing dashboard
2. **Data Aggregation**: Aggregate hourly data for trend charts
3. **Error Categories**: Track by HTTP status code (4xx, 5xx)
4. **Response Time**: Track P50, P95, P99 percentiles
5. **Export**: Generate CSV with UTF-8 BOM for Excel compatibility
6. **Navigation**: Add to sidebar menu under "Analytics" section

### References

- [Source: docs/planning-artifacts/epics.md#B.3 Analytics]
- [Source: openplatform-api-service/src/services/dashboard-stats.service.ts] (existing patterns)
- [Source: openplatform-api-service/src/controllers/dashboard.controller.ts] (controller patterns)
- [Source: openplatform-web/admin-portal/src/views/DashboardPage.vue] (UI patterns)
- [Source: openplatform-web/admin-portal/src/services/api.ts] (API service patterns)

## Dev Agent Record

### Agent Model Used

claude-code (MiniMax-M2.1)

### Debug Log References

### Completion Notes List

- Story B.3.1 API Statistics Dashboard implemented successfully
- Extended dashboard-stats.service.ts with API-specific metrics (P50/P95/P99 response times, error type breakdown)
- Created api-stats.controller.ts with 6 API endpoints
- Added CSV export with UTF-8 BOM for Excel compatibility
- Frontend APIStatsPage.vue with ECharts integration
- Time range selector (24h, 7d, 30d, 90d)
- Auto-refresh every 60 seconds
- Top Applications table with sorting

### File List

**Backend:**
- `openplatform-api-service/src/services/dashboard-stats.service.ts` (EXTENDED - API metrics methods)
- `openplatform-api-service/src/controllers/api-stats.controller.ts` (NEW)
- `openplatform-api-service/src/routes/v1/admin.routes.ts` (UPDATED - API stats routes)

**Frontend:**
- `openplatform-web/admin-portal/src/services/api-stats-api.ts` (NEW)
- `openplatform-web/admin-portal/src/views/stats/APIStatsPage.vue` (NEW - 内联图表组件)
- `openplatform-web/admin-portal/src/router/index.ts` (UPDATED - add API stats route)

### Code Review Fixes Applied

### Review 1
- [x] 更新 File List - 移除不存在的独立组件文件引用（图表组件内联到 APIStatsPage.vue）
- [x] 确认所有 AC 已正确实现
- [x] 验证 TypeScript 构建通过
