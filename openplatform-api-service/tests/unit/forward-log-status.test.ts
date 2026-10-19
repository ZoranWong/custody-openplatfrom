/**
 * Forward controller — custody business code → logged HTTP status mapping
 *
 * The gateway always responds HTTP 200 for forwardable requests; responseStatus
 * is the value shown in the developer portal and used by error-rate queries.
 */

import { describe, it, expect } from 'vitest';
import { custodyCodeToHttpStatus } from '../../src/controllers/thirdparty/forward.controller';

describe('custodyCodeToHttpStatus', () => {
  it('treats 0 and 200 as success', () => {
    expect(custodyCodeToHttpStatus(0)).toBe(200);
    expect(custodyCodeToHttpStatus(200)).toBe(200);
  });

  it('maps parameter/validation errors to 400', () => {
    expect(custodyCodeToHttpStatus(400)).toBe(400);
    expect(custodyCodeToHttpStatus(400001)).toBe(400);
    expect(custodyCodeToHttpStatus(400006)).toBe(400);
    expect(custodyCodeToHttpStatus(400042)).toBe(400);
    expect(custodyCodeToHttpStatus(400070)).toBe(400);
  });

  it('maps business-rule rejections (120xxx) to 400', () => {
    expect(custodyCodeToHttpStatus(120042)).toBe(400);
  });

  it('maps authentication errors to 401', () => {
    expect(custodyCodeToHttpStatus(40102)).toBe(401);
    expect(custodyCodeToHttpStatus(40110)).toBe(401);
  });

  it('maps authorization errors to 403', () => {
    expect(custodyCodeToHttpStatus(40301)).toBe(403);
  });

  it('maps resource-not-found to 404', () => {
    expect(custodyCodeToHttpStatus(400103)).toBe(404);
    expect(custodyCodeToHttpStatus(40401)).toBe(404);
  });

  it('maps conflicts to 409', () => {
    expect(custodyCodeToHttpStatus(40902)).toBe(409);
  });

  it('maps rate limiting to 429', () => {
    expect(custodyCodeToHttpStatus(42901)).toBe(429);
  });

  it('maps upstream failures to 500', () => {
    expect(custodyCodeToHttpStatus(500)).toBe(500);
    expect(custodyCodeToHttpStatus(50001)).toBe(500);
  });

  it('maps unknown client codes to 400 and unparseable values to 500', () => {
    expect(custodyCodeToHttpStatus(77777)).toBe(400);
    expect(custodyCodeToHttpStatus(undefined)).toBe(500);
    expect(custodyCodeToHttpStatus('400103')).toBe(500);
  });
});
