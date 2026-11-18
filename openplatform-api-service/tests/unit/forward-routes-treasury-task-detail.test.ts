/**
 * treasury/task/detail route configuration.
 *
 * The task-detail endpoint is GET-shaped upstream (business filters in the
 * query string), so the route must be marked `businessAsQuery` and keep the
 * gateway-facing contract (POST + Resource signature) consistent with
 * `treasury/tasks`.
 */

import { describe, it, expect } from 'vitest'

import { FORWARD_ROUTES, validateForwardRoutes } from '../../src/config/forward-routes'

describe('treasury/task/detail forward route', () => {
  it('is registered with the custody task-detail target', () => {
    const route = FORWARD_ROUTES.find((r) => r.routeId === 'treasury-task-detail')

    expect(route).toBeDefined()
    expect(route!.inboundPath).toBe('/api/thirdparty/task/detail')
    expect(route!.route).toBe('/api/third-party/detail/task/{resourceKey}')
    expect(route!.method).toBe('GET')
    expect(route!.clientName).toBe('custodyService')
    expect(route!.paramMapping).toEqual({ resourceKey: 'context' })
    expect(route!.businessAsQuery).toBe(true)
  })

  it('keeps the whole route table valid', () => {
    expect(() => validateForwardRoutes(FORWARD_ROUTES)).not.toThrow()
  })
})
