/**
 * Trace Context Utilities
 * W3C Trace Context propagation support
 */

import {
  generateTraceId,
  generateSpanId,
  parseTraceparent,
  generateTraceparent,
  extractTraceState,
  generateTraceState,
  getTraceContext,
  TRACE_HEADERS,
} from '../services/trace.service';

/**
 * Trace context state
 */
export interface W3CTraceContext {
  traceId: string;
  spanId: string;
  traceFlags: string;
  tracestate?: Map<string, string>;
}

/**
 * Parse W3C traceparent header
 * Format: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
 */
export function parseW3CTraceparent(traceparent: string): W3CTraceContext | null {
  const parsed = parseTraceparent(traceparent);
  if (!parsed) {
    return null;
  }

  return {
    traceId: parsed.traceId,
    spanId: parsed.spanId,
    traceFlags: parsed.traceFlags,
  };
}

/**
 * Generate W3C traceparent header
 */
export function createW3CTraceparent(
  traceId?: string,
  spanId?: string,
  sampled: boolean = true
): string {
  const tid = traceId || generateTraceId();
  const sid = spanId || generateSpanId();
  return generateTraceparent(tid, sid, sampled);
}

/**
 * Extract trace context from HTTP headers
 */
export function extractTraceContext(
  headers: Record<string, string | string[] | undefined>
): W3CTraceContext | null {
  // Try traceparent first
  const traceparent = headers[TRACE_HEADERS.TRACEPARENT] as string;
  if (traceparent) {
    const context = parseW3CTraceparent(traceparent);
    if (context) {
      // Extract tracestate
      const tracestate = extractTraceState(headers);
      if (tracestate.size > 0) {
        context.tracestate = tracestate;
      }
      return context;
    }
  }

  // Fall back to X-Trace-Id
  const traceId = headers[TRACE_HEADERS.TRACE_ID] as string;
  if (traceId) {
    return {
      traceId,
      spanId: generateSpanId(),
      traceFlags: '01',
    };
  }

  return null;
}

/**
 * Generate trace context headers for propagation
 */
export function createPropagationHeaders(
  context?: W3CTraceContext
): Record<string, string> {
  const ctx = context || getTraceContextAsW3C();
  if (!ctx) {
    return {};
  }

  const headers: Record<string, string> = {
    [TRACE_HEADERS.TRACEPARENT]: createW3CTraceparent(ctx.traceId, ctx.spanId, ctx.traceFlags === '01'),
  };

  if (ctx.tracestate && ctx.tracestate.size > 0) {
    headers[TRACE_HEADERS.TRACESTATE] = generateTraceState(ctx.tracestate);
  }

  // Also include X-Trace-Id for backward compatibility
  headers[TRACE_HEADERS.TRACE_ID] = ctx.traceId;

  return headers;
}

/**
 * Get current trace context as W3C format
 */
export function getTraceContextAsW3C(): W3CTraceContext | null {
  const context = getTraceContext();
  if (!context) {
    return null;
  }

  return {
    traceId: context.traceId,
    spanId: context.spanId || generateSpanId(),
    traceFlags: context.sampled ? '01' : '00',
  };
}

/**
 * Check if tracing is enabled (sampled)
 */
export function isSampled(context?: W3CTraceContext): boolean {
  const ctx = context || getTraceContextAsW3C();
  if (!ctx) {
    return false;
  }
  return ctx.traceFlags === '01';
}

/**
 * Create child span context
 */
export function createChildSpanContext(parentContext?: W3CTraceContext): W3CTraceContext {
  const parent = parentContext || getTraceContextAsW3C();

  return {
    traceId: parent?.traceId || generateTraceId(),
    spanId: generateSpanId(),
    traceFlags: parent?.traceFlags || '01',
    tracestate: parent?.tracestate,
  };
}

/**
 * Inject trace context into outgoing HTTP request config
 */
export function injectTraceContext(
  config: Record<string, any>,
  context?: W3CTraceContext
): Record<string, any> {
  const headers = createPropagationHeaders(context);

  return {
    ...config,
    headers: {
      ...config.headers,
      ...headers,
    },
  };
}

export default {
  parseW3CTraceparent,
  createW3CTraceparent,
  extractTraceContext,
  createPropagationHeaders,
  getTraceContextAsW3C,
  isSampled,
  createChildSpanContext,
  injectTraceContext,
};
