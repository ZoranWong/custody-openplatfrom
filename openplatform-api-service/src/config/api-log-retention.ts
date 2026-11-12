/**
 * Tiered retention for API logs.
 *
 *   raw detail (api_logs)          → per developer, default RAW_RETENTION_DAYS
 *   daily snapshots + endpoints    → DAILY_RETENTION_MONTHS
 *   monthly snapshots              → MONTHLY_RETENTION_YEARS
 *
 * Raw retention is configurable per developer, bounded by
 * [MIN_RAW_RETENTION_DAYS, MAX_RAW_RETENTION_DAYS] and by the package's
 * log_retention_days. The rollup pipeline recomputes a window one day wider
 * than the longest possible retention so a missed run self-heals the next day.
 */
export const RAW_RETENTION_DAYS = 3;
export const MIN_RAW_RETENTION_DAYS = 1;
export const MAX_RAW_RETENTION_DAYS = 30;
export const DAILY_RETENTION_MONTHS = 6;
export const MONTHLY_RETENTION_YEARS = 5;

/**
 * The cap a developer's configured retention may reach for their package.
 * No active package → the platform default (no upgrade path past it).
 */
export function retentionCapForPackage(packageRetentionDays?: number | null): number {
  const cap = Number(packageRetentionDays);
  if (!Number.isFinite(cap) || cap <= 0) return RAW_RETENTION_DAYS;
  return Math.min(MAX_RAW_RETENTION_DAYS, Math.floor(cap));
}

/** Clamp a configured value into [MIN, cap]. Non-numeric input falls back to the default. */
export function clampRetentionDays(days: unknown, cap = MAX_RAW_RETENTION_DAYS): number {
  const n = Number(days);
  if (!Number.isFinite(n)) return RAW_RETENTION_DAYS;
  return Math.min(cap, Math.max(MIN_RAW_RETENTION_DAYS, Math.floor(n)));
}
