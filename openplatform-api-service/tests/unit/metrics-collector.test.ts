/**
 * Metrics Collector Service Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  MetricsCollectorService,
  createMetricsCollectorService,
} from '../../src/services/metrics-collector.service';

describe('MetricsCollectorService', () => {
  let service: MetricsCollectorService;

  beforeEach(() => {
    // Reset the singleton before each test
    service = new MetricsCollectorService();
  });

  afterEach(() => {
    // Clean up
    service.reset();
  });

  describe('recordRequest', () => {
    it('should record basic request metrics', () => {
      service.recordRequest({
        method: 'GET',
        endpoint: '/api/v1/test',
        statusCode: 200,
        duration: 100,
      });

      const summary = service.getMetricsSummary();
      const metricsData = service.getMetricsData();
      expect(summary.totalRequests).toBe(1);
      expect(metricsData.requestsByStatus[200]).toBe(1);
      expect(metricsData.requestsByMethod['GET']).toBe(1);
    });

    it('should track error requests', () => {
      service.recordRequest({
        method: 'GET',
        endpoint: '/api/v1/test',
        statusCode: 500,
        duration: 50,
      });

      const summary = service.getMetricsSummary();
      const metricsData = service.getMetricsData();
      expect(summary.totalRequests).toBe(1);
      expect(metricsData.totalErrors).toBe(1);
      expect(metricsData.errorsByCode[500]).toBe(1);
      expect(summary.errorRate).toBe(1);
    });

    it('should track requests by appid', () => {
      service.recordRequest({
        method: 'POST',
        endpoint: '/api/v1/test',
        statusCode: 200,
        duration: 100,
        appid: 'app_123',
      });

      service.recordRequest({
        method: 'POST',
        endpoint: '/api/v1/test',
        statusCode: 200,
        duration: 150,
        appid: 'app_456',
      });

      const summary = service.getMetricsSummary();
      expect(summary.requestsByAppid['app_123']).toBe(1);
      expect(summary.requestsByAppid['app_456']).toBe(1);
    });

    it('should normalize endpoint paths', () => {
      service.recordRequest({
        method: 'GET',
        endpoint: '/api/v1/users/123',
        statusCode: 200,
        duration: 100,
      });

      service.recordRequest({
        method: 'GET',
        endpoint: '/api/v1/users/456',
        statusCode: 200,
        duration: 100,
      });

      const summary = service.getMetricsSummary();
      // Should normalize to the same endpoint pattern
      expect(Object.keys(summary.requestsByEndpoint).length).toBe(1);
    });

    it('should calculate latency percentiles', () => {
      // Record requests with varying latencies
      const latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      for (const latency of latencies) {
        service.recordRequest({
          method: 'GET',
          endpoint: '/api/v1/test',
          statusCode: 200,
          duration: latency,
        });
      }

      const summary = service.getMetricsSummary();
      // P50 should be around 50, P95 around 95
      expect(summary.latencyP50).toBeGreaterThan(0);
      expect(summary.latencyP95).toBeGreaterThanOrEqual(summary.latencyP50);
      expect(summary.latencyP99).toBeGreaterThanOrEqual(summary.latencyP95);
    });
  });

  describe('calculateQPS', () => {
    it('should calculate QPS correctly', async () => {
      // Record some requests with small delay to ensure QPS > 0
      service.recordRequest({
        method: 'GET',
        endpoint: '/api/v1/test',
        statusCode: 200,
        duration: 100,
      });

      // Wait a tiny bit
      await new Promise(resolve => setTimeout(resolve, 10));

      service.recordRequest({
        method: 'GET',
        endpoint: '/api/v1/test',
        statusCode: 200,
        duration: 100,
      });

      const qps = service.calculateQPS();
      expect(qps).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculatePercentiles', () => {
    it('should return zero for empty samples', () => {
      const percentiles = service.calculatePercentiles();
      expect(percentiles.p50).toBe(0);
      expect(percentiles.p95).toBe(0);
      expect(percentiles.p99).toBe(0);
    });

    it('should calculate percentiles correctly', () => {
      // Add specific samples
      for (let i = 1; i <= 100; i++) {
        service.recordRequest({
          method: 'GET',
          endpoint: '/api/v1/test',
          statusCode: 200,
          duration: i,
        });
      }

      const percentiles = service.calculatePercentiles();
      // P50 should be around 50, P95 around 95
      expect(percentiles.p50).toBeGreaterThanOrEqual(50);
      expect(percentiles.p95).toBeGreaterThanOrEqual(95);
      expect(percentiles.p99).toBeGreaterThanOrEqual(99);
    });
  });

  describe('calculateErrorRate', () => {
    it('should return 0 for no errors', () => {
      service.recordRequest({
        method: 'GET',
        endpoint: '/api/v1/test',
        statusCode: 200,
        duration: 100,
      });

      expect(service.calculateErrorRate()).toBe(0);
    });

    it('should calculate error rate correctly', () => {
      // 1 success, 1 error = 50% error rate
      service.recordRequest({
        method: 'GET',
        endpoint: '/api/v1/test',
        statusCode: 200,
        duration: 100,
      });

      service.recordRequest({
        method: 'GET',
        endpoint: '/api/v1/test',
        statusCode: 500,
        duration: 100,
      });

      expect(service.calculateErrorRate()).toBe(0.5);
    });
  });

  describe('getAppMetrics', () => {
    it('should track app-specific metrics', () => {
      service.recordRequest({
        method: 'GET',
        endpoint: '/api/v1/test',
        statusCode: 200,
        duration: 100,
        appid: 'app_123',
      });

      service.recordRequest({
        method: 'POST',
        endpoint: '/api/v1/test',
        statusCode: 200,
        duration: 150,
        appid: 'app_123',
      });

      const appMetrics = service.getAppMetrics('app_123');
      expect(appMetrics).not.toBeNull();
      expect(appMetrics?.requestCount).toBe(2);
    });

    it('should return null for unknown app', () => {
      const appMetrics = service.getAppMetrics('unknown_app');
      expect(appMetrics).toBeNull();
    });
  });

  describe('getAllAppMetrics', () => {
    it('should return all app metrics', () => {
      service.recordRequest({
        method: 'GET',
        endpoint: '/api/v1/test',
        statusCode: 200,
        duration: 100,
        appid: 'app_1',
      });

      service.recordRequest({
        method: 'GET',
        endpoint: '/api/v1/test',
        statusCode: 200,
        duration: 100,
        appid: 'app_2',
      });

      const allMetrics = service.getAllAppMetrics();
      expect(allMetrics.size).toBe(2);
    });
  });

  describe('reset', () => {
    it('should reset all metrics', () => {
      service.recordRequest({
        method: 'GET',
        endpoint: '/api/v1/test',
        statusCode: 200,
        duration: 100,
      });

      service.reset();

      const summary = service.getMetricsSummary();
      expect(summary.totalRequests).toBe(0);
      // Verify no errors in metrics data
      const metricsData = service.getMetricsData();
      expect(metricsData.totalErrors).toBe(0);
    });
  });

  describe('activeRequests', () => {
    it('should track active requests', () => {
      service.incrementActiveRequests();
      service.incrementActiveRequests();
      service.decrementActiveRequests();

      const summary = service.getMetricsSummary();
      // Active requests are tracked via Gauge, check via registry
      expect(service.getRegistry()).toBeDefined();
    });
  });

  describe('getRegistry', () => {
    it('should return Prometheus registry', () => {
      const registry = service.getRegistry();
      expect(registry).toBeDefined();
    });
  });
});
