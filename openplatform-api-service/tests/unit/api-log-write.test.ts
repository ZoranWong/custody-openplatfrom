import { describe, it, expect, vi, beforeEach } from 'vitest';

const created: any[] = [];

vi.mock('../../src/repositories/repository.factory', () => ({
  getApiLogRepository: () => ({
    create: async (data: any) => {
      created.push(data);
      return data;
    },
  }),
}));

const { createApiLog } = await import('../../src/services/api-log.service');

describe('createApiLog byte accounting', () => {
  beforeEach(() => {
    created.length = 0;
  });

  it('derives request/response bytes from payloads', async () => {
    await createApiLog({
      endpoint: '/api/x',
      method: 'POST',
      requestBody: { a: 1 },
      responseBody: { ok: true },
    });
    const row = created[0];
    expect(row.requestBytes).toBe(7);
    expect(row.responseBytes).toBe(11);
  });

  it('writes 0 when payloads are absent', async () => {
    await createApiLog({ endpoint: '/api/x', method: 'GET' });
    expect(created[0].requestBytes).toBe(0);
    expect(created[0].responseBytes).toBe(0);
  });

  it('accepts explicit byte counts and prefers them', async () => {
    await createApiLog({
      endpoint: '/api/x',
      method: 'POST',
      requestBody: { a: 1 },
      requestBytes: 999,
    });
    expect(created[0].requestBytes).toBe(999);
  });
});
