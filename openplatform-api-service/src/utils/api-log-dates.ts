/**
 * Day/month helpers for API log rollups.
 *
 * All rollup boundaries follow the UTC wall clock stored in `created_at`, not
 * the database session timezone: the MariaDB adapter serializes `Date`
 * parameters with `getUTC*`, so raw queries (`DATE(created_at)`) yield the UTC
 * calendar day. Rollups and the `@db.Date` snapshot labels must use that same
 * day. The timezone stays injectable for tests.
 */

export const LOG_TIMEZONE = process.env.API_LOG_TIMEZONE || 'UTC';

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
  assertDayKey(day);
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
  assertDayKey(day);
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
}

/** Shift a YYYY-MM key by N months. */
export function addMonths(month: string, months: number): string {
  assertMonthKey(month);
  const [y, m] = month.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + months, 1));
  return t.toISOString().slice(0, 7);
}

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_KEY_PATTERN = /^\d{4}-\d{2}$/;
const MIN_YEAR = 1970;
const MAX_YEAR = 9999;

/**
 * Reject malformed or impossible day keys before they reach raw SQL date
 * parameters or snapshot writes. The round-trip catches normalization such as
 * `2026-13-01` or `2026-11-31`.
 */
function assertDayKey(day: string): void {
  if (!DAY_KEY_PATTERN.test(day)) throw new Error(`Invalid day key: ${day}`);
  const [y, m, d] = day.split('-').map(Number);
  if (y < MIN_YEAR || y > MAX_YEAR) throw new Error(`Invalid day key: ${day}`);
  const t = new Date(Date.UTC(y, m - 1, d));
  if (t.toISOString().slice(0, 10) !== day) throw new Error(`Invalid day key: ${day}`);
}

function assertMonthKey(month: string): void {
  if (!MONTH_KEY_PATTERN.test(month)) throw new Error(`Invalid month key: ${month}`);
  const [y, m] = month.split('-').map(Number);
  if (y < MIN_YEAR || y > MAX_YEAR) throw new Error(`Invalid month key: ${month}`);
  const t = new Date(Date.UTC(y, m - 1, 1));
  if (t.toISOString().slice(0, 7) !== month) throw new Error(`Invalid month key: ${month}`);
}

