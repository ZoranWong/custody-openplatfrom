# Story B.3.2: Revenue Analytics

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **platform admin**,
I want to view revenue analytics,
So that I can understand platform economics.

## Acceptance Criteria

**Given** the Revenue Analytics page
**When** viewing the page
**Then** display the following metrics:

- **Total Revenue**: Show today's revenue, this week's revenue, and this month's revenue with comparison percentages
- **Revenue by Developer**: List top developers by revenue with breakdown by service type
- **Revenue Trends**: Show revenue over selected time period (hourly/daily/weekly) with growth rates
- **Revenue Forecast**: Display predicted revenue for next 7/30 days based on historical patterns

**And** provide the following interactions:

- Time range selector (24h, 7d, 30d, 90d)
- Revenue breakdown by service type (API calls, transaction fees, subscription)
- Export data to CSV/Excel
- Auto-refresh capability (configurable interval)
- Drill-down into individual developer revenue details

## Tasks / Subtasks

- [x] Task 1: Extend dashboard-stats.service.ts with revenue-specific metrics (AC: #1-4)
  - [x] Subtask 1.1: Add revenue aggregation methods (daily, weekly, monthly)
  - [x] Subtask 1.2: Add revenue by developer breakdown methods
  - [x] Subtask 1.3: Implement revenue forecasting algorithm (linear regression/moving average)
  - [x] Subtask 1.4: Add service type revenue categorization
- [x] Task 2: Create revenue backend controller (AC: #1-4)
  - [x] Subtask 2.1: Implement GET /admin/stats/revenue/summary - Revenue summary
  - [x] Subtask 2.2: Implement GET /admin/stats/revenue/by-developer - Revenue by developer
  - [x] Subtask 2.3: Implement GET /admin/stats/revenue/trends - Revenue trends
  - [x] Subtask 2.4: Implement GET /admin/stats/revenue/forecast - Revenue forecast
  - [x] Subtask 2.5: Apply ANALYTICS_VIEW permission guard
- [x] Task 3: Create frontend Revenue Analytics page (AC: #1-4)
  - [x] Subtask 3.1: Create RevenueAnalyticsPage.vue with analytics display
  - [x] Subtask 3.2: Implement time range selector with data refresh
  - [x] Subtask 3.3: Add RevenueTrendChart component (inline in page)
  - [x] Subtask 3.4: Add DeveloperRevenueTable component with sorting
  - [x] Subtask 3.5: Add RevenueForecastChart component (inline in page)
  - [x] Subtask 3.6: Implement CSV/Excel export functionality
- [x] Task 4: Update frontend API service (AC: #1-4)
  - [x] Subtask 4.1: Add revenue statistics service methods
  - [x] Subtask 4.2: Add response types for revenue statistics

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
- `openplatform-api-service/src/services/dashboard-stats.service.ts` - Extended with revenue metrics
- `openplatform-api-service/src/controllers/revenue-stats.controller.ts` - New revenue statistics controller
- `openplatform-api-service/src/routes/v1/admin.routes.ts` - Add revenue stats routes

**Frontend Location:**
- `openplatform-web/admin-portal/src/services/revenue-stats-api.ts` - New revenue statistics service
- `openplatform-web/admin-portal/src/views/stats/RevenueAnalyticsPage.vue` - New revenue analytics page (内联图表组件)
- `openplatform-web/admin-portal/src/router/index.ts` - Add revenue analytics route

### Dependencies

- Builds upon: B.1.1 (Admin Dashboard Overview) - Reuses patterns
- Builds upon: B.3.1 (API Statistics Dashboard) - Reuses similar structure
- Reuses: `dashboard-stats.service.ts` - Extend with revenue-specific metrics
- Reuses: `DashboardPage.vue` - UI patterns and components
- Reuses: `APIStatsPage.vue` - Similar page structure
- Charts Library: ECharts (consistent with existing implementation)

### UI/UX Design Considerations

- Consistent with DashboardPage.vue and APIStatsPage.vue layout and styling
- Use same color scheme and iconography
- Implement responsive grid layout
- Loading states for all async operations
- Error handling with retry options
- Export button with format options (CSV, Excel)
- Revenue display with currency formatting (USD)

### Code Patterns from Existing Dashboard

**Service Layer Pattern (dashboard-stats.service.ts):**
```typescript
// Extend with revenue-specific metrics
interface RevenueStats {
  summary: {
    todayRevenue: number
    weekRevenue: number
    monthRevenue: number
    todayGrowth: number
    weekGrowth: number
    monthGrowth: number
    totalRevenue: number
  }
  byDeveloper: {
    developerId: string
    developerName: string
    revenue: number
    transactionCount: number
    avgFeeRate: number
    serviceTypes: { [key: string]: number }
  }[]
  trends: {
    timestamp: string
    revenue: number
    transactionCount: number
    avgFee: number
  }[]
  forecast: {
    date: string
    predictedRevenue: number
    lowerBound: number
    upperBound: number
  }[]
}
```

**Frontend API Pattern (from api.ts):**
```typescript
// Revenue Statistics service methods
async getRevenueSummary(timeRange: string): Promise<ApiResponse<RevenueSummary>>
async getRevenueByDeveloper(limit: number, timeRange: string): Promise<ApiResponse<RevenueByDeveloper[]>>
async getRevenueTrend(days: number): Promise<ApiResponse<RevenueTrend[]>>
async getRevenueForecast(days: number): Promise<ApiResponse<RevenueForecast[]>>
async exportRevenueStats(format: 'csv' | 'excel', timeRange: string): Promise<Blob>
```

### Important Implementation Notes

1. **Caching Strategy**: Reuse 1-minute TTL from existing dashboard
2. **Data Aggregation**: Aggregate daily data for trend charts
3. **Revenue Categories**:
   - API call fees (per-call pricing)
   - Transaction fees (percentage-based)
   - Subscription fees (monthly/annual)
4. **Forecast Algorithm**: Use weighted moving average with seasonality adjustment
5. **Currency Display**: Format all revenue in USD with 2 decimal places
6. **Navigation**: Add to sidebar menu under "Analytics" section

### Revenue Calculation

- **API Call Fees**: Based on API call volume × pricing tier
- **Transaction Fees**: Based on transaction volume × fee percentage
- **Subscription Fees**: Monthly/annual recurring revenue
- **Growth Calculation**: (Current Period - Previous Period) / Previous Period × 100

### References

- [Source: docs/planning-artifacts/epics.md#B.3 Analytics]
- [Source: openplatform-api-service/src/services/dashboard-stats.service.ts] (existing patterns)
- [Source: openplatform-api-service/src/controllers/api-stats.controller.ts] (controller patterns)
- [Source: openplatform-web/admin-portal/src/views/stats/APIStatsPage.vue] (similar implementation)
- [Source: openplatform-web/admin-portal/src/services/api-stats-api.ts] (service patterns)

## Dev Agent Record

### Agent Model Used

claude-code (MiniMax-M2.1)

### Debug Log References

### Completion Notes List

- Story B.3.2 Revenue Analytics implemented successfully
- Extended dashboard-stats.service.ts with revenue-specific metrics (summary, trends, forecast)
- Created revenue-stats.controller.ts with 6 API endpoints
- Added CSV export with UTF-8 BOM for Excel compatibility
- Frontend RevenueAnalyticsPage.vue with ECharts integration
- Time range selector (24h, 7d, 30d, 90d)
- Auto-refresh every 60 seconds
- Revenue forecast with confidence intervals
- Top Developers table with service type breakdown
- Growth rate indicators with color coding

### File List

**Backend:**
- `openplatform-api-service/src/services/dashboard-stats.service.ts` (EXTENDED - revenue metrics methods)
- `openplatform-api-service/src/controllers/revenue-stats.controller.ts` (NEW)
- `openplatform-api-service/src/routes/v1/admin.routes.ts` (UPDATED - revenue stats routes)

**Frontend:**
- `openplatform-web/admin-portal/src/services/revenue-stats-api.ts` (NEW)
- `openplatform-web/admin-portal/src/views/stats/RevenueAnalyticsPage.vue` (NEW)
- `openplatform-web/admin-portal/src/router/index.ts` (UPDATED - add revenue analytics route)

### Code Review Fixes Applied

1. **File List Updated**: Removed non-existent `components/stats/` reference (charts are inline)
2. **Developer Drill-down Added**: Added click handler to developer table rows
3. **Null Safety Fixed**: Added null check in chart data aggregation
4. **TimeRange Parameter Added**: Added timeRange param to frontend API
5. **Service Type Constants Added**: Added shared constants for service types
6. **Chart Initialization Fixed**: Removed premature chart updates before data loads
