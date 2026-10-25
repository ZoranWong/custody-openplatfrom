---
title: 开放平台 ↔ Custody 内部通道安全方案
description: 网关与 Custody 服务间双向鉴权、防攻击与数据防泄漏设计
---

# 开放平台 ↔ Custody 内部通道安全方案

**Last Updated:** 2026-10-25
**Status:** Draft（待 Custody 侧排期）
**适用范围:** `openplatform-api-service` ↔ `custody-backend` 的全部服务间调用

---

## 1. 背景与现状

开放平台网关（`openplatform-api-service`）作为开发者与 Custody 之间的唯一入口，需要与 Custody 后端双向通信：

```
开发者 ──Basic/Resource签名──► 网关 ──?──► Custody
                                ▲
                                └──?── Custody 内部回调（oauth/verify、custody/callback）
```

**当前两段链路均无服务间认证**，具体缺陷如下。

### 1.1 出站：网关 → Custody（高危）

`forward.controller.ts` 转发请求时仅携带一个 trace 头：

```ts
headers: { 'x-trace-id': traceId }
```

| 风险 | 说明 |
|------|------|
| **绕过网关直连 Custody** | Custody 的 `/api/third-party/*` 无任何调用方身份校验。任何知道地址的人可直连，完全绕过开发者签名、配额限流、API 审计日志 |
| **地址易暴露** | 地址已写入前端可见的部署配置与文档，不构成有效隔离 |
| **无来源审计** | Custody 侧日志无法区分"经网关调用"与"直连调用" |

> 这是整条链路最大的洞：网关累计十年的签名/配额/审计能力，可以被一次直连完全绕过。

### 1.2 入站：Custody → 网关

| 端点 | 现状 | 风险 |
|------|------|------|
| `POST /api/thirdparty/oauth/verify` | 仅校验 JWT 本身，无调用方认证 | 任意人可调用，向 `oauth_resources` 写入任意 `(appId, resourceKey)`，污染授权表；可配合枚举 appId |
| `POST /api/thirdparty/custody/callback` | 无调用方认证 | 任意人可伪造业务回调事件，触发向开发者推送伪造的 `transaction.completed` 等事件 |
| 错误响应 | 回显内部标识 | `Resource not found for resourceKey: ${resourceKey}`、`Application not found for appId: ${appId}`、`CallbackUrl not configured for appId: ${appId}` 可被用于探测 key 是否有效、appId 是否存在 |

### 1.3 其他问题

| 问题 | 位置 | 影响 |
|------|------|------|
| 所有 POST 自动重试 3 次 | `http-client.service.ts:155` | `payout` / `merchant/register` 等非幂等接口可能重复提交 |
| 外部 `x-trace-id` 直接信任 | `forward.controller.ts:165` | 可伪造/污染审计日志 |
| 内部路由无独立限流 | `thirdparty.routes.ts` | `oauth/verify`、`custody/callback` 可被高频打爆 |
| 无请求体大小限制（内部通道） | 全局 `express.json()` 默认 100kb | 尚可，但内部回调应更严格 |

---

## 2. 威胁模型

| 威胁 | 攻击者能力 | 目标 | 现有防护 | 方案后防护 |
|------|-----------|------|---------|-----------|
| T1 直连 Custody 绕过网关 | 知道 Custody 地址 | 绕过签名/配额/审计 | ❌ 无 | ✅ 双向 HMAC + 网络隔离 |
| T2 伪造内部回调 | 知道网关地址 | 推送伪造交易事件 | ❌ 无 | ✅ 入站 HMAC |
| T3 伪造 oauth/verify | 知道网关地址 | 污染授权表、枚举 appId | ❌ 无 | ✅ 入站 HMAC |
| T4 内部标识泄漏 | 仅能发请求 | 探测 key / appId 存在性 | ❌ 无 | ✅ 错误脱敏 |
| T5 重放内部请求 | 抓包 | 重复执行内部操作 | ❌ 无 | ✅ timestamp + nonce |
| T6 非幂等请求重复提交 | 利用 5xx/超时 | 重复 payout | ❌ 无 | ✅ 按路由配置重试 + Idempotency-Key |
| T7 内部接口被打爆 | 大量请求 | 拒绝服务 | 部分（全局限流） | ✅ 内部路由独立限流 |

---

## 3. 方案设计

### 3.1 核心：服务间 HMAC 双向鉴权（P0）

**原则**：Custody 只信任能通过 HMAC 校验的请求；网关只信任能通过 HMAC 校验的回调。

#### 3.1.1 密钥管理

| 项 | 设计 |
|----|------|
| 密钥形式 | 32 字节随机（hex/base64），至少 256 bit |
| 分发 | 不写入代码仓库；通过 K8s Secret / Vault 注入环境变量 |
| 环境变量 | `INTERNAL_CHANNEL_SECRET`（网关侧与 Custody 侧共用） |
| 轮换 | 支持双密钥（`INTERNAL_CHANNEL_SECRET` + `INTERNAL_CHANNEL_SECRET_PREV`），轮换期 7 天 |
| 权限 | 仅运维与安全负责人可读取 |

#### 3.1.2 请求签名格式

所有内部请求（双向）携带以下请求头：

```http
X-Internal-App-Id: <调用方服务标识，如 "openplatform-gateway" / "custody-backend">
X-Internal-Timestamp: <Unix 毫秒>
X-Internal-Nonce: <随机 16-32 字符>
X-Internal-Signature: sha256=<hex>
```

**签名串构造**：

```
signData = method + "\n"
         + path + "\n"
         + xInternalAppId + "\n"
         + timestamp + "\n"
         + nonce + "\n"
         + md5(sortedJSON(body))

signature = HMAC-SHA256(internalChannelSecret, signData).toHex()
```

要点：
- `path` 为不含 query 的请求路径，避免参数顺序影响签名。
- `body` 使用**递归 key 排序的 JSON** 后再 MD5，与现有 Business 签名口径保持一致（见 `docs/signature-spec.md`）。
- GET 请求的 body 为空串，`md5("")` 参与计算。
- 签名覆盖 method 和 path，防止中间人把请求重放到其他端点。

#### 3.1.3 校验规则（接收方）

按顺序校验，任一失败立即拒绝 `401`：

1. `X-Internal-App-Id` 在白名单内（如网关只接受 `custody-backend`）。
2. `|now - X-Internal-Timestamp| <= 5 分钟`（可配置 `INTERNAL_CHANNEL_TOLERANCE_MS`）。
3. `nonce` 未在窗口内出现过（缓存复用现有 `NonceCache`，key 为 `appId:nonce`）。
4. HMAC 签名校验通过（**常数时间比较**，`MessageDigest.isEqual` 语义）。
5. 失败时**不返回具体原因**，统一返回 `401 { code: 40101, message: "Unauthorized" }`。

#### 3.1.4 出站改造（网关侧，不依赖 Custody 即刻可用）

```ts
// forward.controller.ts
const headers = {
  'x-trace-id': traceId,
  'x-internal-app-id': 'openplatform-gateway',
  'x-internal-timestamp': String(Date.now()),
  'x-internal-nonce': generateNonce(),
};
headers['x-internal-signature'] = signInternalRequest({
  secret: config.internalChannelSecret,
  method: config.method,
  path: backendPath,
  appId: 'openplatform-gateway',
  timestamp: headers['x-internal-timestamp'],
  nonce: headers['x-internal-nonce'],
  body: req.body?.business,
});
```

> **兼容策略**：Custody 尚未上线校验时，网关可先按开关 `INTERNAL_CHANNEL_SIGN_OUTBOUND=true` 携带签名头（Custody 忽略即可），双方就绪后翻转 Custody 侧 `INTERNAL_CHANNEL_ENFORCE=true` 开始强制校验。零停机。

#### 3.1.5 入站改造（网关侧，可独立先行）

新增中间件 `internalChannelAuthMiddleware`，挂载到：

| 路由 | 中间件 |
|------|--------|
| `POST /api/thirdparty/oauth/verify` | `internalChannelAuthMiddleware` |
| `POST /api/thirdparty/custody/callback` | `internalChannelAuthMiddleware` |

**灰度**：`INTERNAL_CHANNEL_ENFORCE=false` 时只校验并记录告警（shadow mode），`true` 时强制拒绝。便于先观察 Custody 是否已按格式签名。

---

### 3.2 网关侧加固（P1，不依赖 Custody）

| 措施 | 实现 |
|------|------|
| **错误脱敏** | `custody/callback` 错误响应改为通用文案：`{ code: 400103, message: "Request rejected" }`；详细原因仅写入服务端审计日志（含 traceId） |
| **内部路由独立限流** | `oauth/verify`：按来源 IP + resourceKey 限流（如 100/min）；`custody/callback`：按 resourceKey 限流（如 300/min） |
| **请求体大小限制** | 内部回调单独挂 `express.json({ limit: '256kb' })` |
| **traceId 信任策略** | 外部 `x-trace-id` 仅作为"候选"，服务端生成 `serverTraceId`，审计日志同时记录两者；优先使用签名后的 traceId（未来可纳入 HMAC） |
| **IP 白名单 / mTLS** | 若网络层可控：内网专线 + 安全组仅放行 Custody IP；或双向 TLS。与 HMAC 叠加，纵深防御 |

---

### 3.3 出站可靠性加固（P2，不依赖 Custody）

| 措施 | 实现 |
|------|------|
| **按路由配置重试** | `ForwardRouteConfig` 新增 `retryable?: boolean`（默认 `true`）；`payout`、`merchant/register`、`submit-task` 等非幂等路由设为 `false` 或仅对连接层错误重试 |
| **Idempotency-Key** | 对非幂等路由，网关生成 `Idempotency-Key`（基于 `appId + 业务唯一键 + 请求体哈希`）并透传；Custody 侧按 key 去重 |
| **超时分级** | 查询类 10s，写操作 30s（沿用），批量/导出类 60s |
| **熔断** | 连续 5xx 超阈值时快速失败，避免雪崩 |

---

## 4. 实施计划

| 阶段 | 内容 | 依赖 | 预估 |
|------|------|------|------|
| **Phase 0** | 本方案评审通过，生成 `INTERNAL_CHANNEL_SECRET` 并注入 beta/testing | 无 | 0.5d |
| **Phase 1** | 网关：出站签名（开关开启）+ 入站中间件（shadow mode）+ 错误脱敏 + 内部限流 | 无（可单独上线） | 1.5d |
| **Phase 2** | Custody：出站回调签名 + 入站校验（shadow mode） | Custody 排期 | 1d |
| **Phase 3** | 双方 `ENFORCE=true`，持续观察 7 天 | Phase 1+2 | 观察期 |
| **Phase 4** | 重试策略 / Idempotency-Key / 熔断 | 无 | 1d |
| **Phase 5** | 密钥轮换演练（双密钥机制验证） | 全部 | 0.5d |

**零停机上线顺序**：
1. 双方先只"携带签名但不校验"（sign-only）
2. 双方开启"校验但只告警"（shadow，观察 3-7 天，确认零误杀）
3. 双方同时切 `ENFORCE=true`

---

## 5. 验收标准

- [ ] 未携带签名头直连 Custody `/api/third-party/*` 返回 `401`（Phase 3 后）
- [ ] 未携带签名直连网关 `/oauth/verify`、`/custody/callback` 返回 `401`
- [ ] 篡改 body / path / timestamp 任一字段，签名校验失败
- [ ] 时间戳超出 ±5 分钟被拒
- [ ] 同一 nonce 二次使用被拒
- [ ] 错误响应不包含 resourceKey / appId / callbackUrl 等内部标识
- [ ] 非幂等路由在 5xx 时不再自动重试
- [ ] 内部路由限流生效（超限返回 429）
- [ ] 密钥轮换后旧密钥在窗口期内仍可用，窗口外失效
- [ ] 审计日志同时记录外部 traceId 与服务端 traceId

---

## 6. 待确认事项

1. **Custody 侧技术栈**：确认其签名/验签实现的语言与库，确保 HMAC-SHA256 + 排序 JSON 口径完全一致（建议双方共用同一套测试向量）。
2. **网络隔离可行性**：Custody 是否部署在固定出口 IP / VPC，以便叠加 IP 白名单。
3. **是否需要 mTLS**：若已有服务网格（Istio/Linkerd），优先用 mTLS 替代 HMAC；若两者都有，HMAC 作为应用层兜底。
4. **nonce 缓存容量**：5 分钟窗口内的高频内部调用量，需评估 Redis 容量与 TTL。
5. **ID 体系对齐**：`INTERNAL_CHANNEL_SECRET` 的托管方式（K8s Secret vs Vault）需与运维确认。

---

## 附录 A：签名实现参考（Node.js）

```ts
import crypto from 'crypto';

function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj as object).sort()) {
    sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

export function signInternalRequest(params: {
  secret: string;
  method: string;
  path: string;
  appId: string;
  timestamp: string;
  nonce: string;
  body?: unknown;
}): string {
  const { secret, method, path, appId, timestamp, nonce, body } = params;
  const bodyDigest = crypto
    .createHash('md5')
    .update(JSON.stringify(sortObjectKeys(body ?? {})))
    .digest('hex');
  const signData = [method.toUpperCase(), path, appId, timestamp, nonce, bodyDigest].join('\n');
  return (
    'sha256=' +
    crypto.createHmac('sha256', secret).update(signData).digest('hex')
  );
}
```

## 附录 B：测试向量

双方联调前须用同一组向量验证实现一致：

```
secret   = "0123456789abcdef0123456789abcdef"
method   = "POST"
path     = "/api/third-party/payout/rak_test_123"
appId    = "openplatform-gateway"
timestamp= "1761350400000"
nonce    = "n0nceTestVector01"
body     = {"unitId":1,"amount":"100.00","to":"TXyz"}
```

期望的 `bodyDigest` 与 `signature` 由任一方用附录 A 实现生成后写入本表，作为联调基准。
