# Story C-5-3: Tracing Support

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **API Gateway**,
I want to support distributed tracing,
so that I can trace requests across services.

## Acceptance Criteria

### Core Requirements (from epics.md C.5.3)

**Given** request with trace_id
**When** processing
**Then** propagate trace_id to downstream services
**And** include in response headers

### Extended Requirements

1. **Trace ID Management**
   - [x] Generate trace_id for new requests (if not provided)
   - [x] Accept incoming trace_id from X-Trace-Id header
   - [x] Propagate trace_id to downstream services via headers
   - [x] Include trace_id in all response headers

2. **Trace Context Propagation**
   - [x] Support W3C Trace Context format (traceparent, tracestate)
   - [x] Extract trace context from incoming requests
   - [x] Inject trace context into outgoing HTTP requests
   - [x] Support downstream service chaining

3. **Trace Logging Integration**
   - [x] Include trace_id in all log entries
   - [x] Link logs to trace context
   - [x] Enable trace-based log correlation
   - [x] Integrate with existing C-5-1 logging

4. **Trace Storage**
   - [x] Store trace spans in memory (for demo)
   - [x] Support trace query by trace_id
   - [x] Store span data: timestamp, duration, service, operation
   - [x] Configurable retention period

5. **Trace Query API**
   - [x] GET `/api/v1/admin/traces/:traceId` - Get trace by ID
   - [x] GET `/api/v1/admin/traces` - List recent traces
   - [x] Query by appid, endpoint, status
   - [x] Paginated results

6. **OpenTelemetry Compatibility (Optional)**
   - [ ] Support OpenTelemetry span format
   - [ ] Export to OTLP-compatible backend
   - [ ] Standard span attributes

## Tasks / Subtasks

### Task 1: Create Trace Service (AC: #1)
- [x] 1.1 Create `src/services/trace.service.ts`
- [x] 1.2 Implement `generateTraceId` method (UUID v4)
- [x] 1.3 Implement `extractTraceId` method
- [x] 1.4 Implement `propagateTrace` method for headers
- [x] 1.5 Store trace context in AsyncLocalStorage

### Task 2: Create Trace Middleware (AC: #1, #3)
- [x] 2.1 Create `src/middleware/trace.middleware.ts`
- [x] 2.2 Extract or generate trace_id on request start
- [x] 2.3 Store in res.locals for request scope
- [x] 2.4 Add trace_id to response headers
- [x] 2.5 Integrate with existing logging

### Task 3: Implement Trace Context Propagation (AC: #2)
- [x] 3.1 Create `src/utils/trace-context.ts`
- [x] 3.2 Implement W3C traceparent parsing/generation
- [x] 3.3 Implement tracestate handling
- [x] 3.4 Add propagation to HTTP client calls
- [x] 3.5 Create HTTP client wrapper with propagation

### Task 4: Create Trace Storage (AC: #4)
- [x] 4.1 Create `src/services/trace-storage.service.ts`
- [x] 4.2 Implement in-memory trace store
- [x] 4.3 Store spans with: traceId, spanId, parentId, timestamp, duration
- [x] 4.4 Implement TTL-based cleanup
- [x] 4.5 Add trace indexing by appid, endpoint

### Task 5: Create Trace Query API (AC: #5)
- [x] 5.1 Create `src/controllers/trace.controller.ts`
- [x] 5.2 Implement `getTraceById` handler
- [x] 5.3 Implement `listTraces` handler with filters
- [x] 5.4 Create `src/routes/v1/trace.routes.ts`
- [x] 5.5 Mount routes in main.ts

### Task 6: Integrate with Downstream Services (AC: #2, #3)
- [x] 6.1 Update request-routing service to propagate trace
- [x] 6.2 Update webhook service to include trace context
- [x] 6.3 Ensure all HTTP calls carry trace context
- [x] 6.4 Test multi-service trace continuity

### Task 7: Create Trace Utilities (AC: #1-3)
- [x] 7.1 Create `src/utils/span.ts` for span management
- [x] 7.2 Implement `startSpan`, `endSpan`, `addEvent`
- [x] 7.3 Add span attributes (appid, endpoint, status)
- [x] 7.4 Integrate with AsyncLocalStorage

### Task 8: Unit Tests (AC: #1-5)
- [x] 8.1 Create `tests/unit/trace.service.test.ts`
- [x] 8.2 Create `tests/unit/trace.middleware.test.ts`
- [x] 8.3 Create `tests/unit/trace-context.test.ts`
- [x] 8.4 Test trace propagation scenarios

## Dev Notes

### Architecture Patterns

**Source Structure:**
```
openplatform-api-service/src/
├── middleware/
│   └── trace.middleware.ts             # NEW
├── services/
│   ├── trace.service.ts                # NEW
│   └── trace-storage.service.ts        # NEW
├── controllers/
│   └── trace.controller.ts            # NEW
├── routes/
│   ├── v1/
│   │   └── trace.routes.ts            # NEW
│   └── v1/admin.routes.ts           # EXISTING
├── utils/
│   ├── trace-context.ts               # NEW
│   └── span.ts                       # NEW
└── main.ts                          # MODIFIED
```

**Existing trace_id Usage:**
- Already used as `x-trace-id` header throughout codebase
- Controllers read from `req.headers['x-trace-id']`
- Passed in all API responses

**W3C Trace Context Format:**
```
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
tracestate: congo=t61rcWkgMzE
```

### Dependencies from Previous Work

**C-5-1 Request Logging (done):**
- Logging infrastructure in place
- Trace middleware now integrates with logger for trace correlation

**C-5-2 Metrics Collection (done):**
- Metrics middleware in place
- Trace ID available for metrics correlation

**Existing Code:**
- trace_id already used in controllers
- Need to centralize trace management

### Trace Data Structure

**Trace:**
```typescript
interface Trace {
  traceId: string;
  spans: Span[];
  startTime: number;
  endTime?: number;
  duration?: number;
  appid?: string;
  status: 'pending' | 'completed' | 'error';
}
```

**Span:**
```typescript
interface Span {
  spanId: string;
  parentId?: string;
  operationName: string;
  serviceName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, string>;
  logs: SpanLog[];
}
```

### Performance Considerations

1. **Non-blocking**: All trace operations must be async
2. **Memory**: Limit stored traces (configurable, default 1000)
3. **Sampling**: Support trace sampling (log first N, then sample)
4. **Low Overhead**: Minimal impact on request latency

### Project Structure Notes

- **Alignment**: Follows existing middleware patterns
- **No conflicts**: Independent of other middleware
- **Backward Compatibility**: Existing trace_id header still works
- **W3C Compliance**: Follows Trace Context specification

### Technical Requirements

1. **Trace ID Format**: UUID v4 or W3C traceparent format
2. **Propagation**: HTTP headers (X-Trace-Id, traceparent, tracestate)
3. **Storage**: In-memory with TTL cleanup
4. **Query API**: RESTful endpoints for trace retrieval
5. **Logging**: All logs include trace_id for correlation

### References

- **Epic Requirements**: [docs/planning-artifacts/epics.md#C-5-3]
- **Architecture**: [docs/planning-artifacts/architecture.md]
- **W3C Trace Context**: [https://www.w3.org/TR/trace-context/]
- **OpenTelemetry**: [https://opentelemetry.io/]
- **Previous Story**: [docs/implementation-artifacts/c-5-1-request-logging.md]
- **Previous Story**: [docs/implementation-artifacts/c-5-2-metrics-collection.md]

## Dev Agent Record

### Agent Model Used

MiniMax-M2.5

### Debug Log References

### Completion Notes List

- Completed implementation of distributed tracing support for the API Gateway
- Implemented trace ID generation (UUID v4), extraction from headers, and propagation to downstream services
- Added W3C Trace Context support (traceparent, tracestate headers)
- Created in-memory trace storage with TTL-based cleanup and indexing
- Implemented trace query APIs: GET /api/v1/admin/traces/:traceId, GET /api/v1/admin/traces
- Integrated trace middleware with Express and added trace headers to responses
- Added trace context propagation to HTTP client and webhook service
- Created comprehensive unit tests for trace service, middleware, and context utilities
- Fixed import path issues in trace.middleware.ts (./trace-storage.service -> ../services/trace-storage.service)
- Fixed TypeScript issues: added traceId to span object, fixed res.end type cast

### File List

**New Files:**
- openplatform-api-service/src/services/trace.service.ts
- openplatform-api-service/src/middleware/trace.middleware.ts
- openplatform-api-service/src/services/trace-storage.service.ts
- openplatform-api-service/src/controllers/trace.controller.ts
- openplatform-api-service/src/routes/v1/trace.routes.ts
- openplatform-api-service/src/utils/trace-context.ts
- openplatform-api-service/src/utils/span.ts
- openplatform-api-service/tests/unit/trace.service.test.ts
- openplatform-api-service/tests/unit/trace.middleware.test.ts
- openplatform-api-service/tests/unit/trace-context.test.ts

**Modified Files:**
- openplatform-api-service/src/main.ts (added trace middleware and routes)
- openplatform-api-service/src/services/webhook.service.ts (added trace propagation)
- openplatform-api-service/src/services/http-client.service.ts (already had trace propagation)
- openplatform-api-service/src/services/request-routing.service.ts (already had trace propagation)

### Change Log

- 2026-02-25: Initial implementation of tracing support
- 2026-02-25: Added trace propagation to webhook service

