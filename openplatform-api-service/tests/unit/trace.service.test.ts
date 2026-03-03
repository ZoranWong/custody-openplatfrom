/**
 * Trace Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateTraceId,
  generateSpanId,
  extractTraceId,
  parseTraceparent,
  generateTraceparent,
  propagateTrace,
  getPropagationHeaders,
  extractTraceState,
  generateTraceState,
} from '../../src/services/trace.service';

describe('Trace Service', () => {
  describe('generateTraceId', () => {
    it('should generate a valid UUID v4', () => {
      const traceId = generateTraceId();
      expect(traceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateTraceId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('generateSpanId', () => {
    it('should generate an 8-character hex string', () => {
      const spanId = generateSpanId();
      expect(spanId).toMatch(/^[0-9a-f]{8}$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateSpanId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('extractTraceId', () => {
    it('should extract trace ID from X-Trace-Id header', () => {
      const headers = { 'x-trace-id': 'test-trace-id' };
      const result = extractTraceId(headers);
      expect(result).toBe('test-trace-id');
    });

    it('should extract trace ID from traceparent header', () => {
      const headers = {
        'traceparent': '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01'
      };
      const result = extractTraceId(headers);
      expect(result).toBe('0af7651916cd43dd8448eb211c80319c');
    });

    it('should prefer traceparent over X-Trace-Id', () => {
      const headers = {
        'x-trace-id': 'legacy-trace-id',
        'traceparent': '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01'
      };
      const result = extractTraceId(headers);
      expect(result).toBe('0af7651916cd43dd8448eb211c80319c');
    });

    it('should return null when no trace ID present', () => {
      const headers = {};
      const result = extractTraceId(headers);
      expect(result).toBeNull();
    });
  });

  describe('parseTraceparent', () => {
    it('should parse valid traceparent header', () => {
      const traceparent = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';
      const result = parseTraceparent(traceparent);

      expect(result).not.toBeNull();
      expect(result?.traceId).toBe('0af7651916cd43dd8448eb211c80319c');
      expect(result?.spanId).toBe('b7ad6b7169203331');
      expect(result?.traceFlags).toBe('01');
    });

    it('should return null for invalid version', () => {
      const traceparent = '01-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';
      const result = parseTraceparent(traceparent);
      expect(result).toBeNull();
    });

    it('should return null for invalid format', () => {
      const traceparent = 'invalid-traceparent';
      const result = parseTraceparent(traceparent);
      expect(result).toBeNull();
    });

    it('should handle traceparent without flags', () => {
      const traceparent = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331';
      const result = parseTraceparent(traceparent);

      expect(result).not.toBeNull();
      expect(result?.traceFlags).toBe('01');
    });
  });

  describe('generateTraceparent', () => {
    it('should generate valid W3C traceparent', () => {
      const traceId = '0af7651916cd43dd8448eb211c80319c';
      const spanId = 'b7ad6b7169203331';
      const result = generateTraceparent(traceId, spanId, true);

      expect(result).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}01$/);
      expect(result).toContain(traceId);
      expect(result).toContain(spanId);
    });

    it('should generate sampled flag 00 when not sampled', () => {
      const traceId = '0af7651916cd43dd8448eb211c80319c';
      const spanId = 'b7ad6b7169203331';
      const result = generateTraceparent(traceId, spanId, false);

      expect(result).toMatch(/00-[0-9a-f]{32}-[0-9a-f]{16}00$/);
    });

    it('should pad trace ID to 32 characters', () => {
      const traceId = 'abc';
      const spanId = 'b7ad6b7169203331';
      const result = generateTraceparent(traceId, spanId, true);

      expect(result).toMatch(/^00-[0-9a-f]{32}-/);
    });
  });

  describe('propagateTrace', () => {
    it('should generate propagation headers', () => {
      const context = {
        traceId: 'test-trace-id',
        spanId: 'test-span-id',
        sampled: true,
      };

      const headers = propagateTrace(context);

      expect(headers['x-trace-id']).toBe('test-trace-id');
      expect(headers['traceparent']).toBeDefined();
      expect(headers['traceparent']).toContain('test-trace-id');
      expect(headers['traceparent']).toContain('test-span-id');
    });

    it('should generate span ID if not provided', () => {
      const context = {
        traceId: 'test-trace-id',
        sampled: true,
      };

      const headers = propagateTrace(context);

      expect(headers['x-trace-id']).toBe('test-trace-id');
      expect(headers['traceparent']).toMatch(/00-test-trace-id-[0-9a-f]{16}01$/);
    });
  });

  describe('extractTraceState', () => {
    it('should parse tracestate header', () => {
      const headers = { 'tracestate': 'congo=t61rcWkgMzE,rojo=00-1234-5678-90ab-cdef-12345678-9012-00' };
      const result = extractTraceState(headers);

      expect(result.get('congo')).toBe('t61rcWkgMzE');
      expect(result.get('rojo')).toBe('00-1234-5678-90ab-cdef-12345678-9012-00');
    });

    it('should return empty map when no tracestate', () => {
      const headers = {};
      const result = extractTraceState(headers);
      expect(result.size).toBe(0);
    });
  });

  describe('generateTraceState', () => {
    it('should generate tracestate header value', () => {
      const state = new Map<string, string>();
      state.set('congo', 't61rcWkgMzE');
      state.set('rojo', '00-1234-5678-90ab');

      const result = generateTraceState(state);

      expect(result).toContain('congo=t61rcWkgMzE');
      expect(result).toContain('rojo=00-1234-5678-90ab');
    });
  });

  describe('getPropagationHeaders', () => {
    it('should extract all propagation headers from request', () => {
      const headers = {
        'x-trace-id': 'test-trace-id',
        'traceparent': '00-test-trace-id-test-span-id-01',
        'tracestate': 'congo=t61rcWkgMzE',
      };

      const result = getPropagationHeaders(headers);

      expect(result['x-trace-id']).toBe('test-trace-id');
      expect(result['traceparent']).toBe('00-test-trace-id-test-span-id-01');
      expect(result['tracestate']).toBe('congo=t61rcWkgMzE');
    });

    it('should return empty object when no trace headers', () => {
      const headers = {};
      const result = getPropagationHeaders(headers);
      expect(Object.keys(result)).toHaveLength(0);
    });
  });
});
