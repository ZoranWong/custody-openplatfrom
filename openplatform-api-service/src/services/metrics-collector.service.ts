/**
 * Metrics Collector Service
 * Collects and aggregates metrics for monitoring API Gateway performance
 */

import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Types
export interface MetricsData {
  totalRequests: number;
  requestsByStatus: Record<number, number>;
  requestsByMethod: Record<string, number>;
  requestsByEndpoint: Record<string, number>;
  requestsByAppid: Record<string, number>;
  totalErrors: number;
  errorsByCode: Record<number, number>;
}

export interface LatencyData {
  samples: number[];
  windowStart: number;
}

export interface AppMetrics {
  requestCount: number;
  errorCount: number;
  totalLatency: number;
  latencySamples: number[];
}

export interface MetricsSummary {
  qps: number;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  errorRate: number;
  totalRequests: number;
  requestsByEndpoint: Record<string, number>;
  requestsByAppid: Record<string, number>;
  requestsByStatus: Record<number, number>;
}

// Configuration
const SLIDING_WINDOW_SIZE = 10000;
const WINDOW_DURATION_MS = 60000; // 1 minute

// Singleton instance
let metricsCollectorInstance: MetricsCollectorService | null = null;

/**
 * Create or get the singleton metrics collector instance
 */
export function createMetricsCollectorService(): MetricsCollectorService {
  if (!metricsCollectorInstance) {
    metricsCollectorInstance = new MetricsCollectorService();
  }
  return metricsCollectorInstance;
}

/**
 * Get the metrics collector instance
 */
export function getMetricsCollector(): MetricsCollectorService {
  return createMetricsCollectorService();
}

/**
 * Metrics Collector Service class
 */
export class MetricsCollectorService {
  private registry: Registry;
  private requestCounter: Counter;
  private errorCounter: Counter;
  private requestDurationHistogram: Histogram;
  private activeRequestsGauge: Gauge;
  private latencySamples: number[] = [];
  private windowStartTime: number;
  private requestCounts: number[] = [];
  private requestTimestamps: number[] = [];
  private metricsData: MetricsData;
  private appMetrics: Map<string, AppMetrics>;

  constructor() {
    // Create registry
    this.registry = new Registry();

    // Add default metrics (CPU, memory, etc.)
    collectDefaultMetrics({ register: this.registry, prefix: 'gateway_' });

    // Create HTTP request counter
    this.requestCounter = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'endpoint', 'status', 'appid'],
      registers: [this.registry],
    });

    // Create error counter
    this.errorCounter = new Counter({
      name: 'http_errors_total',
      help: 'Total number of HTTP errors',
      labelNames: ['method', 'endpoint', 'status_code', 'appid'],
      registers: [this.registry],
    });

    // Create request duration histogram
    this.requestDurationHistogram = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'endpoint', 'appid'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    // Create active requests gauge
    this.activeRequestsGauge = new Gauge({
      name: 'http_active_requests',
      help: 'Number of active HTTP requests',
      registers: [this.registry],
    });

    // Initialize metrics data
    this.metricsData = {
      totalRequests: 0,
      requestsByStatus: {},
      requestsByMethod: {},
      requestsByEndpoint: {},
      requestsByAppid: {},
      totalErrors: 0,
      errorsByCode: {},
    };

    // Initialize app metrics
    this.appMetrics = new Map();

    // Initialize time window
    this.windowStartTime = Date.now();
    this.requestCounts.push(0);
    this.requestTimestamps.push(Date.now());
  }

  /**
   * Record an incoming request
   */
  recordRequest(params: {
    method: string;
    endpoint: string;
    statusCode: number;
    duration: number;
    appid?: string;
  }): void {
    const { method, endpoint, statusCode, duration, appid } = params;

    // Increment counters
    this.requestCounter.inc({
      method,
      endpoint: this.normalizeEndpoint(endpoint),
      status: statusCode.toString(),
      appid: appid || 'unknown',
    });

    // Record duration in histogram
    this.requestDurationHistogram.observe(
      {
        method,
        endpoint: this.normalizeEndpoint(endpoint),
        appid: appid || 'unknown',
      },
      duration / 1000 // Convert to seconds
    );

    // Track in sliding window for QPS calculation
    const now = Date.now();
    this.requestTimestamps.push(now);
    this.requestCounts.push(this.requestCounts[this.requestCounts.length - 1] + 1);

    // Remove old entries outside the window
    this.cleanupOldEntries(now);

    // Update metrics data
    this.metricsData.totalRequests++;
    this.metricsData.requestsByStatus[statusCode] =
      (this.metricsData.requestsByStatus[statusCode] || 0) + 1;
    this.metricsData.requestsByMethod[method] =
      (this.metricsData.requestsByMethod[method] || 0) + 1;
    this.metricsData.requestsByEndpoint[this.normalizeEndpoint(endpoint)] =
      (this.metricsData.requestsByEndpoint[this.normalizeEndpoint(endpoint)] || 0) + 1;

    if (appid) {
      this.metricsData.requestsByAppid[appid] =
        (this.metricsData.requestsByAppid[appid] || 0) + 1;
    }

    // Track latency samples for percentile calculation
    this.latencySamples.push(duration);
    if (this.latencySamples.length > SLIDING_WINDOW_SIZE) {
      this.latencySamples.shift();
    }

    // Track error metrics
    if (statusCode >= 400) {
      this.errorCounter.inc({
        method,
        endpoint: this.normalizeEndpoint(endpoint),
        status_code: statusCode.toString(),
        appid: appid || 'unknown',
      });

      this.metricsData.totalErrors++;
      this.metricsData.errorsByCode[statusCode] =
        (this.metricsData.errorsByCode[statusCode] || 0) + 1;
    }

    // Track app-specific metrics
    if (appid) {
      this.updateAppMetrics(appid, duration, statusCode >= 400);
    }
  }

  /**
   * Increment active requests count
   */
  incrementActiveRequests(): void {
    this.activeRequestsGauge.inc();
  }

  /**
   * Decrement active requests count
   */
  decrementActiveRequests(): void {
    this.activeRequestsGauge.dec();
  }

  /**
   * Update app-specific metrics
   */
  private updateAppMetrics(appid: string, latency: number, isError: boolean): void {
    let appMetric = this.appMetrics.get(appid);

    if (!appMetric) {
      appMetric = {
        requestCount: 0,
        errorCount: 0,
        totalLatency: 0,
        latencySamples: [],
      };
      this.appMetrics.set(appid, appMetric);
    }

    appMetric.requestCount++;
    appMetric.totalLatency += latency;
    appMetric.latencySamples.push(latency);

    if (appMetric.latencySamples.length > SLIDING_WINDOW_SIZE) {
      appMetric.latencySamples.shift();
    }

    if (isError) {
      appMetric.errorCount++;
    }
  }

  /**
   * Clean up old entries from sliding window
   */
  private cleanupOldEntries(now: number): void {
    while (
      this.requestTimestamps.length > 0 &&
      now - this.requestTimestamps[0] > WINDOW_DURATION_MS
    ) {
      this.requestTimestamps.shift();
      this.requestCounts.shift();
    }
  }

  /**
   * Normalize endpoint for better grouping
   */
  private normalizeEndpoint(endpoint: string): string {
    // Replace UUIDs, IDs, etc. with placeholders
    return endpoint
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      .replace(/\/[0-9]+/g, '/:id')
      .replace(/\b[0-9a-f]{16,}\b/g, ':hash');
  }

  /**
   * Calculate QPS (queries per second)
   */
  calculateQPS(): number {
    const now = Date.now();
    this.cleanupOldEntries(now);

    if (this.requestTimestamps.length < 2) {
      return 0;
    }

    const windowDuration = (now - this.requestTimestamps[0]) / 1000;
    if (windowDuration <= 0) {
      return 0;
    }

    const requestCount =
      this.requestCounts[this.requestCounts.length - 1] - this.requestCounts[0];

    return requestCount / windowDuration;
  }

  /**
   * Calculate latency percentiles
   */
  calculatePercentiles(): { p50: number; p95: number; p99: number } {
    if (this.latencySamples.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...this.latencySamples].sort((a, b) => a - b);
    const n = sorted.length;

    return {
      p50: sorted[Math.floor(n * 0.5)],
      p95: sorted[Math.floor(n * 0.95)],
      p99: sorted[Math.ceil(n * 0.99) - 1],
    };
  }

  /**
   * Calculate error rate
   */
  calculateErrorRate(): number {
    if (this.metricsData.totalRequests === 0) {
      return 0;
    }
    return this.metricsData.totalErrors / this.metricsData.totalRequests;
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(): MetricsSummary {
    const percentiles = this.calculatePercentiles();

    return {
      qps: this.calculateQPS(),
      latencyP50: percentiles.p50,
      latencyP95: percentiles.p95,
      latencyP99: percentiles.p99,
      errorRate: this.calculateErrorRate(),
      totalRequests: this.metricsData.totalRequests,
      requestsByEndpoint: { ...this.metricsData.requestsByEndpoint },
      requestsByAppid: { ...this.metricsData.requestsByAppid },
      requestsByStatus: { ...this.metricsData.requestsByStatus },
    };
  }

  /**
   * Get app-specific metrics
   */
  getAppMetrics(appid: string): AppMetrics | null {
    return this.appMetrics.get(appid) || null;
  }

  /**
   * Get all app metrics
   */
  getAllAppMetrics(): Map<string, AppMetrics> {
    return new Map(this.appMetrics);
  }

  /**
   * Get Prometheus registry for metrics endpoint
   */
  getRegistry(): Registry {
    return this.registry;
  }

  /**
   * Get metrics data (raw)
   */
  getMetricsData(): MetricsData {
    return { ...this.metricsData };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metricsData = {
      totalRequests: 0,
      requestsByStatus: {},
      requestsByMethod: {},
      requestsByEndpoint: {},
      requestsByAppid: {},
      totalErrors: 0,
      errorsByCode: {},
    };

    this.latencySamples = [];
    this.appMetrics.clear();
    this.requestCounts = [0];
    this.requestTimestamps = [Date.now()];
    this.windowStartTime = Date.now();
  }
}

export default MetricsCollectorService;
