import { describe, it, expect } from 'vitest';
import {
  SDKError, SDKErrorCode, ErrorCodeMessages, isCustodyError, isRetryableError, getCustodyErrorInfo,
} from '../core/error';
import { CustodyErrorCode, CustodyErrorInfo, CustodyErrorsByRoute } from '../core/custody-errors';

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

describe('custody business codes', () => {
  it('maps BOARD_NOT_EXIST (400030) → CUSTODY_STATE_ERROR with metadata', () => {
    const err = SDKError.fromApiResponse(400030, 'BOARD_NOT_EXIST', 200, 't');
    expect(err.code).toBe(SDKErrorCode.CUSTODY_STATE_ERROR);
    expect(err.apiCode).toBe(400030);
    expect(err.apiConstant).toBe('BOARD_NOT_EXIST');
    expect(err.constant).toBe('BOARD_NOT_EXIST');
    expect(err.category).toBe('STATE');
    expect(err.message).toContain('BOARD_NOT_EXIST');
    expect(err.isRetryable).toBe(false);
  });

  it('maps 400006 ACCOUNT_NOT_EXIST → CUSTODY_STATE_ERROR', () => {
    const err = SDKError.fromApiResponse(400006, 'ACCOUNT_NOT_EXIST', 200);
    expect(err.code).toBe(SDKErrorCode.CUSTODY_STATE_ERROR);
    expect(err.message).toContain('does not belong to this company');
    expect(getCustodyErrorInfo(400006).meaningZh).toContain('账户不存在');
  });

  it('maps 400103 → CUSTODY_RESOURCE_NOT_EXISTS', () => {
    expect(SDKError.fromApiResponse(400103, 'THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS', 200).code)
      .toBe(SDKErrorCode.CUSTODY_RESOURCE_NOT_EXISTS);
  });

  it.each([300004, 400440])('maps balance code %i → CUSTODY_INSUFFICIENT_FUNDS', (c) => {
    expect(SDKError.fromApiResponse(c, 'X', 200).code).toBe(SDKErrorCode.CUSTODY_INSUFFICIENT_FUNDS);
  });

  it('maps 400216 NETWORK_NOT_SUPPORT → CUSTODY_VALIDATION_ERROR', () => {
    expect(SDKError.fromApiResponse(400216, 'NETWORK_NOT_SUPPORT', 200).code)
      .toBe(SDKErrorCode.CUSTODY_VALIDATION_ERROR);
  });

  it('flags infra codes as retryable (e.g. 400441 address lock)', () => {
    const err = SDKError.fromApiResponse(400441, 'ADDRESS_BALANCE_CHECK_FAILED', 200);
    expect(err.category).toBe('INFRA');
    expect(err.isRetryable).toBe(true);
  });

  it('keeps gateway 500 non-retryable-agnostic mapping but server category', () => {
    const err = SDKError.fromApiResponse(500, 'Request failed with status code 502', 500);
    expect(err.code).toBe(SDKErrorCode.API_SERVER_ERROR);
    expect(err.apiConstant).toBeNull();
    expect(err.isRetryable).toBe(true);
  });

  it('isCustodyError / isRetryableError helpers', () => {
    expect(isCustodyError(SDKError.fromApiResponse(400030, 'x', 200))).toBe(true);
    expect(isCustodyError(SDKError.fromApiResponse(40102, 'x', 401))).toBe(false);
    expect(isCustodyError(new Error('x'))).toBe(false);
    expect(isRetryableError(SDKError.fromApiResponse(400441, 'x', 200))).toBe(true);
    expect(isRetryableError(SDKError.fromApiResponse(400030, 'x', 200))).toBe(false);
  });

  it('registry stays consistent', () => {
    for (const [name, code] of Object.entries(CustodyErrorCode)) {
      expect(CustodyErrorInfo[code].constant).toBe(name);
    }
    expect(CustodyErrorsByRoute['treasury-payout']).toContain(CustodyErrorCode.ACCOUNT_BALANCE_NOT_ENOUGH);
    expect(CustodyErrorsByRoute['board-init']).toContain(CustodyErrorCode.SIGNER_NOT_EXIST_OR_NOT_ENOUGH);
  });
});

describe('ErrorCodeMessages', () => {
  it('has a message for every SDKErrorCode', () => {
    for (const code of Object.values(SDKErrorCode)) {
      expect(ErrorCodeMessages[code]).toBeTruthy();
    }
  });
});
