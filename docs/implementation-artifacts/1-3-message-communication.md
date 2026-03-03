# Story 1.3: SDK消息通信

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **third-party developer**,
I want to receive authorization results from the iframe,
So that I know when authorization completes.

## Acceptance Criteria

1. Given authorization page is open, When user completes authorization, Then SDK receives result via postMessage
2. Given SDK receives success result, When authorization is successful, Then onEvent callback fires with 'authorization_complete' event
3. Given SDK receives error result, When authorization fails, Then onEvent callback fires with 'authorization_error' event
4. Given SDK is destroyed, When authorization is in progress, Then all message listeners are cleaned up

## Tasks / Subtasks

- [ ] Task 1: Implement authorization result handling (AC: 1, 2, 3)
  - [ ] Subtask 1.1: Parse postMessage data structure from iframe
  - [ ] Subtask 1.2: Map message types to SDK events
  - [ ] Subtask 1.3: Resolve promise with AuthorizationResult
- [ ] Task 2: Add event callback support (AC: 2, 3)
  - [ ] Subtask 2.1: Emit 'authorization_complete' on success
  - [ ] Subtask 2.2: Emit 'authorization_error' on failure
- [ ] Task 3: Cleanup and error handling (AC: 4)
  - [ ] Subtask 3.1: Remove message listener on iframe removal
  - [ ] Subtask 3.2: Handle timeout scenarios

## Story Context

### From Epic 1 (Authorization SDK MVP)

**Epic Goal:** 演示完整的授权流程（开发者集成 → 用户登录 → 授权完成）

**This Story's Role:** Third story - Complete the message communication loop from iframe to SDK

### Dependencies

- Story 1.1: SDK初始化与配置 (已完成)
- Story 1.2: 唤起授权页面 (已完成)

### Technical Context

| Component | Technology |
|-----------|------------|
| SDK Package | npm (@cregis/openplatform-web) |
| Language | TypeScript |
| Integration | iframe + postMessage |

---

## Technical Requirements

### Message Protocol

The iframe will send messages using postMessage with the following structure:

```typescript
interface IframeMessage {
  action: 'authorization_result';
  type: 'success' | 'error';
  data?: string; // authorizationId on success
  error?: {
    code: string;
    message: string;
  };
}
```

### Expected Flow

1. User completes authorization in iframe
2. Iframe sends postMessage to parent window
3. SDK receives message via window.addEventListener('message')
4. SDK parses message and determines success/error
5. SDK emits appropriate event via onEvent callback
6. SDK resolves the Promise returned by openAuthorization()
7. SDK removes iframe and cleans up listener

### SDKEvent Types

| Event Type | When Fired |
|-----------|------------|
| authorization_started | User clicks authorize, iframe opens |
| authorization_complete | User successfully authorizes |
| authorization_error | User cancels or authorization fails |

---

## Architecture Compliance

### From Architecture Document

| Rule | Compliance |
|------|------------|
| SDK 统一管理 | npm 包发布到公有云 |
| iframe 嵌入式页面 | 使用 iframe + postMessage 通信 |
| 前端 SDK | TypeScript + npm |

### Integration with Stories 1.1 & 1.2

- Reuses CregisWebSDK class from Story 1.1
- Builds on openAuthorization() from Story 1.2
- Uses existing messageHandler and setupMessageListener from index.ts
- Utilizes message module functions: sendToParent, listenFromParent

---

## Library/Framework Requirements

### Dependencies (已有 from Story 1.1)

- typescript ^5.0
- vite ^5.0
- vitest ^1.0.0
- jsdom (for testing)

---

## File Structure Requirements

### Files to Modify

| File | Purpose |
|------|---------|
| openplatform-sdk/web/src/index.ts | Enhance message handling in setupMessageListener |
| openplatform-sdk/web/src/types.ts | Ensure IframeMessage type is complete |
| openplatform-sdk/web/src/index.test.ts | Add tests for message handling |

### Existing Code Reference

The SDK already has:
- `setupMessageListener()` at index.ts:221 - handles 'authorization_result' action
- `messageHandler` at index.ts:57 - stores listener reference
- `removeMessageListener()` at index.ts:276 - cleans up listener
- `sendToParent()` in message/index.ts - for iframe to send messages
- `listenFromParent()` in message/index.ts - for iframe to receive messages

---

## Testing Requirements

### Unit Tests

- Test postMessage event is received correctly
- Test success message triggers 'authorization_complete' event
- Test error message triggers 'authorization_error' event
- Test AuthorizationResult is correctly populated
- Test iframe is removed after message received
- Test message listener is cleaned up
- Test SDK handles malformed messages gracefully

---

## Dev Notes

### Implementation Sequence

1. Review existing setupMessageListener() implementation
2. Enhance message parsing to handle all message types
3. Ensure proper event emission via onEvent
4. Add unit tests for message handling
5. Test cleanup scenarios

### Key Decisions

- Use existing messageHandler pattern from Story 1.2
- Continue using postMessage for communication
- Include origin validation for security (already implemented in Story 1.1)
- Follow same cleanup pattern as destroy()

### Previous Story Learnings (from Story 1.2)

- URLSearchParams used for URL construction (may not apply here)
- iframe cleanup added when openAuthorization() called multiple times
- Tests use jsdom with vi.fn() for mocking
- appendChild verified in tests

---

## References

- [Source: docs/planning-artifacts/prd.md#6-SDK-技术需求]
- [Source: docs/planning-artifacts/epic-auth-sdk-mvp.md#Story-13-SDK-消息通信]
- [Source: Story 1.1 implementation - postMessage origin validation]
- [Source: Story 1.2 implementation - openAuthorization flow]

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Story 1.3 requirements were already implemented in Stories 1..2
- Added comprehensive1 & 1 unit tests for message handling (7 new tests)
- All 20 tests pass
- Tests cover: message listener setup, success/error events, iframe cleanup, listener cleanup, malformed messages

### File List

- openplatform-sdk/web/src/index.ts (already implemented)
- openplatform-sdk/web/src/index.test.ts (added 7 new tests)