# 代码缺陷清单（文档评审时发现）

> 来源：`docs/thirdparty-integration-guide.md` 与 `docs/callback-webhook-spec.md` 的规格评审。文档已按「代码即真相」描述现状；
> 本文件记录**代码侧**的问题与修复方案，待后续单独排期修复，不在文档任务中改动。
>
> 验证方式：每条都标注了复现位置。建议修复时同步补测试。

---

## 汇总

| # | 缺陷 | 严重度 | 位置 |
|---|------|--------|------|
| D1 | `permissions` 网关 JSON 序列化与授权页逗号切分不兼容 | **高**（授权流程不可用） | `thirdparty.controller.ts:184` / `App.vue:241` |
| D2 | 授权校验未比对 `appId` 归属 | **高**（越权风险） | `resource-authorization.service.ts:60` |
| D3 | `oauth/token` 的 `resourceKey` 永远为空 | —（接口已移除，2026-10-19） | `thirdparty.controller.ts` |
| D4 | 应用详情接口返回 `appSecret` | **高**（凭证泄露面） | `isv.routes.ts:156-159` |
| D5 | 应用未激活返回错误码 `40104`（语义错误） | 中 | `resource-validation.middleware.ts:195-199` |
| D6 | 限流档位恒为 `basic`，`burstSize` 未生效 | 中 | `rate-limit.middleware.ts:197-206` |
| D7 | `traceId` 未持久化到 `api_logs` | 中 | `api-log.service.ts:31-46` |
| D8 | 回调第 4 次重试的 30s 间隔不可达 | 低 | `application-callback.service.ts:61-62,306` |
| D9 | 授权页在 URL 模式下不注册 message 监听 | 低 | `App.vue:281-286` |
| D10 | 网关 `fail()` 响应结构不统一 | 低 | `forward.controller.ts:128-131` |
| D11 | IP 白名单用 `includes` 比对 CIDR 字符串，私网段永不命中 | 低 | `rate-limit.middleware.ts:86-89` / `rate-limit-rules.ts:167-173` |
| D12 | 授权页解析 `state` 但从不回传；`redirectUri` 只校验不跳转 | 低 | `App.vue:242`、`:177-192` |
| D14 | 回调 HTTP 429 / 5xx 不会重试（`validateStatus` 未配置） | **高**（回调丢失） | `application-callback.service.ts:68-75,253-263,296-303` |

---

## D1 — `permissions` 序列化不兼容

**现象**：`authorizeUrl` 生成的链接里 `permissions` 是 JSON 数组编码，授权页却按逗号切分，两个 `read`/`write` 都变成非法值，页面直接显示 Invalid permission。

```ts
// openplatform-api-service/src/controllers/thirdparty/thirdparty.controller.ts:184
params.set('permissions', JSON.stringify(businessData.permissions));
// → ?permissions=%5B%22read%22%2C%22write%22%5D

// openplatform-web/auth-page/src/App.vue:241
permissions: urlParams.get('permissions')?.split(',') || ['read'],
// → ['["read"', '"write"]']
```

**影响**：只要传入非空 `permissions`，授权页就不可用；当前只能不传（页面回退 `['read']`）。

**修复方案**（二选一，推荐 1）：
1. 网关改为逗号拼接：`params.set('permissions', businessData.permissions.join(','))`，并保留对旧 JSON 格式的兼容：
   ```ts
   const raw = urlParams.get('permissions') || '';
   const parsed = raw.startsWith('[')
     ? JSON.parse(raw)
     : raw.split(',').filter(Boolean);
   ```
2. 授权页改为识别 JSON：先 `JSON.parse`，失败再按逗号切分。

**测试**：`authorizeUrl` 单测断言 URL 中 `permissions=read,write`；授权页单测覆盖两种格式。

---

## D2 — 授权 ID 未校验 appId 归属

**现象**：`checkAuthorization` 仅按 id 查 `oauth_resources`，未比较 `oauthResource.appId === appId`。A 应用拿到 B 应用的 `authorizationId` 后，用自己的 `appSecret` 签名即可通过授权校验。

```ts
// openplatform-api-service/src/services/resource-authorization.service.ts:60
const oauthResource = await repo.findById(authorizationId)
// 之后只校验 status / expiresAt，没有 appId 比对
```

**影响**：跨应用越权访问托管资源，属于高危问题。虽然需要先获知他人 id，但不应该依赖 id 保密。

**修复方案**：查询后立即比对，失败按 `RESOURCE_NOT_AUTHORIZED` 返回：

```ts
if (!oauthResource || oauthResource.appId !== appId) {
  logAuthorizationFailure(appId, authorizationId, 'resource_owner_mismatch')
  return { authorized: false, errorCode: 'RESOURCE_NOT_AUTHORIZED', errorMessage: '...' }
}
```
缓存 key 已包含 `appId`（`cache.get(appId, authorizationId)`），无需额外改动。

**测试**：新增用例——应用 A 使用应用 B 的 authorizationId 调用业务接口，期望 40301。

---

## D3 — `oauth/token` 的资源标识永远为空（已移除）

**现象**：`issueOauthToken` 读取 `req.authorizationId`，但该字段从未被赋值（中间件里的赋值被注释掉，`BasicValidator` 也只提取 appId/timestamp/nonce/signature）。

```ts
// thirdparty.controller.ts (removed)
const resourceKey = req.authorizationId;              // undefined
// resource-validation.middleware.ts:159
// const authorizationId = req.body.basic?.authorizationId as string | undefined;
```

**影响**：签发的 JWT 中 `resourceKey` 恒为 `''`，且该 token 在网关内没有任何消费方（业务接口只接受 Resource 签名，SDK 与授权页也不调用该接口）。

**处理结果（2026-10-19）**：接口实现与路由已删除，`POST /api/thirdparty/oauth/token` 现返回 404。同步清理了 `logOAuthCall` 的 apiName 映射、`fix-apiname.ts`、`basic.validator.ts` 注释、集成指南、`signature-spec.md` 与路由覆盖校验脚本。如需按用户签发访问令牌，应作为新特性重新设计（绑定 `authorizationId`、校验归属、并给业务接口定义 Bearer 校验），而不是恢复本接口。

---

## D4 — 应用详情返回 `appSecret`

**现象**：

```ts
// openplatform-api-service/src/routes/v1/isv.routes.ts:156-159
res.json({ code: 0, message: 'Success', data: { application: app } })
```

列表接口与更新接口都会剥离 `appSecret`，唯独详情接口返回原始记录。

**影响**：前端页面或日志一旦调用/打印详情，凭证即泄露。

**修复方案**：与列表一致，剥离字段：

```ts
const { appSecret: _secret, ...safe } = app
res.json({ code: 0, message: 'Success', data: { application: safe } })
```
若确有展示需求，改为仅返回 `appSecretMasked`（如 `sk_mo4b***`）。

**测试**：详情接口响应断言不含 `appSecret`。

---

## D5 — 应用未激活返回 `40104`（Nonce 重复）

```ts
// resource-validation.middleware.ts:195-199
if (application.status !== 'active') {
  res.status(HttpCodes.UNAUTHORIZED).json({
    code: BusinessCodes.AUTH_DUPLICATE_NONCE,   // 40104 = Duplicate nonce
    message: 'Application is not active',
```

**影响**：客户端收到「nonce 重复」却被告知应用未激活，排障误导。

**修复方案**：新增/使用专用码（如 `AUTH_APP_NOT_ACTIVE = 40106`）并在错误映射中同步；文档与 SDK 错误映射一起更新。

**测试**：停用应用后调用业务接口，断言 `code === 40106`。

---

## D6 — 限流档位恒为 `basic`，突发桶未生效

```ts
// rate-limit.middleware.ts:197-206
// TODO(REAL-1): Query Subscription table for app's package tier
return defaultTier;
```

另外 `TIER_APP_MAPPING` 未被读取，`burstSize` 只定义、未在 `RateLimitService` 中使用。

**影响**：付费套餐的限流额度不会生效；文档只能写「当前固定 basic」。

**修复方案**：
1. `getTierForApp` 查询订阅 → 套餐 → tier，做短 TTL 缓存（如 60s）；
2. 明确 `appid` 来源：当前读取 `req.appid`/`req.body.appid`，第三方请求里 `appId` 只在 `basic.appId`，应改为从验签上下文取；
3. 接入或删除 `burstSize`（令牌桶实现），避免配置项与行为不符。

**测试**：为不同套餐的应用配置不同 tier，断言 429 阈值不同；无订阅时回退 `free`/`basic` 有明确策略。

---

## D7 — `traceId` 未落库

**现象**：`ApiLog` 表有 `trace_id` 字段，但 `createApiLog` 从未赋值；列表接口也无 `traceId` 过滤条件。

```ts
// api-log.service.ts:31-46  createApiLog(...) 未包含 traceId
```

**影响**：无法按 traceId 检索；排障只能从详情响应里的 `requestHeaders` 间接看到。

**修复方案**：
1. `LogContext` 增加 `traceId`，转发时传入（forward.controller 已有 `traceId` 变量）；
2. `createApiLog` 写入 `traceId`；
3. `findByDeveloper` 增加 `traceId` 过滤；ISV/Admin 列表接口与前端加搜索框。

**测试**：调用后按 traceId 查询，返回唯一记录。

---

## D8 — 回调重试间隔 30s 不可达

```ts
retryDelays: [0, 1000, 5000, 30000]
maxAttempts = maxRetries(3) + 1 = 4
// 仅在第 1/2/3 次失败后取 delays[0]/[1]/[2] → 实际 0/1s/5s
```

**影响**：文档若写 0/1/5/30s 会误导；最后一次重试与上一次仅隔 5s。

**修复方案**：把 `maxRetries` 改为 4，或把 `retryDelay` 改为 `delays[attempt]` 并在数组末尾补一个值；同时更新配置注释。

**测试**：mock 连续失败，断言 sleep 调用序列。

---

## D9 — URL 模式下授权页不监听 postMessage

```ts
// App.vue:281-286
const urlData = getTokenFromUrl();
if (urlData) { tryInitialize(urlData); return; }   // 未注册 listenFromParent
```

**影响**：`init` / `cancel` / `close` 等父窗口消息在 authorizeUrl 流程下无效。

**修复方案**：在 `tryInitialize` 之后仍注册监听（只处理 `cancel`/`close`），或在 embed 场景统一走消息协议。注意 URL 与消息初始化不要重复执行。

**测试**：iframe 加载后发送 `close`，断言收到 `authorization_failed(USER_CANCELLED)`。

---

## D10 — 网关错误响应结构不统一

```ts
// forward.controller.ts:128-131
res.status(status).json({ code, message });   // 无 data / trace_id
```

而验签错误返回 `{ code, message, errors, trace_id }`，限流错误返回 `{ code, message, trace_id, original_code }`。

**影响**：客户端无法用统一逻辑读取 `trace_id`。

**修复方案**：`fail()` 统一附加 `trace_id`（从 `req.headers['x-trace-id']` 取）与 `data: null`；保持业务码不变。

**测试**：路由不存在、缺少 resourceKey、配额超限三种场景断言响应含 `trace_id`。

---

## 建议修复顺序

1. **D2、D4、D14**（安全 / 回调可靠性）→ 立即修，补测试
2. **D1、D3**（授权链路不可用）→ 本次迭代
3. **D5、D10**（错误语义/契约）→ 与 SDK 错误映射一起调整
4. **D6、D7**（配额与可观测性）→ 随订阅体系落地
5. **D8、D9、D11、D12**（体验/一致性）→ 顺手修

修复后需要同步更新：
- `docs/thirdparty-integration-guide.md` 的「已知限制」章节
- `openplatform-sdk/node`、`java` 的错误码映射与 README
- 对应的单元/集成测试

---

## D11 — IP 白名单的 CIDR 条目永不命中

```ts
// rate-limit.middleware.ts:86-89
whiteList.ips.includes(ip)

// rate-limit-rules.ts:167-173
export const WHITELIST_IPS = ['127.0.0.1', '::1', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'];
```

**影响**：`10.x` / `172.16-31.x` / `192.168.x` 的客户端不会被豁免，仍受限流；只有回环地址恰好字符串相等才生效。配置看起来像支持网段，实际只支持精确匹配。

**修复方案**：用 CIDR 库（如 `ipaddr.js`）匹配，或把所有条目显式展开成网段判断，并在配置注释中写明「仅支持单 IP」。

**测试**：`10.1.2.3`、`172.20.0.1`、`192.168.1.10` 均应命中白名单。

---

## D12 — 授权页丢弃 `state`、不执行 `redirectUri`

```ts
// App.vue:242
redirectUri: urlParams.get('redirectUri') || undefined,
// 之后仅在 validateAuthData 中校验格式，无 location.assign / window.open
```

**影响**：调用方无法通过 `state` 做 CSRF 校验（页面不回传）；`redirectUri` 存在但无跳转行为，容易让集成方误以为会重定向。

**修复方案**：二选一并锁定契约：
1. 授权成功后 `postMessage({ type: 'authorization_succeed', data: { authorizationId, state } })`，由父页面负责跳转；
2. 若坚持服务端 redirect，则实现 `location.assign(redirectUri + '?authorizationId=...&state=...')`，并对已注册域名做白名单校验。

**测试**：授权成功后断言消息中携带原始 `state`。

---

## D14 — 回调 HTTP 429 / 5xx 不会重试

**现象**：`sendWithRetry()` 中有一段专为 HTTP 状态码准备的重试分支，但实际永远走不到。

```ts
// application-callback.service.ts:68-75
const httpClient = axios.create({
    timeout: CALLBACK_CONFIG.timeout,
    headers: { 'Content-Type': 'application/json' },
    // 没有 validateStatus —— axios 默认只接受 2xx，其余状态直接 reject
})

// :246-263
const response = await httpClient.post(url, data, { headers })  // 非 2xx 会在这里抛异常
if (response.status >= 200 && response.status < 300) { return }
const retryable = response.status === 429 || response.status >= 500  // 不可达
```

异常进入 `catch` 后，`isRetryableNetworkError()`（`:296-303`）只识别：

```ts
axiosError.code === 'ECONNABORTED' ||
axiosError.code === 'ETIMEDOUT' ||
(axiosError.isAxiosError === true && axiosError.response === undefined)
```

HTTP 429 / 5xx 的 `error.response` 已设置，因此返回 `false`，循环立即抛出并结束。实际只有超时、连接中断等“没有拿到响应”的错误会重试。

**影响**：
- 开发者服务返回 `429` / `5xx`（例如短暂不可用、限流）时，平台**不会重试**，事件在首次失败后即丢失；这与文档原先承诺的「429/5xx 会重试」相反。
- `custody/callback` 路由对 Custody 始终返回 HTTP 200，推送失败只写日志，Custody 也不会重投，最终开发者可能完全收不到该交易事件。
- 回调本身没有队列 / 持久化 / 死信，丢失后只能靠对账补救。

**修复方案**（二选一，推荐 1）：
1. 在 `axios.create()` 中设置 `validateStatus: () => true`，让所有 HTTP 响应都进入正常分支，由 `:253` 的 `retryable` 判断决定是否重试；注意成功判定仍保留 `2xx`。
2. 在 `catch` 中检查 `axiosError.response?.status`，把 `429` / `5xx` 也视为可重试：
   ```ts
   const status = (error as AxiosError).response?.status
   const retryable = this.isRetryableNetworkError(error) || status === 429 || (status !== undefined && status >= 500)
   ```
   同时修正日志与返回值，避免把“HTTP 失败”误记为网络错误。

修复后还需按实际情况决定是否把 `maxRetries` 调到 4（见 D8），并更新 `docs/callback-webhook-spec.md` 与集成指南 14.5 / 14.6 的重试契约。

**测试**：
- mock 返回 429 / 500 / 503，断言重试次数为 4（或与 D8 一起调整后的次数）；
- mock 返回 400 / 404，断言不重试；
- mock 超时（`ECONNABORTED`），断言仍会重试。
