/**
 * treasury/tasks route configuration.
 *
 * The task-list endpoint is GET-shaped upstream, so the route must be marked
 * `businessAsQuery` and keep the gateway-facing contract (POST + Resource
 * signature) consistent with the other forwarded routes.
 */

import { describe, it, expect } from 'vitest'

import { FORWARD_ROUTES, validateForwardRoutes } from '../../src/config/forward-routes'

describe('treasury/tasks forward route', () => {
  it('is registered with the custody task-list target', () => {
    const route = FORWARD_ROUTES.find((r) => r.routeId === 'treasury-tasks')

    expect(route).toBeDefined()
    expect(route!.inboundPath).toBe('/api/thirdparty/treasury/tasks')
    expect(route!.route).toBe('/api/third-party/list/task/{resourceKey}')
    expect(route!.method).toBe('GET')
    expect(route!.clientName).toBe('custodyService')
    expect(route!.paramMapping).toEqual({ resourceKey: 'context' })
    expect(route!.businessAsQuery).toBe(true)
  })

  it('keeps the whole route table valid', () => {
    expect(() => validateForwardRoutes(FORWARD_ROUTES)).not.toThrow()
  })
})
