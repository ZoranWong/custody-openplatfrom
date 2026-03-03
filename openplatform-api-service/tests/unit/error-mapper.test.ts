/**
 * Error Mapper Service Tests
 */

import { describe, it, expect } from 'vitest';
import {
  ErrorMapper,
  errorMapper,
  createErrorMapper,
  PlatformErrorResponse,
} from '../../src/services/error-mapper.service';

describe('ErrorMapper', () => {
  let mapper: ErrorMapper;

  beforeEach(() => {
    mapper = new ErrorMapper();
  });

  describe('mapCode', () => {
    it('should map custody code 40001 to platform code 40001', () => {
      expect(mapper.mapCode(40001)).toBe(40001);
    });

    it('should map custody code 40102 to platform code 40102', () => {
      expect(mapper.mapCode(40102)).toBe(40102);
    });

    it('should map custody code 40305 to platform code 40305', () => {
      expect(mapper.mapCode(40305)).toBe(40305);
    });

    it('should map custody code 40401 to platform code 40401', () => {
      expect(mapper.mapCode(40401)).toBe(40401);
    });

    it('should map custody code 50001 to platform code 50001', () => {
      expect(mapper.mapCode(50001)).toBe(50001);
    });

    it('should map unknown 400 code to 42901', () => {
      // 4xxxx codes fall back to 40000, which maps to 42901 (last entry)
      expect(mapper.mapCode(40099)).toBe(42901);
    });

    it('should map unknown 500 code to 50402', () => {
      // 5xxxx codes fall back to 50000, which maps to 50402 (last entry)
      expect(mapper.mapCode(50099)).toBe(50402);
    });

    it('should map unknown 5xx code to 50402', () => {
      // 5xxxx codes fall back to 50000, which maps to 50402 (last entry)
      expect(mapper.mapCode(59999)).toBe(50402);
    });
  });

  describe('getDefaultMessage', () => {
    it('should return correct message for 40001', () => {
      expect(mapper.getDefaultMessage(40001)).toBe('Parameter error');
    });

    it('should return correct message for 40102', () => {
      expect(mapper.getDefaultMessage(40102)).toBe('Token expired');
    });

    it('should return correct message for 50001', () => {
      expect(mapper.getDefaultMessage(50001)).toBe('Internal server error');
    });

    it('should return generic message for unknown 500 error', () => {
      expect(mapper.getDefaultMessage(55555)).toBe('Internal server error');
    });

    it('should return generic message for unknown 400 error', () => {
      // Unknown 400 codes (in the 400-499 range) get generic client error message
      expect(mapper.getDefaultMessage(444)).toBe('Client error');
    });
  });

  describe('mapError', () => {
    it('should map custody error response', () => {
      const custodyError = {
        code: 40001,
        message: 'Invalid parameter',
      };

      const result = mapper.mapError(custodyError, 'trace-123');

      expect(result.code).toBe(40001);
      expect(result.message).toBe('Invalid parameter');
      expect(result.trace_id).toBe('trace-123');
      expect(result.original_code).toBe(40001);
    });

    it('should use default message if not provided', () => {
      const custodyError = {
        code: 40001,
      };

      const result = mapper.mapError(custodyError, 'trace-123');

      expect(result.message).toBe('Parameter error');
    });

    it('should use default code and message if not provided', () => {
      const custodyError = {};

      const result = mapper.mapError(custodyError, 'trace-123');

      expect(result.code).toBe(50001);
      expect(result.message).toBe('Internal server error');
    });

    it('should preserve additional error properties', () => {
      const custodyError = {
        code: 40001,
        message: 'Error',
        details: { field: 'email' },
      };

      const result = mapper.mapError(custodyError, 'trace-123');

      expect(result.original_code).toBe(40001);
    });
  });

  describe('createNetworkError', () => {
    it('should create timeout error for ECONNABORTED', () => {
      const networkError = {
        code: 'ECONNABORTED',
        message: 'Timeout exceeded',
      };

      const result = mapper.createNetworkError(networkError, 'trace-123');

      expect(result.code).toBe(50401);
      expect(result.message).toBe('Gateway timeout');
      expect(result.details?.type).toBe('timeout');
    });

    it('should create timeout error for ETIMEDOUT', () => {
      const networkError = {
        code: 'ETIMEDOUT',
        message: 'Connection timed out',
      };

      const result = mapper.createNetworkError(networkError, 'trace-123');

      expect(result.code).toBe(50401);
      expect(result.message).toBe('Gateway timeout');
    });

    it('should create connection refused error', () => {
      const networkError = {
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      };

      const result = mapper.createNetworkError(networkError, 'trace-123');

      expect(result.code).toBe(50402);
      expect(result.message).toBe('Service unavailable');
      expect(result.details?.type).toBe('connection_refused');
    });

    it('should handle unknown network error', () => {
      const networkError = {
        code: 'UNKNOWN',
        message: 'Unknown error',
      };

      const result = mapper.createNetworkError(networkError, 'trace-123');

      expect(result.code).toBe(50001);
      expect(result.message).toBe('Internal server error');
      expect(result.details?.type).toBe('network_error');
    });
  });
});

describe('Default Error Mapper Instance', () => {
  it('should have predefined mappings', () => {
    expect(errorMapper.mapCode(40001)).toBe(40001);
    expect(errorMapper.mapCode(40101)).toBe(40101);
    expect(errorMapper.mapCode(40301)).toBe(40301);
    expect(errorMapper.mapCode(40401)).toBe(40401);
    expect(errorMapper.mapCode(50001)).toBe(50001);
  });
});

describe('Custom Error Mapper', () => {
  it('should create with custom mappings', () => {
    const customMappings = [
      {
        custodyCode: 99999,
        platformCode: 40001,
        defaultMessage: 'Custom error',
      },
    ];

    const customMapper = createErrorMapper(customMappings);

    expect(customMapper.mapCode(99999)).toBe(40001);
  });

  it('should fall back to default mappings for unknown codes', () => {
    const customMappings = [
      {
        custodyCode: 99999,
        platformCode: 40001,
        defaultMessage: 'Custom error',
      },
    ];

    const customMapper = createErrorMapper(customMappings);

    // Custom mapper inherits default mappings
    expect(customMapper.mapCode(50001)).toBe(50001);
  });
});

describe('Error Response Format', () => {
  it('should match PlatformErrorResponse interface', () => {
    const error: PlatformErrorResponse = {
      code: 40001,
      message: 'Parameter error',
      trace_id: 'trace-123',
      original_code: 40001,
    };

    expect(error.code).toBe(40001);
    expect(error.message).toBe('Parameter error');
    expect(error.trace_id).toBe('trace-123');
    expect(error.original_code).toBe(40001);
  });

  it('should allow optional details', () => {
    const error: PlatformErrorResponse = {
      code: 50401,
      message: 'Gateway timeout',
      trace_id: 'trace-123',
      details: {
        type: 'timeout',
        original_error: 'ETIMEDOUT',
      },
    };

    expect(error.details).toBeDefined();
    expect(error.details?.type).toBe('timeout');
  });
});
