/**
 * Trace Context Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseW3CTraceparent,
  createW3CTraceparent,
  extractTraceContext,
  createPropagationHeaders,
  isSampled,
  createChildSpanContext,
  injectTraceContext,
} from '../../src/utils/trace-context';

describe('Trace Context', () => {
  describe('parseW3CTraceparent', () => {
    it('should parse valid traceparent', () => {
      const traceparent = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';
      const result = parseW3CTraceparent(traceparent);

      expect(result).not.toBeNull();
      expect(result?.traceId).toBe('0af7651916cd43dd8448eb211c80319c');
      expect(result?.spanId).toBe('b7ad6b7169203331');
      expect(result?.traceFlags).toBe('01');
    });

    it('should return null for invalid format', () => {
      const result = parseW3CTraceparent('invalid');
      expect(result).toBeNull();
    });

    it('should return null for invalid version', () => {
      const result = parseW3CTraceparent('01-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01');
      expect(result).toBeNull();
    });
  });

  describe('createW3CTraceparent', () => {
    it('should generate valid traceparent', () => {
      const result = createW3CTraceparent('0af7651916cd43dd8448eb211c80319c', 'b7ad6b7169203331', true);
      expect(result).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}01$/);
    });

    it('should use sampled flag 00 when not sampled', () => {
      const result = createW3CTraceparent('0af7651916cd43dd8448eb211c80319c', 'b7ad6b7169203331', false);
      expect(result).toMatch(/00-[0-9a-f]{32}-[0-9a-f]{16}00$/);
    });

    it('should generate IDs when not provided', () => {
      const result = createW3CTraceparent();
      expect(result).toMatch(/^00-[0-9a-f-]{32}-[0-9a-f]{8}01$/);
    });
  });

  describe('extractTraceContext', () => {
    it('should extract from traceparent header', () => {
      const headers = {
        'traceparent': '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
      };
      const result = extractTraceContext(headers);

      expect(result).not.toBeNull();
      expect(result?.traceId).toBe('0af7651916cd43dd8448eb211c80319c');
    });

    it('should fall back to X-Trace-Id', () => {
      const headers = { 'x-trace-id': 'legacy-trace-id' };
      const result = extractTraceContext(headers);

      expect(result).not.toBeNull();
      expect(result?.traceId).toBe('legacy-trace-id');
    });

    it('should prefer traceparent over X-Trace-Id', () => {
      const headers = {
        'x-trace-id': 'legacy-trace-id',
        'traceparent': '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
      };
      const result = extractTraceContext(headers);

      expect(result?.traceId).toBe('0af7651916cd43dd8448eb211c80319c');
    });

    it('should return null when no trace context', () => {
      const headers = {};
      const result = extractTraceContext(headers);
      expect(result).toBeNull();
    });
  });

  describe('createPropagationHeaders', () => {
    it('should create all propagation headers', () => {
      const context = {
        traceId: '0af7651916cd43dd8448eb211c80319c',
        spanId: 'b7ad6b7169203331',
        traceFlags: '01',
      };

      const headers = createPropagationHeaders(context);

      expect(headers['x-trace-id']).toBe('0af7651916cd43dd8448eb211c80319c');
      expect(headers['traceparent']).toContain('0af7651916cd43dd8448eb211c80319c');
      expect(headers['traceparent']).toContain('b7ad6b7169203331');
    });
  });

  describe('isSampled', () => {
    it('should return true for sampled trace', () => {
      const context = { traceId: 'test', spanId: 'test', traceFlags: '01' };
      expect(isSampled(context)).toBe(true);
    });

    it('should return false for non-sampled trace', () => {
      const context = { traceId: 'test', spanId: 'test', traceFlags: '00' };
      expect(isSampled(context)).toBe(false);
    });
  });

  describe('createChildSpanContext', () => {
    it('should create child with same trace ID', () => {
      const parent = { traceId: 'parent-trace', spanId: 'parent-span', traceFlags: '01' };
      const child = createChildSpanContext(parent);

      expect(child.traceId).toBe('parent-trace');
      expect(child.spanId).not.toBe('parent-span');
    });

    it('should generate new context when no parent', () => {
      const child = createChildSpanContext();

      expect(child.traceId).toBeDefined();
      expect(child.spanId).toBeDefined();
    });
  });

  describe('injectTraceContext', () => {
    it('should inject trace headers into config', () => {
      const config = { url: '/api/test', method: 'GET' };
      const context = { traceId: '0af7651916cd43dd8448eb211c80319c', spanId: 'b7ad6b7169203331', traceFlags: '01' };

      const result = injectTraceContext(config, context);

      expect(result.headers).toBeDefined();
      expect(result.headers['x-trace-id']).toBe('0af7651916cd43dd8448eb211c80319c');
    });
  });
});
