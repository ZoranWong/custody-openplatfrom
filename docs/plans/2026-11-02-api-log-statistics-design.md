# 三方 API 日志统计模块优化 — 设计

- 日期：2026-11-02
- 状态：已确认，待实现
- 范围：`openplatform-api-service`（存储、聚合、统计接口）+ `openplatform-web/developer-portal-v2`（API 日志页）

## 背景

开发者门户的 API 日志模块目前只有一张明细列表，统计数据放在"工作台"首页，且全量实时扫描原始表：

- `api_logs` 在 beta 上已有 8 万多行，从 8 月保留至今。清理任务使用硬编码的 7 天瘦身 / 180 天删除，而启动日志打印的 `API_LOG_RETENTION_DAYS`（默认 30）并未生效。
- `api_log_snapshots` 表已存在（按 developer × 日聚合），但**没有任何代码读取它**，统计仍实时扫原始表。
- 流量统计是占位：`totalBandwidth` 恒为 0，日志表没有记录任何字节数。
- testing 环境 pm2 为 `cluster_mode`，而清理调度器没有实例守卫，每个 worker 都会执行一遍。

## 目标

1. 原始日志只保留短期明细（3 天），之后按天聚合，删除原始行。
2. 日统计保留 6 个月，之后滚动为月统计，保留 5 年。
3. 统计模块能正确展示调用次数、流量、成功率、耗时，且不受原始日志清理影响。
4. 开发者门户"API 日志"页升级为"统计 + 明细"。

## 非目标

- 不改管理后台的日志明细视图（仍只读原始表，范围为 3 天）。
- 不引入小时级 / 分钟级预聚合。
- 不回填历史日志的字节数（写入时未记录）。

## 数据模型

新增迁移 `2026xxxx_add_api_log_bytes_and_rollups`。

### api_logs（现有表，加字段）

| 字段 | 类型 | 说明 |
|---|---|---|
| `request_bytes` | `Int?` | 请求体 JSON 序列化字节数 |
| `response_bytes` | `Int?` | 响应体 JSON 序列化字节数 |

索引：现有 `(appId, createdAt)`、`(traceId)` 保留；新增 `(developerId, createdAt)`（聚合按 developer 扫日区间）与 `(createdAt)`（按天删除）。

保留：**3 天原始明细**。

### api_log_snapshots（现有表，加字段）

在现有 `totalCalls / errorCalls / avgResponseTime / p95ResponseTime / topEndpoints` 基础上：

| 字段 | 类型 | 说明 |
|---|---|---|
| `totalBytes` | `BigInt @default(0)` | 当日请求 + 响应字节合计 |

保留：**6 个月**。`topEndpoints` 继续保存 Top 5，供列表/卡片快速展示，不作为精确统计来源。

### api_log_endpoint_daily（新建）

| 字段 | 类型 |
|---|---|
| `id` | `BigInt` 自增主键 |
| `developerId` | `String` |
| `date` | `DateTime @db.Date` |
| `endpoint` | `String` |
| `method` | `String` |
| `calls` / `errorCalls` | `Int` |
| `totalBytes` | `BigInt` |
| `avgResponseTime` / `maxResponseTime` | `Int` |

唯一键 `(developerId, date, endpoint, method)`；索引 `(developerId, date)`。
保留：**6 个月**（与日快照同步清理）。

### api_log_monthly_snapshots（新建）

| 字段 | 类型 |
|---|---|
| `id` | `BigInt` 自增主键 |
| `developerId` | `String` |
| `month` | `DateTime @db.Date`（当月 1 日） |
| `totalCalls` / `errorCalls` | `Int` |
| `totalBytes` | `BigInt` |
| `avgResponseTime` | `Int`（按调用数加权） |

唯一键 `(developerId, month)`。
保留：**5 年**。

月维度不提供 P95——日 P95 无法精确合并，宁可缺失也不给错误数字。

## 口径

- **切天 / 切月按 DB 时区（CST, UTC+8）**，与现有 `DATE(created_at)` 一致，避免两个接口对同一条日志算出不同日期。
- `total_bytes = request_bytes + response_bytes`；按 `JSON.stringify` 的 UTF-8 字节数计，不含 HTTP 头。
- 历史行字节数为 `NULL`，统计按 0 处理；页面标注流量自上线日起统计。
- `developer_id IS NULL` 的日志（beta 上约 0.6%）照常写原始表，但不进入任何开发者维度聚合。

## 聚合与清理流水线

每日 00:05（本地时间）执行一次，单实例执行（见下）。

```
D-3 ──┐
D-2 ──┼─→ 重算日聚合（UPSERT，幂等）
D-1 ──┘         │
                ├─→ api_log_snapshots        （developer × 日）
                └─→ api_log_endpoint_daily   （developer × 日 × endpoint × method）
                        │
                        ▼
              删除 created_at < 今天 − 3 天的原始行（仅删除已聚合成功的日）
                        │
                        ▼
     满 6 个月的日快照 ─→ 汇总进 monthly ─→ 删除对应日快照 / 端点日数据
                        │
                        ▼
          月快照超 5 年、端点日数据超 6 个月 ─→ 清理
```

关键约束：

1. **重算窗口 > 保留窗口**：每次重算 D-1 ~ D-3，原始行保留到"今天 + 前 2 天"。任务漏跑一天，次日仍能补算。
2. **先聚合后删除**：删除某日原始行前，确认该日的聚合已写入；缺失则跳过该日并告警。
3. **幂等**：全部写入走 `INSERT ... ON DUPLICATE KEY UPDATE`，重复执行结果一致。
4. **失败不删数据**：聚合抛错时本次不执行删除，留待次日重试。

替换现有 `cleanupOldLogs()`：移除其"每次重算 180 天"与硬编码天数；`API_LOG_RETENTION_DAYS` 不再用于打印与实际保留不一致。`startCleanupScheduler()` 改为上面的流水线入口。

## 单实例执行

- `process.env.NODE_APP_INSTANCE` 存在且不为 `'0'` 时跳过。
- 再加 `SELECT GET_LOCK('api_log_rollup', 0)`，取不到锁即退出，结束后 `RELEASE_LOCK`。
- 适用于清理流水线和 `quota.service.ts` 的每日重置调度（同一问题）。

## 统计读取

`GET /api/v1/billing/usage` 按时间段选择数据源并合并：

| 时间段 | 数据源 |
|---|---|
| 今天 | `api_logs`（实时） |
| 昨天 ~ 6 个月前 | `api_log_snapshots` + `api_log_endpoint_daily` |
| 6 个月前 ~ 5 年 | `api_log_monthly_snapshots` |

返回结构保持现有 snake_case 契约（`total_calls`、`daily_breakdown`、`endpoint_breakdown`、`recent_errors` 等），新增：

- `total_bytes`、`total_request_bytes`、`total_response_bytes`
- `daily_breakdown[].bytes`
- `endpoint_breakdown[].bytes`
- `bytes_tracked_since`（首个有字节数据的日期）

`GET /api/v1/api-logs`（明细列表）不变，天然只有 3 天数据。

## 前端展示

"API 日志"页（`developer-portal-v2/src/views/developer/usage-statistics/index.vue`）升级为"统计 + 明细"：

1. 时间范围切换：7 天 / 30 天 / 90 天 / 6 个月 / 自定义区间。
2. 统计卡片：调用次数、流量（自动换算 KB/MB/GB）、成功率、平均响应时间。
3. 趋势图：调用次数 + 流量双轴。
4. 接口分布：来自 `endpoint_breakdown`，含调用数、错误数、流量、平均/最大耗时。
5. 页面顶部提示"明细保留 3 天，统计数据保留 6 个月"。
6. 流量卡片为空且 `bytes_tracked_since` 为空时隐藏，避免展示恒为 0 的假数据。

工作台首页保留现有卡片，只补充流量数据（读同一个接口）。

## 错误处理

- 聚合任务失败：记录 `[ApiLog] rollup failed` 与失败日期，不删除原始行，次日重试。
- 取锁失败：记 debug 日志后退出，不视为错误。
- 统计接口：单一数据源失败时降级返回已获取部分，并在响应中带 `partial: true`。
- 快照表缺失（迁移未执行）：统计接口回退到实时查询，日志中告警一次。

## 测试

- **单测**：聚合 SQL 的日期边界（CST 跨日）、UPSERT 幂等、单实例守卫、分段数据源合并、月加权平均、字节数换算。
- **集成**：造 5 天的日志，跑流水线，断言 → 3 天内保留原始行、日快照/端点日表正确、第 7 天数据被删除；用 7 个月的假日快照验证月滚动与 6 个月清理。
- **回归**：`/billing/usage` 在仅有快照数据、仅有原始数据、两者都有三种情况下的返回一致性。
- **手工验证**：testing 环境部署后用 ISV token 拉取各时间段的统计，比对数据库结果。

## 迁移与上线

1. 迁移只加表加列加索引，无破坏性变更；`totalBytes` 默认 0，可在线执行。
2. 部署后首次启动会跑一次聚合（D-1~D-3），再删除 3 天前原始行 —— **beta/testing 上现有的 8 万行历史中，3 天前的部分会在首次运行后被聚合并删除**。上线前需确认：管理后台是否有人依赖这些历史明细。
3. `api_log_snapshots` 在 testing 可能不存在（代码注释提到"table 可能缺失"），迁移需包含 `CREATE TABLE IF NOT EXISTS` 语义或先确认存在。
