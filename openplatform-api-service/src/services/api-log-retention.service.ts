/**
 * Resolves a developer's effective raw log retention.
 *
 * The configured value lives on developer_alert_settings.log_retention_days.
 * It is clamped to [MIN_RAW_RETENTION_DAYS, MAX_RAW_RETENTION_DAYS] and, when
 * the developer has an active package, to that package's log_retention_days —
 * the package value is the ceiling, so retention never exceeds what was sold.
 */

import { getApiLogRepository, getSubscriptionRepository } from '../repositories/repository.factory';
import {
  MAX_RAW_RETENTION_DAYS,
  MIN_RAW_RETENTION_DAYS,
  RAW_RETENTION_DAYS,
  clampRetentionDays,
  retentionCapForPackage,
} from '../config/api-log-retention';

export interface RetentionInfo {
  /** Lowest value a developer may configure. */
  minDays: number;
  /** Value persisted for the developer, clamped to the global max. */
  configuredDays: number;
  /** Highest value the current package allows. */
  maxDays: number;
  /** What the rollup and stats actually use: min(configured, max). */
  effectiveDays: number;
  /** The package's log_retention_days, or null when there is no active package. */
  packageRetentionDays: number | null;
}

function buildInfo(configuredDays: unknown, packageRetentionDays: number | null): RetentionInfo {
  const maxDays = retentionCapForPackage(packageRetentionDays);
  const configured = clampRetentionDays(configuredDays, MAX_RAW_RETENTION_DAYS);
  return {
    minDays: MIN_RAW_RETENTION_DAYS,
    configuredDays: configured,
    maxDays,
    effectiveDays: Math.min(configured, maxDays),
    packageRetentionDays,
  };
}

/**
 * Retention for one developer. Pass `packageRetentionDays` when the caller
 * already loaded the active subscription to skip a redundant query; pass null
 * when it already knows there is no active package.
 */
export async function getRetentionInfo(
  developerId: string,
  packageRetentionDays?: number | null,
): Promise<RetentionInfo> {
  const configured = await getApiLogRepository().getLogRetentionDays(developerId);
  let pkg = packageRetentionDays;
  if (pkg === undefined) {
    const sub = await getSubscriptionRepository().findActiveWithPackage(developerId);
    pkg = sub?.package?.logRetention ?? null;
  }
  return buildInfo(configured, pkg);
}

/**
 * Bulk variant for the rollup pipeline: one settings query and one package
 * query for the whole developer set instead of two per developer.
 */
export async function resolveRetentionForDevelopers(
  developerIds: string[],
): Promise<Map<string, RetentionInfo>> {
  const result = new Map<string, RetentionInfo>();
  if (developerIds.length === 0) return result;

  const [settings, packageRetention] = await Promise.all([
    getApiLogRepository().listAlertSettings(),
    getSubscriptionRepository().findActiveLogRetention(developerIds),
  ]);
  const configuredByDev = new Map(settings.map((s) => [s.developerId, s.logRetentionDays]));

  for (const dev of developerIds) {
    result.set(dev, buildInfo(configuredByDev.get(dev) ?? RAW_RETENTION_DAYS, packageRetention.get(dev) ?? null));
  }
  return result;
}
