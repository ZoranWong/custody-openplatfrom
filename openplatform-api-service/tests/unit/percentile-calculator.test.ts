/**
 * Percentile Calculator Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PercentileCalculator,
  createPercentileCalculator,
  calculatePercentiles,
} from '../../src/utils/percentile-calculator';

describe('PercentileCalculator', () => {
  let calculator: PercentileCalculator;

  beforeEach(() => {
    calculator = createPercentileCalculator({ maxSize: 1000 });
  });

  describe('add', () => {
    it('should add samples', () => {
      calculator.add(10);
      calculator.add(20);
      calculator.add(30);

      expect(calculator.getCount()).toBe(3);
    });

    it('should maintain max size limit', () => {
      const smallCalculator = createPercentileCalculator({ maxSize: 5 });

      for (let i = 1; i <= 10; i++) {
        smallCalculator.add(i);
      }

      expect(smallCalculator.getCount()).toBe(5);
    });
  });

  describe('addBatch', () => {
    it('should add multiple samples at once', () => {
      calculator.addBatch([10, 20, 30, 40, 50]);

      expect(calculator.getCount()).toBe(5);
    });
  });

  describe('getPercentile', () => {
    it('should return 0 for empty calculator', () => {
      expect(calculator.getPercentile(50)).toBe(0);
    });

    it('should calculate percentile correctly', () => {
      // Add 100 samples (1 to 100)
      for (let i = 1; i <= 100; i++) {
        calculator.add(i);
      }

      expect(calculator.getPercentile(50)).toBe(50);
      expect(calculator.getPercentile(95)).toBe(95);
      expect(calculator.getPercentile(99)).toBe(99);
    });

    it('should handle edge case for single value', () => {
      calculator.add(100);

      expect(calculator.getPercentile(50)).toBe(100);
      expect(calculator.getPercentile(95)).toBe(100);
      expect(calculator.getPercentile(99)).toBe(100);
    });
  });

  describe('getPercentiles', () => {
    it('should return multiple percentiles at once', () => {
      for (let i = 1; i <= 100; i++) {
        calculator.add(i);
      }

      const percentiles = calculator.getPercentiles([50, 90, 95, 99]);

      expect(percentiles).toEqual([50, 90, 95, 99]);
    });
  });

  describe('getAllPercentiles', () => {
    it('should return all percentiles', () => {
      for (let i = 1; i <= 1000; i++) {
        calculator.add(i);
      }

      const result = calculator.getAllPercentiles();

      expect(result.p50).toBeGreaterThanOrEqual(500);
      expect(result.p75).toBeGreaterThanOrEqual(750);
      expect(result.p90).toBeGreaterThanOrEqual(900);
      expect(result.p95).toBeGreaterThanOrEqual(950);
      expect(result.p99).toBeGreaterThanOrEqual(990);
      expect(result.p999).toBeGreaterThanOrEqual(999);
      expect(result.min).toBe(1);
      expect(result.max).toBe(1000);
      expect(result.count).toBe(1000);
    });

    it('should return zeros for empty calculator', () => {
      const result = calculator.getAllPercentiles();

      expect(result.p50).toBe(0);
      expect(result.p95).toBe(0);
      expect(result.p99).toBe(0);
      expect(result.count).toBe(0);
    });
  });

  describe('getCount', () => {
    it('should return correct count', () => {
      calculator.add(10);
      calculator.add(20);
      calculator.add(30);

      expect(calculator.getCount()).toBe(3);
    });
  });

  describe('clear', () => {
    it('should clear all samples', () => {
      calculator.add(10);
      calculator.add(20);
      calculator.clear();

      expect(calculator.getCount()).toBe(0);
      expect(calculator.isEmpty()).toBe(true);
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty calculator', () => {
      expect(calculator.isEmpty()).toBe(true);
    });

    it('should return false for non-empty calculator', () => {
      calculator.add(10);

      expect(calculator.isEmpty()).toBe(false);
    });
  });

  describe('calculatePercentiles helper', () => {
    it('should calculate percentiles from array', () => {
      const values = Array.from({ length: 100 }, (_, i) => i + 1);
      const result = calculatePercentiles(values);

      expect(result.p50).toBeGreaterThanOrEqual(50);
      expect(result.p95).toBeGreaterThanOrEqual(95);
      expect(result.p99).toBeGreaterThanOrEqual(99);
    });

    it('should handle empty array', () => {
      const result = calculatePercentiles([]);

      expect(result.p50).toBe(0);
      expect(result.count).toBe(0);
    });

    it('should calculate mean correctly', () => {
      const values = [10, 20, 30, 40, 50];
      const result = calculatePercentiles(values);

      expect(result.mean).toBe(30);
    });
  });
});
