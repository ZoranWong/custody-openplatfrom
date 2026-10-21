# 企业资金账户与充值体系设计

> 日期：2026-10-21
> 状态：已确认，待实施
> 范围：企业（ISV Developer）资金账户、充值、余额消费（订阅 / gas 代付）、对账

## 1. 背景与目标

平台当前的订阅支付只有 `Order` + 人工银行转账流程，没有账户余额概念。企业希望：

1. 预先充值，为后续消费做准备
2. 支持主流链上代币（USDT / USDC / NBU 等稳定币）
3. 余额可用于订阅套餐、gas 代付
4. 需要完整的对账能力

本期落地**人工入账**（管理员录入 + 企业申请审核两条通道），但从数据结构到服务接口为 Custody 自动入账预留完整扩展点。法币线上支付不确定，不做实现，仅在币种配置层预留。

## 2. 已确认的关键决策

| 决策项 | 结论 | 理由 |
|---|---|---|
| 计价方式 | 多币种独立余额，稳定币 1:1 计价 | 稳定币为主，无需汇率表 |
| 账户粒度 | **币种 + 网络**（`USDT:TRC20` ≠ `USDT:ERC20`） | 链上资产不可跨网互换，Custody 按网络托管 |
| 记账模型 | 复式记账：platform / developer 两类账户 | 写入时强制平衡，防内部篡改 |
| 平台侧账户 | 多具名账户（CUSTODY / REVENUE / GAS_COST） | 资产与收入分离，可直接对账 |
| 金额存储 | 最小单位整数 + 冗余 `decimals` | 杜绝浮点误差 |
| 冻结建模 | 独立账户 `:AVAILABLE` / `:FROZEN` | 冻结本身也是平衡的双边记账 |
| 冻结使用范围 | **仅异步外部依赖**（gas 代付） | 订阅为同步内部操作，直接扣减 |
| 余额查询 | 缓存余额表 + 分录增量校正 | 日常查询 O(1) |
| 库表设计 | **单库单 schema**，`ledger_entries` 按月分区 | 平台账户共享，分库会破坏原子平衡 |
| 业务单据 | 与账本分录分层，1 单据对应 1 个 `txGroupId` | 关注点分离 |
| 双人复核 | 充值超过 **1000 USDT 等价**需第二人审批 | 内部风控 |
| 套餐升级 | v1 **立即生效，不退差价** | 简化上线；v2 再实现按天折算 |

## 3. 分层架构

```
业务单据层    deposit_order / order / gas_order / adjustment_order
                     │  状态机、凭证、审批
                     ▼
记账服务      LedgerService.post(txGroup)
                     │  唯一写入口：校验平衡 → 幂等 → 写分录 → 更新余额缓存
                     ▼
账本层        ledger_tx_groups / ledger_entries / ledger_accounts
                     │  不可变、可重算
                     ▼
对账层        ledger_daily_snapshots / reconciliation_issues
```

**硬性约束**：

- 所有余额变动只能经 `LedgerService`，业务代码禁止直接写 `ledger_entries` / `ledger_accounts`
- `ledger_entries` 数据库账号仅授予 INSERT / SELECT，无 UPDATE / DELETE
- 金额在代码中一律 `bigint` / `BigInt`，API 边界用十进制字符串

## 4. 数据模型

### 4.1 币种配置

```prisma
model CurrencyConfig {
  currency    String  @map("currency")      // USDT
  network     String  @map("network")       // TRC20
  decimals    Int                            // 6
  symbol      String                         // USDT
  displayName String? @map("display_name")
  enabled     Boolean @default(true)
  isFiat      Boolean @default(false) @map("is_fiat")  // 法币预留
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@id([currency, network])
  @@map("currency_configs")
}
```

### 4.2 账本账户

```prisma
model LedgerAccount {
  id           BigInt  @id @default(autoincrement())
  accountKey   String  @unique @map("account_key")   // 人类可读、日志排查用
  accountType  String  @map("account_type")          // platform | developer
  ownerId      String? @map("owner_id")              // developerId；平台账户为 null
  currency     String
  network      String
  bucket       String                                 // CUSTODY | REVENUE | GAS_COST | AVAILABLE | FROZEN
  balanceRaw   BigInt  @default(0) @map("balance_raw")
  version      BigInt  @default(0)                    // 乐观锁
  lastEntryId  BigInt? @map("last_entry_id")          // 增量校验起点
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@unique([accountType, ownerId, currency, network, bucket])
  @@index([ownerId, currency, network])
  @@map("ledger_accounts")
}
```

账户 key 约定：

| account_key | 类型 | bucket | 含义 |
|---|---|---|---|
| `PLATFORM:CUSTODY:USDT:TRC20` | platform | CUSTODY | 平台托管真实资产 |
| `PLATFORM:REVENUE:SUBSCRIPTION:USDT:TRC20` | platform | REVENUE | 订阅收入 |
| `PLATFORM:REVENUE:GAS:USDT:TRC20` | platform | REVENUE | gas 代付收入 |
| `PLATFORM:GAS_COST:USDT:TRC20` | platform | GAS_COST | gas 真实链上成本 |
| `DEV:<uuid>:USDT:TRC20:AVAILABLE` | developer | AVAILABLE | 企业可用余额 |
| `DEV:<uuid>:USDT:TRC20:FROZEN` | developer | FROZEN | 企业冻结余额 |

### 4.3 分录组与分录

```prisma
model LedgerTxGroup {
  id          String   @id                       // G-<uuid>
  bizType     String   @map("biz_type")          // deposit | subscribe | gas_hold | gas_settle | gas_release | adjust
  bizRef      String?  @map("biz_ref")           // 业务单据 ID
  memo        String?
  createdBy   String?  @map("created_by")
  createdAt   DateTime @default(now()) @map("created_at")

  entries     LedgerEntry[]

  @@index([bizType, bizRef])
  @@map("ledger_tx_groups")
}

model LedgerEntry {
  id            BigInt   @id @default(autoincrement())
  txGroupId     String   @map("tx_group_id")
  accountId     BigInt   @map("account_id")       // FK → ledger_accounts.id
  accountType   String   @map("account_type")     // 冗余，聚合免 JOIN
  direction     String                             // debit | credit
  amountRaw     BigInt   @map("amount_raw")
  currency      String
  network       String
  decimals      Int
  bizType       String   @map("biz_type")
  bizRef        String?  @map("biz_ref")
  balanceBefore BigInt?  @map("balance_before")
  balanceAfter  BigInt?  @map("balance_after")
  createdAt     DateTime @default(now()) @map("created_at")

  txGroup       LedgerTxGroup @relation(fields: [txGroupId], references: [id])
  account       LedgerAccount @relation(fields: [accountId], references: [id], onDelete: Restrict)

  @@unique([bizType, bizRef, accountId])           // 幂等
  @@index([accountId, id])
  @@index([txGroupId])
  @@index([createdAt])
  @@map("ledger_entries")
}
```

`ledger_entries` 按月 RANGE 分区（`created_at`），由迁移脚本创建。

### 4.4 业务单据

```prisma
model DepositOrder {
  id             String   @id @default(uuid())
  orderNo        String   @unique @map("order_no")       // DP-20261021-0001
  developerId    String   @map("developer_id")
  currency       String
  network        String
  amountRaw      BigInt   @map("amount_raw")
  decimals       Int
  channel        String                                   // admin | self_service
  status         String   @default("pending")             // pending|reviewing|approved|credited|rejected|expired
  txHash         String?  @map("tx_hash")
  proofUrl       String?  @map("proof_url")
  fromAddress    String?  @map("from_address")
  applicantId    String?  @map("applicant_id")
  createdBy      String?  @map("created_by")
  reviewedBy     String?  @map("reviewed_by")
  approvedBy     String?  @map("approved_by")             // 双人复核第二人
  reviewedAt     DateTime? @map("reviewed_at")
  creditedAt     DateTime? @map("credited_at")
  rejectReason   String?  @map("reject_reason")
  txGroupId      String?  @map("tx_group_id")
  version        Int      @default(0)
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  @@index([developerId, status])
  @@index([status, createdAt])
  @@map("deposit_orders")
}

model GasOrder {
  id             String   @id @default(uuid())
  orderNo        String   @unique @map("order_no")
  developerId    String   @map("developer_id")
  currency       String
  network        String
  feeRaw         BigInt   @map("fee_raw")                 // 向企业收取
  costRaw        BigInt?  @map("cost_raw")                // 真实链上成本
  decimals       Int
  status         String   @default("created")             // created|held|submitting|succeeded|failed|expired
  txHash         String?  @map("tx_hash")
  holdTxGroupId  String?  @map("hold_tx_group_id")
  settleTxGroupId String? @map("settle_tx_group_id")
  holdExpiresAt  DateTime? @map("hold_expires_at")
  version        Int      @default(0)
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  @@index([developerId, status])
  @@index([status, holdExpiresAt])
  @@map("gas_orders")
}

model AdjustmentOrder {
  id           String   @id @default(uuid())
  orderNo      String   @unique @map("order_no")
  developerId  String?  @map("developer_id")
  currency     String
  network      String
  amountRaw    BigInt   @map("amount_raw")                // 可为负（有符号）
  decimals     Int
  reason       String
  status       String   @default("pending")               // pending|approved|posted|rejected
  createdBy    String?  @map("created_by")
  approvedBy   String?  @map("approved_by")
  txGroupId    String?  @map("tx_group_id")
  version      Int      @default(0)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("adjustment_orders")
}
```

现有 `Order` 表复用为订阅单，新增字段：

```prisma
// model Order 追加
  paymentMethod   String   @default("bank_transfer")  // 追加 balance 取值
  txGroupId       String?  @map("tx_group_id")
  version         Int      @default(0)
```

### 4.5 对账

```prisma
model LedgerDailySnapshot {
  id           BigInt   @id @default(autoincrement())
  accountId    BigInt   @map("account_id")
  snapshotDate DateTime @db.Date @map("snapshot_date")
  openingRaw   BigInt   @map("opening_raw")
  inflowRaw    BigInt   @map("inflow_raw")
  outflowRaw   BigInt   @map("outflow_raw")
  closingRaw   BigInt   @map("closing_raw")
  verified     Boolean  @default(false)
  createdAt    DateTime @default(now()) @map("created_at")

  @@unique([accountId, snapshotDate])
  @@map("ledger_daily_snapshots")
}

model ReconciliationIssue {
  id             String   @id @default(uuid())
  type           String                                // snapshot_mismatch | orphan_order | orphan_entry
  accountId      BigInt?  @map("account_id")
  refType        String?  @map("ref_type")
  refId          String?  @map("ref_id")
  expectedRaw    BigInt?  @map("expected_raw")
  actualRaw      BigInt?  @map("actual_raw")
  diffRaw        BigInt?  @map("diff_raw")
  status         String   @default("open")             // open|investigating|resolved
  assignee       String?
  resolutionNote String?  @map("resolution_note")
  createdAt      DateTime @default(now()) @map("created_at")
  resolvedAt     DateTime? @map("resolved_at")

  @@index([status, createdAt])
  @@map("reconciliation_issues")
}
```

### 4.6 Custody 预留

```prisma
model DeveloperDepositAddress {
  id            String   @id @default(uuid())
  developerId   String   @map("developer_id")
  currency      String
  network       String
  address       String
  custodyUnitId String?  @map("custody_unit_id")
  status        String   @default("active")
  createdAt     DateTime @default(now()) @map("created_at")

  @@unique([currency, network, address])
  @@index([developerId])
  @@map("developer_deposit_addresses")
}

model GasPricePolicy {
  id          String   @id @default(uuid())
  currency    String
  network     String
  fixedFeeRaw BigInt   @map("fixed_fee_raw")
  decimals    Int
  effectiveAt DateTime @map("effective_at")
  createdBy   String?  @map("created_by")

  @@index([currency, network, effectiveAt])
  @@map("gas_price_policies")
}
```

## 5. 记账规则

### 5.1 平衡校验（唯一规则）

```sql
-- 同一 tx_group_id 内
SUM(amount_raw) FILTER (direction='debit') == SUM(amount_raw) FILTER (direction='credit')
```

与账户类型无关。账户类型只决定**余额如何计算**。

### 5.2 余额计算

| account_type | 余额 |
|---|---|
| platform | `Σdebit − Σcredit` |
| developer | `Σcredit − Σdebit` |

### 5.3 分录示例

**充值 1000 USDT-TRC20（企业 A）**

| account | direction | amount_raw |
|---|---|---|
| PLATFORM:CUSTODY:USDT:TRC20 | debit | 1000000000 |
| DEV:<a>:USDT:TRC20:AVAILABLE | credit | 1000000000 |

**订阅扣费 100 USDT**

| account | direction | amount_raw |
|---|---|---|
| DEV:<a>:USDT:TRC20:AVAILABLE | debit | 100000000 |
| PLATFORM:REVENUE:SUBSCRIPTION:USDT:TRC20 | credit | 100000000 |

**gas 代付冻结 5 USDT**

| account | direction | amount_raw |
|---|---|---|
| DEV:<a>:USDT:TRC20:AVAILABLE | debit | 5000000 |
| DEV:<a>:USDT:TRC20:FROZEN | credit | 5000000 |

**gas 成功结算**

| account | direction | amount_raw |
|---|---|---|
| DEV:<a>:USDT:TRC20:FROZEN | debit | 5000000 |
| PLATFORM:REVENUE:GAS:USDT:TRC20 | credit | 5000000 |

**gas 失败释放**

| account | direction | amount_raw |
|---|---|---|
| DEV:<a>:USDT:TRC20:FROZEN | debit | 5000000 |
| DEV:<a>:USDT:TRC20:AVAILABLE | credit | 5000000 |

**gas 真实成本（内部，仅成本核算）**

| account | direction | amount_raw |
|---|---|---|
| PLATFORM:GAS_COST:USDT:TRC20 | debit | 800000 |
| PLATFORM:CUSTODY:USDT:TRC20 | credit | 800000 |

### 5.4 LedgerService 接口

```ts
interface PostTxGroupInput {
  bizType: string;
  bizRef?: string;
  memo?: string;
  createdBy?: string;
  entries: Array<{
    accountKey: string;
    direction: 'debit' | 'credit';
    amountRaw: bigint;
  }>;
}

interface PostTxGroupResult {
  txGroupId: string;
  entryIds: bigint[];
  idempotent: boolean;   // true 表示命中幂等，未产生新分录
}

ledgerService.postTxGroup(input): Promise<PostTxGroupResult>
ledgerService.getBalance(accountKey): Promise<{ availableRaw: bigint; frozenRaw: bigint }>
```

事务内步骤：

1. 校验借方合计 == 贷方合计，否则抛错
2. 按 `accountKey` 排序（统一加锁顺序，防死锁），`SELECT ... FOR UPDATE`
3. 校验乐观锁版本、`amount > 0`
4. 幂等检查：命中 `(bizType, bizRef, accountId)` 唯一索引则返回已有结果
5. 插入 `ledger_tx_groups` 与全部 `ledger_entries`
6. 逐账户更新 `balance_raw`；开发者账户（AVAILABLE / FROZEN）校验变动后不为负
7. 提交

## 6. 业务流程

### 6.1 充值：管理员录入

```
1. 管理员创建 DepositOrder(channel=admin, status=pending)
2. 金额 ≤ 阈值 → 直接 approved；> 阈值 → 需第二管理员 approve（创建人 ≠ 审批人）
3. 调 ledgerService.postTxGroup(bizType='deposit', bizRef=orderNo)
4. 同事务：DepositOrder → status=credited, txGroupId 回写
```

### 6.2 充值：企业申请

```
1. 企业提交 DepositOrder(channel=self_service, txHash, proofUrl, status=pending)
2. 管理员核验链上转账 → approved / rejected（填原因）
3. 后续同 6.1 步骤 3–4
```

### 6.3 套餐订阅（余额支付）

```
1. 企业 POST /isv/orders (paymentMethod=balance)
2. 校验余额充足
3. 单事务：
   a. postTxGroup(bizType='subscribe', bizRef=orderId)
   b. 创建 / 续期 Subscription
   c. Order → status=paid, paidAt, txGroupId
4. 余额不足 → 400，订单保持 pending
```

**不冻结**：订阅为同步内部操作，无外部异步依赖。

### 6.4 gas 代付

```
1. 企业发起 GasOrder(status=created)，费用取自 GasPricePolicy
2. postTxGroup(bizType='gas_hold') → AVAILABLE→FROZEN，记录 holdTxGroupId、holdExpiresAt
3. 提交 Custody → status=submitting
4. 链上成功 → postTxGroup(bizType='gas_settle') + status=succeeded
   链上失败 → postTxGroup(bizType='gas_release') + status=failed
5. 超时 → 定时任务 release + status=expired
```

### 6.5 套餐升级

v1：立即生效，不退差价，生成新 `Subscription` 记录并结束旧记录。
不涉及余额调整（已付费用不退还）。

## 7. 对账

### 7.1 实时校验（写入时）

| 检查 | 失败处理 |
|---|---|
| 借贷平衡 | 拒绝写入 |
| AVAILABLE / FROZEN 变动后非负 | 拒绝写入 |
| 乐观锁版本匹配 | 重试或失败 |
| `(bizType, bizRef, accountId)` 唯一 | 幂等返回 |

### 7.2 日终快照

每日 00:05 执行：

```
closing = opening(昨日快照或 0) + inflow − outflow
与 ledger_accounts.balance_raw 比对
不一致 → ledger_daily_snapshots.verified=false + 写 reconciliation_issues
```

### 7.3 增量校验

```
SELECT SUM(按账户类型的符号规则)
FROM ledger_entries
WHERE account_id = ? AND id > :lastEntryId

与 balance_before(= lastEntryId 时余额) + 增量 比对当前 balance_raw
```

成本与当日流水量成正比，与历史总量无关。

### 7.4 全量审计

季度或怀疑数据损坏时，从全部历史分录重算，与缓存比对。差异以分录为准，按调账单修正。

### 7.5 双边对账（Custody 接入后）

`PLATFORM:CUSTODY:{currency}:{network}` 余额 ⇄ Custody 查询的链上余额。当前人工入账阶段无法执行。

### 7.6 单据 ⇄ 分录双向校验

| 方向 | 规则 |
|---|---|
| 单据 → 分录 | `status=credited` 的充值单必须存在 `txGroupId` 且该组有分录 |
| 分录 → 单据 | `bizType=deposit` 的分录组 `bizRef` 必须指向 `credited` 的充值单 |

## 8. 优化与防错清单

| 类别 | 措施 |
|---|---|
| 唯一写入口 | 业务代码禁止直接操作账本表；CI 检查 |
| 金额精度 | 全程 bigint；API 用字符串；禁止 `parseFloat` |
| 账本不可变 | DB 账号仅 INSERT/SELECT；冲正用反向分录 |
| 外键 | `Restrict`，禁止级联删除账本与单据 |
| 并发 | 乐观锁 + `accountId` 升序加锁 |
| 幂等 | 唯一索引 + 单据状态幂等返回 |
| 审批 | 创建人 ≠ 审批人；> 1000 USDT 等价需双人复核 |
| 超时清扫 | 每 5 分钟扫描 `held` 且超时的 gas 单，释放冻结 |
| 定价 | gas 费用来自 `GasPricePolicy`，留历史 |
| 扩展 | 新业务线只需新增平台具名账户 |

## 9. 性能与存储

- 单库单 schema；`ledger_entries` 按月 RANGE 分区
- 日常读路径全部走索引或主键，不扫表
- 超过 12 个月的分录归档到 `ledger_entries_archive`
- 数据量估算：1000 企业 × 50 笔/日 × 2 条分录 ≈ 3650 万条/年（约 6–11 GB）

## 10. 测试策略

| 测试 | 内容 |
|---|---|
| 不变量 | 随机业务序列 → 每组借贷相等、余额非负、缓存与分录一致 |
| 金额转换 | 各币种精度边界、最大值、截断规则 |
| 并发 | 同账户并发扣款不超扣、不死锁 |
| 幂等 | 重复提交单据只入账一次 |
| 对账 | 构造不平数据，验证告警与 `reconciliation_issues` |
| 冻结超时 | 模拟 Custody 无回调，验证释放与 `expired` |

## 11. 分阶段实施

| 阶段 | 范围 |
|---|---|
| P1 | 数据模型 + LedgerService + 管理员充值 + 余额查询 + 流水 |
| P2 | 企业申请充值 + 审批流 + 双人复核 |
| P3 | 订阅余额支付 + 套餐升级规则 |
| P4 | gas 代付 + 冻结超时清扫 + 定价策略 |
| P5 | 日终快照 + 对账报表 + 差异处理 |
| P6 | Custody 自动入账 + 双边对账 |

## 12. 待接入方确认

| 事项 | 需要 |
|---|---|
| Custody 充值回调契约 | 字段（txHash / from / to / amount / currency / network / confirmations）、重放策略 |
| Custody 余额查询 | 用于双边对账 |
| gas 代付接口 | 提交、查询、回调；费用结算方式 |
| 充值地址分配 | 每企业每币种网络的地址从哪个财务单元生成 |
