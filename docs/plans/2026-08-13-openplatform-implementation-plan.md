# Cregis Custody OpenPlatform — 完整实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完成 Cregis Custody OpenPlatform 的全面优化：修复安全缺陷、清理技术债务、迁移至 Art Design Pro UI、实现计费体系、补全管理后台和开发者门户功能。

**Architecture:** 分 9 个阶段执行，每个阶段包含多个独立任务。阶段一至三为代码修复和清理，阶段四为 UI 框架迁移，阶段五至七为新功能开发，阶段八为 SDK 补齐，阶段九为后期补充功能。

**Tech Stack:** Express 4 + TypeScript + Prisma 7 (MySQL) + Vue 3 + Element Plus + Tailwind CSS + Art Design Pro

**关键约束:**
- 对外三方 API（`/api/thirdparty/*`、`/api/oauth/*`）的请求/响应结构、路由路径、签名方式**不可修改**
- 所有新功能在 Art Design Pro UI 框架基础上开发

---

## 阶段一：P0 安全修复（预计 1 周）

### Task 1.1: 移除密码明文日志

**Files:**
- Modify: `openplatform-api-service/src/controllers/admin-auth.controller.ts`

**Step 1: 定位并移除密码日志**

找到 `admin-auth.controller.ts` 中 `adminLogin` 函数内的 `console.log`：

```typescript
// 删除这段代码（约 191-195 行）
console.log('[Login] Password verification:', {
  inputPassword: password,
  storedHash: admin.passwordHash.substring(0, 20) + '...',
  inputLength: password.length
})
```

**Step 2: 替换为安全的日志**

```typescript
// 替换为不包含密码的日志
console.log('[Login] Attempt:', { email, timestamp: new Date().toISOString() })
```

**Step 3: 检查同一文件中是否有其他密码泄露**

搜索 `password` 关键字在 `admin-auth.controller.ts` 中，确保所有日志都不包含密码原文。

**Step 4: 验证**

```bash
cd openplatform-api-service && grep -n "console.log.*password" src/controllers/admin-auth.controller.ts
```

预期：无输出（所有密码日志已移除）。

**Step 5: 提交**

```bash
git add openplatform-api-service/src/controllers/admin-auth.controller.ts
git commit -m "fix: remove plaintext password logging in admin login"
```

---

### Task 1.2: 修复管理员操作审计身份

**Files:**
- Modify: `openplatform-api-service/src/controllers/isv-status.controller.ts`
- Modify: `openplatform-api-service/src/controllers/developer.controller.ts`

**Step 1: 修复 isv-status.controller.ts 中的 adminId 来源**

在 `activateISV`、`suspendISV`、`banISV` 三个函数中，将：

```typescript
const adminId = req.headers['x-admin-id'] as string || 'unknown'
```

替换为：

```typescript
const adminId = (req as any).adminId || 'unknown'
```

**Step 2: 修复 developer.controller.ts 中的 adminEmail 来源**

在 `approveDeveloper` 和 `rejectDeveloper` 函数中，将：

```typescript
const adminEmail = (req as any).user?.email || 'admin@cregis.com'
```

替换为：

```typescript
const adminEmail = (req as any).adminEmail || 'unknown'
```

**Step 3: 验证修复**

```bash
cd openplatform-api-service
grep -n "x-admin-id" src/controllers/isv-status.controller.ts
grep -n "user?.email" src/controllers/developer.controller.ts
```

预期：两处搜索结果均为空。

**Step 4: 提交**

```bash
git add openplatform-api-service/src/controllers/isv-status.controller.ts openplatform-api-service/src/controllers/developer.controller.ts
git commit -m "fix: use JWT-derived adminId/adminEmail instead of client-controlled headers"
```

---

## 阶段二：P1 重大修复（预计 3-4 周）

### Task 2.1: 修复 GET /api/v1/admin/admins 路由

**Files:**
- Modify: `openplatform-api-service/src/controllers/admin-auth.controller.ts`
- Modify: `openplatform-api-service/src/routes/v1/admin-auth.routes.ts`

**Step 1: 实现 listAdmins 控制器**

在 `admin-auth.controller.ts` 中新增函数：

```typescript
import { getAdminRepository } from '../repositories/repository.factory'

export async function listAdmins(req: Request, res: Response): Promise<void> {
  try {
    const adminRepo = getAdminRepository()
    const admins = await adminRepo.findAll()
    
    res.json({
      code: 0,
      data: admins.map(a => ({
        id: a.id,
        email: a.email,
        name: a.name,
        role: a.role,
        status: a.status,
        lastLoginAt: a.lastLoginAt?.toISOString(),
        createdAt: a.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Failed to list admins:', error)
    res.status(500).json({ code: 50001, message: 'Failed to list admins' })
  }
}
```

**Step 2: 修复路由注册**

在 `admin-auth.routes.ts` 中，将：

```typescript
router.get('/admins', adminAuthMiddleware, requireRole('super_admin'), getAdminProfile)
```

改为：

```typescript
router.get('/admins', adminAuthMiddleware, requireRole('super_admin'), listAdmins)
```

同时更新 import 语句，添加 `listAdmins`。

**Step 3: 验证**

```bash
cd openplatform-api-service && npx vitest run tests/unit/admin-auth.controller.test.ts 2>&1 | tail -10
```

**Step 4: 提交**

```bash
git add openplatform-api-service/src/controllers/admin-auth.controller.ts openplatform-api-service/src/routes/v1/admin-auth.routes.ts
git commit -m "fix: correct GET /admins handler to return admin list instead of profile"
```

---

### Task 2.2: 实现 OAuth Token 刷新端点

**Files:**
- Modify: `openplatform-api-service/src/services/token.service.ts`
- Create: `openplatform-api-service/src/services/credential.service.ts`（如需要）

**Step 1: 实现真实的 CredentialService**

```typescript
// credential.service.ts
import { getApplicationRepository } from '../repositories/repository.factory'
import bcrypt from 'bcrypt'
import { CredentialService } from '../types/jwt.types'

export function createCredentialService(): CredentialService {
  return {
    validateCredentials: async (appid: string, appsecret: string) => {
      const appRepo = getApplicationRepository()
      const app = await appRepo.findByAppId(appid)
      
      if (!app || app.status !== 'active') {
        return { valid: false }
      }
      
      // 使用 bcrypt 比较 appSecret
      const isValid = await bcrypt.compare(appsecret, app.appSecret)
      if (!isValid) {
        return { valid: false }
      }
      
      return {
        valid: true,
        user_id: app.isvDeveloperId,
        enterprise_id: undefined,
        permissions: [],
      }
    },
  }
}
```

**Step 2: 实现真实的 RefreshTokenRepository**

在 `token.service.ts` 中，将 `defaultRefreshTokenRepo` 替换为基于 Prisma 的实现。需要先在 `prisma/schema.prisma` 中新增 `RefreshToken` 模型：

```prisma
model RefreshToken {
  id            BigInt   @id @default(autoincrement())
  jti           String   @unique
  appid         String
  user_id       String
  expires_at    BigInt
  revoked       Boolean  @default(false)
  replaced_by_jti String?
  created_at    BigInt
  last_used_at  BigInt?
  
  @@map("refresh_tokens")
}
```

然后实现 repository：

```typescript
const refreshTokenRepo: RefreshTokenRepository = {
  create: async (record) => {
    return prisma.refreshToken.create({ data: record })
  },
  findByJti: async (jti) => {
    return prisma.refreshToken.findUnique({ where: { jti } })
  },
  // ... 其他方法
}
```

**Step 3: 在 main.ts 中组装真实实例**

```typescript
const realTokenService = createTokenService(
  defaultBlacklist,  // 暂时保持内存实现，后续迁移 Redis
  refreshTokenRepo,
  createCredentialService(),
  defaultRateLimiter
)
```

**Step 4: 验证**

```bash
# 测试 token 刷新端点
curl -X POST http://localhost:1000/api/oauth/appToken/refresh \
  -H "Content-Type: application/json" \
  -d '{"grant_type":"client_credentials","appid":"<appid>","appsecret":"<appsecret>"}'
```

**Step 5: 提交**

```bash
git add openplatform-api-service/
git commit -m "feat: implement real CredentialService and RefreshTokenRepository for OAuth token refresh"
```

---

### Task 2.3: 挂载 API 限流中间件

**Files:**
- Modify: `openplatform-api-service/src/main.ts`

**Step 1: 在 main.ts 中导入限流中间件**

```typescript
import { defaultRateLimitMiddleware } from './middleware/rate-limit.middleware'
import { strictRateLimit } from './middleware/admin-rate-limit.middleware'
```

**Step 2: 按路由分组挂载**

```typescript
// 对外三方 API — 分层限流（在 resourceValidationMiddleware 之前）
app.use('/api/thirdparty', defaultRateLimitMiddleware)

// 管理后台登录/注册 — 严格限流
app.use('/api/v1/admin/auth/login', strictRateLimit)
app.use('/api/v1/isv/auth/login', strictRateLimit)
app.use('/api/v1/isv/auth/register', strictRateLimit)
```

**Step 3: 验证**

确认限流中间件在路由请求中生效，超过限制后返回 429。

**Step 4: 提交**

```bash
git add openplatform-api-service/src/main.ts
git commit -m "feat: mount rate-limit middleware for API and admin endpoints"
```

---

### Task 2.4: 开发者管理路由增加角色权限检查

**Files:**
- Modify: `openplatform-api-service/src/routes/v1/admin-auth.routes.ts`

**Step 1: 添加权限检查**

将 `admin-auth.routes.ts` 中开发者管理路由更新为：

```typescript
// 查询 — 所有登录管理员可查看
router.get('/developers', adminAuthMiddleware, getDevelopers)
router.get('/developers/stats', adminAuthMiddleware, getDeveloperStats)
router.get('/developers/:id', adminAuthMiddleware, getDeveloperById)

// 审批/拒绝/封禁 — 需要 KYB 审核权限
router.post('/developers/:id/approve', adminAuthMiddleware, requirePermission(Resource.ISV_KYB), approveDeveloper)
router.post('/developers/:id/reject', adminAuthMiddleware, requirePermission(Resource.ISV_KYB), rejectDeveloper)
router.post('/developers/:id/ban', adminAuthMiddleware, requirePermission(Resource.ISV_KYB), banDeveloper)

// 激活/冻结 — 需要 ISV 状态管理权限
router.post('/developers/:id/activate', adminAuthMiddleware, requirePermission(Resource.ISV_STATUS), activateDeveloper)
router.post('/developers/:id/suspend', adminAuthMiddleware, requirePermission(Resource.ISV_STATUS), suspendDeveloper)
```

同时添加 `requirePermission` 和 `Resource` 的 import。

**Step 2: 验证**

```bash
cd openplatform-api-service && npx vitest run tests/unit/ 2>&1 | tail -10
```

**Step 3: 提交**

```bash
git add openplatform-api-service/src/routes/v1/admin-auth.routes.ts
git commit -m "fix: add role permission checks to developer management routes"
```

---

### Task 2.5: 修复 Nonce 缓存 TTL 失效

**Files:**
- Modify: `openplatform-api-service/src/middleware/nonce-cache.ts`

**Step 1: 修复 isDuplicate 方法**

```typescript
async isDuplicate(appId: string, nonce: string): Promise<boolean> {
  const key = this.getKey(appId, nonce)
  const entry = this.cache.get(key)
  
  if (!entry) {
    return false
  }
  
  // 检查是否过期
  if (Date.now() > entry.timestamp + this.ttl) {
    this.cache.delete(key)  // 清理过期条目
    return false
  }
  
  return true
}
```

**Step 2: 改进 record 方法，增加主动清理**

```typescript
async record(appId: string, nonce: string): Promise<void> {
  const key = this.getKey(appId, nonce)
  const now = Date.now()
  
  this.cache.set(key, { timestamp: now })
  
  // 定期清理过期条目（每 1000 次写入触发一次）
  if (this.cache.size % 1000 === 0) {
    for (const [k, v] of this.cache.entries()) {
      if (now > v.timestamp + this.ttl) {
        this.cache.delete(k)
      }
    }
  }
}
```

**Step 3: 验证**

```bash
cd openplatform-api-service && npx vitest run tests/unit/ 2>&1 | grep -E "PASS|FAIL|nonce"
```

**Step 4: 提交**

```bash
git add openplatform-api-service/src/middleware/nonce-cache.ts
git commit -m "fix: add TTL check in nonce isDuplicate and periodic cleanup"
```

---

### Task 2.6: Nginx 启用 HTTPS

**Files:**
- Modify: `deploy/nginx.conf`

**Step 1: 更新 nginx.conf 增加 SSL 配置**

```nginx
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name _;

    ssl_certificate     /etc/nginx/ssl/cregis.crt;
    ssl_certificate_key /etc/nginx/ssl/cregis.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # ... 其余 location 配置保持不变
}
```

**Step 2: 提交**

```bash
git add deploy/nginx.conf
git commit -m "feat: add HTTPS configuration to nginx with HSTS"
```

---

### Task 2.7: 内存存储迁移为可扩展方案

**Files:**
- Modify: `openplatform-api-service/src/middleware/nonce-cache.ts`
- Modify: `openplatform-api-service/src/services/admin-auth.service.ts`
- Modify: `openplatform-api-service/src/controllers/admin-auth.controller.ts`

**Step 1: 抽象存储接口**

```typescript
// src/services/kv-store.interface.ts
export interface KVStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlMs?: number): Promise<void>
  delete(key: string): Promise<void>
  has(key: string): Promise<boolean>
}
```

**Step 2: 实现内存版和 Redis 版**

```typescript
// 内存版（当前逻辑包装为接口）
export class InMemoryKVStore implements KVStore { ... }

// Redis 版（使用 ioredis）
export class RedisKVStore implements KVStore { ... }
```

**Step 3: 通过环境变量切换**

```typescript
const kvStore: KVStore = process.env.REDIS_URL
  ? new RedisKVStore(process.env.REDIS_URL)
  : new InMemoryKVStore()
```

**Step 4: 将 NonceCache、TokenBlacklist、LoginAttempts 迁移到 KVStore**

**Step 5: 提交**

```bash
git add openplatform-api-service/src/
git commit -m "feat: abstract storage layer with KVStore interface, add Redis support"
```

---

### Task 2.8: 修复 TransferTaskDetailDialog DOM XSS

**Files:**
- Modify: `openplatform-sdk/web/src/components/transfer/TransferTaskDetailDialog.ts`

**Step 1: 添加 HTML 转义函数**

```typescript
function escapeHtml(str: string): string {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}
```

**Step 2: 对所有用户数据字段进行转义**

将模板字符串中所有 `${data.xxx}`、`${party.xxx}`、`${recipient.xxx}` 等用户数据字段包裹 `escapeHtml()`：

```typescript
// 修改前
`<span>${data.amount} ${data.coin}</span>`

// 修改后
`<span>${escapeHtml(String(data.amount))} ${escapeHtml(data.coin)}</span>`
```

**Step 3: 验证**

```bash
cd openplatform-sdk/web && npm test 2>&1 | tail -10
```

**Step 4: 提交**

```bash
git add openplatform-sdk/web/src/components/transfer/TransferTaskDetailDialog.ts
git commit -m "fix: escape HTML in TransferTaskDetailDialog to prevent XSS"
```

---

## 阶段三：P2 + Minor + 组织优化 + 注释完善（预计 3-4 周）

### Task 3.1: P2 技术债务修复

**P2-1: 修复 banned 状态** — 更新 `prisma/schema.prisma` 注释和 `getDeveloperStats` 统计逻辑。

**P2-2: 修复限流分层映射** — 修改 `rate-limit.middleware.ts` 中 `getTierForApp` 使其根据 `TIER_APP_MAPPING` 返回对应层级。

### Task 3.2: 死代码清理

删除以下文件：
- `src/services/forwarders.ts`
- `src/config/validation-rules.ts`
- `src/middleware/validation.middleware.ts`
- `src/middleware/jwt-auth.middleware.ts`
- `src/middleware/signature.middleware.ts`
- `src/services/validators/request.validators.ts`
- `src/services/validators/common.validators.ts`
- `src/services/permission-check.service.ts`
- `src/middleware/permission-check.middleware.ts`
- `src/services/kyb-review.service.ts` 中的 `developerAuthService` 代码块
- `openplatform-sdk/node/src/services/` 整个目录
- `openplatform-sdk/node/src/auth/` 整个目录
- `openplatform-web/developer-portal/src/services/mockData.ts`
- `openplatform-web/developer-portal/src/composables/useRegistrationForm.ts`
- `openplatform-web/developer-portal/src/composables/useStepNavigation.ts`

### Task 3.3: Minor 加固项

逐项完成 MIN-1 至 MIN-18，主要工作：
- MIN-1: `common.validator.ts` 签名比较改用 `crypto.timingSafeEqual`
- MIN-2: 启动时检查 JWT 密钥
- MIN-10: ISV 服务 bcrypt 改为异步
- MIN-11: ISV 登出加入黑名单
- MIN-18: 清理生产路径 console.log

### Task 3.4: API 代码组织优化

- ORG-1~8: 目录整理、命名规范、路由拆分、中间件规范化、依赖注入、类型整理、环境变量统一、错误处理统一

### Task 3.5: 代码注释完善

- DOC-1~6: 签名验证流程、转发路由、分层架构、关键服务 JSDoc、Prisma Schema、回调机制

---

## 阶段四：UI 改造 — Art Design Pro 二次开发（预计 4-6 周）

### Task 4.1: 初始化 Art Design Pro 项目

**Step 1: 克隆 Art Design Pro**

```bash
git clone https://github.com/Daymychen/art-design-pro /tmp/art-design-pro
```

**Step 2: 创建 admin-portal 项目**

```bash
cp -r /tmp/art-design-pro openplatform-web/admin-portal-v2
cd openplatform-web/admin-portal-v2
pnpm install
pnpm clean:dev  # 清理演示数据
```

**Step 3: 配置项目基础信息**

修改 `package.json` 为 `cregis-admin-portal`，更新 `vite.config.ts` 的 base 路径。

### Task 4.2: 迁移 Admin Portal 页面

逐页迁移：
1. **LoginPage** — 使用 Art Design Pro 的登录页模板
2. **Layout** — 使用 Art Design Pro 的 AdminLayout（侧边栏 + 顶部栏 + 面包屑）
3. **DashboardPage** — 使用 Art Design Pro 的 StatsCard + TrendChart
4. **DeveloperListPage / DeveloperDetailPage / DeveloperReviewPage** — 使用 useTable
5. **KYBReviewDetailPage / KYBPendingListPage / KYBHistoryListPage** — 使用 useTable
6. **ISVListPage / ISVStatusDetailPage** — 使用 useTable
7. **APIStatsPage / RevenueAnalyticsPage / SystemHealthPage** — 使用 Art Design Pro 图表组件
8. **ChangePasswordPage / ForbiddenPage** — 使用 ArtForm

**保持所有现有 API 调用层不变**（`src/services/api.ts` 等文件直接迁移）。

### Task 4.3: 迁移 Developer Portal 页面

同样基于 Art Design Pro 脚手架重建：
1. LandingPage、LoginPage、RegisterPage
2. ApplicationListPage、ApplicationDetailPage、CreateApplicationPage、EditApplicationPage
3. ProfilePage（含 KYB 表单）
4. UsageStatisticsPage、InvoiceGenerationPage、PaymentHistoryPage

### Task 4.4: 配置代码规范

```bash
pnpm add -D eslint prettier stylelint husky lint-staged @commitlint/cli @commitlint/config-conventional
```

配置 ESLint + Prettier + Stylelint + Husky pre-commit hooks + commitlint。

### Task 4.5: 启用主题系统

利用 Art Design Pro 的暗黑/亮色主题切换，用户偏好持久化到 localStorage。

---

## 阶段五：Mock → 真实实现（预计 4-6 周）

### Task 5.1: Billing 计费服务真实化

**Step 1: 新增 Prisma 模型**

```prisma
model Package {
  id              Int      @id @default(autoincrement())
  packageCode     String   @map("package_code")
  region          String
  name            String
  description     String?  @db.Text
  features        Json?
  price           Decimal  @db.Decimal(10, 2)
  currency        String   @default("CNY")
  yearlyDiscount  Decimal  @default(1.0) @map("yearly_discount") @db.Decimal(3, 2)
  dailyLimit      Int      @map("daily_limit")
  validDays       Int      @map("valid_days")
  isTrial         Boolean  @default(false) @map("is_trial")
  status          String   @default("active")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  subscriptions    Subscription[]
  
  @@unique([packageCode, region])
  @@map("packages")
}

model Subscription {
  id          Int      @id @default(autoincrement())
  isvDeveloperId String @map("isv_developer_id")
  packageId   Int      @map("package_id")
  startDate   DateTime @map("start_date")
  endDate     DateTime @map("end_date")
  dailyLimit  Int      @map("daily_limit")
  status      String   @default("active")
  createdAt   DateTime @default(now()) @map("created_at")
  
  package     Package  @relation(fields: [packageId], references: [id])
  
  @@map("subscriptions")
}

model Order {
  id              Int      @id @default(autoincrement())
  isvDeveloperId   String  @map("isv_developer_id")
  packageId       Int      @map("package_id")
  period          String   // "monthly" | "yearly"
  amount          Decimal  @db.Decimal(10, 2)
  currency        String   @default("CNY")
  status          String   @default("pending") // pending/paid/cancelled/refunded
  createdAt       DateTime @default(now()) @map("created_at")
  paidAt          DateTime? @map("paid_at")
  
  @@map("orders")
}

model Payment {
  id          Int      @id @default(autoincrement())
  orderId     Int      @map("order_id")
  method      String   // "online" | "offline"
  amount      Decimal  @db.Decimal(10, 2)
  currency    String   @default("CNY")
  status      String   @default("pending")
  proofUrl    String?  @map("proof_url")
  createdAt   DateTime @default(now()) @map("created_at")
  
  @@map("payments")
}
```

**Step 2: 运行数据库同步**

```bash
npx prisma db push
```

**Step 3: 实现计费相关 API**

- `GET /api/v1/billing/packages` — 套餐列表（按地区筛选）
- `POST /api/v1/billing/orders` — 创建订单
- `GET /api/v1/billing/orders` — 订单列表
- `POST /api/v1/billing/payments` — 提交支付凭证
- `GET /api/v1/billing/subscription` — 当前订阅状态
- `GET /api/v1/billing/usage` — 当日用量

**Step 4: 实现体验卡自动发放**

在 `approveDeveloper` 中增加逻辑：KYB 审核通过后，自动创建一条 trial 套餐的 Subscription。

### Task 5.2: Dashboard 统计真实化

基于 `ApiLog`、`Metric` 表实现真实数据聚合，替换 `dashboard-stats.service.ts` 中的 `Math.random()`。

### Task 5.3: KYB 审核服务迁移到 Prisma

将 `kyb-review.controller.ts`、`kyb-history.controller.ts`、`isv-status.controller.ts` 的数据源从 `kybReviewService`（内存 Map）切换为 Prisma `IsvDeveloper` 表。删除 `kyb-review.service.ts` 中的内存 Map 存储。

### Task 5.4: Audit 日志迁移到 Prisma

将 `admin-audit.service.ts` 的数据存储从内存 Map 切换为 Prisma `ApiLog` 模型。

### Task 5.5: Trace 服务迁移到 Prisma

将 `trace-storage.service.ts` 的数据存储切换为 Prisma `Trace` 模型。

### Task 5.6: Auth-page 移除 mock 降级

删除 `getOrganizationList` 的 mock 回退逻辑，删除 `mockFirstAuthenticate`/`mockSecondAuthenticate` 函数。

### Task 5.7: Developer Portal 清理 mock 数据

删除 `mockData.ts`，清理 `RegisterPage.vue` 中未与后端同步的流程。

---

## 阶段六：Admin Portal 新功能（预计 3-4 周）

### Task 6.1: 管理员账号管理

- 管理员列表页面（使用 useTable）
- 创建管理员对话框（ArtForm）
- 编辑角色/启用禁用操作

### Task 6.2: 审计日志查看

- 审计日志页面（使用 useTable，支持按操作人、时间、类型过滤）
- 导出功能

### Task 6.3: API 调用日志查询

- 后端 API：`GET /api/v1/admin/api-logs`
- 前端页面：按 appId、时间范围、状态码、端点过滤

### Task 6.4: 套餐管理

- 套餐配置页面（CRUD，多地区配置）
- 启停套餐

### Task 6.5: 订单与支付管理

- 订单列表
- 支付审核（线下转账确认）
- 退款处理

### Task 6.6: 系统公告管理

- 公告 CRUD
- 定向推送（按套餐等级/地区）

---

## 阶段七：Developer Portal 新功能（预计 3-4 周）

### Task 7.1: 套餐购买与续费

- 套餐展示页面（按地区展示价格和文案）
- 购买流程（选择套餐 → 选择周期 → 确认订单 → 支付）
- 订单历史

### Task 7.2: 消费明细

- 每日 API 调用量展示
- 剩余额度展示
- 消费趋势图

### Task 7.3: 账户充值

- 在线充值
- 线下转账凭证上传

### Task 7.4: KYB 审核进度

- 进度页面（时间线展示）
- 补充材料提交

### Task 7.5: 团队成员管理

- 成员列表（使用 useTable）
- 添加/删除成员
- 分配应用权限

### Task 7.6: Webhook 配置管理

- 后端 API：`POST/GET/PUT/DELETE /api/v1/isv/webhooks`
- 前端页面：注册、列表、编辑、删除、测试发送
- Webhook 推送日志

### Task 7.7: API 密钥管理

- appSecret 脱敏展示
- 重新生成功能（确认对话框）

### Task 7.8: 通知中心

- 通知列表
- 已读/未读状态
- 通知类型：系统公告、审核结果、额度告警、套餐到期提醒

### Task 7.9: SDK 下载入口

- 各语言 SDK 下载页面
- 安装命令和快速开始示例

---

## 阶段八：SDK 完善 + 其他（预计 2-3 周）

### Task 8.1: Node SDK 补齐遗漏方法

- `pooling(authorizationId, params)` — 归集请求
- `createUnitAddress(authorizationId, unitId, accountType, network, coinId, number)` — 创建地址
- `listUnitAccounts(authorizationId, unitId)` — 查询账户余额

### Task 8.2: Java SDK 补齐遗漏方法

- 补齐 treasury 遗漏方法
- 新增 WebhookService

### Task 8.3: Java SDK 启用 netty 和 spring-boot-starter

- 修复编译问题
- 取消 pom.xml 中的注释

### Task 8.4: Web SDK 测试修复

- 修复 `index.test.ts` 中与当前实现不一致的测试用例

### Task 8.5: Admin Portal 测试覆盖

- 使用 vitest + @vue/test-utils 编写关键页面测试

### Task 8.6: 监控告警

- 定义告警规则（错误率 > 5%、P99 延迟 > 5s、QPS 异常）
- 告警通知（邮件/Webhook）

### Task 8.7: 邮件/短信验证

- 邮箱验证码发送 API
- 注册流程中增加验证步骤

### Task 8.8: ISV 忘记密码/重置密码

- 发送重置验证码
- 验证码校验 + 新密码设置

### Task 8.9: 嵌入式插件页面

- Treasury Unit 创建授权页
- Policy 配置页
- Policy 签名页

---

## 阶段九：补充功能（后期迭代，预计 3-4 周）

### Task 9.1: ISV 自助注销

- 注销申请 API
- 管理员审核流程

### Task 9.2: 数据导出

- ISV 导出 API 调用记录（CSV/Excel）
- ISV 导出消费明细

### Task 9.3: ISV 侧操作日志

- 记录团队成员操作
- 操作日志页面

### Task 9.4: API 调用限流通知

- 80%/90%/100% 三档告警
- 邮件/站内信通知

### Task 9.5: 发票管理

- 发票申请
- 管理员审核开票
- 发票历史

### Task 9.6: Admin 多因子认证（MFA）

- Admin 登录后 TOTP 验证
- 复用 auth-page 已有 TOTP 流程

### Task 9.7: IP 白名单

- 应用详情中增加 IP 白名单配置
- API 网关层校验

### Task 9.8: 应用转让

- 转让申请
- 接收方确认
- 管理员审核

---

## 附录

### A. 关键约束

- 对外三方 API 不可修改（路径、参数、返回结构、签名方式）
- 新功能在 Art Design Pro UI 基础上开发
- 所有代码使用 camelCase 命名

### B. 文件变更统计

| 阶段 | 新增文件 | 修改文件 | 删除文件 |
|------|---------|---------|---------|
| 一 | 0 | 3 | 0 |
| 二 | 3 | 6 | 0 |
| 三 | 0 | 15 | 15 |
| 四 | 30+ | 0 | 0 |
| 五 | 8 | 8 | 2 |
| 六 | 12 | 2 | 0 |
| 七 | 18 | 2 | 0 |
| 八 | 8 | 8 | 0 |
| 九 | 10 | 2 | 0 |

### C. 相关文档

- [开发需求文档](./2026-08-13-openplatform-development-requirements.md)
- [消息签名规范](../signature-spec.md)
- [第三方开发者接入指南](../thirdparty-integration-guide.md)
- [Art Design Pro](https://github.com/Daymychen/art-design-pro)