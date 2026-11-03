/**
 * Segmented stats reads for API logs.
 *
 * Today / recent days without a snapshot → raw api_logs
 * last 6 months                          → api_log_snapshots + api_log_endpoint_daily
 * older                                  → api_log_monthly_snapshots
 *
 * The three tiers are merged into one series so the caller never has to know
 * which storage tier a given day lives in.
 */

import { getApiLogRepository } from '../repositories/repository.factory';
import { addDays, addMonths, dayKey, monthKey, startOfDay, LOG_TIMEZONE } from '../utils/api-log-dates';
import { RAW_RETENTION_DAYS, DAILY_RETENTION_MONTHS } from '../config/api-log-retention';

export interface SeriesPoint {
  date: string;
  calls: number;
  errorCalls: number;
  totalBytes: number;
  avgResponseTime: number;
}

export interface EndpointRow {
  endpoint: string;
  method: string;
  calls: number;
  errorCalls: number;
  totalBytes: number;
  avgResponseTime: number;
  maxResponseTime: number;
}

/** A monthly snapshot row (as read from the repository) or an already-mapped point. */
type MonthlyLike = {
  month: string;
  totalCalls: number;
  errorCalls: number;
  totalBytes: number;
  avgResponseTime: number;
};

function toSeriesPoint(point: MonthlyLike | SeriesPoint): SeriesPoint {
  if ('month' in point) {
    return {
      date: point.month,
      calls: point.totalCalls,
      errorCalls: point.errorCalls,
      totalBytes: point.totalBytes,
      avgResponseTime: point.avgResponseTime,
    };
  }
  return point;
}

/**
 * Merge monthly (coarser, `YYYY-MM`) and daily (`YYYY-MM-DD`) points.
 * Monthly rows are normalized to the same shape; the whole month's total sits
 * under `date: 'YYYY-MM'`. A daily point wins if both describe the same key.
 */
export function mergeTimeSeries(
  daily: SeriesPoint[],
  monthly: Array<MonthlyLike | SeriesPoint>,
): SeriesPoint[] {
  const map = new Map<string, SeriesPoint>();
  for (const m of monthly) {
    const point = toSeriesPoint(m);
    map.set(point.date, point);
  }
  for (const d of daily) map.set(d.date, d);
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function buildBreakdown(rows: EndpointRow[]) {
  const total = rows.reduce((s, r) => s + r.calls, 0);
  return rows.map((r) => ({
    endpoint: r.endpoint,
    method: r.method,
    calls: r.calls,
    successCount: r.calls - r.errorCalls,
    successRate: r.calls ? Math.round(((r.calls - r.errorCalls) / r.calls) * 1000) / 10 : 100,
    percentage: total ? Math.round((r.calls / total) * 1000) / 10 : 0,
    totalBytes: r.totalBytes,
    avgResponseTime: r.avgResponseTime,
    maxResponseTime: r.maxResponseTime,
  }));
}

export interface UsageWindow {
  totalCalls: number;
  errorCalls: number;
  totalBytes: number;
  avgResponseTime: number;
  series: SeriesPoint[];
  endpoints: ReturnType<typeof buildBreakdown>;
  bytesTrackedSince: string | null;
  partial: boolean;
}

/** Weighted mean of per-point averages, weighted by call count. */
function weightedAvg(points: SeriesPoint[]): number {
  const calls = points.reduce((s, p) => s + p.calls, 0);
  if (!calls) return 0;
  const weighted = points.reduce((s, p) => s + p.avgResponseTime * p.calls, 0);
  return Math.round(weighted / calls);
}

/** Merge endpoint rows across days, keeping totals and weighted latency. */
function mergeEndpoints(rows: EndpointRow[]): EndpointRow[] {
  const map = new Map<string, EndpointRow>();
  for (const r of rows) {
    const key = `${r.method} ${r.endpoint}`;
    const cur = map.get(key);
    if (!cur) {
      map.set(key, { ...r });
      continue;
    }
    const calls = cur.calls + r.calls;
    cur.avgResponseTime = calls
      ? Math.round((cur.avgResponseTime * cur.calls + r.avgResponseTime * r.calls) / calls)
      : 0;
    cur.calls = calls;
    cur.errorCalls += r.errorCalls;
    cur.totalBytes += r.totalBytes;
    cur.maxResponseTime = Math.max(cur.maxResponseTime, r.maxResponseTime);
  }
  return [...map.values()].sort((a, b) => b.calls - a.calls);
}

export async function loadUsageWindow(
  developerId: string,
  startDay: string,
  timeZone: string = LOG_TIMEZONE,
  now: Date = new Date(),
): Promise<UsageWindow> {
  const repo = getApiLogRepository();
  const today = dayKey(now, timeZone);
  const currentMonth = monthKey(now, timeZone);

  // Daily tier starts at the beginning of the 6-month window (or later).
  const dailyFloorMonth = addMonths(currentMonth, -(DAILY_RETENTION_MONTHS - 1));
  const dailyStart = startDay > `${dailyFloorMonth}-01` ? startDay : `${dailyFloorMonth}-01`;
  const monthlyEndMonth = addMonths(dailyFloorMonth, -1);

  let partial = false;
  let monthly: SeriesPoint[] = [];
  let daily: SeriesPoint[] = [];
  let endpoints: EndpointRow[] = [];

  // --- monthly tier: older than the daily window ---
  const requestedStartMonth = startDay.slice(0, 7);
  if (requestedStartMonth <= monthlyEndMonth) {
    try {
      const rows = await repo.getMonthlySnapshotsBetween(developerId, requestedStartMonth, monthlyEndMonth);
      monthly = rows.map((m) => ({
        date: m.month,
        calls: m.totalCalls,
        errorCalls: m.errorCalls,
        totalBytes: m.totalBytes,
        avgResponseTime: m.avgResponseTime,
      }));
    } catch (err) {
      partial = true;
      console.error('[ApiLog] monthly read failed:', (err as Error).message);
    }
  }

  // --- daily tier + live raw days that have no snapshot yet ---
  try {
    const snapshots = await repo.getDailySnapshotsBetween(developerId, dailyStart, today);
    daily = snapshots.map((s) => ({
      date: s.date,
      calls: s.totalCalls,
      errorCalls: s.errorCalls,
      totalBytes: s.totalBytes,
      avgResponseTime: s.avgResponseTime,
    }));
    endpoints = await repo.getEndpointDailyBetween(developerId, dailyStart, today);

    // A day may have raw rows but no snapshot (rollup has not run yet, or the
    // day is still today). Read those live so the newest data is never missing.
    const snapDays = new Set(daily.map((d) => d.date));
    const rawFloor = addDays(today, -(RAW_RETENTION_DAYS - 1));
    const rawStart = dailyStart > rawFloor ? dailyStart : rawFloor;
    for (let d = rawStart; d <= today; d = addDays(d, 1)) {
      if (snapDays.has(d)) continue;
      const agg = await repo.aggregateRawRange(developerId, startOfDay(d), startOfDay(addDays(d, 1)));
      if (agg.calls === 0) continue;
      daily.push({
        date: d,
        calls: agg.calls,
        errorCalls: agg.errorCalls,
        totalBytes: agg.totalBytes,
        avgResponseTime: agg.avgResponseTime,
      });
      endpoints.push(...agg.byEndpoint.map((e) => ({ ...e, date: d })));
    }
  } catch (err) {
    partial = true;
    console.error('[ApiLog] daily/raw read failed:', (err as Error).message);
  }

  const series = mergeTimeSeries(daily, monthly);
  const totalCalls = series.reduce((s, p) => s + p.calls, 0);
  const errorCalls = series.reduce((s, p) => s + p.errorCalls, 0);
  const totalBytes = series.reduce((s, p) => s + p.totalBytes, 0);
  const bytesTrackedSince = series.find((p) => p.totalBytes > 0)?.date ?? null;

  return {
    totalCalls,
    errorCalls,
    totalBytes,
    avgResponseTime: weightedAvg(series),
    series,
    endpoints: buildBreakdown(mergeEndpoints(endpoints)),
    bytesTrackedSince,
    partial,
  };
}
