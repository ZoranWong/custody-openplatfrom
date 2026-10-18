import { describe, it, expect } from 'vitest';
import { SDKError, SDKErrorCode, ErrorCodeMessages } from '../core/error';

describe('SDKError', () => {
  it('exposes code, httpStatus, details, isRetryable', () => {
    const err = new SDKError(SDKErrorCode.API_ERROR, 'boom', 500, { traceId: 't1' });
    expect(err.name).toBe('SDKError');
    expect(err.message).toBe('boom');
    expect(err.code).toBe(SDKErrorCode.API_ERROR);
    expect(err.httpStatus).toBe(500);
    expect(err.details).toEqual({ traceId: 't1' });
    expect(err.isRetryable).toBe(true);
  });

  it('is not retryable for 4xx', () => {
    expect(new SDKError(SDKErrorCode.API_ERROR, 'bad', 400).isRetryable).toBe(false);
  });

  it('is retryable for timeout code', () => {
    expect(new SDKError(SDKErrorCode.HTTP_TIMEOUT, 'timeout').isRetryable).toBe(true);
  });

  it('serializes to JSON', () => {
    const json = new SDKError(SDKErrorCode.API_ERROR, 'boom').toJSON();
    expect(json.code).toBe(SDKErrorCode.API_ERROR);
    expect(json.name).toBe('SDKError');
  });
});

describe('SDKError.fromApiResponse', () => {
  it('maps 40001 → VALIDATION_MISSING_REQUIRED', () => {
    expect(SDKError.fromApiResponse(40001, 'x', 400, 't').code).toBe(SDKErrorCode.VALIDATION_MISSING_REQUIRED);
  });
  it('maps 40002 → VALIDATION_INVALID_FORMAT', () => {
    expect(SDKError.fromApiResponse(40002, 'x', 400, 't').code).toBe(SDKErrorCode.VALIDATION_INVALID_FORMAT);
  });
  it.each([40101, 40102, 40103, 40104, 40105, 40106, 40107])('maps %i → API_UNAUTHORIZED', (c) => {
    expect(SDKError.fromApiResponse(c, 'x', 401, 't').code).toBe(SDKErrorCode.API_UNAUTHORIZED);
  });
  it('maps 40301 → API_FORBIDDEN', () => {
    expect(SDKError.fromApiResponse(40301, 'x', 403, 't').code).toBe(SDKErrorCode.API_FORBIDDEN);
  });
  it('maps 40401 → API_NOT_FOUND', () => {
    expect(SDKError.fromApiResponse(40401, 'x', 404, 't').code).toBe(SDKErrorCode.API_NOT_FOUND);
  });
  it.each([40901, 40902])('maps %i → API_CONFLICT', (c) => {
    expect(SDKError.fromApiResponse(c, 'x', 409, 't').code).toBe(SDKErrorCode.API_CONFLICT);
  });
  it('maps 42901 → API_RATE_LIMITED', () => {
    expect(SDKError.fromApiResponse(42901, 'x', 429, 't').code).toBe(SDKErrorCode.API_RATE_LIMITED);
  });
  it.each([50001, 50301])('maps %i → API_SERVER_ERROR', (c) => {
    expect(SDKError.fromApiResponse(c, 'x', 500, 't').code).toBe(SDKErrorCode.API_SERVER_ERROR);
  });
  it('maps unknown 4xxxx → API_ERROR with code in message', () => {
    const err = SDKError.fromApiResponse(45000, 'custom', 400, 't');
    expect(err.code).toBe(SDKErrorCode.API_ERROR);
    expect(err.message).toContain('[45000]');
  });
  it('retains traceId and apiCode in details', () => {
    expect(SDKError.fromApiResponse(40301, 'x', 403, 'trace-1').details).toEqual({ traceId: 'trace-1', apiCode: 40301 });
  });
});

describe('ErrorCodeMessages', () => {
  it('has a message for every SDKErrorCode', () => {
    for (const code of Object.values(SDKErrorCode)) {
      expect(ErrorCodeMessages[code]).toBeTruthy();
    }
  });
});
