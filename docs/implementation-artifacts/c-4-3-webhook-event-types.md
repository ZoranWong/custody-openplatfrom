# Story C-4-3: Webhook Event Types

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **API Gateway**,
I want to handle different event types,
so that ISVs receive relevant notifications.

## Acceptance Criteria

### Core Requirements (from epics.md C.4.3)

**Given** event types: task.created, task.signed, payment.completed, etc.
**When** processing events
**Then** route to correct handler
**And** format payload appropriately

### Extended Requirements

1. **Event Type Routing**
   - [ ] Route events to correct handler based on `WebhookEventType`
   - [ ] Support all 13 event types defined in webhook.types.ts
   - [ ] Handle unknown event types gracefully

2. **Payload Formatting**
   - [ ] Format payload per WebhookPayload interface
   - [ ] Include all required fields: id, type, timestamp, data
   - [ ] Add optional metadata (source, correlationId, priority)

3. **Event Handler Registry**
   - [ ] Create handler registry pattern
   - [ ] Support handler registration per event type
   - [ ] Support async handlers for processing

4. **Event Processing Pipeline**
   - [ ] Validate event structure before processing
   - [ ] Support priority queue (HIGH_PRIORITY_EVENTS first)
   - [ ] Log event processing decisions

5. **Event Type Metadata**
   - [ ] Use EVENT_TYPE_NAMES for display
   - [ ] Support HIGH_PRIORITY_EVENTS classification
   - [ ] Document event type semantics

## Tasks / Subtasks

### Task 1: Create Event Handler Registry (AC: #1, #3)
- [x] 1.1 Create `src/services/webhook-event-handler.service.ts`
- [x] 1.2 Implement `registerHandler` method
- [x] 1.3 Implement `unregisterHandler` method
- [x] 1.4 Implement `getHandler` method

### Task 2: Create Event Router (AC: #1, #2)
- [x] 2.1 Create `src/services/webhook-event-router.service.ts`
- [x] 2.2 Implement `routeEvent` method
- [x] 2.3 Implement priority-based routing
- [x] 2.4 Handle unknown event types

### Task 3: Create Event Handlers (AC: #1)
- [x] 3.1 Create handlers directory: `src/services/webhook-handlers/`
- [x] 3.2 Create `payment.handler.ts`
- [x] 3.3 Create `transfer.handler.ts`
- [x] 3.4 Create `pooling.handler.ts`
- [x] 3.5 Create `task.handler.ts`
- [x] 3.6 Create `account.handler.ts`

### Task 4: Implement Payload Formatter (AC: #2)
- [x] 4.1 Create `src/services/webhook-payload-formatter.service.ts`
- [x] 4.2 Implement `formatPayload` method
- [x] 4.3 Add metadata enrichment
- [x] 4.4 Validate payload structure

### Task 5: Create Event Processing Service (AC: #3, #4)
- [x] 5.1 Create `src/services/webhook-event-processor.service.ts`
- [x] 5.2 Implement `processEvent` method
- [x] 5.3 Implement priority queue logic
- [x] 5.4 Add event logging

### Task 6: Integration with Webhook Service (AC: #1-5)
- [x] 6.1 Update webhook.service.ts to use event router
- [x] 6.2 Ensure backward compatibility with existing C-4-1 push logic
- [x] 6.3 Mount handlers in main.ts (handlers are auto-initialized in constructor)

### Task 7: Unit Tests (AC: #1-5)
- [x] 7.1 Create `tests/unit/webhook-event-handler.test.ts`
- [x] 7.2 Create `tests/unit/webhook-event-router.test.ts`
- [x] 7.3 Create `tests/unit/webhook-handlers.test.ts`
- [x] 7.4 Create `tests/unit/webhook-event-processor.test.ts`
- [x] 7.5 Create `tests/unit/webhook-payload-formatter.test.ts`

## Dev Notes

### Architecture Patterns

**Source Structure:**
```
openplatform-api-service/src/
├── services/
│   ├── webhook.service.ts                    # EXISTING (C-4-1)
│   ├── webhook-event-handler.service.ts       # NEW
│   ├── webhook-event-router.service.ts       # NEW
│   ├── webhook-event-processor.service.ts    # NEW
│   ├── webhook-payload-formatter.service.ts # NEW
│   └── webhook-handlers/                     # NEW directory
│       ├── payment.handler.ts
│       ├── transfer.handler.ts
│       ├── pooling.handler.ts
│       ├── task.handler.ts
│       └── account.handler.ts
```

**API Response Format (per architecture.md):**
```json
{
  "code": 0,
  "message": "success",
  "data": { /* business data */ },
  "trace_id": "string"
}
```

**Error Response Format:**
```json
{
  "code": 40001,
  "message": "Parameter error",
  "trace_id": "string"
}
```

### Dependencies from Previous Work

**C-4-1 Webhook Push (completed):**
- `src/types/webhook.types.ts` - All type definitions exist
- `src/services/webhook.service.ts` - Webhook delivery logic exists
- `src/config/webhook-config.ts` - Configuration exists
- Retry mechanism already implemented

**C-4-2 Webhook Configuration (completed):**
- Webhook CRUD API exists
- Event types subscription management exists
- Webhook registration with eventTypes array exists

### Event Types (from webhook.types.ts)

```typescript
export const WEBHOOK_EVENT_TYPES = [
  'payment.created',
  'payment.completed',
  'payment.failed',
  'transfer.created',
  'transfer.completed',
  'transfer.failed',
  'pooling.completed',
  'pooling.failed',
  'task.created',
  'task.signed',
  'task.rejected',
  'account.low_balance',
];

export const HIGH_PRIORITY_EVENTS = [
  'payment.completed',
  'payment.failed',
  'transfer.completed',
  'transfer.failed',
  'account.low_balance',
];

export const EVENT_TYPE_NAMES = {
  'payment.created': 'Payment Created',
  'payment.completed': 'Payment Completed',
  // ... etc
};
```

### Webhook Payload Structure

```typescript
interface WebhookPayload {
  id: string;
  type: WebhookEventType;
  timestamp: number;
  data: Record<string, unknown>;
  metadata?: {
    source?: string;
    correlationId?: string;
  };
}
```

### Project Structure Notes

- **Alignment**: Follows existing patterns from webhook.service.ts
- **No conflicts**: Service pattern matches existing codebase
- **Backward Compatibility**: Must maintain C-4-1 webhook push functionality
- **Priority Handling**: HIGH_PRIORITY_EVENTS processed first

### Technical Requirements

1. **Handler Registry Pattern**
   - Allow dynamic handler registration
   - Support async handlers
   - Graceful degradation for missing handlers

2. **Event Routing**
   - Route based on event type
   - Support priority queue
   - Handle unknown types gracefully (log and skip)

3. **Payload Formatting**
   - Standardize payload structure
   - Enrich with metadata
   - Validate before sending

4. **Performance**
   - Async processing for non-blocking
   - Priority queue for critical events
   - Minimize processing latency

### References

- **Epic Requirements**: [docs/planning-artifacts/epics.md#C-4-3]
- **Architecture**: [docs/planning-artifacts/architecture.md]
- **Webhook Types**: [openplatform-api-service/src/types/webhook.types.ts]
- **Previous Story**: [docs/implementation-artifacts/c-4-1-webhook-push.md]
- **Previous Story**: [docs/implementation-artifacts/c-4-2-webhook-configuration.md]
- **C-4-1 Implementation**: [openplatform-api-service/src/services/webhook.service.ts]
- **C-4-2 Implementation**: [openplatform-api-service/src/controllers/webhook-config.controller.ts]

## Dev Agent Record

### Agent Model Used

Claude (MiniMax-M2.5)

### Debug Log References

### Completion Notes List

**Implementation completed on 2026-02-25:**

1. **Task 1: Event Handler Registry** - Created `webhook-event-handler.service.ts` with registerHandler, unregisterHandler, getHandler methods and singleton support.

2. **Task 2: Event Router** - Created `webhook-event-router.service.ts` with routeEvent method, priority-based routing, and unknown event type handling.

3. **Task 3: Event Handlers** - Created handlers directory with 5 handler files:
   - `payment.handler.ts` - Handles payment.created, payment.completed, payment.failed
   - `transfer.handler.ts` - Handles transfer.created, transfer.completed, transfer.failed
   - `pooling.handler.ts` - Handles pooling.completed, pooling.failed
   - `task.handler.ts` - Handles task.created, task.signed, task.rejected
   - `account.handler.ts` - Handles account.low_balance

4. **Task 4: Payload Formatter** - Created `webhook-payload-formatter.service.ts` with formatPayload, enrichPayload, validatePayload methods.

5. **Task 5: Event Processor** - Created `webhook-event-processor.service.ts` with processEvent method, priority queue logic, and event logging.

6. **Task 6: Integration** - Updated `webhook.service.ts` to integrate event processor with backward compatibility.

7. **Task 7: Unit Tests** - Created 5 test files:
   - `webhook-event-handler.test.ts`
   - `webhook-event-router.test.ts`
   - `webhook-handlers.test.ts`
   - `webhook-event-processor.test.ts`
   - `webhook-payload-formatter.test.ts`

All 455 tests pass (4 pre-existing test failures unrelated to this story).

## File List

### New Files
- openplatform-api-service/src/services/webhook-event-handler.service.ts
- openplatform-api-service/src/services/webhook-event-router.service.ts
- openplatform-api-service/src/services/webhook-event-processor.service.ts
- openplatform-api-service/src/services/webhook-payload-formatter.service.ts
- openplatform-api-service/src/services/webhook-handlers/payment.handler.ts
- openplatform-api-service/src/services/webhook-handlers/transfer.handler.ts
- openplatform-api-service/src/services/webhook-handlers/pooling.handler.ts
- openplatform-api-service/src/services/webhook-handlers/task.handler.ts
- openplatform-api-service/src/services/webhook-handlers/account.handler.ts
- openplatform-api-service/src/services/webhook-handlers/index.ts
- openplatform-api-service/tests/unit/webhook-event-handler.test.ts
- openplatform-api-service/tests/unit/webhook-event-router.test.ts
- openplatform-api-service/tests/unit/webhook-event-processor.test.ts
- openplatform-api-service/tests/unit/webhook-handlers.test.ts
- openplatform-api-service/tests/unit/webhook-payload-formatter.test.ts

### Modified Files
- openplatform-api-service/src/services/webhook.service.ts (added event processor integration)

