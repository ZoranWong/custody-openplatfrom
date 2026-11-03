/**
 * Tiered retention for API logs.
 *
 *   raw detail (api_logs)          → RAW_RETENTION_DAYS
 *   daily snapshots + endpoints    → DAILY_RETENTION_MONTHS
 *   monthly snapshots              → MONTHLY_RETENTION_YEARS
 *
 * The rollup pipeline recomputes a window one day wider than the raw
 * retention so a missed run self-heals on the next day.
 */
export const RAW_RETENTION_DAYS = 3;
export const DAILY_RETENTION_MONTHS = 6;
export const MONTHLY_RETENTION_YEARS = 5;
