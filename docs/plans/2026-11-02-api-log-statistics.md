# API 日志统计模块优化 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 把 API 日志从"全量实时扫原始表"改为分层存储：原始明细 3 天、日统计 6 个月、月统计 5 年，并补上真实的流量统计，开发者门户 API 日志页升级为"统计 + 明细"。

**Architecture:** 写入端在 `createApiLog` 记录请求/响应字节数；每日 00:05 的流水线把 D-1~D-3 重算成日快照与端点日表（UPSERT 幂等），确认聚合成功后删除 3 天前的原始行，再把 6 个月前的日数据滚动进月快照；`/billing/usage` 按时间范围在"原始表 / 日快照 / 月快照"之间选源并合并。

**Tech Stack:** TypeScript、Express、Prisma 7 + MySQL、Vitest、Vue 3 + Element Plus（`developer-portal-v2`）

**设计文档:** `docs/plans/2026-11-02-api-log-statistics-design.md`

**工作分支:** `feat/api-log-statistics-rollup`（已创建，设计文档已提交）

---

## 约定

- 后端命令都在 `openplatform-api-service/` 下执行；前端在 `openplatform-web/developer-portal-v2/` 下执行。
- 单测一律用 `vi.mock('../../src/repositories/repository.factory', ...)` 替换仓库，不连真实 DB（参考 `tests/unit/api-log-detail.test.ts`）。
- 所有涉及日期的计算必须显式传入"当前时间"，测试里不要依赖机器时区。
- **切天口径已修正为 UTC**：`api_logs.created_at` 实测存的是 UTC 墙钟，Prisma 也按 UTC 序列化 `Date` 参数，故 `startOfDay(D)` 即 `D 00:00:00Z`。本文档 Task 2/5/8 代码片段里若出现 `Asia/Shanghai` 默认值，以 `src/utils/api-log-dates.ts` 的实际实现（`LOG_TIMEZONE = 'UTC'`、时区可注入）为准。
- 每个 Task 结束都提交一次。

---

### Task 1: 字节数工具函数

**Files:**
- Create: `openplatform-api-service/src/utils/byte-size.ts`
- Test: `openplatform-api-service/tests/unit/byte-size.test.ts`

**Step 1: 写失败的测试**

```typescript
import { describe, it, expect } from 'vitest';
import { byteLength, sumByteLength } from '../../src/utils/byte-size';

describe('byte-size', () => {
  it('counts UTF-8 bytes, not characters', () => {
    expect(byteLength('abc')).toBe(3);
    expect(byteLength('中文')).toBe(6);
  });

  it('serializes objects before counting', () => {
    expect(byteLength({ a: 1 })).toBe(7); // {"a":1}
    expect(byteLength({ 名称: '充值' })).toBeGreaterThan(6);
  });

  it('returns 0 for null / undefined', () => {
    expect(byteLength(null)).toBe(0);
    expect(byteLength(undefined)).toBe(0);
  });

  it('returns the string byte length as-is for strings', () => {
    expect(byteLength('{"a":1}')).toBe(7);
  });

  it('sums multiple values and tolerates unserializable ones', () => {
    const circular: any = {};
    circular.self = circular;
    expect(sumByteLength({ a: 1 }, 'xy', circular)).toBe(7 + 2 + 0);
  });
});
```

**Step 2: 运行，确认失败**

Run: `npx vitest run tests/unit/byte-size.test.ts`
Expected: FAIL — cannot resolve `../../src/utils/byte-size`

**Step 3: 最小实现**

```typescript
/**
 * Byte counting helpers for API log traffic statistics.
 * Payloads are counted as JSON (UTF-8), excluding HTTP headers.
 */

export function byteLength(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'string') return Buffer.byteLength(value, 'utf8');
  if (Buffer.isBuffer(value)) return value.length;
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8');
  } catch {
    // Circular structures cannot be serialized — count as zero.
    return 0;
  }
}

export function sumByteLength(...values: unknown[]): number {
  return values.reduce<number>((total, v) => total + byteLength(v), 0);
}
```

**Step 4: 运行，确认通过**

Run: `npx vitest run tests/unit/byte-size.test.ts`
Expected: PASS（5 passed）

**Step 5: 提交**

```bash
git add openplatform-api-service/src/utils/byte-size.ts openplatform-api-service/tests/unit/byte-size.test.ts
git commit -m "feat(api-log): add UTF-8 byte counting helpers"
```

---

### Task 2: 时区安全的日期工具

**Files:**
- Create: `openplatform-api-service/src/utils/api-log-dates.ts`
- Test: `openplatform-api-service/tests/unit/api-log-dates.test.ts`

设计里切天/切月按 DB 时区（CST, UTC+8）计算。新增一个可注入 `now` 的工具，避免测试依赖机器时区。

**Step 1: 写失败的测试**

```typescript
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
```

**Step 2: 运行，确认失败**

Run: `npx vitest run tests/unit/api-log-dates.test.ts`
Expected: FAIL — module not found

**Step 3: 实现**

```typescript
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
```

**Step 4: 运行，确认通过**

Run: `npx vitest run tests/unit/api-log-dates.test.ts`
Expected: PASS（5 passed）

> 若 `startOfDay` 用例失败，先确认 `Intl` 的 `en-CA` 在 Node 22 下输出 `YYYY-MM-DD` 格式；如不一致，改为手动拼接 `p.year-p.month-p.day`（当前实现已是拼接，不受影响）。

**Step 5: 提交**

```bash
git add openplatform-api-service/src/utils/api-log-dates.ts openplatform-api-service/tests/unit/api-log-dates.test.ts
git commit -m "feat(api-log): add timezone-aware day/month helpers"
```

---

### Task 3: Prisma schema 与迁移（基线 + 新表）

**Files:**
- Modify: `openplatform-api-service/prisma/schema.prisma`（`ApiLog`、`ApiLogSnapshot` 两个 model，文件末尾追加两个 model）
- Create: `openplatform-api-service/prisma/migrations/20261102000000_api_log_rollups_baseline/migration.sql`
- Create: `openplatform-api-service/prisma/migrations/20261102000100_add_api_log_bytes_and_rollups/migration.sql`

**背景:** `api_log_snapshots` 目前只存在于线上数据库，`prisma/migrations/` 里没有它的建表记录。如果新迁移里直接 `ALTER TABLE api_log_snapshots`，全新环境会失败。因此拆成两个迁移：先补基线（`CREATE TABLE IF NOT EXISTS`），再加字段/新表。

**Step 1: 改 schema.prisma**

在 `model ApiLog` 的 `isError` 字段前加：

```prisma
  /// 请求体字节数 (UTF-8 JSON)
  requestBytes    Int?     @map("request_bytes")
  /// 响应体字节数 (UTF-8 JSON)
  responseBytes   Int?     @map("response_bytes")
```

`model ApiLog` 的索引区追加：

```prisma
  @@index([developerId, createdAt])
  @@index([createdAt])
```

`model ApiLogSnapshot` 在 `topEndpoints` 前加：

```prisma
  /// 当日请求+响应字节合计
  totalBytes        BigInt   @default(0) @map("total_bytes")
```

文件末尾追加：

```prisma
// ============================================
// ApiLogEndpointDaily - 端点维度的日聚合
// ============================================
model ApiLogEndpointDaily {
  id              BigInt   @id @default(autoincrement())
  developerId     String   @map("developer_id")
  date            DateTime @map("date") @db.Date
  endpoint        String   @db.VarChar(255)
  method          String   @db.VarChar(16)
  calls           Int      @default(0)
  errorCalls      Int      @default(0) @map("error_calls")
  totalBytes      BigInt   @default(0) @map("total_bytes")
  avgResponseTime Int      @default(0) @map("avg_response_time")
  maxResponseTime Int      @default(0) @map("max_response_time")
  createdAt       DateTime @default(now()) @map("created_at")

  @@unique([developerId, date, endpoint, method], name: "uq_dev_date_endpoint")
  @@index([developerId, date])
  @@map("api_log_endpoint_daily")
}

// ============================================
// ApiLogMonthlySnapshot - 月聚合（保留5年）
// ============================================
model ApiLogMonthlySnapshot {
  id              BigInt   @id @default(autoincrement())
  developerId     String   @map("developer_id")
  month           DateTime @map("month") @db.Date
  totalCalls      Int      @default(0) @map("total_calls")
  errorCalls      Int      @default(0) @map("error_calls")
  totalBytes      BigInt   @default(0) @map("total_bytes")
  avgResponseTime Int      @default(0) @map("avg_response_time")
  createdAt       DateTime @default(now()) @map("created_at")

  @@unique([developerId, month], name: "uq_dev_month")
  @@map("api_log_monthly_snapshots")
}
```

**Step 2: 基线迁移**

`prisma/migrations/20261102000000_api_log_rollups_baseline/migration.sql`：

```sql
-- Baseline for api_log_snapshots: the table was created out-of-band on the
-- existing servers, so recreate it idempotently for fresh environments.
CREATE TABLE IF NOT EXISTS `api_log_snapshots` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `developer_id` varchar(191) NOT NULL,
  `date` date NOT NULL,
  `total_calls` int NOT NULL DEFAULT '0',
  `error_calls` int NOT NULL DEFAULT '0',
  `avg_response_time` int NOT NULL DEFAULT '0',
  `p95_response_time` int NOT NULL DEFAULT '0',
  `top_endpoints` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dev_date` (`developer_id`,`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Step 3: 字段与新表迁移**

`prisma/migrations/20261102000100_add_api_log_bytes_and_rollups/migration.sql`：

```sql
-- Raw log byte columns for traffic statistics
ALTER TABLE `api_logs`
  ADD COLUMN `request_bytes` INT NULL,
  ADD COLUMN `response_bytes` INT NULL,
  ADD INDEX `api_logs_developer_created_idx` (`developer_id`, `created_at`),
  ADD INDEX `api_logs_created_idx` (`created_at`);

-- Daily snapshot traffic total
ALTER TABLE `api_log_snapshots`
  ADD COLUMN `total_bytes` BIGINT NOT NULL DEFAULT 0;

-- Endpoint-level daily rollup
CREATE TABLE `api_log_endpoint_daily` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `developer_id` varchar(191) NOT NULL,
  `date` date NOT NULL,
  `endpoint` varchar(255) NOT NULL,
  `method` varchar(16) NOT NULL,
  `calls` int NOT NULL DEFAULT '0',
  `error_calls` int NOT NULL DEFAULT '0',
  `total_bytes` bigint NOT NULL DEFAULT '0',
  `avg_response_time` int NOT NULL DEFAULT '0',
  `max_response_time` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dev_date_endpoint` (`developer_id`,`date`,`endpoint`,`method`),
  KEY `api_log_endpoint_daily_dev_date_idx` (`developer_id`,`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Monthly rollup (5 year retention)
CREATE TABLE `api_log_monthly_snapshots` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `developer_id` varchar(191) NOT NULL,
  `month` date NOT NULL,
  `total_calls` int NOT NULL DEFAULT '0',
  `error_calls` int NOT NULL DEFAULT '0',
  `total_bytes` bigint NOT NULL DEFAULT '0',
  `avg_response_time` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dev_month` (`developer_id`,`month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Step 4: 生成 client 并确认类型可用**

Run: `npx prisma generate`
Expected: `Generated Prisma Client`，无报错

Run: `npm run build`
Expected: 通过（本 Task 只加字段，未改动代码）

> 不在本地执行 `prisma migrate deploy`（没有本地 MySQL）。迁移会在部署脚本里执行；上线前先在 testing 库用 `npx prisma migrate status` 确认两个新迁移处于 pending。

**Step 5: 提交**

```bash
git add openplatform-api-service/prisma/schema.prisma openplatform-api-service/prisma/migrations/20261102000000_api_log_rollups_baseline openplatform-api-service/prisma/migrations/20261102000100_add_api_log_bytes_and_rollups
git commit -m "feat(db): add api log byte columns, endpoint daily and monthly rollup tables"
```

---

### Task 4: 写入端记录字节数

**Files:**
- Modify: `openplatform-api-service/src/services/api-log.service.ts:4-72`
- Test: `openplatform-api-service/tests/unit/api-log-write.test.ts`

三个调用点（`forward.controller.ts`、`thirdparty.controller.ts`、`application-callback.service.ts`）各不相同，所以把计算放在 `createApiLog` 里统一处理，调用点只传 payload。

**Step 1: 写失败的测试**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const created: any[] = [];

vi.mock('../../src/repositories/repository.factory', () => ({
  getApiLogRepository: () => ({
    create: async (data: any) => {
      created.push(data);
      return data;
    },
  }),
}));

const { createApiLog } = await import('../../src/services/api-log.service');

describe('createApiLog byte accounting', () => {
  beforeEach(() => {
    created.length = 0;
  });

  it('derives request/response bytes from payloads', async () => {
    await createApiLog({
      endpoint: '/api/x',
      method: 'POST',
      requestBody: { a: 1 },
      responseBody: { ok: true },
    });
    const row = created[0];
    expect(row.requestBytes).toBe(7);
    expect(row.responseBytes).toBe(11);
  });

  it('writes 0 when payloads are absent', async () => {
    await createApiLog({ endpoint: '/api/x', method: 'GET' });
    expect(created[0].requestBytes).toBe(0);
    expect(created[0].responseBytes).toBe(0);
  });

  it('accepts explicit byte counts and prefers them', async () => {
    await createApiLog({
      endpoint: '/api/x',
      method: 'POST',
      requestBody: { a: 1 },
      requestBytes: 999,
    });
    expect(created[0].requestBytes).toBe(999);
  });
});
```

**Step 2: 运行，确认失败**

Run: `npx vitest run tests/unit/api-log-write.test.ts`
Expected: FAIL — `row.requestBytes` 为 `undefined`

**Step 3: 实现**

在 `api-log.service.ts` 顶部加 import：

```typescript
import { byteLength } from '../utils/byte-size';
```

`ApiLogEntry` 接口加两个可选字段：

```typescript
  requestBytes?: number;
  responseBytes?: number;
```

`createApiLog` 的 `repo.create({...})` 里，在 `requestBody` 之后插入：

```typescript
        requestBytes: entry.requestBytes ?? byteLength(entry.requestBody),
        responseBytes: entry.responseBytes ?? byteLength(entry.responseBody),
```

**Step 4: 运行，确认通过**

Run: `npx vitest run tests/unit/api-log-write.test.ts`
Expected: PASS（3 passed）

**Step 5: 提交**

```bash
git add openplatform-api-service/src/services/api-log.service.ts openplatform-api-service/tests/unit/api-log-write.test.ts
git commit -m "feat(api-log): record request and response byte sizes"
```

---

### Task 5: 仓库层 —— 聚合写入与分段读取

**Files:**
- Modify: `openplatform-api-service/src/repositories/repository.interfaces.ts:145-222`
- Modify: `openplatform-api-service/src/repositories/implementations/api-log.repository.ts:284-306`（追加方法，保留 `findByDeveloper`）
- Test: `openplatform-api-service/tests/unit/api-log-rollup-repo.test.ts`

**接口新增**（`repository.interfaces.ts`）：

```typescript
export interface ApiLogDailySnapshot {
  date: string;
  developerId: string;
  totalCalls: number;
  errorCalls: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  totalBytes: number;
  topEndpoints: Array<{ endpoint: string; calls: number; errorRate: number }>;
  createdAt: string;
}

export interface ApiLogEndpointDailyRow {
  date: string;          // YYYY-MM-DD
  endpoint: string;
  method: string;
  calls: number;
  errorCalls: number;
  totalBytes: number;
  avgResponseTime: number;
  maxResponseTime: number;
}

export interface ApiLogMonthlySnapshot {
  month: string;         // YYYY-MM
  totalCalls: number;
  errorCalls: number;
  totalBytes: number;
  avgResponseTime: number;
}

export interface ApiLogRawDayAggregate {
  date: string;          // YYYY-MM-DD
  calls: number;
  errorCalls: number;
  totalBytes: number;
  avgResponseTime: number;
}
```

`ApiLogRepository` 接口追加：

```typescript
  /** Aggregate one day of raw logs for a developer into the daily snapshot + endpoint daily table. */
  rollupDay(developerId: string, date: string): Promise<{ calls: number; errors: number }>
  /** Insert-or-update a precomputed daily snapshot (used by tests and backfills). */
  upsertDailySnapshot(snapshot: ApiLogDailySnapshot): Promise<void>
  /** Read daily snapshots in [startDay, endDay] inclusive. */
  getDailySnapshotsBetween(developerId: string, startDay: string, endDay: string): Promise<ApiLogDailySnapshot[]>
  /** Read endpoint-daily rows in [startDay, endDay] inclusive. */
  getEndpointDailyBetween(developerId: string, startDay: string, endDay: string): Promise<ApiLogEndpointDailyRow[]>
  /** Aggregate raw logs for one developer over a day range (today's slice). */
  aggregateRawRange(developerId: string, startIso: Date, endIso: Date): Promise<{ calls: number; errorCalls: number; totalBytes: number; avgResponseTime: number; byEndpoint: ApiLogEndpointDailyRow[]; byDay: ApiLogRawDayAggregate[] }>
  /** Roll daily snapshots of a month into the monthly table, then delete those daily rows. */
  rollupMonth(developerId: string, month: string): Promise<number>
  /** Read monthly snapshots in [startMonth, endMonth] inclusive. */
  getMonthlySnapshotsBetween(developerId: string, startMonth: string, endMonth: string): Promise<ApiLogMonthlySnapshot[]>
  /** Delete raw rows older than `day` (YYYY-MM-DD, exclusive). */
  deleteRawBefore(day: string): Promise<{ count: number }>
  /** Whether any daily snapshot exists for the developer+day. */
  hasDailySnapshot(developerId: string, date: string): Promise<boolean>
  /** List developer ids that have raw rows in the given day. */
  listDevelopersWithRawLogs(date: string): Promise<string[]>
  /** Retain only the last N days of daily snapshots / endpoint rows; returns deleted counts. */
  pruneDailyOlderThan(day: string): Promise<{ snapshots: number; endpoints: number }>
  /** Delete monthly snapshots older than the given month. */
  pruneMonthlyOlderThan(month: string): Promise<number>
```

**Step 1: 写失败的测试（mock Prisma delegate）**

测试文件 `tests/unit/api-log-rollup-repo.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const rawResults: any[][] = [];
const rawSql: string[] = [];

vi.mock('../../src/repositories/db-client', () => ({
  getClient: () => ({
    $queryRaw: async (strings: any, ..._values: any[]) => {
      rawSql.push(strings.join('?'));
      return rawResults.shift() ?? [];
    },
    $executeRaw: async (strings: any) => {
      rawSql.push(strings.join('?'));
      return 1;
    },
    apiLog: { findMany: async () => [] },
    apiLogSnapshot: {
      upsert: async () => ({}),
      findUnique: async () => null,
      deleteMany: async () => ({ count: 0 }),
    },
    apiLogEndpointDaily: {
      deleteMany: async () => ({ count: 0 }),
    },
    apiLogMonthlySnapshot: {
      deleteMany: async () => ({ count: 0 }),
    },
  }),
}));

const { ApiLogRepositoryImpl } = await import('../../src/repositories/implementations/api-log.repository');

describe('ApiLogRepositoryImpl rollups', () => {
  let repo: ApiLogRepositoryImpl;

  beforeEach(() => {
    rawResults.length = 0;
    rawSql.length = 0;
    repo = new ApiLogRepositoryImpl();
  });

  it('rollupDay aggregates bytes and writes the snapshot', async () => {
    // 1st query: snapshot aggregate; 2nd: endpoint rows; 3rd: p95 samples
    rawResults.push([{ calls: 10, errors: 2, total_bytes: 500, avg_rt: 120 }]);
    rawResults.push([{ endpoint: '/a', method: 'POST', calls: 10, errors: 2, total_bytes: 500, avg_rt: 120, max_rt: 300 }]);
    rawResults.push([{ rt: 100 }, { rt: 120 }, { rt: 300 }]);

    const result = await repo.rollupDay('dev-1', '2026-11-01');

    expect(result).toEqual({ calls: 10, errors: 2 });
    const sql = rawSql.join('\n');
    expect(sql).toContain('request_bytes');
    expect(sql).toContain('response_bytes');
  });

  it('rollupDay is a no-op when the day has no rows', async () => {
    rawResults.push([{ calls: 0, errors: 0, total_bytes: null, avg_rt: null }]);
    rawResults.push([]);
    rawResults.push([]);
    const result = await repo.rollupDay('dev-1', '2026-11-01');
    expect(result).toEqual({ calls: 0, errors: 0 });
  });

  it('getDailySnapshotsBetween returns zeroed bytes for legacy rows', async () => {
    rawResults.push([{ date: '2026-10-01', total_calls: 5, error_calls: 1, avg_response_time: 10, p95_response_time: 20, total_bytes: null, top_endpoints: null }]);
    const rows = await repo.getDailySnapshotsBetween('dev-1', '2026-10-01', '2026-10-02');
    expect(rows[0].totalBytes).toBe(0);
    expect(rows[0].date).toBe('2026-10-01');
  });

  it('rollupMonth weights the average by call count', async () => {
    // Daily rows: 10 calls @100ms, 30 calls @200ms => 175ms weighted
    rawResults.push([
      { date: '2026-10-01', total_calls: 10, error_calls: 1, total_bytes: 100, avg_response_time: 100 },
      { date: '2026-10-02', total_calls: 30, error_calls: 3, total_bytes: 300, avg_response_time: 200 },
    ]);
    rawResults.push([{ affected: 1 }]); // upsert result
    rawResults.push([{ affected: 2 }]); // delete result

    const written = await repo.rollupMonth('dev-1', '2026-10');
    expect(written).toBe(1);
    const upsertSql = rawSql.find((s) => s.includes('api_log_monthly_snapshots'));
    expect(upsertSql).toBeDefined();
  });
});
```

**Step 2: 运行，确认失败**

Run: `npx vitest run tests/unit/api-log-rollup-repo.test.ts`
Expected: FAIL — `repo.rollupDay is not a function`

**Step 3: 实现（追加到 `ApiLogRepositoryImpl`）**

```typescript
import { addDays, startOfDay, dayKey, monthKey } from '../../utils/api-log-dates';
import { calculatePercentiles } from '../../utils/percentile-calculator';
```

```typescript
  /**
   * Aggregate one day of raw logs into api_log_snapshots and api_log_endpoint_daily.
   * Byte sums use request_bytes + response_bytes; legacy NULLs count as 0.
   */
  async rollupDay(developerId: string, date: string): Promise<{ calls: number; errors: number }> {
    const start = startOfDay(date);
    const end = startOfDay(addDays(date, 1));

    const [summary] = await this.queryRaw<any[]>`
      SELECT COUNT(*) AS calls,
             SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) AS errors,
             SUM(COALESCE(request_bytes, 0) + COALESCE(response_bytes, 0)) AS total_bytes,
             ROUND(AVG(response_time), 0) AS avg_rt
      FROM api_logs
      WHERE developer_id = ${developerId}
        AND created_at >= ${start} AND created_at < ${end}
    `;

    const calls = Number(summary?.calls || 0);
    const errors = Number(summary?.errors || 0);
    if (calls === 0) {
      // Nothing to aggregate; leave any existing snapshot untouched.
      return { calls: 0, errors: 0 };
    }

    const endpointRows: any[] = await this.queryRaw`
      SELECT endpoint, method,
             COUNT(*) AS calls,
             SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) AS errors,
             SUM(COALESCE(request_bytes, 0) + COALESCE(response_bytes, 0)) AS total_bytes,
             ROUND(AVG(response_time), 0) AS avg_rt,
             MAX(response_time) AS max_rt
      FROM api_logs
      WHERE developer_id = ${developerId}
        AND created_at >= ${start} AND created_at < ${end}
      GROUP BY endpoint, method
      ORDER BY calls DESC
    `;

    const samples: any[] = await this.queryRaw`
      SELECT response_time AS rt
      FROM api_logs
      WHERE developer_id = ${developerId}
        AND created_at >= ${start} AND created_at < ${end}
        AND response_time IS NOT NULL
    `;
    const p95 = calculatePercentiles(samples.map((s) => Number(s.rt))).p95;

    const topEndpoints = endpointRows.slice(0, 5).map((r) => ({
      endpoint: r.endpoint,
      calls: Number(r.calls),
      errorRate: Number(r.calls) ? Math.round((Number(r.errors) / Number(r.calls)) * 1000) / 10 : 0,
    }));

    await this.client.apiLogSnapshot.upsert({
      where: { developerId_date: { developerId, date: new Date(`${date}T00:00:00.000Z`) } },
      create: {
        developerId,
        date: new Date(`${date}T00:00:00.000Z`),
        totalCalls: calls,
        errorCalls: errors,
        avgResponseTime: Number(summary?.avg_rt || 0),
        p95ResponseTime: p95,
        totalBytes: BigInt(Number(summary?.total_bytes || 0)),
        topEndpoints: topEndpoints as any,
      },
      update: {
        totalCalls: calls,
        errorCalls: errors,
        avgResponseTime: Number(summary?.avg_rt || 0),
        p95ResponseTime: p95,
        totalBytes: BigInt(Number(summary?.total_bytes || 0)),
        topEndpoints: topEndpoints as any,
      },
    });

    for (const r of endpointRows) {
      await this.client.apiLogEndpointDaily.upsert({
        where: {
          developerId_date_endpoint_method: {
            developerId,
            date: new Date(`${date}T00:00:00.000Z`),
            endpoint: r.endpoint,
            method: r.method,
          },
        },
        create: {
          developerId,
          date: new Date(`${date}T00:00:00.000Z`),
          endpoint: r.endpoint,
          method: r.method,
          calls: Number(r.calls),
          errorCalls: Number(r.errors),
          totalBytes: BigInt(Number(r.total_bytes || 0)),
          avgResponseTime: Number(r.avg_rt || 0),
          maxResponseTime: Number(r.max_rt || 0),
        },
        update: {
          calls: Number(r.calls),
          errorCalls: Number(r.errors),
          totalBytes: BigInt(Number(r.total_bytes || 0)),
          avgResponseTime: Number(r.avg_rt || 0),
          maxResponseTime: Number(r.max_rt || 0),
        },
      });
    }

    return { calls, errors };
  }
```

```typescript
  async getDailySnapshotsBetween(
    developerId: string,
    startDay: string,
    endDay: string,
  ): Promise<ApiLogDailySnapshot[]> {
    const rows: any[] = await this.client.apiLogSnapshot.findMany({
      where: {
        developerId,
        date: { gte: new Date(`${startDay}T00:00:00.000Z`), lte: new Date(`${endDay}T00:00:00.000Z`) },
      },
      orderBy: { date: 'asc' },
    });
    return rows.map((r: any) => ({
      date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10),
      developerId: r.developerId,
      totalCalls: r.totalCalls,
      errorCalls: r.errorCalls,
      avgResponseTime: r.avgResponseTime,
      p95ResponseTime: r.p95ResponseTime,
      totalBytes: Number(r.totalBytes || 0),
      topEndpoints: Array.isArray(r.topEndpoints) ? r.topEndpoints : [],
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }));
  }

  async getEndpointDailyBetween(
    developerId: string,
    startDay: string,
    endDay: string,
  ): Promise<ApiLogEndpointDailyRow[]> {
    const rows: any[] = await this.client.apiLogEndpointDaily.findMany({
      where: {
        developerId,
        date: { gte: new Date(`${startDay}T00:00:00.000Z`), lte: new Date(`${endDay}T00:00:00.000Z`) },
      },
      orderBy: { date: 'asc' },
    });
    return rows.map((r: any) => ({
      date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10),
      endpoint: r.endpoint,
      method: r.method,
      calls: r.calls,
      errorCalls: r.errorCalls,
      totalBytes: Number(r.totalBytes || 0),
      avgResponseTime: r.avgResponseTime,
      maxResponseTime: r.maxResponseTime,
    }));
  }
```

> 测试里 mock 了 `$queryRaw` / `$executeRaw`，`prisma generate` 之后 `this.client.apiLogSnapshot` 等 delegate 才存在；若在首次 generate 前跑测试，需先执行 Task 3 Step 4。

```typescript
  async rollupMonth(developerId: string, month: string): Promise<number> {
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const rows: any[] = await this.queryRaw`
      SELECT date, total_calls, error_calls, total_bytes, avg_response_time
      FROM api_log_snapshots
      WHERE developer_id = ${developerId}
        AND date >= ${start}
        AND date < DATE_ADD(${start}, INTERVAL 1 MONTH)
    `;
    if (rows.length === 0) return 0;

    const totalCalls = rows.reduce((s, r) => s + Number(r.total_calls), 0);
    const errorCalls = rows.reduce((s, r) => s + Number(r.error_calls), 0);
    const totalBytes = rows.reduce((s, r) => s + Number(r.total_bytes || 0), 0);
    const weighted = rows.reduce((s, r) => s + Number(r.avg_response_time) * Number(r.total_calls), 0);
    const avg = totalCalls ? Math.round(weighted / totalCalls) : 0;

    await this.queryRaw`
      INSERT INTO api_log_monthly_snapshots
        (developer_id, month, total_calls, error_calls, total_bytes, avg_response_time, created_at)
      VALUES (${developerId}, ${start}, ${totalCalls}, ${errorCalls}, ${totalBytes}, ${avg}, NOW())
      ON DUPLICATE KEY UPDATE
        total_calls = VALUES(total_calls),
        error_calls = VALUES(error_calls),
        total_bytes = VALUES(total_bytes),
        avg_response_time = VALUES(avg_response_time)
    `;

    await this.queryRaw`
      DELETE FROM api_log_snapshots
      WHERE developer_id = ${developerId}
        AND date >= ${start} AND date < DATE_ADD(${start}, INTERVAL 1 MONTH)
    `;
    await this.queryRaw`
      DELETE FROM api_log_endpoint_daily
      WHERE developer_id = ${developerId}
        AND date >= ${start} AND date < DATE_ADD(${start}, INTERVAL 1 MONTH)
    `;
    return 1;
  }

  async getMonthlySnapshotsBetween(
    developerId: string,
    startMonth: string,
    endMonth: string,
  ): Promise<ApiLogMonthlySnapshot[]> {
    const rows: any[] = await this.queryRaw`
      SELECT month, total_calls, error_calls, total_bytes, avg_response_time
      FROM api_log_monthly_snapshots
      WHERE developer_id = ${developerId}
        AND month >= ${new Date(`${startMonth}-01T00:00:00.000Z`)}
        AND month <= ${new Date(`${endMonth}-01T00:00:00.000Z`)}
      ORDER BY month ASC
    `;
    return rows.map((r: any) => ({
      month: String(r.month).slice(0, 7),
      totalCalls: Number(r.total_calls),
      errorCalls: Number(r.error_calls),
      totalBytes: Number(r.total_bytes || 0),
      avgResponseTime: Number(r.avg_response_time),
    }));
  }

  async aggregateRawRange(
    developerId: string,
    startIso: Date,
    endIso: Date,
  ): Promise<{
    calls: number; errorCalls: number; totalBytes: number; avgResponseTime: number;
    byEndpoint: ApiLogEndpointDailyRow[]; byDay: ApiLogRawDayAggregate[];
  }> {
    const [summary] = await this.queryRaw<any[]>`
      SELECT COUNT(*) AS calls,
             SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) AS errors,
             SUM(COALESCE(request_bytes, 0) + COALESCE(response_bytes, 0)) AS total_bytes,
             ROUND(AVG(response_time), 0) AS avg_rt
      FROM api_logs
      WHERE developer_id = ${developerId}
        AND created_at >= ${startIso} AND created_at < ${endIso}
    `;
    const byEndpointRows: any[] = await this.queryRaw`
      SELECT endpoint, method,
             COUNT(*) AS calls,
             SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) AS errors,
             SUM(COALESCE(request_bytes, 0) + COALESCE(response_bytes, 0)) AS total_bytes,
             ROUND(AVG(response_time), 0) AS avg_rt,
             MAX(response_time) AS max_rt
      FROM api_logs
      WHERE developer_id = ${developerId}
        AND created_at >= ${startIso} AND created_at < ${endIso}
      GROUP BY endpoint, method
      ORDER BY calls DESC
    `;
    const byDayRows: any[] = await this.queryRaw`
      SELECT DATE(created_at) AS d,
             COUNT(*) AS calls,
             SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) AS errors,
             SUM(COALESCE(request_bytes, 0) + COALESCE(response_bytes, 0)) AS total_bytes,
             ROUND(AVG(response_time), 0) AS avg_rt
      FROM api_logs
      WHERE developer_id = ${developerId}
        AND created_at >= ${startIso} AND created_at < ${endIso}
      GROUP BY DATE(created_at)
      ORDER BY d ASC
    `;
    return {
      calls: Number(summary?.calls || 0),
      errorCalls: Number(summary?.errors || 0),
      totalBytes: Number(summary?.total_bytes || 0),
      avgResponseTime: Number(summary?.avg_rt || 0),
      byEndpoint: byEndpointRows.map((r) => ({
        date: '', endpoint: r.endpoint, method: r.method,
        calls: Number(r.calls), errorCalls: Number(r.errors),
        totalBytes: Number(r.total_bytes || 0), avgResponseTime: Number(r.avg_rt || 0),
        maxResponseTime: Number(r.max_rt || 0),
      })),
      byDay: byDayRows.map((r) => ({
        date: String(r.d).slice(0, 10),
        calls: Number(r.calls), errorCalls: Number(r.errors),
        totalBytes: Number(r.total_bytes || 0), avgResponseTime: Number(r.avg_rt || 0),
      })),
    };
  }

  async deleteRawBefore(day: string): Promise<{ count: number }> {
    const cutoff = startOfDay(day);
    const result = await this.model.deleteMany({ where: { createdAt: { lt: cutoff } } });
    return { count: result.count };
  }

  async hasDailySnapshot(developerId: string, date: string): Promise<boolean> {
    const row = await this.client.apiLogSnapshot.findUnique({
      where: { developerId_date: { developerId, date: new Date(`${date}T00:00:00.000Z`) } },
      select: { id: true },
    });
    return !!row;
  }

  async listDevelopersWithRawLogs(date: string): Promise<string[]> {
    const start = startOfDay(date);
    const end = startOfDay(addDays(date, 1));
    const rows: any[] = await this.queryRaw`
      SELECT DISTINCT developer_id
      FROM api_logs
      WHERE created_at >= ${start} AND created_at < ${end}
        AND developer_id IS NOT NULL
    `;
    return rows.map((r) => r.developer_id);
  }

  async pruneDailyOlderThan(day: string): Promise<{ snapshots: number; endpoints: number }> {
    const cutoff = new Date(`${day}T00:00:00.000Z`);
    const snaps = await this.client.apiLogSnapshot.deleteMany({ where: { date: { lt: cutoff } } });
    const eps = await this.client.apiLogEndpointDaily.deleteMany({ where: { date: { lt: cutoff } } });
    return { snapshots: snaps.count, endpoints: eps.count };
  }

  async pruneMonthlyOlderThan(month: string): Promise<number> {
    const cutoff = new Date(`${month}-01T00:00:00.000Z`);
    const res = await this.client.apiLogMonthlySnapshot.deleteMany({ where: { month: { lt: cutoff } } });
    return res.count;
  }
```

同时删除旧的 `buildDailySnapshot` 与 `slimOlderThan`（新流水线不再使用），并从接口里移除。

**Step 4: 运行，确认通过（并跑全量单测）**

Run: `npx vitest run tests/unit/api-log-rollup-repo.test.ts`
Expected: PASS（4 passed）

Run: `npx vitest run tests/unit`
Expected: 全部通过

Run: `npm run build`
Expected: 通过（若 `repository.interfaces.ts` 移除旧方法导致其他实现报错，一并修复）

**Step 5: 提交**

```bash
git add openplatform-api-service/src/repositories openplatform-api-service/tests/unit/api-log-rollup-repo.test.ts
git commit -m "feat(api-log): add rollup write and segmented read repository methods"
```

---

### Task 6: 单实例守卫与分布式锁

**Files:**
- Create: `openplatform-api-service/src/utils/single-instance.ts`
- Test: `openplatform-api-service/tests/unit/single-instance.test.ts`

**Step 1: 写失败的测试**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { isRollupInstance, withAdvisoryLock } from '../../src/utils/single-instance';

describe('single-instance', () => {
  it('runs only on instance 0 or when unset', () => {
    expect(isRollupInstance({})).toBe(true);
    expect(isRollupInstance({ NODE_APP_INSTANCE: '0' })).toBe(true);
    expect(isRollupInstance({ NODE_APP_INSTANCE: '1' })).toBe(false);
    expect(isRollupInstance({ NODE_APP_INSTANCE: '7' })).toBe(false);
  });

  it('skips work when the advisory lock is held', async () => {
    const client = { $queryRaw: async () => [{ got: 0 }], $executeRaw: async () => 1 };
    const fn = vi.fn();
    const ran = await withAdvisoryLock(client as any, 'api_log_rollup', fn);
    expect(ran).toBe(false);
    expect(fn).not.toHaveBeenCalled();
  });

  it('runs work and releases the lock when acquired', async () => {
    const client = { $queryRaw: async () => [{ got: 1 }], $executeRaw: async () => 1 };
    const fn = vi.fn().mockResolvedValue(undefined);
    const ran = await withAdvisoryLock(client as any, 'api_log_rollup', fn);
    expect(ran).toBe(true);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('still releases the lock when the work throws', async () => {
    const execute = vi.fn().mockResolvedValue(1);
    const client = { $queryRaw: async () => [{ got: 1 }], $executeRaw: execute };
    const fn = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(withAdvisoryLock(client as any, 'x', fn)).rejects.toThrow('boom');
    expect(execute).toHaveBeenCalled(); // RELEASE_LOCK
  });
});
```

**Step 2: 运行，确认失败**

Run: `npx vitest run tests/unit/single-instance.test.ts`
Expected: FAIL — module not found

**Step 3: 实现**

```typescript
/**
 * Guards for background jobs that must run once per cluster, not once per worker.
 */

import { PrismaClient } from '@prisma/client';

export function isRollupInstance(env: NodeJS.ProcessEnv = process.env): boolean {
  const idx = env.NODE_APP_INSTANCE;
  return idx === undefined || idx === '0';
}

/**
 * Run `fn` while holding a MySQL advisory lock. Returns false when another
 * instance already holds it. The lock is always released, even on error.
 */
export async function withAdvisoryLock(
  client: Pick<PrismaClient, '$queryRaw' | '$executeRaw'>,
  lockName: string,
  fn: () => Promise<void>,
): Promise<boolean> {
  const rows = await client.$queryRaw<Array<{ got: number | bigint }>>`
    SELECT GET_LOCK(${lockName}, 0) AS got
  `;
  const got = Number(rows?.[0]?.got ?? 0);
  if (got !== 1) return false;
  try {
    await fn();
  } finally {
    await client.$executeRaw`SELECT RELEASE_LOCK(${lockName})`;
  }
  return true;
}
```

**Step 4: 运行，确认通过**

Run: `npx vitest run tests/unit/single-instance.test.ts`
Expected: PASS（4 passed）

**Step 5: 提交**

```bash
git add openplatform-api-service/src/utils/single-instance.ts openplatform-api-service/tests/unit/single-instance.test.ts
git commit -m "feat(api-log): add single-instance guard and advisory lock"
```

---

### Task 7: 聚合清理流水线

**Files:**
- Create: `openplatform-api-service/src/services/api-log-rollup.service.ts`
- Modify: `openplatform-api-service/src/services/api-log.service.ts:74-160`（移除 `cleanupOldLogs` / `startCleanupScheduler` 与相关常量）
- Modify: `openplatform-api-service/src/main.ts:50,219`
- Test: `openplatform-api-service/tests/unit/api-log-rollup.service.test.ts`

**Step 1: 写失败的测试**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const repo = {
  listDevelopersWithRawLogs: vi.fn(async () => ['dev-1']),
  listDevelopersWithDailySnapshots: vi.fn(async () => []),
  hasDailySnapshot: vi.fn(async () => true),
  rollupDay: vi.fn(async () => ({ calls: 1, errors: 0 })),
  deleteRawBefore: vi.fn(async () => ({ count: 1 })),
  pruneDailyOlderThan: vi.fn(async () => ({ snapshots: 1, endpoints: 1 })),
  rollupMonth: vi.fn(async () => 1),
  pruneMonthlyOlderThan: vi.fn(async () => 0),
};

vi.mock('../../src/repositories/repository.factory', () => ({
  getApiLogRepository: () => repo,
}));

vi.mock('../../src/repositories/db-client', () => ({
  getClient: () => ({}),
}));

const { createApiLogRollupService } = await import('../../src/services/api-log-rollup.service');

const NOW = new Date('2026-11-02T04:00:00Z'); // 2026-11-02 12:00 CST

describe('ApiLogRollupService', () => {
  beforeEach(() => {
    Object.values(repo).forEach((fn: any) => fn.mockClear());
  });

  it('rolls up D-1..D-3 then deletes raw rows older than D-2', async () => {
    const svc = createApiLogRollupService({ now: () => NOW });
    await svc.runOnce();
    const days = repo.rollupDay.mock.calls.map((c) => c[1]);
    expect(days).toEqual(['2026-11-01', '2026-10-31', '2026-10-30']);
    expect(repo.deleteRawBefore).toHaveBeenCalledWith('2026-10-30');
  });

  it('skips deleting a day whose snapshot is missing', async () => {
    repo.hasDailySnapshot.mockResolvedValue(false);
    const svc = createApiLogRollupService({ now: () => NOW });
    await svc.runOnce();
    expect(repo.deleteRawBefore).not.toHaveBeenCalled();
  });
});
```

> 实现时把"日期字符串"生成收敛到一处，测试里直接断言 3 个连续日期即可（上例已写成字面量）。

**Step 2: 运行，确认失败**

Run: `npx vitest run tests/unit/api-log-rollup.service.test.ts`
Expected: FAIL — module not found

**Step 3: 实现**

```typescript
/**
 * Daily rollup pipeline for API logs.
 *
 *   raw (3 days) → daily snapshot + endpoint daily (6 months) → monthly snapshot (5 years)
 *
 * Runs once per cluster (see utils/single-instance). Every write is an idempotent
 * upsert, so a missed or repeated run converges to the same result.
 */

import { getApiLogRepository } from '../repositories/repository.factory';
import { getClient } from '../repositories/db-client';
import { addDays, addMonths, dayKey, monthKey, startOfDay, LOG_TIMEZONE } from '../utils/api-log-dates';
import { isRollupInstance, withAdvisoryLock } from '../utils/single-instance';
import { RAW_RETENTION_DAYS, DAILY_RETENTION_MONTHS, MONTHLY_RETENTION_YEARS } from '../config/api-log-retention';

export interface ApiLogRollupOptions {
  now?: () => Date;
  timeZone?: string;
}

export function createApiLogRollupService(opts: ApiLogRollupOptions = {}) {
  const now = opts.now ?? (() => new Date());
  const tz = opts.timeZone ?? LOG_TIMEZONE;

  async function runOnce(): Promise<void> {
    const repo = getApiLogRepository();
    const today = dayKey(now(), tz);

    // 1) Recompute D-1..D-3. The recompute window is one day wider than the
    //    retention window so a missed run self-heals the next day.
    for (let i = 1; i <= RAW_RETENTION_DAYS; i++) {
      const day = addDays(today, -i);
      const devs = await repo.listDevelopersWithRawLogs(day);
      for (const dev of devs) {
        await repo.rollupDay(dev, day);
      }
    }

    // 2) Delete raw rows strictly before D-2, but only when every developer
    //    still holding raw rows in that span has a daily snapshot.    const cutoff = addDays(today, -(RAW_RETENTION_DAYS - 1));
    let safeToDelete = true;
    // Check the last 10 days we still hold raw rows for (retention + slack).
    for (let i = RAW_RETENTION_DAYS; i <= RAW_RETENTION_DAYS + 7; i++) {
      const day = addDays(today, -i);
      const devs = await repo.listDevelopersWithRawLogs(day);
      for (const dev of devs) {
        if (!(await repo.hasDailySnapshot(dev, day))) {
          safeToDelete = false;
          console.warn(`[ApiLog] Rollup missing for ${dev}/${day}; skipping raw deletion`);
        }
      }
    }
    if (safeToDelete) {
      const deleted = await repo.deleteRawBefore(cutoff);
      if (deleted.count > 0) {
        console.log(`[ApiLog] Deleted ${deleted.count} raw rows older than ${cutoff}`);
      }
    }

    // 3) Roll months that aged out of the daily window into monthly snapshots.
    //    Walk backwards until a month has no daily data left; the cap covers
    //    the full monthly retention window in case the job has been down long.
    const currentMonth = monthKey(now(), tz);
    const dailyWindowStartMonth = addMonths(currentMonth, -DAILY_RETENTION_MONTHS + 1);
    for (let back = 1; back <= MONTHLY_RETENTION_YEARS * 12; back++) {
      const m = addMonths(dailyWindowStartMonth, -back);
      const devs = await repo.listDevelopersWithDailySnapshots(m);
      if (devs.length === 0) break;
      for (const dev of devs) {
        await repo.rollupMonth(dev, m);
      }
    }

    // 4) Prune expired tiers.
    const pruned = await repo.pruneDailyOlderThan(`${dailyWindowStartMonth}-01`);
    if (pruned.snapshots || pruned.endpoints) {
      console.log(
        `[ApiLog] Pruned ${pruned.snapshots} daily snapshots / ${pruned.endpoints} endpoint rows before ${dailyWindowStartMonth}-01`,
      );
    }
    const monthlyCutoff = addMonths(currentMonth, -MONTHLY_RETENTION_YEARS * 12);
    const months = await repo.pruneMonthlyOlderThan(monthlyCutoff);
    if (months) {
      console.log(`[ApiLog] Pruned ${months} monthly snapshots before ${monthlyCutoff}`);
    }
  }
  return { runOnce };
}

/** Start the daily 00:05 (local time) scheduler. */
export function startRollupScheduler(): () => void {
  if (!isRollupInstance()) {
    console.log('[ApiLog] Rollup scheduler skipped on non-primary instance');
    return () => {};
  }
  let stopped = false;
  const scheduleNext = () => {
    const next = new Date();
    next.setHours(24, 5, 0, 0);
    setTimeout(async () => {
      if (stopped) return;
      try {
        await withAdvisoryLock(getClient(), 'api_log_rollup', () => createApiLogRollupService().runOnce());
      } catch (err) {
        console.error('[ApiLog] Rollup failed:', (err as Error).message);
      }
      scheduleNext();
    }, next.getTime() - Date.now());
  };
  scheduleNext();
  return () => { stopped = true; };
}
```

> **实现提醒**：`runOnce` 第 3 步调用的 `listDevelopersWithDailySnapshots(month)` 是 Task 5 需要一起加的仓库方法（`ApiLogRepository` 接口与实现）：
>
> ```typescript
>   /** List developer ids that still have daily snapshots in the given month (YYYY-MM). */
>   listDevelopersWithDailySnapshots(month: string): Promise<string[]>
> ```
>
> ```typescript
>   async listDevelopersWithDailySnapshots(month: string): Promise<string[]> {
>     const start = new Date(`${month}-01T00:00:00.000Z`);
>     const rows: any[] = await this.queryRaw`
>       SELECT DISTINCT developer_id FROM api_log_snapshots
>       WHERE date >= ${start} AND date < DATE_ADD(${start}, INTERVAL 1 MONTH)
>     `;
>     return rows.map((r) => r.developer_id);
>   }
> ```
>
> Task 7 的测试里给 `repo` 补一个 `listDevelopersWithDailySnapshots: vi.fn(async () => [])`，并在导入 `api-log-rollup.service` 前加入 `vi.mock('../../src/repositories/db-client', () => ({ getClient: () => ({}) }))`（`runOnce` 不直接用 client，这个 mock 只为避免单测时初始化 Prisma）。

**Step 4: 删除旧的清理代码**

- `api-log.service.ts`：删除 `cleanupOldLogs`、`startCleanupScheduler`、`DEFAULT_SLIM_DAYS`、`DEFAULT_DELETE_DAYS`、`getRetentionDays` 及其导出（`main.ts` 里的 `API log retention` 打印改成固定文案）。
- `main.ts`：把 `startCleanupScheduler()` 换成 `startRollupScheduler()`，import 改为来自 `./services/api-log-rollup.service`。
- `quota.service.ts` 的 `startDailyResetScheduler()` 跳过非主实例：函数开头加 `if (!isRollupInstance()) return;`。

**Step 5: 运行测试与构建**

Run: `npx vitest run tests/unit/api-log-rollup.service.test.ts`
Expected: PASS（2 passed）

Run: `npx vitest run tests/unit && npm run build`
Expected: 全部通过

**Step 6: 提交**

```bash
git add openplatform-api-service/src/services/api-log-rollup.service.ts openplatform-api-service/src/services/api-log.service.ts openplatform-api-service/src/services/quota.service.ts openplatform-api-service/src/main.ts openplatform-api-service/tests/unit/api-log-rollup.service.test.ts
git commit -m "feat(api-log): replace cleanup with tiered rollup pipeline"
```

---

### Task 8: 统计读取 —— 按时间段选源并合并

**Files:**
- Create: `openplatform-api-service/src/services/api-log-stats.service.ts`
- Test: `openplatform-api-service/tests/unit/api-log-stats.service.test.ts`

把"今天读原始表 / 6 个月内读日快照 / 更早读月快照"的合并逻辑独立出来，`billing.service.ts` 调用它。

**Step 1: 写失败的测试**

```typescript
import { describe, it, expect, vi } from 'vitest';

// The service builds its repository from the factory; stub it so importing the
// module does not spin up Prisma.
vi.mock('../../src/repositories/repository.factory', () => ({
  getApiLogRepository: () => ({}),
}));

const { mergeTimeSeries, buildBreakdown } = await import('../../src/services/api-log-stats.service');

describe('api-log-stats merge', () => {
  it('merges daily and monthly series without gaps', () => {
    const daily = [
      { date: '2026-11-01', calls: 10, errorCalls: 1, totalBytes: 100, avgResponseTime: 50 },
    ];
    const monthly = [
      { month: '2026-10', totalCalls: 300, errorCalls: 30, totalBytes: 3000, avgResponseTime: 60 },
    ];
    const merged = mergeTimeSeries(daily, monthly);
    expect(merged).toEqual([
      { date: '2026-10', calls: 300, errorCalls: 30, totalBytes: 3000, avgResponseTime: 60 },
      { date: '2026-11-01', calls: 10, errorCalls: 1, totalBytes: 100, avgResponseTime: 50 },
    ]);
  });

  it('computes success rate and percentage from endpoint rows', () => {
    const rows = [
      { endpoint: '/a', method: 'POST', calls: 30, errorCalls: 3, totalBytes: 300, avgResponseTime: 10, maxResponseTime: 50 },
      { endpoint: '/b', method: 'GET', calls: 10, errorCalls: 0, totalBytes: 100, avgResponseTime: 20, maxResponseTime: 40 },
    ];
    const out = buildBreakdown(rows);
    expect(out[0]).toMatchObject({ endpoint: '/a', calls: 30, successRate: 90, percentage: 75, totalBytes: 300 });
    expect(out[1].percentage).toBe(25);
  });

  it('handles an empty set without dividing by zero', () => {
    expect(buildBreakdown([])).toEqual([]);
  });
});
```

**Step 2: 运行，确认失败**

Run: `npx vitest run tests/unit/api-log-stats.service.test.ts`
Expected: FAIL — module not found

**Step 3: 实现**

先新建 `openplatform-api-service/src/config/api-log-retention.ts`（Task 7 与 Task 8 共用）：

```typescript
/** Tiered retention for API logs. */
export const RAW_RETENTION_DAYS = 3;
export const DAILY_RETENTION_MONTHS = 6;
export const MONTHLY_RETENTION_YEARS = 5;
```

然后 `src/services/api-log-stats.service.ts`：

```typescript
/**
 * Segmented stats reads for API logs.
 *
 * Today / recent days without a snapshot → raw api_logs
 * last 6 months                          → api_log_snapshots + api_log_endpoint_daily
 * older                                  → api_log_monthly_snapshots
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

export function mergeTimeSeries(daily: SeriesPoint[], monthly: SeriesPoint[]): SeriesPoint[] {
  const map = new Map<string, SeriesPoint>();
  for (const m of monthly) map.set(m.date, m);
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
```

> **注意**：`series` 里既有日粒度也有月粒度（月粒度表示整月），`weightedAvg` 按调用数加权，与 `rollupMonth` 的口径一致。月粒度的 `date` 是 `YYYY-MM`，前端按字符串展示即可。

**Step 4: 运行，确认通过**

Run: `npx vitest run tests/unit/api-log-stats.service.test.ts`
Expected: PASS（3 passed）

**Step 5: 提交**

```bash
git add openplatform-api-service/src/services/api-log-stats.service.ts openplatform-api-service/tests/unit/api-log-stats.service.test.ts
git commit -m "feat(api-log): add segmented stats reader with series merge"
```

---

### Task 9: `/billing/usage` 接入分段读取

**Files:**
- Modify: `openplatform-api-service/src/services/billing.service.ts:82-152`
- Modify: `openplatform-api-service/src/controllers/isv/billing.controller.ts:209-245`
- Modify: `openplatform-api-service/src/types/billing.types.ts:98-140`
- Test: `openplatform-api-service/tests/unit/billing-usage.test.ts`

**Step 1: 写失败的测试**

```typescript
import { describe, it, expect, vi } from 'vitest';

const loadUsageWindow = vi.fn();
vi.mock('../../src/services/api-log-stats.service', () => ({ loadUsageWindow }));

const { createBillingService } = await import('../../src/services/billing.service');

describe('getUsageStatistics', () => {
  it('maps the usage window into the existing contract plus bytes', async () => {
    loadUsageWindow.mockResolvedValue({
      totalCalls: 120,
      errorCalls: 6,
      totalBytes: 2400,
      avgResponseTime: 88,
      series: [{ date: '2026-11-01', calls: 120, errorCalls: 6, totalBytes: 2400, avgResponseTime: 88 }],
      endpoints: [{ endpoint: '/a', method: 'POST', calls: 120, successCount: 114, successRate: 95, percentage: 100, totalBytes: 2400, avgResponseTime: 88, maxResponseTime: 300 }],
      bytesTrackedSince: '2026-11-01',
      partial: false,
    });
    const svc = createBillingService();
    const stats = await svc.getUsageStatistics('dev-1', '30days');
    expect(stats.totalCalls).toBe(120);
    expect(stats.successRate).toBe(95);
    expect(stats.totalBytes).toBe(2400);
    expect(stats.bytesTrackedSince).toBe('2026-11-01');
    expect(stats.dailyBreakdown?.[0].calls).toBe(120);
  });
});
```

**Step 2: 运行，确认失败**

Run: `npx vitest run tests/unit/billing-usage.test.ts`
Expected: FAIL — `stats.totalBytes` 为 undefined

**Step 3: 实现**

`billing.service.ts` 的 `getUsageStatistics` 改为：

```typescript
    const endDay = todayKey();
    const startDay = addDays(endDay, -(days - 1));
    const window = await loadUsageWindow(enterpriseId, startDay);
    const activeSub = await subRepo.findActiveWithPackage(enterpriseId);

    const successRate = window.totalCalls > 0
      ? ((window.totalCalls - window.errorCalls) / window.totalCalls) * 100
      : 100;

    return {
      period: { start: startDay, end: endDay },
      totalApiCalls: window.totalCalls,
      totalBandwidth: window.totalBytes,
      totalStorage: 0,
      apiCallCost: 0,
      bandwidthCost: 0,
      storageCost: 0,
      totalCost: 0,
      currency: 'USD',
      totalCalls: window.totalCalls,
      totalBytes: window.totalBytes,
      bytesTrackedSince: window.bytesTrackedSince,
      successRate,
      avgResponseTimeMs: window.avgResponseTime,
      todayCalls: Number(activeSub?.dailyApiUsage) || 0,
      dailyLimit: activeSub?.package?.dailyApiLimit ?? 0,
      recentErrors: await getRecentErrors(enterpriseId, 10),
      dailyBreakdown: window.series.map((d) => ({
        date: d.date,
        calls: d.calls,
        successCount: d.calls - d.errorCalls,
        avgResponseTime: d.avgResponseTime,
        bytes: d.totalBytes,
      })),
      endpointBreakdown: window.endpoints,
    };
```

`billing.types.ts` 的 `UsageStatistics` 加：

```typescript
  totalBytes?: number;
  bytesTrackedSince?: string | null;
```

`dailyBreakdown` 条目加 `bytes?: number`；`endpointBreakdown` 条目加 `totalBytes?: number`。

`billing.controller.ts` 的 `data` 里加：

```typescript
            total_bytes: stats.totalBytes || 0,
            bytes_tracked_since: stats.bytesTrackedSince ?? null,
            partial: (stats as any).partial ?? false,
```

`daily_breakdown` 的映射补 `bytes`，`endpoint_breakdown` 原样返回（已含 `totalBytes`）。

**Step 4: 运行测试和构建**

Run: `npx vitest run tests/unit/billing-usage.test.ts tests/unit/billing.service.test.ts`
Expected: PASS

Run: `npm run build`
Expected: 通过

**Step 5: 提交**

```bash
git add openplatform-api-service/src/services/billing.service.ts openplatform-api-service/src/controllers/isv/billing.controller.ts openplatform-api-service/src/types/billing.types.ts openplatform-api-service/tests/unit/billing-usage.test.ts
git commit -m "feat(billing): serve usage stats from segmented rollups with traffic bytes"
```

---

### Task 10: 前端 —— API 日志页升级为"统计 + 明细"

**Files:**
- Modify: `openplatform-web/developer-portal-v2/src/api/billing.ts:4-10`
- Modify: `openplatform-web/developer-portal-v2/src/views/developer/usage-statistics/index.vue`
- Create: `openplatform-web/developer-portal-v2/src/views/developer/usage-statistics/modules/api-log-stats-panel.vue`
- Modify: `openplatform-web/developer-portal-v2/src/locales/langs/zh.json:567-580`
- Modify: `openplatform-web/developer-portal-v2/src/locales/langs/en.json`（同名 key，行号同上）

**Step 1: 新增 i18n**

`zh.json` 的 `developer.usageStatistics` 内追加：

```json
      "statsTitle": "调用统计",
      "traffic": "流量",
      "successRate": "成功率",
      "totalCalls": "调用次数",
      "range7d": "近7天",
      "range30d": "近30天",
      "range90d": "近90天",
      "range180d": "近6个月",
      "detailHint": "明细仅保留 3 天，统计数据保留 6 个月",
      "trafficSince": "流量自 {date} 起统计",
      "noTrafficData": "暂未采集流量数据"
```

`en.json` 对应：

```json
      "statsTitle": "Call Statistics",
      "traffic": "Traffic",
      "successRate": "Success Rate",
      "totalCalls": "Total Calls",
      "range7d": "Last 7 days",
      "range30d": "Last 30 days",
      "range90d": "Last 90 days",
      "range180d": "Last 6 months",
      "detailHint": "Details are kept for 3 days; statistics for 6 months.",
      "trafficSince": "Traffic tracked since {date}",
      "noTrafficData": "No traffic data yet"
```

**Step 2: 新增统计面板组件**

`api-log-stats-panel.vue`：接收 `stats`（`/billing/usage` 的 `data`）与 `loading`，渲染色块 + 趋势图 + 接口分布。

```vue
<!--
  API 调用统计面板：调用次数 / 流量 / 成功率 / 平均耗时 + 趋势 + 接口分布
-->
<template>
  <div class="api-log-stats">
    <ElRow :gutter="16" class="mb-4">
      <ElCol v-for="card in cards" :key="card.key" :xs="24" :sm="12" :lg="6">
        <ArtStatsCard
          :icon="card.icon"
          :icon-style="card.iconStyle"
          :title="card.title"
          :subtitle="card.subtitle"
          :description="card.description"
          :decimals="card.decimals ?? 0"
          separator=","
        />
      </ElCol>
    </ElRow>

    <div class="art-card p-5 mb-4">
      <div class="art-card-header mb-2 flex items-center justify-between">
        <div class="title">
          <h4>{{ $t('developer.usageStatistics.usageTrend') }}</h4>
          <p class="text-xs text-gray-400">{{ $t('developer.usageStatistics.detailHint') }}</p>
        </div>
        <ElRadioGroup v-model="range" size="small" @change="emit('range-change', range)">
          <ElRadioButton value="7days">{{ $t('developer.usageStatistics.range7d') }}</ElRadioButton>
          <ElRadioButton value="30days">{{ $t('developer.usageStatistics.range30d') }}</ElRadioButton>
          <ElRadioButton value="90days">{{ $t('developer.usageStatistics.range90d') }}</ElRadioButton>
          <ElRadioButton value="180days">{{ $t('developer.usageStatistics.range180d') }}</ElRadioButton>
        </ElRadioGroup>
      </div>
      <ArtLineChart
        v-if="seriesDates.length"
        height="280px"
        :data="seriesData"
        :x-axis-data="seriesDates"
        :show-legend="true"
        :show-area-color="true"
      />
      <ElEmpty v-else :image-size="60" />
      <p v-if="trafficSinceText" class="text-xs text-gray-400 mt-2">{{ trafficSinceText }}</p>
    </div>

    <div class="art-card p-5">
      <div class="art-card-header mb-2">
        <h4>{{ $t('developer.usageStatistics.endpointBreakdown') }}</h4>
      </div>
      <ElTable :data="endpoints" size="small" stripe>
        <ElTableColumn prop="endpoint" :label="$t('developer.billing.endpointBreakdown.path')" min-width="220" />
        <ElTableColumn prop="method" :label="$t('developer.billing.endpointBreakdown.method')" width="80" />
        <ElTableColumn prop="calls" :label="$t('developer.usageStatistics.totalCalls')" width="110" />
        <ElTableColumn prop="totalBytes" :label="$t('developer.usageStatistics.traffic')" width="120">
          <template #default="{ row }">{{ formatBytes(row.totalBytes) }}</template>
        </ElTableColumn>
        <ElTableColumn prop="successRate" :label="$t('developer.usageStatistics.successRate')" width="100">
          <template #default="{ row }">{{ row.successRate }}%</template>
        </ElTableColumn>
        <ElTableColumn prop="avgResponseTime" :label="$t('developer.usageStatistics.avgResponse')" width="110">
          <template #default="{ row }">{{ row.avgResponseTime }}ms</template>
        </ElTableColumn>
      </ElTable>
    </div>
  </div>
</template>
```

```vue
<script setup lang="ts">
  import { formatBytes } from '@/utils/format'

  defineOptions({ name: 'ApiLogStatsPanel' })

  const props = defineProps<{ stats: Record<string, any> | null; loading?: boolean }>()
  const emit = defineEmits<{ (e: 'range-change', value: string): void }>()
  const range = ref('30days')
  const { t } = useI18n()

  const breakdown = computed(() => props.stats?.endpoint_breakdown ?? [])
  const endpoints = computed(() => breakdown.value)

  const seriesDates = computed(() => (props.stats?.daily_breakdown ?? []).map((d: any) => d.date))
  const seriesData = computed(() => [
    { name: t('developer.usageStatistics.totalCalls'), data: (props.stats?.daily_breakdown ?? []).map((d: any) => d.calls ?? 0) },
    { name: t('developer.usageStatistics.traffic'), data: (props.stats?.daily_breakdown ?? []).map((d: any) => d.bytes ?? 0) }
  ])

  const trafficSinceText = computed(() => {
    const since = props.stats?.bytes_tracked_since
    return since ? t('developer.usageStatistics.trafficSince', { date: since }) : ''
  })

  const cards = computed(() => {
    const s = props.stats ?? {}
    const hasBytes = (s.total_bytes ?? 0) > 0
    return [
      { key: 'calls', icon: 'ri:bar-chart-line', iconStyle: 'bg-blue-500', title: t('developer.usageStatistics.totalCalls'), subtitle: s.total_calls ?? 0, description: t('developer.usageStatistics.statsTitle') },
      { key: 'traffic', icon: 'ri:exchange-dollar-line', iconStyle: 'bg-cyan-500', title: t('developer.usageStatistics.traffic'), subtitle: hasBytes ? formatBytes(s.total_bytes) : '—', description: hasBytes ? t('developer.usageStatistics.statsTitle') : t('developer.usageStatistics.noTrafficData') },
      { key: 'success', icon: 'ri:check-double-line', iconStyle: 'bg-green-500', title: t('developer.usageStatistics.successRate'), subtitle: s.success_rate ?? 0, description: '%', decimals: 1 },
      { key: 'latency', icon: 'ri:timer-line', iconStyle: 'bg-purple-500', title: t('developer.usageStatistics.avgResponse'), subtitle: s.avg_response_time_ms ?? 0, description: 'ms' }
    ]
  })

  watch(
    () => props.stats?.period,
    () => {}, // stats 变化时卡片/图表自动重算
  )
</script>
```

新建 `openplatform-web/developer-portal-v2/src/utils/format.ts`（如已存在同名工具则合并进去）：

```typescript
/** Human-readable byte size (KB/MB/GB, 1024-based). */
export function formatBytes(bytes?: number | null): string {
  const n = Number(bytes ?? 0)
  if (!Number.isFinite(n) || n <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let v = n
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`
}
```

**Step 3: 改造 `index.vue`**

在 `<ArtTableHeader>` 之前插入统计面板，并让范围切换重新拉取：

```vue
      <ApiLogStatsPanel
        :stats="stats"
        :loading="statsLoading"
        class="mb-4"
        @range-change="handleRangeChange"
      />
```

```typescript
  import ApiLogStatsPanel from './modules/api-log-stats-panel.vue'
  import { fetchUsageStats } from '@/api/billing'

  const stats = ref<Record<string, any> | null>(null)
  const statsLoading = ref(false)

  const loadStats = async (period = '30days') => {
    statsLoading.value = true
    try {
      stats.value = await fetchUsageStats(period)
    } finally {
      statsLoading.value = false
    }
  }

  const handleRangeChange = (value: string) => loadStats(value)

  onMounted(() => loadStats())
```

`fetchUsageStats` 已存在，无需改动签名；确认 `request` 拦截器返回的是 `data`（与工作台用法一致）。

**Step 4: 构建验证**

Run: `npm run build`
Expected: `vue-tsc --noEmit` 与 `vite build` 均通过

**Step 5: 手工验证**

1. 本地起网关与前端，用开发者账号登录，进入"API日志"页。
2. 切 7 天 / 30 天 / 90 天 / 6 个月，确认趋势图和卡片随之变化。
3. 确认页面出现"明细仅保留 3 天"提示，列表仍然可用。

**Step 6: 提交**

```bash
git add openplatform-web/developer-portal-v2/src
git commit -m "feat(portal): upgrade API log page to stats plus details view"
```

---

### Task 11: 部署与线上验证

**Files:** 无代码改动

**Step 1: 部署前检查迁移状态**

在 testing 主机上：

```bash
ssh root@8.217.54.115 "cd /web/custody-openplatform/api-service && npx prisma migrate status"
```

Expected: 列出两个新迁移为 `not yet applied`（若已由部署脚本应用则显示 `up to date`）。

**Step 2: 部署 testing**

```bash
SKIP_BUILD=0 ./deploy-testing.sh api-service
SKIP_BUILD=0 ./deploy-testing.sh developer-portal
```

**Step 3: 首次运行时手动跑一次流水线（验证，不等 00:05）**

在 testing 主机上用 Node 执行（临时脚本，跑完删除）：

```bash
ssh root@8.217.54.115 "cd /web/custody-openplatform/api-service && node -e \"require('dotenv').config(); require('./dist/services/api-log-rollup.service').createApiLogRollupService().runOnce().then(()=>process.exit(0))\"" 
```

Expected: 日志中出现 `[ApiLog] Deleted N raw rows older than YYYY-MM-DD`，且 `api_log_snapshots` / `api_log_endpoint_daily` 出现新行。

**Step 4: 校验数据**

```sql
SELECT COUNT(*) FROM api_logs;                       -- 应只剩约 3 天
SELECT COUNT(*), SUM(total_bytes) FROM api_log_snapshots;
SELECT COUNT(*) FROM api_log_endpoint_daily;
SELECT MAX(created_at) FROM api_logs;
```

**Step 5: 校验接口**

用短时 ISV token 调用 `/api/v1/billing/usage?period=30days`，确认返回 `total_bytes`、`bytes_tracked_since`、`daily_breakdown[].bytes`、`endpoint_breakdown[].totalBytes`。

**Step 6: 部署 beta**

```bash
SKIP_BUILD=0 ./deploy-beta.sh api-service
SKIP_BUILD=0 ./deploy-beta.sh developer-portal
```

> 上线注意：首次运行会**删除 beta 上 3 天前的历史明细**（约 7 万行）。执行前确认管理后台没有人正在依赖这些历史记录。

---

## 完成标准

- [ ] 原始日志保留 3 天，聚合后的日统计保留 6 个月、月统计保留 5 年
- [ ] 流量（请求+响应字节）从写入到展示全链路打通
- [ ] 统计数据不因原始日志删除而丢失
- [ ] testing 的 cluster 模式只有一个 worker 执行清理
- [ ] API 日志页可切换 7/30/90/180 天并展示卡片、趋势、接口分布
- [ ] 所有新增单测与 `npm run build` 通过
