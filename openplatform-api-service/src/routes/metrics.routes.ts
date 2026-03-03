/**
 * Metrics Routes
 * Prometheus metrics endpoint for monitoring
 */

import { Router, Request, Response } from 'express';
import { getMetricsCollector } from '../services/metrics-collector.service';

const router = Router();

/**
 * GET /metrics
 * Prometheus metrics endpoint
 */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const metricsCollector = getMetricsCollector();
    const registry = metricsCollector.getRegistry();

    // Set content type for Prometheus
    res.set('Content-Type', registry.contentType);

    // Get metrics in Prometheus format
    const metrics = await registry.metrics();

    res.send(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch metrics',
    });
  }
});

/**
 * GET /metrics/summary
 * Human-readable metrics summary
 */
router.get('/summary', (_req: Request, res: Response): void => {
  try {
    const metricsCollector = getMetricsCollector();
    const summary = metricsCollector.getMetricsSummary();

    res.json({
      timestamp: new Date().toISOString(),
      metrics: summary,
    });
  } catch (error) {
    console.error('Error fetching metrics summary:', error);
    res.status(500).json({
      error: 'Failed to fetch metrics summary',
    });
  }
});

/**
 * GET /metrics/app/:appid
 * App-specific metrics
 */
router.get('/app/:appid', (req: Request, res: Response): void => {
  try {
    const { appid } = req.params;
    const metricsCollector = getMetricsCollector();
    const appMetrics = metricsCollector.getAppMetrics(appid);

    if (!appMetrics) {
      res.status(404).json({
        error: 'App metrics not found',
        appid,
      });
      return;
    }

    // Calculate average latency
    const avgLatency =
      appMetrics.requestCount > 0
        ? appMetrics.totalLatency / appMetrics.requestCount
        : 0;

    // Calculate app-specific error rate
    const errorRate =
      appMetrics.requestCount > 0
        ? appMetrics.errorCount / appMetrics.requestCount
        : 0;

    // Calculate percentiles from samples
    const sorted = [...appMetrics.latencySamples].sort((a, b) => a - b);
    const n = sorted.length;

    res.json({
      appid,
      requestCount: appMetrics.requestCount,
      errorCount: appMetrics.errorCount,
      errorRate,
      avgLatencyMs: avgLatency,
      latency: {
        p50: n > 0 ? sorted[Math.floor(n * 0.5)] : 0,
        p95: n > 0 ? sorted[Math.floor(n * 0.95)] : 0,
        p99: n > 0 ? sorted[Math.ceil(n * 0.99) - 1] : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching app metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch app metrics',
    });
  }
});

/**
 * GET /metrics/apps
 * All app metrics
 */
router.get('/apps', (_req: Request, res: Response): void => {
  try {
    const metricsCollector = getMetricsCollector();
    const allAppMetrics = metricsCollector.getAllAppMetrics();

    const apps: Record<string, any> = {};

    for (const [appid, metrics] of allAppMetrics) {
      const sorted = [...metrics.latencySamples].sort((a, b) => a - b);
      const n = sorted.length;
      const avgLatency = metrics.requestCount > 0 ? metrics.totalLatency / metrics.requestCount : 0;
      const errorRate = metrics.requestCount > 0 ? metrics.errorCount / metrics.requestCount : 0;

      apps[appid] = {
        requestCount: metrics.requestCount,
        errorCount: metrics.errorCount,
        errorRate,
        avgLatencyMs: avgLatency,
        latency: {
          p50: n > 0 ? sorted[Math.floor(n * 0.5)] : 0,
          p95: n > 0 ? sorted[Math.floor(n * 0.95)] : 0,
          p99: n > 0 ? sorted[Math.ceil(n * 0.99) - 1] : 0,
        },
      };
    }

    res.json({
      apps,
    });
  } catch (error) {
    console.error('Error fetching all app metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch app metrics',
    });
  }
});

/**
 * POST /metrics/reset
 * Reset all metrics (admin only in production)
 */
router.post('/reset', (_req: Request, res: Response): void => {
  try {
    const metricsCollector = getMetricsCollector();
    metricsCollector.reset();

    res.json({
      success: true,
      message: 'Metrics reset successfully',
    });
  } catch (error) {
    console.error('Error resetting metrics:', error);
    res.status(500).json({
      error: 'Failed to reset metrics',
    });
  }
});

export default router;
