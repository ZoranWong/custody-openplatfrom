# Story C-4-2: Webhook Configuration

Status: review

## Story

As an **API Gateway**,
I want to manage webhook configurations,
So that ISVs can configure callbacks.

## Acceptance Criteria

### Core Requirements (from epics.md C.4.2)

**Given** ISV managing webhook config
**When** updating callback URL
**Then** validate URL format
**And** save configuration

### Extended Requirements

1. **Webhook Registration API**
   - [x] POST `/api/v1/isv/webhooks` - Create new webhook configuration
   - [x] Validate URL format (HTTPS-only, bank-grade security from C-4-1 review)
   - [x] Auto-generate webhook secret for payload signing
   - [x] Support event type selection (12 event types from webhook.types.ts)

2. **Webhook Retrieval API**
   - [x] GET `/api/v1/isv/webhooks` - List all webhooks for ISV
   - [x] GET `/api/v1/isv/webhooks/:id` - Get webhook details
   - [x] Include webhook secret in response (only at creation)

3. **Webhook Update API**
   - [x] PUT `/api/v1/isv/webhooks/:id` - Update webhook configuration
   - [x] Validate URL format when URL is provided
   - [x] Support updating event types subscription
   - [x] Support enabling/disabling webhook

4. **Webhook Delete API**
   - [x] DELETE `/api/v1/isv/webhooks/:id` - Delete webhook configuration
   - [x] Return error if webhook has pending deliveries

5. **Security Requirements**
   - [x] All endpoints require ISV authentication (isvAuth middleware)
   - [x] Validate webhook belongs to authenticated ISV
   - [x] HTTPS-only URLs (from C-4-1 code review fix)
   - [x] URL validation with hostname/IP checks

## Tasks / Subtasks

### Task 1: Create Webhook Configuration Controller (AC: #1-3)
- [x] 1.1 Create `src/controllers/webhook-config.controller.ts`
- [x] 1.2 Implement `createWebhook` handler
- [x] 1.3 Implement `getWebhooks` handler (list)
- [x] 1.4 Implement `getWebhookById` handler
- [x] 1.5 Implement `updateWebhook` handler
- [x] 1.6 Implement `deleteWebhook` handler

### Task 2: Extend Webhook Service (AC: #1-3)
- [x] 2.1 Add CRUD methods to `src/services/webhook.service.ts` (already existed from C-4-1)
- [x] 2.2 Implement `createWebhookConfig` method (already existed)
- [x] 2.3 Implement `getWebhooksByISV` method (already existed)
- [x] 2.4 Implement `getWebhookConfigById` method (already existed)
- [x] 2.5 Implement `updateWebhookConfig` method (already existed)
- [x] 2.6 Implement `deleteWebhookConfig` method (already existed)

### Task 3: Create Webhook Routes (AC: #1-4)
- [x] 3.1 Create `src/routes/v1/webhook-config.routes.ts`
- [x] 3.2 Add POST `/webhooks` route
- [x] 3.3 Add GET `/webhooks` route
- [x] 3.4 Add GET `/webhooks/:id` route
- [x] 3.5 Add PUT `/webhooks/:id` route
- [x] 3.6 Add DELETE `/webhooks/:id` route
- [x] 3.7 Mount routes in main.ts under `/api/v1/isv`

### Task 4: URL Validation (AC: #2, #3)
- [x] 4.1 URL validation already exists in webhook.service.ts (from C-4-1)
- [x] 4.2 Enforce HTTPS-only URLs (implemented)
- [x] 4.3 Validate hostname format (implemented)
- [x] 4.4 Reject localhost/private IPs (implemented)

### Task 5: Unit Tests (AC: #1-5)
- [x] 5.1 Create `tests/unit/webhook-config.controller.test.ts`
- [x] 5.2 Test webhook creation with valid/invalid URLs
- [x] 5.3 Test webhook listing and retrieval
- [x] 5.4 Test webhook update scenarios
- [x] 5.5 Test webhook deletion
- [x] 5.6 Test authentication and authorization

## Dev Notes

### Architecture Patterns

**Source Structure:**
```
openplatform-api-service/src/
├── controllers/
│   └── webhook-config.controller.ts  # NEW
├── services/
│   └── webhook.service.ts          # EXISTING (CRUD methods already existed)
├── routes/
│   └── v1/
│       └── webhook-config.routes.ts # NEW
└── types/
    └── webhook.types.ts            # EXISTING (reused)
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
- `src/types/webhook.types.ts` - All type definitions already exist
- `src/services/webhook.service.ts` - Webhook delivery logic and CRUD methods exist
- `src/config/webhook-config.ts` - Configuration exists

**Security Requirements (from C-4-1 code review):**
- HTTPS-only URLs (HTTP rejected)
- Replay attack window: 120s
- Rate limiting implemented in HTTP client
- Concurrency control via processingLock

### Webhook Configuration Schema

From webhook.types.ts, the configuration to manage:
```typescript
interface Webhook {
  id: string;
  enterpriseId: string;  // Maps to ISV's enterprise
  url: string;           // HTTPS-only validated
  secret: string;        // Auto-generated for signing
  eventTypes: WebhookEventType[];  // 12 event types
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

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
```

### Project Structure Notes

- **Alignment**: Follows existing patterns from `isv.routes.ts` and `billing.routes.ts`
- **No conflicts**: Controller pattern matches existing codebase
- **Mount point**: Routes mount under `/api/v1/isv` to match ISV resource structure

### References

- **Epic Requirements**: [docs/planning-artifacts/epics.md#C-4-2]
- **Architecture**: [docs/planning-artifacts/architecture.md]
- **Webhook Types**: [openplatform-api-service/src/types/webhook.types.ts]
- **Previous Story**: [docs/implementation-artifacts/c-4-1-webhook-push.md]
- **ISV Auth Middleware**: [openplatform-api-service/src/middleware/isv-auth.middleware.ts]
- **C-4-1 Code Review Fixes**: HTTPS-only validation, security improvements

## Dev Agent Record

### Agent Model Used

Claude MiniMax-M2.1 (2026-02-11)

### Debug Log References

### Completion Notes List

- **Task 1**: Created webhook-config.controller.ts with all 5 CRUD handlers following billing.controller.ts pattern
- **Task 2**: Verified CRUD methods already existed in webhook.service.ts from C-4-1 implementation
- **Task 3**: Created webhook-config.routes.ts and mounted to `/api/v1/isv` in main.ts
- **Task 4**: HTTPS-only URL validation already implemented in webhook.service.ts (C-4-1)
- **Task 5**: Created 19 unit tests covering all CRUD operations and authorization

### Implementation Summary

- Created comprehensive controller following existing patterns
- All endpoints require ISV authentication via isvAuth middleware
- Webhook ownership validation prevents ISVs from accessing others' webhooks
- Secret is only exposed in creation response (security best practice)
- HTTPS-only URL validation enforced at service level

### Test Results

- **24 tests passed** in webhook-config.controller.test.ts (added 5 new tests)
- **377 tests passed** in full test suite (no regressions)
- TypeScript compilation: No errors

## File List

```
Created:
- src/controllers/webhook-config.controller.ts
- src/routes/v1/webhook-config.routes.ts
- tests/unit/webhook-config.controller.test.ts

Modified:
- src/main.ts (added webhookConfigRoutes import and mount)

No Changes Required:
- src/services/webhook.service.ts (CRUD methods already existed from C-4-1)
```

## Change Log

- **2026-02-11**: Initial implementation - Created webhook configuration CRUD API
- **2026-02-11**: Code review fixes applied

### Code Review Fixes Applied (2026-02-11)

**HIGH Issues Fixed:**

1. **Pending deliveries check before delete** - Added `listDeliveries()` check with 409 response when pending deliveries exist

2. **Event types type safety** - Added `validateEventTypes()` helper function that:
   - Validates each element is a valid `WebhookEventType`
   - Filters and type-asserts valid types
   - Returns detailed error with invalid types

3. **Race condition mitigation** - Added:
   - Re-fetch before update to minimize TOCTOU window
   - Optimistic locking support via `if_version` header
   - 409 response with current version when version mismatch

**MEDIUM Issues Fixed:**

4. **Added test for pending deliveries check** - New test case verifies 409 response

5. **Consistent traceId handling** - Extracted `extractIsvContext()` helper for consistent pattern

6. **Pagination on webhook list** - Added:
   - `page` and `page_size` query parameters
   - Response includes `total`, `page`, `page_size`, `total_pages`
   - Page size capped at 100 to prevent abuse

**LOW Issues Addressed:**

7. **API response consistency** - All responses use consistent snake_case format

8. **Code duplication reduced** - Helper functions extract common patterns
