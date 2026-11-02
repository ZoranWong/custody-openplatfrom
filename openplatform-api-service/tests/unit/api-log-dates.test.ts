import { describe, it, expect } from 'vitest';
import {
  dayKey,
  monthKey,
  startOfDay,
  addDays,
  todayKey,
} from '../../src/utils/api-log-dates';

const TZ = 'Asia/Shanghai';

describe('api-log-dates', () => {
  it('formats a UTC instant as a CST day key', () => {
    // 2026-11-01T17:30:00Z == 2026-11-02 01:30 CST
    expect(dayKey(new Date('2026-11-01T17:30:00Z'), TZ)).toBe('2026-11-02');
    // 2026-11-01T15:59:00Z == 2026-11-01 23:59 CST
    expect(dayKey(new Date('2026-11-01T15:59:00Z'), TZ)).toBe('2026-11-01');
  });

  it('formats a month key', () => {
    expect(monthKey(new Date('2026-10-31T20:00:00Z'), TZ)).toBe('2026-11');
  });

  it('startOfDay returns local midnight as a Date', () => {
    const start = startOfDay('2026-11-02', TZ);
    // 2026-11-02 00:00 CST == 2026-11-01T16:00:00Z
    expect(start.toISOString()).toBe('2026-11-01T16:00:00.000Z');
  });

  it('addDays shifts the day key', () => {
    expect(addDays('2026-11-02', -3)).toBe('2026-10-30');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('todayKey accepts an injected now', () => {
    expect(todayKey(TZ, new Date('2026-11-01T17:30:00Z'))).toBe('2026-11-02');
  });
});
