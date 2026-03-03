# Story 1.2: 唤起授权页面

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **third-party developer**,
I want to trigger the authorization popup,
So that users can authorize access to their Custody account.

## Acceptance Criteria

1. Given SDK is initialized, When calling openAuthorization(), Then iframe with authorization page appears
2. Given SDK is initialized, When calling openAuthorization(), Then passes token to authorization page
3. Given iframe is created, When authorization page loads, Then proper styling is applied

## Story Context

### From Epic 1 (Authorization SDK MVP)

**Epic Goal:** 演示完整的授权流程（开发者集成 → 用户登录 → 授权完成）

**This Story's Role:** Second story - SDK must be able to open authorization page in iframe

### Dependencies

- Story 1.1: SDK初始化与配置 (已完成)

### Technical Context

| Component | Technology |
|-----------|------------|
| SDK Package | npm (@cregis/openplatform-web) |
| Language | TypeScript |
| Integration | iframe + postMessage |

---

## Technical Requirements

### openAuthorization() API

```typescript
interface AuthorizationOptions {
  /** Permissions to request */
  permissions?: string[];
  /** Custom state for callback */
  state?: string;
  /** Redirect URI after completion */
  redirectUri?: string;
}

// Usage
const sdk = new CregisWebSDK({ appId: 'xxx', container: element });
const result = await sdk.openAuthorization({
  permissions: ['read', 'write'],
  state: 'custom-state',
  redirectUri: 'https://example.com/callback'
});
```

### iframe Requirements

- Width: 100%
- Height: 100%
- Border: none
- Source URL: `{baseUrl}/auth/authorize?appId={appId}&token={token}`

### URL Parameters

| Parameter | Required | Description |
|----------|----------|-------------|
| appId | Yes | Application ID |
| token | No | Access token from third-party (via setToken()) |
| state | No | Custom state for CSRF protection |
| redirectUri | No | Callback URL after completion |

---

## Architecture Compliance

### From Architecture Document

| Rule | Compliance |
|------|------------|
| SDK 统一管理 | npm 包发布到公有云 |
| iframe 嵌入式页面 | 使用 iframe + postMessage 通信 |
| 前端 SDK | TypeScript + npm |

### Integration with Story 1.1

- Reuses CregisWebSDK class from Story 1.1
- Adds openAuthorization() method
- Token is passed via setToken() from Story 1.1

---

## Library/Framework Requirements

### Dependencies (已有 from Story 1.1)

- typescript ^5.0
- vite ^5.0
- vitest ^1.0.0

---

## File Structure Requirements

### Files to Modify

| File | Purpose |
|------|---------|
| openplatform-sdk/web/src/index.ts | Add openAuthorization() method |
| openplatform-sdk/web/src/index.test.ts | Add tests for openAuthorization |

---

## Testing Requirements

### Unit Tests

- Test openAuthorization() creates iframe
- Test iframe has correct src URL
- Test iframe styling (width, height, border)
- Test token is included in URL

---

## Dev Notes

### Implementation Sequence

1. Add openAuthorization() method to CregisWebSDK class
2. Implement iframe creation with correct URL parameters
3. Apply iframe styling
4. Add unit tests

### Key Decisions

- Use URLSearchParams for building query string
- Support both string and HTMLElement for container
- Include token in URL as query parameter

---

### References

- [Source: docs/planning-artifacts/prd.md#6-SDK-技术需求]
- [Source: docs/planning-artifacts/epic-auth-sdk-mvp.md#Story-12-唤起授权页面]
- [Source: docs/planning-artifacts/architecture.md]
- [Source: Story 1.1 implementation]

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Implemented openAuthorization() method in CregisWebSDK class
- Added token, state, redirectUri, and permissions parameters to authorization URL
- Created iframe with correct styling (width: 100%, height: 100%, border: none)
- Added unit tests verifying URL construction and iframe creation
- Tests pass successfully (11 tests)

### Code Review Fixes Applied

- Fixed: Updated story URL Parameters table to reflect token is optional (via setToken())
- Fixed: Added iframe cleanup when openAuthorization() is called multiple times
- Fixed: Added appendChild verification in tests
- Added new test: verify existing iframe is cleaned up when called multiple times
- All 12 tests pass

### File List

- openplatform-sdk/web/src/index.ts
- openplatform-sdk/web/src/index.test.ts