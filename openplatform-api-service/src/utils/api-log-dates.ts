/**
 * Day/month helpers for API log rollups.
 *
 * All rollup boundaries follow the database timezone (Asia/Shanghai by default)
 * so raw queries (`DATE(created_at)`) and precomputed snapshots agree on which
 * day a call belongs to.
 */

export const LOG_TIMEZONE = process.env.API_LOG_TIMEZONE || 'Asia/Shanghai';

interface Parts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
}

function partsFor(date: Date, timeZone: string): Parts {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== 'literal') out[p.type] = p.value;
  }
  return out as unknown as Parts;
}

export function dayKey(date: Date, timeZone: string = LOG_TIMEZONE): string {
  const p = partsFor(date, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

export function monthKey(date: Date, timeZone: string = LOG_TIMEZONE): string {
  const p = partsFor(date, timeZone);
  return `${p.year}-${p.month}`;
}

export function todayKey(timeZone: string = LOG_TIMEZONE, now: Date = new Date()): string {
  return dayKey(now, timeZone);
}

/** Local midnight of `day` (YYYY-MM-DD) expressed as a UTC instant. */
export function startOfDay(day: string, timeZone: string = LOG_TIMEZONE): Date {
  // Compute the timezone offset at local midnight by formatting a probe instant.
  const [y, m, d] = day.split('-').map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const p = partsFor(probe, timeZone);
  const probeAsLocal = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second),
  );
  const offsetMs = probeAsLocal - probe.getTime();
  return new Date(Date.UTC(y, m - 1, d) - offsetMs);
}

/** Shift a YYYY-MM-DD key by N days. */
export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
}

/** Shift a YYYY-MM key by N months. */
export function addMonths(month: string, months: number): string {
  const [y, m] = month.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + months, 1));
  return t.toISOString().slice(0, 7);
}
