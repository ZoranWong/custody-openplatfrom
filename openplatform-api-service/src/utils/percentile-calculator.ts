/**
 * Percentile Calculator Utility
 * High-performance percentile calculation using sliding window algorithm
 */

export interface PercentileResult {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  p999: number;
  min: number;
  max: number;
  mean: number;
  count: number;
}

export interface SlidingWindowConfig {
  maxSize: number;
  windowDurationMs?: number;
}

/**
 * Sliding Window Percentile Calculator
 * Optimized for high-throughput scenarios
 */
export class PercentileCalculator {
  private samples: number[] = [];
  private maxSize: number;
  private timestamps: number[] = [];
  private windowDurationMs: number;
  private sortedCache: number[] | null = null;
  private isDirty: boolean = true;

  constructor(config?: SlidingWindowConfig) {
    this.maxSize = config?.maxSize || 10000;
    this.windowDurationMs = config?.windowDurationMs || 60000;
  }

  /**
   * Add a sample to the window
   */
  add(value: number): void {
    const now = Date.now();

    // Add new sample
    this.samples.push(value);
    this.timestamps.push(now);

    // Mark cache as dirty
    this.isDirty = true;

    // Remove old samples if over max size (FIFO)
    if (this.samples.length > this.maxSize) {
      this.samples.shift();
      this.timestamps.shift();
    }

    // Remove samples outside time window
    this.cleanupOldSamples(now);
  }

  /**
   * Add multiple samples at once
   */
  addBatch(values: number[]): void {
    for (const value of values) {
      this.add(value);
    }
  }

  /**
   * Clean up samples outside the time window
   */
  private cleanupOldSamples(now: number): void {
    const cutoff = now - this.windowDurationMs;

    while (this.timestamps.length > 0 && this.timestamps[0] < cutoff) {
      this.samples.shift();
      this.timestamps.shift();
    }
  }

  /**
   * Sort samples and cache the result
   */
  private ensureSorted(): number[] {
    if (this.isDirty || !this.sortedCache) {
      this.sortedCache = [...this.samples].sort((a, b) => a - b);
      this.isDirty = false;
    }
    return this.sortedCache;
  }

  /**
   * Get percentile value
   */
  getPercentile(percentile: number): number {
    if (this.samples.length === 0) {
      return 0;
    }

    const sorted = this.ensureSorted();
    const n = sorted.length;
    const index = Math.ceil((percentile / 100) * n) - 1;

    return sorted[Math.max(0, index)];
  }

  /**
   * Get multiple percentiles at once
   */
  getPercentiles(percentiles: number[]): number[] {
    return percentiles.map(p => this.getPercentile(p));
  }

  /**
   * Get all common percentiles
   */
  getAllPercentiles(): PercentileResult {
    if (this.samples.length === 0) {
      return {
        p50: 0,
        p75: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        p999: 0,
        min: 0,
        max: 0,
        mean: 0,
        count: 0,
      };
    }

    const sorted = this.ensureSorted();
    const n = sorted.length;
    const sum = sorted.reduce((acc, val) => acc + val, 0);

    return {
      p50: sorted[Math.floor(n * 0.5)],
      p75: sorted[Math.floor(n * 0.75)],
      p90: sorted[Math.floor(n * 0.9)],
      p95: sorted[Math.floor(n * 0.95)],
      p99: sorted[Math.ceil(n * 0.99) - 1],
      p999: sorted[Math.ceil(n * 0.999) - 1],
      min: sorted[0],
      max: sorted[n - 1],
      mean: sum / n,
      count: n,
    };
  }

  /**
   * Get the number of samples in the window
   */
  getCount(): number {
    // Clean up before counting
    this.cleanupOldSamples(Date.now());
    return this.samples.length;
  }

  /**
   * Clear all samples
   */
  clear(): void {
    this.samples = [];
    this.timestamps = [];
    this.sortedCache = [];
    this.isDirty = false;
  }

  /**
   * Check if calculator is empty
   */
  isEmpty(): boolean {
    return this.samples.length === 0;
  }
}

/**
 * Helper function to calculate percentiles from an array of values
 * (non-windowed version)
 */
export function calculatePercentiles(values: number[]): PercentileResult {
  if (values.length === 0) {
    return {
      p50: 0,
      p75: 0,
      p90: 0,
      p95: 0,
      p99: 0,
      p999: 0,
      min: 0,
      max: 0,
      mean: 0,
      count: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((acc, val) => acc + val, 0);

  return {
    p50: sorted[Math.floor(n * 0.5)],
    p75: sorted[Math.floor(n * 0.75)],
    p90: sorted[Math.floor(n * 0.9)],
    p95: sorted[Math.floor(n * 0.95)],
    p99: sorted[Math.ceil(n * 0.99) - 1],
    p999: sorted[Math.ceil(n * 0.999) - 1],
    min: sorted[0],
    max: sorted[n - 1],
    mean: sum / n,
    count: n,
  };
}

/**
 * Create a new PercentileCalculator instance
 */
export function createPercentileCalculator(config?: SlidingWindowConfig): PercentileCalculator {
  return new PercentileCalculator(config);
}

export default PercentileCalculator;
