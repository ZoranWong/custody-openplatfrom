/**
 * Trace Storage Service
 * In-memory storage for trace spans with TTL-based cleanup
 */

import { Span, Trace, SpanUpdate } from '../utils/span';

/**
 * Trace storage configuration
 */
export interface TraceStorageConfig {
  /**
   * Maximum number of traces to store
   * @default 1000
   */
  maxTraces?: number;

  /**
   * Time to live for traces in milliseconds
   * @default 3600000 (1 hour)
   */
  traceTtlMs?: number;

  /**
   * Time to live for spans in milliseconds
   * @default 1800000 (30 minutes)
   */
  spanTtlMs?: number;

  /**
   * Cleanup interval in milliseconds
   * @default 60000 (1 minute)
   */
  cleanupIntervalMs?: number;
}

/**
 * Query options for fetching traces
 */
export interface TraceQueryOptions {
  appid?: string;
  endpoint?: string;
  status?: 'pending' | 'completed' | 'error';
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}

/**
 * Default configuration
 */
const defaultConfig: Required<TraceStorageConfig> = {
  maxTraces: 1000,
  traceTtlMs: 3600000, // 1 hour
  spanTtlMs: 1800000, // 30 minutes
  cleanupIntervalMs: 60000, // 1 minute
};

/**
 * In-memory trace storage
 */
class TraceStorage {
  private traces: Map<string, Trace> = new Map();
  private spans: Map<string, Span> = new Map();
  private traceIndex: Map<string, Set<string>> = new Map(); // appid -> traceIds
  private endpointIndex: Map<string, Set<string>> = new Map(); // endpoint -> traceIds
  private config: Required<TraceStorageConfig>;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: TraceStorageConfig = {}) {
    this.config = { ...defaultConfig, ...config } as Required<TraceStorageConfig>;
    this.startCleanupTimer();
  }

  /**
   * Start periodic cleanup of expired traces and spans
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupIntervalMs);

    // Prevent timer from keeping process alive
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Cleanup expired traces and spans
   */
  private cleanup(): void {
    const now = Date.now();

    // Clean up expired spans
    for (const [spanId, span] of this.spans.entries()) {
      if (span.endTime && now - span.endTime > this.config.spanTtlMs) {
        this.spans.delete(spanId);
      }
    }

    // Clean up expired traces
    for (const [traceId, trace] of this.traces.entries()) {
      const lastTime = trace.endTime || trace.startTime;
      if (now - lastTime > this.config.traceTtlMs) {
        this.deleteTrace(traceId);
      }
    }

    // Enforce max traces limit
    while (this.traces.size > this.config.maxTraces) {
      // Find oldest trace
      let oldestTraceId: string | null = null;
      let oldestTime = Infinity;

      for (const [traceId, trace] of this.traces.entries()) {
        if (trace.startTime < oldestTime) {
          oldestTime = trace.startTime;
          oldestTraceId = traceId;
        }
      }

      if (oldestTraceId) {
        this.deleteTrace(oldestTraceId);
      } else {
        break;
      }
    }
  }

  /**
   * Delete a trace and its associated spans
   */
  private deleteTrace(traceId: string): void {
    const trace = this.traces.get(traceId);
    if (trace) {
      // Delete spans
      trace.spans.forEach((span) => {
        this.spans.delete(span.spanId);
      });

      // Remove from indexes
      if (trace.appid) {
        const appIdSet = this.traceIndex.get(trace.appid);
        if (appIdSet) {
          appIdSet.delete(traceId);
          if (appIdSet.size === 0) {
            this.traceIndex.delete(trace.appid);
          }
        }
      }

      // Remove from endpoint index
      trace.spans.forEach((span) => {
        const endpointSet = this.endpointIndex.get(span.operationName);
        if (endpointSet) {
          endpointSet.delete(traceId);
          if (endpointSet.size === 0) {
            this.endpointIndex.delete(span.operationName);
          }
        }
      });

      // Delete trace
      this.traces.delete(traceId);
    }
  }

  /**
   * Create or get a trace
   */
  private getOrCreateTrace(traceId: string): Trace {
    let trace = this.traces.get(traceId);

    if (!trace) {
      trace = {
        traceId,
        spans: [],
        startTime: Date.now(),
        status: 'pending',
      };
      this.traces.set(traceId, trace);
    }

    return trace;
  }

  /**
   * Start a new span for a trace
   */
  startSpan(traceId: string, span: Span): void {
    // Ensure trace exists
    const trace = this.getOrCreateTrace(traceId);

    // Add span to trace
    trace.spans.push(span);

    // Store span separately for quick lookup
    this.spans.set(span.spanId, span);

    // Index by appid if present
    if (span.tags?.appid) {
      if (!this.traceIndex.has(span.tags.appid)) {
        this.traceIndex.set(span.tags.appid, new Set());
      }
      this.traceIndex.get(span.tags.appid)!.add(traceId);
    }

    // Index by endpoint
    if (!this.endpointIndex.has(span.operationName)) {
      this.endpointIndex.set(span.operationName, new Set());
    }
    this.endpointIndex.get(span.operationName)!.add(traceId);
  }

  /**
   * End a span
   */
  endSpan(spanId: string, update: SpanUpdate): void {
    const span = this.spans.get(spanId);
    if (!span) {
      return;
    }

    // Update span
    if (update.endTime) {
      span.endTime = update.endTime;
    }
    if (update.duration) {
      span.duration = update.duration;
    }
    if (update.tags) {
      span.tags = { ...span.tags, ...update.tags };
    }
    if (update.logs) {
      span.logs = [...span.logs, ...update.logs];
    }

    // Update trace status
    const errorTag = span.tags?.error;
    if (errorTag === 'true') {
      const trace = this.traces.get(span.traceId);
      if (trace && trace.status !== 'completed') {
        trace.status = 'error';
      }
    }
  }

  /**
   * Add event to a span
   */
  addSpanEvent(spanId: string, event: { name: string; timestamp?: number; payload?: Record<string, string> }): void {
    const span = this.spans.get(spanId);
    if (!span) {
      return;
    }

    span.logs.push({
      timestamp: event.timestamp || Date.now(),
      message: event.name,
      payload: event.payload,
    });
  }

  /**
   * Complete a trace
   */
  completeTrace(traceId: string, status: 'completed' | 'error' = 'completed'): void {
    const trace = this.traces.get(traceId);
    if (!trace) {
      return;
    }

    trace.endTime = Date.now();
    trace.duration = trace.endTime - trace.startTime;
    trace.status = status;
  }

  /**
   * Get trace by ID
   */
  getTrace(traceId: string): Trace | null {
    const trace = this.traces.get(traceId);
    if (!trace) {
      return null;
    }

    // Return a copy with resolved spans
    return {
      ...trace,
      spans: trace.spans.map((span) => ({
        ...this.spans.get(span.spanId)!,
      })),
    };
  }

  /**
   * Query traces with filters
   */
  queryTraces(options: TraceQueryOptions = {}): {
    traces: Trace[];
    total: number;
    hasMore: boolean;
  } {
    const { appid, endpoint, status, startTime, endTime, limit = 20, offset = 0 } = options;

    let traceIds: Set<string>;

    // Determine which traces to consider
    if (appid && this.traceIndex.has(appid)) {
      traceIds = this.traceIndex.get(appid)!;
    } else if (endpoint && this.endpointIndex.has(endpoint)) {
      traceIds = this.endpointIndex.get(endpoint)!;
    } else {
      traceIds = new Set(this.traces.keys());
    }

    // Filter traces
    let filteredTraces = Array.from(traceIds)
      .map((traceId) => this.traces.get(traceId))
      .filter((trace): trace is Trace => trace !== undefined)
      .filter((trace) => {
        // Filter by status
        if (status && trace.status !== status) {
          return false;
        }

        // Filter by time range
        if (startTime && trace.startTime < startTime) {
          return false;
        }
        if (endTime && trace.startTime > endTime) {
          return false;
        }

        // Filter by appid (check in spans)
        if (appid) {
          const hasAppId = trace.spans.some(
            (span) => span.tags?.appid === appid
          );
          if (!hasAppId) {
            return false;
          }
        }

        // Filter by endpoint (check in spans)
        if (endpoint) {
          const hasEndpoint = trace.spans.some(
            (span) => span.operationName === endpoint
          );
          if (!hasEndpoint) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => b.startTime - a.startTime); // Newest first

    const total = filteredTraces.length;

    // Apply pagination
    const paginatedTraces = filteredTraces.slice(offset, offset + limit);

    // Return with resolved spans
    const traces = paginatedTraces.map((trace) => ({
      ...trace,
      spans: trace.spans.map((span) => {
        const storedSpan = this.spans.get(span.spanId);
        return storedSpan ? { ...storedSpan } : span;
      }),
    }));

    return {
      traces,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get trace statistics
   */
  getStats(): {
    totalTraces: number;
    totalSpans: number;
    byStatus: Record<string, number>;
    oldestTrace: number | null;
  } {
    const byStatus: Record<string, number> = {
      pending: 0,
      completed: 0,
      error: 0,
    };

    let oldestTrace: number | null = null;

    for (const trace of this.traces.values()) {
      byStatus[trace.status] = (byStatus[trace.status] || 0) + 1;
      if (!oldestTrace || trace.startTime < oldestTrace) {
        oldestTrace = trace.startTime;
      }
    }

    return {
      totalTraces: this.traces.size,
      totalSpans: this.spans.size,
      byStatus,
      oldestTrace,
    };
  }

  /**
   * Clear all traces (for testing)
   */
  clear(): void {
    this.traces.clear();
    this.spans.clear();
    this.traceIndex.clear();
    this.endpointIndex.clear();
  }

  /**
   * Stop cleanup timer
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Singleton instance
let traceStorageInstance: TraceStorage | null = null;

/**
 * Get trace storage instance
 */
export function getTraceStorage(config?: TraceStorageConfig): TraceStorage {
  if (!traceStorageInstance) {
    traceStorageInstance = new TraceStorage(config);
  }
  return traceStorageInstance;
}

/**
 * Reset trace storage (for testing)
 */
export function resetTraceStorage(): void {
  if (traceStorageInstance) {
    traceStorageInstance.stop();
    traceStorageInstance.clear();
    traceStorageInstance = null;
  }
}

export default {
  getTraceStorage,
  resetTraceStorage,
};
