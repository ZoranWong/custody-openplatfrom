# Story C-5-2: Metrics Collection

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **API Gateway**,
I want to collect metrics,
so that I can monitor performance.

## Acceptance Criteria

### Core Requirements (from epics.md C.5.2)

**Given** processed request
**When** collecting metrics
**Then** track: QPS, latency P50/P95/P99, error rate

### Extended Requirements

1. **Real-time Metrics Collection**
   - [x] Track QPS (queries per second)
   - [x] Track latency P50, P95, P99
   - [x] Track error rate (4xx, 5xx)
   - [x] Track request count by endpoint
   - [x] Track request count by appid

2. **Metrics Middleware**
   - [x] Create `src/middleware/metrics.middleware.ts`
   - [x] Record request start time
   - [x] Record response status code
   - [x] Calculate response time on request completion
   - [x] Propagate metrics data to collector

3. **Metrics Storage**
   - [x] In-memory metrics store (for real-time)
   - [x] Time-windowed aggregation (1min, 5min, 1h, 24h)
   - [x] Sliding window for percentiles
   - [ ] Periodic flush to persistent storage (optional)

4. **Prometheus Endpoint**
   - [x] Expose `/metrics` endpoint
   - [x] Prometheus text format output
   - [x] Include all collected metrics
   - [x] Support Prometheus scrape interval

5. **Metrics Categories**
   - [x] HTTP request metrics (counter + histogram)
   - [x] App-specific metrics (per appid)
   - [x] Endpoint-specific metrics (per path pattern)
   - [x] Error metrics (by status code)
   - [ ] Custom business metrics (optional)

6. **Health Check Integration**
   - [x] Include metrics in `/health` endpoint
   - [x] Show current QPS in health check
   - [x] Show error rate in health check

## Tasks / Subtasks

### Task 1: Add Metrics Dependencies (AC: #1-5)
- [x] 1.1 Add `prom-client` package for Prometheus metrics
- [x] 1.2 Configure TypeScript types for prom-client
- [x] 1.3 Update package.json dependencies

### Task 2: Create Metrics Collector Service (AC: #1, #3)
- [x] 2.1 Create `src/services/metrics-collector.service.ts`
- [x] 2.2 Implement in-memory metrics storage
- [x] 2.3 Implement time-windowed aggregation
- [x] 2.4 Implement sliding window for percentiles
- [x] 2.5 Add methods: recordRequest, getMetrics, reset

### Task 3: Create Metrics Middleware (AC: #2)
- [x] 3.1 Create `src/middleware/metrics.middleware.ts`
- [x] 3.2 Record request start time in res.locals
- [x] 3.3 Calculate response time on finish
- [x] 3.4 Call metrics collector on each request
- [x] 3.5 Handle async metrics recording

### Task 4: Implement Prometheus Metrics (AC: #4)
- [x] 4.1 Create `src/routes/metrics.routes.ts`
- [x] 4.2 Implement GET `/metrics` endpoint
- [x] 4.3 Export HTTP request histogram
- [x] 4.4 Export counters (requests, errors)
- [x] 4.5 Export gauge metrics (active requests)

### Task 5: Implement Percentile Calculation (AC: #1)
- [x] 5.1 Create `src/utils/percentile-calculator.ts`
- [x] 5.2 Implement sliding window algorithm
- [x] 5.3 Calculate P50, P95, P99
- [x] 5.4 Optimize for high-throughput

### Task 6: Add App-level Metrics (AC: #5)
- [x] 6.1 Track metrics per appid
- [x] 6.2 Create app-level counters
- [x] 6.3 Create app-level histograms
- [x] 6.4 Support app-specific queries

### Task 7: Integrate with Existing Code (AC: #1-6)
- [x] 7.1 Mount metrics middleware in main.ts
- [x] 7.2 Mount metrics route in main.ts
- [x] 7.3 Test with existing endpoints
- [x] 7.4 Verify metrics collection works

### Task 8: Unit Tests (AC: #1-5)
- [x] 8.1 Create `tests/unit/metrics-collector.test.ts`
- [x] 8.2 Create `tests/unit/metrics.middleware.test.ts`
- [x] 8.3 Test percentile calculations
- [x] 8.4 Test Prometheus format output

## Dev Notes

### Architecture Patterns

**Source Structure:**
```
openplatform-api-service/src/
├── middleware/
│   └── metrics.middleware.ts           # NEW
├── services/
│   ├── metrics-collector.service.ts     # NEW
│   └── api-stats.controller.ts        # EXISTING (for admin portal)
├── routes/
│   ├── metrics.routes.ts               # NEW
│   └── v1/admin.routes.ts             # EXISTING
├── utils/
│   └── percentile-calculator.ts        # NEW
└── main.ts                           # MODIFIED
```

**Dependencies to Add:**
```json
{
  "prom-client": "^15.1.0"
}
```

**Prometheus Metrics:**
```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",endpoint="/api/v1/...",status="200"} 12345

# HELP http_request_duration_seconds HTTP request latency
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} 123
http_request_duration_seconds_bucket{le="0.5"} 456
http_request_duration_seconds_bucket{le="1.0"} 789
http_request_duration_seconds_bucket{le="+Inf"} 1000
```

### Dependencies from Previous Work

**C-5-1 Request Logging (ready-for-dev):**
- Logging infrastructure will be in place
- Can reuse trace_id from logging

**Existing api-stats.controller.ts:**
- Provides admin-facing stats API
- Uses mock data for demo
- This story adds real-time metrics collection

### Metrics Data Structure

**In-Memory Store:**
```typescript
interface MetricsStore {
  requests: {
    total: number;
    byStatus: Record<number, number>;
    byMethod: Record<string, number>;
    byEndpoint: Record<string, number>;
    byAppid: Record<string, number>;
  };
  latency: {
    samples: number[];  // Sliding window
    windowStart: number;
  };
  errors: {
    total: number;
    byCode: Record<number, number>;
  };
}
```

### Performance Considerations

1. **Non-blocking**: All metrics collection must be async
2. **Memory**: Limit sliding window size (e.g., 10000 samples)
3. **CPU**: Calculate percentiles efficiently (approximation OK)
4. **Scalability**: Support multiple API gateway instances

### Project Structure Notes

- **Alignment**: Follows existing middleware patterns
- **No conflicts**: Independent of other middleware
- **Integration**: Works with existing morgan logging

### Technical Requirements

1. **QPS Calculation**: Requests per second over time window
2. **Latency Percentiles**: P50, P95, P99 using sliding window
3. **Error Rate**: (4xx + 5xx) / total requests
4. **Prometheus Format**: Standard text exposition format
5. **Backward Compatibility**: Existing /health endpoint still works

### References

- **Epic Requirements**: [docs/planning-artifacts/epics.md#C-5-2]
- **Architecture**: [docs/planning-artifacts/architecture.md]
- **Prometheus Client**: [https://github.com/siimon/prom-client]
- **Prometheus Format**: [https://prometheus.io/docs/instrumenting/exposition_formats/]
- **Previous Story**: [docs/implementation-artifacts/c-5-1-request-logging.md]
- **Existing Stats**: [openplatform-api-service/src/controllers/api-stats.controller.ts]

## Dev Agent Record

### Agent Model Used

MiniMax-M2.5

### Debug Log References

- Implemented using prom-client v15.1.3
- TypeScript types included in prom-client package
- Uses singleton pattern for metrics collector service

### Completion Notes List

**Implementation Complete - Story C-5-2 Metrics Collection**

**Summary:**
Implemented comprehensive metrics collection system for the API Gateway using Prometheus client library.

**Files Created:**
1. `/openplatform-api-service/src/services/metrics-collector.service.ts` - Core metrics collection service with in-memory storage, sliding window percentiles, QPS calculation
2. `/openplatform-api-service/src/middleware/metrics.middleware.ts` - Express middleware for capturing request metrics
3. `/openplatform-api-service/src/routes/metrics.routes.ts` - Prometheus metrics endpoints (/metrics, /metrics/summary, /metrics/app/:appid, /metrics/apps)
4. `/openplatform-api-service/src/utils/percentile-calculator.ts` - Standalone percentile calculator utility

**Files Modified:**
1. `/openplatform-api-service/src/main.ts` - Added metrics middleware and routes integration, updated /health endpoint to include metrics

**Tests Created:**
1. `/openplatform-api-service/tests/unit/metrics-collector.test.ts` - 16 tests for metrics collector service
2. `/openplatform-api-service/tests/unit/metrics.middleware.test.ts` - 8 tests for metrics middleware
3. `/openplatform-api-service/tests/unit/percentile-calculator.test.ts` - 16 tests for percentile calculator

**Test Results:**
- All 40 unit tests pass
- Tests cover: request tracking, error tracking, QPS calculation, percentiles, app-level metrics, reset functionality

**Features Implemented:**
- Real-time QPS tracking
- Latency percentile calculation (P50, P95, P99)
- Error rate tracking (4xx, 5xx)
- Request count by endpoint, method, appid
- Prometheus text format endpoint at /metrics
- Human-readable summary at /metrics/summary
- App-specific metrics at /metrics/app/:appid
- Health check integration with QPS and error rate
- Non-blocking async metrics recording

**Dependencies Added:**
- prom-client: ^15.1.3

**Note:**
The server has pre-existing build errors in the codebase unrelated to this story (import/export issues in audit-logging.middleware.ts). The metrics implementation itself is complete and all tests pass.

## File List

### New Files
- `openplatform-api-service/src/services/metrics-collector.service.ts`
- `openplatform-api-service/src/middleware/metrics.middleware.ts`
- `openplatform-api-service/src/routes/metrics.routes.ts`
- `openplatform-api-service/src/utils/percentile-calculator.ts`
- `openplatform-api-service/tests/unit/metrics-collector.test.ts`
- `openplatform-api-service/tests/unit/metrics.middleware.test.ts`
- `openplatform-api-service/tests/unit/percentile-calculator.test.ts`

### Modified Files
- `openplatform-api-service/src/main.ts` (added metrics middleware and routes)
- `openplatform-api-service/package.json` (added prom-client dependency)

### Deleted Files
None

