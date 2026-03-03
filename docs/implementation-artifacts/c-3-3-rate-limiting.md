# Story C-3-3: Rate Limiting

**Status:** done
**Priority:** High
**Estimated Points:** 8
**Epic:** C (API Gateway)
**Created:** 2026-02-10

## Story Description

As an API Gateway, I need to implement rate limiting to protect backend services from abuse and ensure fair resource allocation among API consumers.

## User Stories

1. **App-Level Rate Limiting**: Limit requests per application (appid)
2. **Enterprise-Level Rate Limiting**: Limit requests per enterprise
3. **Endpoint-Level Rate Limiting**: Apply different limits per API endpoint
4. **Tiered Rate Limits**: Support different limits based on subscription tiers
5. **Rate Limit Headers**: Return rate limit information in response headers
6. **Quota Management**: Daily/monthly request quotas
7. **Rate Limit Exceeded Response**: Return 429 status when limit exceeded

## Technical Requirements

### Rate Limiting Strategy

| Tier | Requests/Day | Requests/Hour | Requests/Minute | Burst |
|------|--------------|---------------|-----------------|-------|
| Free | 1,000 | 100 | 10 | 20 |
| Basic | 10,000 | 1,000 | 100 | 200 |
| Pro | 100,000 | 10,000 | 1,000 | 2,000 |
| Enterprise | Unlimited | 100,000 | 10,000 | 20,000 |

### Response Headers

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
X-RateLimit-Policy: basic
```

### Error Response (429)

```json
{
  "code": 42901,
  "message": "Rate limit exceeded. Please try again later.",
  "retry_after": 60
}
```

## Implementation Details

### Files to Create

1. `src/types/rate-limit.types.ts` - Type definitions
2. `src/services/rate-limit.service.ts` - Rate limiting service
3. `src/middleware/rate-limit.middleware.ts` - Express middleware
4. `src/config/rate-limit-rules.ts` - Rate limit configurations
5. `tests/unit/rate-limit.service.test.ts` - Service tests
6. `tests/unit/rate-limit.middleware.test.ts` - Middleware tests

### Rate Limit Algorithm

Use **Sliding Window Counter** algorithm for accurate rate limiting:

```typescript
interface RateLimitConfig {
  windowSize: number;        // Window size in seconds
  maxRequests: number;       // Max requests per window
  tierKey: string;          // Subscription tier identifier
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
  tier: string;
}
```

### Redis Schema (for distributed rate limiting)

```
ratelimit:{appid}:{window} -> count
ratelimit:{enterprise_id}:{window} -> count
ratelimit:ip:{ip_address}:{window} -> count
```

## Acceptance Criteria

- [x] Rate limits enforced per appid
- [x] Rate limits enforced per enterprise
- [x] Different limits per endpoint type
- [x] Tier-based configuration supported
- [x] Rate limit headers returned on all responses
- [x] 429 status code on limit exceeded
- [x] Retry-After header included
- [x] Tests cover all scenarios
- [x] Code reviewed and approved

## Dependencies

- Redis (for distributed rate limiting)
- Configuration service (for tier settings)

## Implementation Completed

### Files Created/Modified

1. `src/types/rate-limit.types.ts` - Type definitions
2. `src/services/rate-limit.service.ts` - Rate limiting service (sliding window counter)
3. `src/middleware/rate-limit.middleware.ts` - Express middleware
4. `src/config/rate-limit-rules.ts` - Rate limit configurations
5. `src/middleware/admin-rate-limit.middleware.ts` - Admin-specific rate limiting
6. `tests/unit/rate-limit.service.test.ts` - Service tests (27 tests)
7. `tests/unit/rate-limit.middleware.test.ts` - Middleware tests (25 tests)

### Implementation Details

- ✅ Sliding Window Counter algorithm
- ✅ 4 subscription tiers: Free, Basic, Pro, Enterprise
- ✅ App-level rate limiting
- ✅ Enterprise-level rate limiting
- ✅ Endpoint-level rate limiting
- ✅ Rate limit headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- ✅ 429 status code with Retry-After header
- ✅ 52 tests passing

## Code Review Findings (2026-02-25)

### Issues Fixed
- Fixed typo in rate-limit-rules.ts:222 - "ed configuration" → "Relaxed configuration"

## Notes

- Use in-memory cache for single-instance deployments
- Use Redis for multi-instance deployments
- Consider using token bucket for burst handling
