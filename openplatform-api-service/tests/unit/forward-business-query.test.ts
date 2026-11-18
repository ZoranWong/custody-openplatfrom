/**
 * Forward controller — business → query promotion.
 *
 * The task-list route forwards to a GET-shaped custody endpoint, so the
 * inbound business payload (signed as usual) must travel as query params
 * while ordinary routes keep sending business as the POST body.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockRequest = vi.fn()

vi.mock('../../src/services/http-client.service', () => ({
  createHttpClient: () => ({ request: mockRequest }),
}))

vi.mock('../../src/services/quota.service', () => ({
  checkAndIncrement: vi.fn().mockResolvedValue({ allowed: true }),
}))

vi.mock('../../src/services/api-log.service', () => ({
  createApiLog: vi.fn().mockResolvedValue(undefined),
}))

import { forwardRequest } from '../../src/controllers/thirdparty/forward.controller'

const RESOURCE_KEY = 'rak-test-001'

function makeReq(path: string, business: Record<string, unknown>) {
  return {
    baseUrl: '/api/thirdparty',
    path,
    method: 'POST',
    query: {},
    headers: {},
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    body: { basic: { appId: 'app-1' }, business },
    context: { application: { id: 'app-1' }, resource: { resourceKey: RESOURCE_KEY } },
  } as any
}

function makeRes() {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('forwardRequest businessAsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequest.mockResolvedValue({ code: 0, message: 'Success', data: { records: [] } })
  })

  it('sends business filters as query params to the task-list target', async () => {
    const business = {
      pageNum: 1,
      pageSize: 10,
      businessId: 'B-1',
      taskType: 'orders',
      taskId: 'T-1',
      state: 'AUDITING',
    }

    await forwardRequest(makeReq('/treasury/tasks', business), makeRes())

    expect(mockRequest).toHaveBeenCalledTimes(1)
    const sent = mockRequest.mock.calls[0][0]
    expect(sent.method).toBe('GET')
    expect(sent.url).toBe(`/api/third-party/list/task/${RESOURCE_KEY}`)
    expect(sent.data).toBeUndefined()
    expect(sent.params).toEqual(business)
  })

  it('drops undefined/null business fields from the query', async () => {
    const business = { pageNum: 1, state: 'AUDITING', taskType: undefined, businessId: null }

    await forwardRequest(makeReq('/treasury/tasks', business), makeRes())

    const sent = mockRequest.mock.calls[0][0]
    expect(sent.params).toEqual({ pageNum: 1, state: 'AUDITING' })
  })

  it('keeps business as the POST body for ordinary routes', async () => {
    const business = { pageSize: 10, pageNum: 1 }

    await forwardRequest(makeReq('/treasury/list', business), makeRes())

    const sent = mockRequest.mock.calls[0][0]
    expect(sent.url).toBe('/api/third-party/list/' + RESOURCE_KEY)
    expect(sent.data).toBe(business)
    expect(sent.params).toEqual({})
  })

  it('sends business filters as query params to the task-detail target', async () => {
    const business = { businessId: 'B-1', taskType: 'issues' }

    await forwardRequest(makeReq('/task/detail', business), makeRes())

    expect(mockRequest).toHaveBeenCalledTimes(1)
    const sent = mockRequest.mock.calls[0][0]
    expect(sent.method).toBe('GET')
    expect(sent.url).toBe(`/api/third-party/detail/task/${RESOURCE_KEY}`)
    expect(sent.data).toBeUndefined()
    expect(sent.params).toEqual(business)
  })
})
