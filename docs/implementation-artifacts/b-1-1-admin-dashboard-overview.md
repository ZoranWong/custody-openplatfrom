# Story B.1.1: Admin Dashboard Overview

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **platform admin**,
I want to view platform overview,
So that I can monitor platform health.

## Acceptance Criteria

**Given** admin dashboard
**When** viewing overview
**Then** show:
- Total developers
- Total applications
- Pending KYB reviews
- API call statistics
- Error rate trends

## Tasks / Subtasks

- [x] Task 1: Create backend dashboard statistics API (AC: API endpoints for dashboard data)
  - [x] Subtask 1.1: Create dashboard statistics controller
  - [x] Subtask 1.2: Implement developer count query
  - [x] Subtask 1.3: Implement application count query
  - [x] Subtask 1.4: Implement pending KYB count query
  - [x] Subtask 1.5: Implement API statistics aggregation
- [x] Task 2: Create dashboard statistics service (AC: Data aggregation)
  - [x] Subtask 2.1: Create dashboard-stats.service.ts
  - [x] Subtask 2.2: Aggregate statistics from multiple sources
  - [x] Subtask 2.3: Cache frequently accessed data
- [x] Task 3: Create frontend Dashboard page (AC: UI components)
  - [x] Subtask 3.1: Create DashboardPage.vue
  - [x] Subtask 3.2: Implement statistics cards component
  - [x] Subtask 3.3: Implement trend charts using ECharts
  - [x] Subtask 3.4: Add auto-refresh functionality
- [x] Task 4: Integrate with existing admin layout (AC: Navigation)
  - [x] Subtask 4.1: Add dashboard route to router
  - [x] Subtask 4.2: Add menu item in sidebar (existing layout)
  - [x] Subtask 4.3: Apply permission guard (ANALYTICS_VIEW)

## Dev Notes

### Project Structure Notes

**Backend Location:**
- `openplatform-api-service/src/controllers/` - Dashboard controller
- `openplatform-api-service/src/services/` - Dashboard stats service

**Frontend Location:**
- `openplatform-web/admin-portal/src/views/DashboardPage.vue` - Main dashboard page
- `openplatform-web/admin-portal/src/components/dashboard/` - Dashboard components

**Dependencies:**
- Builds upon: b-0-3 (admin auth middleware, permissions)
- Integration with: ISV service, Application service
- Charts: Apache ECharts (Vue 3 compatible)

### Architecture Alignment

| Aspect | Requirement | Implementation |
|--------|-------------|----------------|
| Stats Refresh | Real-time with auto-refresh | Frontend polling, backend caching |
| Permissions | admin/super_admin view | requirePermission(Resource.ANALYTICS_VIEW) |
| Chart Library | ECharts | Install echarts, use vue-echarts wrapper |
| Caching | Reduce DB load | In-memory cache with TTL |

### References

- [Source: docs/planning-artifacts/epics.md#B.1 Dashboard]
- [Source: docs/implementation-artifacts/b-0-3-admin-auth-middleware.md] (permissions)
- [Source: CLAUDE.md] (Vue 3 + Element Plus patterns)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### Review Fixes Applied

**Code Review Date:** 2026-02-10

**Issues Fixed:**
1. [HIGH] Fixed DashboardDetails API type mismatch - Updated frontend `TopApplication` and `ApplicationStats` interfaces to match backend response fields (`appId`, `appName`, `calls`, `pendingReview`, `suspended`)
2. [MEDIUM] Implemented TrendChart timeRangeChange event - Added `emit` definition and event handling in parent component
3. [MEDIUM] Updated story File List to include `main.ts` registration

### File List

**Backend:**
- `openplatform-api-service/src/controllers/dashboard.controller.ts`
- `openplatform-api-service/src/services/dashboard-stats.service.ts`
- `openplatform-api-service/src/routes/v1/admin.routes.ts`
- `openplatform-api-service/src/main.ts` (update - register routes)

**Frontend:**
- `openplatform-web/admin-portal/src/services/api.ts` (update - dashboard API methods)
- `openplatform-web/admin-portal/src/views/DashboardPage.vue`
- `openplatform-web/admin-portal/src/components/dashboard/StatsCard.vue`
- `openplatform-web/admin-portal/src/components/dashboard/TrendChart.vue`
- `openplatform-web/admin-portal/src/router/index.ts` (update)
