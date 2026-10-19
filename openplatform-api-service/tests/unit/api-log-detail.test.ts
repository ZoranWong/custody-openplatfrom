/**
 * API log detail endpoint tests (developer scope)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const logs = new Map<string, any>([
  ['log-own', { id: 'log-own', developerId: 'dev-1', endpoint: '/api/thirdparty/treasury/list', method: 'POST', responseStatus: 200, responseBody: { code: 200 }, requestBody: { pageSize: 1 }, createdAt: new Date('2026-10-18T00:00:00Z') }],
  ['log-other', { id: 'log-other', developerId: 'dev-2', endpoint: '/api/thirdparty/treasury/list', method: 'POST', responseStatus: 200, responseBody: { code: 200 }, createdAt: new Date('2026-10-18T00:00:00Z') }],
]);

vi.mock('../../src/middleware/isv-auth.middleware', () => ({
  isvAuth: (req: any, _res: any, next: any) => {
    req.isvUser = { isvId: 'dev-1' };
    next();
  },
}));

vi.mock('../../src/repositories/repository.factory', () => ({
  getApiLogRepository: () => ({
    findById: async (id: string) => logs.get(id) ?? null,
  }),
}));

// Import after mocks are registered
const { default: apiLogRoutes } = await import('../../src/routes/v1/api-log.routes');

describe('GET /api/v1/api-logs/:id', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use('/api/v1/api-logs', apiLogRoutes);
  });

  it('returns the log payload for the owning developer', async () => {
    const res = await request(app).get('/api/v1/api-logs/log-own');
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.id).toBe('log-own');
    expect(res.body.data.requestBody).toEqual({ pageSize: 1 });
    expect(res.body.data.responseBody).toEqual({ code: 200 });
  });

  it("hides another developer's log behind 404", async () => {
    const res = await request(app).get('/api/v1/api-logs/log-other');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe(40401);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).get('/api/v1/api-logs/missing');
    expect(res.status).toBe(404);
  });
});
