/**
 * Trace Service
 * Provides trace ID generation, extraction, and propagation
 */

import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

// Trace context storage using AsyncLocalStorage
const asyncLocalStorage = new AsyncLocalStorage<Map<string, string>>();

// Trace context interface
export interface TraceContext {
  traceId: string;
  spanId?: string;
  parentSpanId?: string;
  sampled?: boolean;
}

// Default trace headers
export const TRACE_HEADERS = {
  TRACE_ID: 'x-trace-id',
  TRACEPARENT: 'traceparent',
  TRACESTATE: 'tracestate',
};

/**
 * Generate a new trace ID (UUID v4)
 */
export function generateTraceId(): string {
  return uuidv4();
}

/**
 * Generate a new span ID (8-character hex string)
 */
export function generateSpanId(): string {
  return Math.random().toString(16).substring(2, 10).padStart(8, '0');
}

/**
 * Extract trace ID from request headers
 * Priority: traceparent > X-Trace-Id
 */
export function extractTraceId(headers: Record<string, string | string[] | undefined>): string | null {
  // First try W3C traceparent
  const traceparent = headers[TRACE_HEADERS.TRACEPARENT] as string;
  if (traceparent) {
    const parsed = parseTraceparent(traceparent);
    if (parsed) {
      return parsed.traceId;
    }
  }

  // Fall back to X-Trace-Id
  const traceId = headers[TRACE_HEADERS.TRACE_ID] as string;
  return traceId || null;
}

/**
 * Parse W3C traceparent header
 * Format: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
 */
export function parseTraceparent(traceparent: string): { traceId: string; spanId: string; traceFlags: string } | null {
  const parts = traceparent.split('-');
  if (parts.length < 3) {
    return null;
  }

  // Version must be 00
  if (parts[0] !== '00') {
    return null;
  }

  // trace-id must be 32 hex characters
  if (parts[1].length !== 32) {
    return null;
  }

  // span-id must be 16 hex characters
  if (parts[2].length < 16) {
    return null;
  }

  return {
    traceId: parts[1],
    spanId: parts[2].substring(0, 16),
    traceFlags: parts[2].substring(16) || '01',
  };
}

/**
 * Generate W3C traceparent header
 */
export function generateTraceparent(traceId: string, spanId: string, sampled: boolean = true): string {
  const flags = sampled ? '01' : '00';
  // trace-id must be 32 characters, pad or truncate if needed
  const traceId32 = traceId.padEnd(32, '0').substring(0, 32);
  return `00-${traceId32}-${spanId}${flags}`;
}

/**
 * Extract trace state from headers
 */
export function extractTraceState(headers: Record<string, string | string[] | undefined>): Map<string, string> {
  const traceState = new Map<string, string>();
  const stateHeader = headers[TRACE_HEADERS.TRACESTATE] as string;

  if (stateHeader) {
    stateHeader.split(',').forEach((entry) => {
      const [key, value] = entry.trim().split('=');
      if (key && value) {
        traceState.set(key, value);
      }
    });
  }

  return traceState;
}

/**
 * Generate trace state header value
 */
export function generateTraceState(state: Map<string, string>): string {
  return Array.from(state.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join(',');
}

/**
 * Propagate trace context to downstream services
 * Returns headers to add to outgoing requests
 */
export function propagateTrace(context: TraceContext): Record<string, string> {
  const headers: Record<string, string> = {};

  // Set X-Trace-Id
  headers[TRACE_HEADERS.TRACE_ID] = context.traceId;

  // Set W3C traceparent
  const spanId = context.spanId || generateSpanId();
  headers[TRACE_HEADERS.TRACEPARENT] = generateTraceparent(
    context.traceId,
    spanId,
    context.sampled
  );

  return headers;
}

/**
 * Store trace context in AsyncLocalStorage
 */
export function setTraceContext(context: TraceContext): void {
  const store = asyncLocalStorage.getStore();
  if (store) {
    store.set('traceId', context.traceId);
    if (context.spanId) {
      store.set('spanId', context.spanId);
    }
    if (context.parentSpanId) {
      store.set('parentSpanId', context.parentSpanId);
    }
    if (context.sampled !== undefined) {
      store.set('sampled', context.sampled.toString());
    }
  }
}

/**
 * Get trace context from AsyncLocalStorage
 */
export function getTraceContext(): TraceContext | null {
  const store = asyncLocalStorage.getStore();
  if (!store) {
    return null;
  }

  const traceId = store.get('traceId');
  if (!traceId) {
    return null;
  }

  return {
    traceId,
    spanId: store.get('spanId'),
    parentSpanId: store.get('parentSpanId'),
    sampled: store.get('sampled') === 'true',
  };
}

/**
 * Get trace ID from AsyncLocalStorage
 */
export function getCurrentTraceId(): string | null {
  return getTraceContext()?.traceId || null;
}

/**
 * Run function within trace context
 */
export function runWithTraceContext<T>(context: TraceContext, fn: () => T): T {
  const store = new Map<string, string>();
  store.set('traceId', context.traceId);
  if (context.spanId) {
    store.set('spanId', context.spanId);
  }
  if (context.parentSpanId) {
    store.set('parentSpanId', context.parentSpanId);
  }
  if (context.sampled !== undefined) {
    store.set('sampled', context.sampled.toString());
  }

  return asyncLocalStorage.run(store, fn);
}

/**
 * Get all trace propagation headers for a request
 */
export function getPropagationHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string> {
  const traceId = extractTraceId(headers);
  if (!traceId) {
    return {};
  }

  const traceparent = headers[TRACE_HEADERS.TRACEPARENT] as string;
  const tracestate = headers[TRACE_HEADERS.TRACESTATE] as string;

  const result: Record<string, string> = {
    [TRACE_HEADERS.TRACE_ID]: traceId,
  };

  if (traceparent) {
    result[TRACE_HEADERS.TRACEPARENT] = traceparent;
  }

  if (tracestate) {
    result[TRACE_HEADERS.TRACESTATE] = tracestate;
  }

  return result;
}

export default {
  generateTraceId,
  generateSpanId,
  extractTraceId,
  parseTraceparent,
  generateTraceparent,
  extractTraceState,
  generateTraceState,
  propagateTrace,
  setTraceContext,
  getTraceContext,
  getCurrentTraceId,
  runWithTraceContext,
  getPropagationHeaders,
  TRACE_HEADERS,
};
