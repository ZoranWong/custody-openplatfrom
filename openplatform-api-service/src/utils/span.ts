/**
 * Span Utilities
 * Provides span management with AsyncLocalStorage integration
 */

import { generateSpanId, setTraceContext, getTraceContext } from '../services/trace.service';
import { getTraceStorage } from '../services/trace-storage.service';

/**
 * Span interface
 */
export interface Span {
  spanId: string;
  traceId: string;
  parentId?: string;
  operationName: string;
  serviceName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, string>;
  logs: SpanLog[];
}

/**
 * Span log/event
 */
export interface SpanLog {
  timestamp: number;
  message: string;
  payload?: Record<string, string>;
}

/**
 * Span update for ending a span
 */
export interface SpanUpdate {
  endTime?: number;
  duration?: number;
  tags?: Record<string, string>;
  logs?: SpanLog[];
}

/**
 * Trace interface (simplified from storage)
 */
export interface Trace {
  traceId: string;
  spans: Span[];
  startTime: number;
  endTime?: number;
  duration?: number;
  appid?: string;
  status: 'pending' | 'completed' | 'error';
}

/**
 * Active span context
 */
interface ActiveSpan {
  spanId: string;
  traceId: string;
  startTime: number;
}

/**
 * Span stack for nested spans
 */
const spanStack: ActiveSpan[] = [];

/**
 * Start a new span
 */
export function startSpan(operationName: string, options?: {
  serviceName?: string;
  parentSpanId?: string;
  tags?: Record<string, string>;
}): Span {
  const traceContext = getTraceContext();
  const traceId = traceContext?.traceId || generateSpanId();
  const spanId = generateSpanId();

  const span: Span = {
    spanId,
    traceId,
    parentId: options?.parentSpanId || traceContext?.spanId,
    operationName,
    serviceName: options?.serviceName || 'api-gateway',
    startTime: Date.now(),
    tags: options?.tags || {},
    logs: [],
  };

  // Push to stack
  spanStack.push({
    spanId,
    traceId,
    startTime: span.startTime,
  });

  // Store in trace storage
  try {
    const storage = getTraceStorage();
    storage.startSpan(traceId, span);
  } catch (error) {
    console.error('Failed to start span in storage:', error);
  }

  return span;
}

/**
 * End the current span
 */
export function endSpan(update?: SpanUpdate): void {
  const activeSpan = spanStack.pop();
  if (!activeSpan) {
    return;
  }

  const endTime = update?.endTime || Date.now();
  const duration = update?.duration || (endTime - activeSpan.startTime);

  try {
    const storage = getTraceStorage();
    storage.endSpan(activeSpan.spanId, {
      endTime,
      duration,
      tags: update?.tags,
      logs: update?.logs,
    });
  } catch (error) {
    console.error('Failed to end span in storage:', error);
  }
}

/**
 * Add an event to the current span
 */
export function addSpanEvent(name: string, payload?: Record<string, string>): void {
  const activeSpan = spanStack[spanStack.length - 1];
  if (!activeSpan) {
    return;
  }

  try {
    const storage = getTraceStorage();
    storage.addSpanEvent(activeSpan.spanId, {
      name,
      payload,
    });
  } catch (error) {
    console.error('Failed to add span event:', error);
  }
}

/**
 * Set a tag on the current span
 */
export function setSpanTag(key: string, value: string): void {
  const activeSpan = spanStack[spanStack.length - 1];
  if (!activeSpan) {
    return;
  }

  try {
    const storage = getTraceStorage();
    storage.addSpanEvent(activeSpan.spanId, {
      name: 'tag',
      payload: { key, value },
    });
  } catch (error) {
    console.error('Failed to set span tag:', error);
  }
}

/**
 * Get current active span ID
 */
export function getCurrentSpanId(): string | null {
  const activeSpan = spanStack[spanStack.length - 1];
  return activeSpan?.spanId || null;
}

/**
 * Get current trace ID
 */
export function getCurrentTraceId(): string | null {
  const activeSpan = spanStack[spanStack.length - 1];
  return activeSpan?.traceId || null;
}

/**
 * Run a function within a span
 */
export function runWithSpan<T>(
  operationName: string,
  fn: () => T,
  options?: {
    serviceName?: string;
    parentSpanId?: string;
    tags?: Record<string, string>;
  }
): T {
  startSpan(operationName, options);
  try {
    return fn();
  } finally {
    endSpan();
  }
}

/**
 * Run an async function within a span
 */
export async function runWithSpanAsync<T>(
  operationName: string,
  fn: () => Promise<T>,
  options?: {
    serviceName?: string;
    parentSpanId?: string;
    tags?: Record<string, string>;
  }
): Promise<T> {
  startSpan(operationName, options);
  try {
    return await fn();
  } finally {
    endSpan();
  }
}

/**
 * Clear span stack (for testing)
 */
export function clearSpanStack(): void {
  spanStack.length = 0;
}

export default {
  startSpan,
  endSpan,
  addSpanEvent,
  setSpanTag,
  getCurrentSpanId,
  getCurrentTraceId,
  runWithSpan,
  runWithSpanAsync,
  clearSpanStack,
};
