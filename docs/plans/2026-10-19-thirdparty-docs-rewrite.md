# 开放平台对外文档重写 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 `docs/thirdparty-integration-guide.md` / `.html` 完全重写为与当前网关（22 条转发接口 + 6 条本地接口）和三个 SDK（Node 1.1.0 / Java 1.2.0 / Web 1.0.5）一致的对外接入指南，并同步修正 `signature-spec.md`、`callback-webhook-spec.md`，新增 `docs/README.md` 索引。

**Architecture:** 先写一个可执行的「路由覆盖校验脚本」作为验收测试（从 `forward-routes.ts` 解析全部 inboundPath，断言 md 与 html 中都出现）；随后按章节分批重写 Markdown；HTML 手写单文件、复用现有 wiki 侧边栏骨架，内容与 Markdown 章节一一对应；最后跑校验脚本与章节一致性检查。

**Tech Stack:** Markdown、单文件 HTML/CSS、Node.js（校验脚本，零依赖，用正则解析 TS 配置）、git。

---

## 背景与必读文件

实施前必须通读以下文件，不要凭记忆写接口：

| 文件 | 用途 |
|------|------|
| `openplatform-api-service/src/config/forward-routes.ts` | **唯一权威**的 22 条转发路由（inboundPath → upstream route → paramMapping） |
| `openplatform-api-service/src/routes/thirdparty.routes.ts` | 本地实现的 6 条接口（oauth/token、authorizeUrl、verify、merchant/register、custody/callback、catch-all） |
| `openplatform-api-service/src/controllers/thirdparty/thirdparty.controller.ts` | authorizeUrl 的 business 参数（**没有 redirectUri**）、verify 的返回、授权回调 |
| `openplatform-api-service/src/services/validators/common.validator.ts` | 签名校验的真实实现（`verifyBasicSignature` / `verifyResourceSignature` / `sortObjectKeys`） |
| `openplatform-api-service/src/services/application-callback.service.ts` | 回调事件名、请求头、重试策略 |
| `openplatform-api-service/src/config/rate-limit-rules.ts` | 限流 tier 配置 |
| `openplatform-api-service/src/services/quota.service.ts` | 每日配额（fail-closed） |
| `openplatform-sdk/node/README.md` | Node SDK 1.1.0 已核对过的接口签名 |
| `openplatform-sdk/java/README.md` | Java SDK 1.2.0 已核对过的接口签名 |
| `docs/signature-spec.md`、`docs/callback-webhook-spec.md` | 待同步修改的规范 |

**硬性事实（写文档时不得写错）：**

1. 业务接口路径前缀是 `/api/thirdparty/`，不是 `/third-party/`（那是 custody 后端路径）。
2. `oauth/authorizeUrl` 只接受 `permissions`、`state`、`callback`、`token`；**不存在 `redirectUri`**。
3. `oauth/verify` 需要 `{ resourceKey, oauthToken }`，返回 `{ authorizeId }`。
4. `business` 的 MD5：对象 key 递归排序，**数组元素保序、数组内对象也排序**；`timestamp` 是 **Unix 秒**，容差 300 秒。
5. 地址接口必须同时传 `unitId + accountType + coinId + network`，`coinId/network` 从 `list-unit-account` 的返回获取。
6. 回调请求头为 `X-App-Id`、`X-Timestamp`、`X-Signature: sha256=…`，有事件时加 `X-Event`；签名串是 `appId[.event].timestamp.md5(sortedJSON(data))`，HMAC-SHA256。
7. 重试：初始 + 3 次，间隔 0s / 1s / 5s / 30s；仅 429、5xx、网络错误重试。
8. 配额超限返回业务码 `42901`；配额服务异常时拒绝请求（fail-closed）。
9. 错误码：`400xxx` 参数、`401xx` 认证、`403xx` 权限、`400103` 资源键不存在、`120042` 归集来源账户不允许、`42901` 配额/限流、`5xx` 上游。
10. SDK 版本与坐标：
    - Node：`@cregis-kit/openplatform-node@1.1.0`
    - Java：`com.github.ZoranWong.custody-openplatfrom:cregis-sdk-core:java-sdk-v1.2.0`（JitPack）
    - Web：`@cregis-kit/openplatform-webkit@1.0.5`

---

## Task 1: 建立路由覆盖校验脚本（验收测试）

**Files:**
- Create: `docs/scripts/verify-integration-guide.mjs`
- Test target: `docs/thirdparty-integration-guide.md`（当前应失败）

**Step 1: 写校验脚本**

```js
#!/usr/bin/env node
// docs/scripts/verify-integration-guide.mjs
// 零依赖：解析 forward-routes.ts 的 inboundPath，校验 md/html 是否全部覆盖。
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');

const routesSrc = readFileSync(
  resolve(root, 'openplatform-api-service/src/config/forward-routes.ts'),
  'utf8',
);
const inbound = [...routesSrc.matchAll(/inboundPath: '([^']+)'/g)].map((m) => m[1]);

// 本地实现的接口（不在 forward-routes.ts 中）
const localRoutes = [
  '/api/thirdparty/oauth/authorizeUrl',
  '/api/thirdparty/oauth/verify',
  '/api/thirdparty/oauth/token',
  '/api/thirdparty/custody/callback',
  '/api/oauth/appToken/refresh',
  '/api/oauth/revoke',
  '/api/oauth/appToken/validate',
];

const expected = [...inbound, ...localRoutes].map((p) => p.replace(/\{[^}]+\}/g, '{'));

const targets = process.argv.slice(2);
if (targets.length === 0) {
  targets.push(resolve(root, 'docs/thirdparty-integration-guide.md'),
                 resolve(root, 'docs/thirdparty-integration-guide.html'));
}

let failed = false;
for (const file of targets) {
  if (!existsSync(file)) { console.error(`MISSING FILE: ${file}`); failed = true; continue; }
  const text = readFileSync(file, 'utf8');
  const normalized = text.replace(/\{[^}]+\}/g, '{').replace(/\{unitId\}\/\{accountTypy\}/g, '{');
  const missing = expected.filter((p) => !normalized.includes(p) && !normalized.includes(p.replace('/api/thirdparty/', '')));
  if (missing.length) {
    failed = true;
    console.error(`\n${file}: missing ${missing.length} route(s)`);
    missing.forEach((m) => console.error(`  - ${m}`));
  } else {
    console.log(`${file}: all ${expected.length} routes documented`);
  }
}
process.exit(failed ? 1 : 0);
```

**Step 2: 运行脚本，确认失败**

Run: `node docs/scripts/verify-integration-guide.mjs`
Expected: FAIL，输出形如 `docs/thirdparty-integration-guide.md: missing 9 route(s)`（当前文档只有 13 个接口）。

**Step 3: 提交脚本**

```bash
git add docs/scripts/verify-integration-guide.mjs
git commit -m "docs: add route coverage verifier for the integration guide"
```

---

## Task 2: 重写 Markdown 第 1–6 章（总览、流程、入驻、签名、OAuth、通用约定）

**Files:**
- Modify: `docs/thirdparty-integration-guide.md`（整体替换，1–6 章先落地）

**Step 1: 按以下结构重写文件前六章**

```markdown
# Cregis 开放平台 - 第三方开发者接入指南

> 适用版本：Node SDK 1.1.0 / Java SDK 1.2.0 / Web SDK 1.0.5
> 接口基数：网关对外 22 条业务接口 + 7 条本地接口

## 目录

## 1. 概述
- 平台定位、三种业务模式（Individual Custody / Crypto Payment / Corporate Treasury）
- 本指南覆盖范围（开发者后台入驻 + 对外 API + 回调）

## 2. 接入总览
- Mermaid 或 ASCII 端到端时序：注册 → KYB → 订阅 → 授权 → 业务调用
- 一张「你负责什么 / 平台负责什么」对照表

## 3. 开发者入驻
3.1 注册（POST /api/v1/isv/auth/register）→ kybStatus=pending
3.2 管理员审核（POST /api/v1/admin/kyb/:id/approve|reject），需说明这是运营侧动作
3.3 登录（POST /api/v1/isv/auth/login，需 captcha）
3.4 创建应用（POST /api/v1/isv/applications）→ appId + appSecret
3.5 订阅套餐（GET /api/v1/isv/packages、POST /api/v1/isv/orders）→ dailyApiLimit
3.6 凭证安全（appSecret 只展示一次、泄露需 regenerate-secret）

## 4. 认证与签名
4.1 两种签名对照表（Basic / Resource）
4.2 签名串公式与字段说明（timestamp 秒、nonce 32 位）
4.3 business 规范化规则（递归排序；数组保序、数组内对象排序）
4.4 完整 Node.js / Java 计算示例（可直接运行的最小代码）
4.5 常见验签失败原因表（时间戳、nonce 重放、数组未排序、字段被网关改写）

## 5. OAuth 授权流程
5.1 步骤总览（authorizeUrl → 用户授权 → oauthToken → verify → authorizeId）
5.2 POST /api/thirdparty/oauth/authorizeUrl（Basic 签名；参数表：permissions/state/callback/token）
5.3 授权页交互（URL 参数、iframe postMessage、redirectUri 仅授权页使用）
5.4 POST /api/thirdparty/oauth/verify（{ resourceKey, oauthToken } → { authorizeId }，幂等）
5.5 POST /api/thirdparty/oauth/token（issueOauthToken，注明实现现状与适用场景）
5.6 授权回调（authorization.created，载荷 authorizeId + oauthToken）

## 6. 通用约定
6.1 请求结构 basic + business 与统一响应 envelope
6.2 分页（pageSize/pageNum vs pageIndex）
6.3 幂等（orderId、legalName、邮箱）
6.4 每日配额（42901，fail-closed）
6.5 限流（free/basic/pro/enterprise 四档的具体数值，来自 rate-limit-rules.ts）
6.6 traceId 与排障
6.7 错误码速查表
```

**Step 2: 校验章节存在且脚本进度提升**

Run: `grep -cE '^## [0-9]+\. ' docs/thirdparty-integration-guide.md`
Expected: `6`（第 1–6 章）

Run: `node docs/scripts/verify-integration-guide.mjs docs/thirdparty-integration-guide.md`
Expected: 仍 FAIL（API 章节尚未写），missing 数量应少于 Task 1 的初始值。

**Step 3: 提交**

```bash
git add docs/thirdparty-integration-guide.md
git commit -m "docs: rewrite integration guide sections 1-6"
```

---

## Task 3: 重写第 7–12 章（API 参考）

**Files:**
- Modify: `docs/thirdparty-integration-guide.md`

每个接口固定模板（缺一不可）：

```markdown
#### 7.1 创建财务单元
**POST** `/api/thirdparty/treasury/create` · 鉴权：Resource 签名

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|

**请求**
```json
{ "basic": { ... }, "business": { ... } }
```
**响应**
```json
{ "code": 200, "message": "SUCCESS", "data": { ... } }
```
**常见业务码**：400 / 400xxx
```

**Step 1: 写第 7 章 财务单元**（4 个接口）
- `treasury/create`、`treasury/create-custom`、`treasury/list`、`treasury/list-unit-account/{unitId}`
- `list` 返回**数组**而非分页包装，必须写明

**Step 2: 写第 8 章 地址**（4 个接口）
- `treasury/address`、`treasury/address-by-account/{cusAccountId}`（分页）
- `treasury/create-unit-address/{unitId}/{accountType}/{network}/{coinId}/{number}`
- `treasury/create-unit-address-by-account/{cusAccountId}/{number}`（返回地址数组）
- 必须写明：`accountType + coinId + network` 缺一不可

**Step 3: 写第 9 章 币种/资金控制/白名单**（3 个接口）
- `treasury/add-coins`、`treasury/fund-control-update`、`treasury/whitelist-update`

**Step 4: 写第 10 章 出金与归集**（2 个接口）
- `treasury/payout`（`payTo[]`、`merchantType` 必填；返回审批任务 `taskId`）
- `treasury/pooling`（`fromAccountId`、`address` 必填；120042 限制）

**Step 5: 写第 11 章 任务审批**（1 个接口）
- `treasury/submit-task/{taskId}`；说明 `confirmed` 与多签 `signatures`

**Step 6: 写第 12 章 交易查询**（5 个接口）
- `activities`、`transfer-out-orders`、`transfer-in-orders`、`fund-records`、`unit-fund-records`
- 统一给 `PaginationQuery` 与 `QueryCondition` 定义与示例

**Step 7: 运行覆盖校验**

Run: `node docs/scripts/verify-integration-guide.mjs docs/thirdparty-integration-guide.md`
Expected: `missing 0 route(s)` 或仅剩第 13 章的三条（`merchant/register`、`user/add`、`board/init`）。

**Step 8: 提交**

```bash
git add docs/thirdparty-integration-guide.md
git commit -m "docs: document all treasury, address, payout and transaction endpoints"
```

---

## Task 4: 写第 13–17 章（商户/用户/Board、回调、错误码、SDK、附录）

**Files:**
- Modify: `docs/thirdparty-integration-guide.md`

**Step 1: 第 13 章 商户、用户与 Board**
- `merchant/register`（**Basic 签名，无需 authorizeId**，幂等，返回 `resourceAccessKey`）
- `user/add`、`board/init`
- 用 `registerMerchant` 的真实成功响应做示例（ecode / vaultCode / resourceAccessKey / alreadyExists）

**Step 2: 第 14 章 回调**
- 事件清单（`authorization.created|revoked|expired`、`transaction.submitted|confirming|completed|failed`、`task.approved|rejected`）
- 请求头、签名算法、可运行验签代码（Node）、重试策略、幂等建议
- 收到回调必须 2xx 快速响应

**Step 3: 第 15 章 错误码与排查**
- 平台业务码表 + custody 透传码表（400103 / 120042 / 400001 等）
- 按现象排查：签名失败、400103、空分页地址、42901

**Step 4: 第 16 章 SDK 集成**
- Node：安装、最小示例、方法速查表（24 个方法）
- Java：Maven + JitPack 仓库配置、`CregisClient` 服务入口、同步/异步对照
- Web：授权页嵌入（iframe / 弹窗）、postMessage 事件

**Step 5: 第 17 章 附录**
- 枚举：BusinessScope、Topology、AccountType、VaultAccountType、MerchantType、PayoutOperation、AuditTaskStatus
- 字段类型：PaginatedResponse、FundControl、CoinInfo、WhiteListCreateRequest

**Step 6: 覆盖校验通过**

Run: `node docs/scripts/verify-integration-guide.mjs docs/thirdparty-integration-guide.md`
Expected: `docs/thirdparty-integration-guide.md: all 29 routes documented`

**Step 7: 提交**

```bash
git add docs/thirdparty-integration-guide.md
git commit -m "docs: complete integration guide with merchant, callback and SDK chapters"
```

---

## Task 5: 同步 `signature-spec.md`

**Files:**
- Modify: `docs/signature-spec.md`（在「签名算法」章节后追加/修正）

**Step 1: 补充数组排序规则**

在 business 规范化章节加入明确表述：

```markdown
### business 序列化规则（与网关实现一致）

1. 对象的 key 按字典序升序排列；
2. 数组元素顺序**保持不变**（数组顺序有业务含义）；
3. 数组内的对象**同样要递归排序**；
4. `null` / `undefined` 字段不参与序列化；
5. 空 business 统一序列化为 `{}`。

> 反例：`{"coinIds":[{"network":"TRC20","coinId":"USDT"}]}` 若不排序数组内对象，
> MD5 与网关不一致，会得到 `40102 Invalid signature`。
```

**Step 2: 加入跨语言一致性对照**

- Node `sortKeys`（`openplatform-sdk/node/src/core/signature.ts`）
- Java `Signer.sortKeys`（`openplatform-sdk/java/.../Signer.java`）
- 网关 `sortObjectKeys`（`openplatform-api-service/src/services/validators/common.validator.ts`）
三处必须给出同一条公式，并说明三者已对齐。

**Step 3: 校验**

Run: `grep -n "数组内" docs/signature-spec.md`
Expected: 至少 1 行命中。

**Step 4: 提交**

```bash
git add docs/signature-spec.md
git commit -m "docs: clarify recursive array sorting in signature spec"
```

---

## Task 6: 同步 `callback-webhook-spec.md`

**Files:**
- Modify: `docs/callback-webhook-spec.md`

**Step 1: 对齐事件名**

以 `application-callback.service.ts` 的 `CallbackEventType` 为准：`authorization.created|revoked|expired`、`transaction.submitted|confirming|completed|failed`、`task.approved|rejected`。删除文档中不存在的类型。

**Step 2: 对齐请求头与签名**

- `X-App-Id` / `X-Timestamp` / `X-Signature: sha256=<hex>`，有事件时 `X-Event`
- 签名串 `appId[.event].timestamp.md5(sortedJSON(data))`
- 明确 body **只含业务数据**，元数据只在头里

**Step 3: 对齐重试策略**

初始 + 3 次重试，间隔 0 / 1 / 5 / 30 秒；2xx 成功；429 与 5xx 重试；其他 4xx 不重试；单次超时 30 秒；payload 上限 64KB。

**Step 4: 校验**

Run: `grep -nE "0s|1s|5s|30s|64KB|X-Event" docs/callback-webhook-spec.md`
Expected: 命中重试与请求头相关内容。

**Step 5: 提交**

```bash
git add docs/callback-webhook-spec.md
git commit -m "docs: align callback spec with the implemented events and retry policy"
```

---

## Task 7: 新增 `docs/README.md` 文档索引

**Files:**
- Create: `docs/README.md`

**Step 1: 写索引**

必须说明区分：
- `thirdparty-integration-guide.md/html` — 面向第三方开发者的对外接入指南
- `signature-spec.md` — 通用消息签名规范
- `callback-webhook-spec.md` — 回调推送规范
- `custody-openplatform-api.yaml` — custody 后端上游 OpenAPI（非网关对外接口）
- `api/*.md` — 开发者门户内部 API（登录、应用、账单等），不是开放平台业务接口
- `plans/`、`implementation-artifacts/`、`planning-artifacts/` — 研发过程产物

**Step 2: 校验每个链接文件存在**

Run:
```bash
for f in thirdparty-integration-guide.md signature-spec.md callback-webhook-spec.md custody-openplatform-api.yaml; do test -f docs/$f || echo "MISSING $f"; done
```
Expected: 无输出。

**Step 3: 提交**

```bash
git add docs/README.md
git commit -m "docs: add documentation index"
```

---

## Task 8: 手写 `thirdparty-integration-guide.html`

**Files:**
- Modify: `docs/thirdparty-integration-guide.html`

> **注意：不要用脚本自动转换。** 复用现有文件的 CSS 骨架（第 1–150 行）与 `sidebar` / `wiki-content` 结构，正文按 Task 2–4 的 17 章手工编排。

**Step 1: 保留样式与骨架**

- 保留 `<style>` 段与 `.sidebar`、`.wiki-content`、代码块样式
- 侧边栏 `<a class="nav-item" href="#...">` 与正文 `<h2 id="...">` 一一对应

**Step 2: 逐章写正文**

- 每章 `<h2 id="ch-N">`，接口小节 `<h3>`，接口内参数表 `<table>`
- 代码块用 `<pre><code class="language-json">` 并做 HTML 转义（`&lt;`、`&gt;`、`&amp;`）
- 第 4 章的双语签名示例、第 14 章的验签代码需完整可复制

**Step 3: 校验 HTML**

Run: `node docs/scripts/verify-integration-guide.mjs docs/thirdparty-integration-guide.html`
Expected: `all 29 routes documented`

Run: `python3 - <<'PY'` 检查标签闭合
```python
from html.parser import HTMLParser
class P(HTMLParser):
    def __init__(self):
        super().__init__(); self.stack=[]; self.void={'meta','br','hr','img','input','link','source'}
    def handle_starttag(self,t,a):
        if t not in self.void: self.stack.append(t)
    def handle_endtag(self,t):
        if self.stack and self.stack[-1]==t: self.stack.pop()
        else: print('MISMATCH', t, 'stack tail:', self.stack[-3:])
p=P(); p.feed(open('docs/thirdparty-integration-guide.html').read()); print('unclosed:', p.stack)
PY
```
Expected: 无 `MISMATCH`，`unclosed: []`

**Step 4: 中英标点与转义抽查**

Run: `grep -n '&lt;' docs/thirdparty-integration-guide.html | head -3`
Expected: 代码块转义存在。

**Step 5: 提交**

```bash
git add docs/thirdparty-integration-guide.html
git commit -m "docs: rewrite the HTML integration guide to match the markdown"
```

---

## Task 9: 章节一致性检查与最终验收

**Files:**
- 只读校验，无文件修改（除非发现不一致需回改）

**Step 1: md / html 章节一致**

Run:
```bash
grep -oE '^## [0-9]+\. [^ ]+' docs/thirdparty-integration-guide.md | sed 's/^## //' > /tmp/md-heads.txt
grep -oE '<h2 id="[^"]+">[0-9]+\. [^<]+' docs/thirdparty-integration-guide.html | sed -E 's/<h2 id="[^"]+">//' > /tmp/html-heads.txt
diff /tmp/md-heads.txt /tmp/html-heads.txt
```
Expected: 无差异（或仅标点差异，需要修）。

**Step 2: 全量路由覆盖**

Run: `node docs/scripts/verify-integration-guide.mjs`
Expected:
```
docs/thirdparty-integration-guide.md: all 29 routes documented
docs/thirdparty-integration-guide.html: all 29 routes documented
```

**Step 3: 禁用词检查（防止旧错误回流）**

Run: `grep -n "accountTypy\|redirectUri" docs/thirdparty-integration-guide.md docs/thirdparty-integration-guide.html`
Expected: 无输出。

**Step 4: 提交**

```bash
git add -A docs
git commit -m "docs: finalize third-party integration documentation"
```

---

## Task 10: 推送与交付说明

**Step 1: 推送**

```bash
git push origin main
```

**Step 2: 汇报内容**

汇报必须包含：
- 覆盖的接口数量与校验脚本输出原文
- 三个 SDK 的版本与安装坐标
- 未覆盖/待确认事项（如 `oauth/token` 的实现现状、上级 custody `create` 的 400 问题）

---

## 验收标准（Definition of Done）

1. `node docs/scripts/verify-integration-guide.mjs` 退出码为 0，md 与 html 各覆盖 29 条路由。
2. 文档中不存在 `redirectUri`、`accountTypy` 等与实现不符的表述。
3. md 与 html 的 17 个一级章节一一对应。
4. `signature-spec.md` 明确写出数组递归排序规则。
5. `callback-webhook-spec.md` 的事件名、请求头、重试间隔与实现一致。
6. `docs/README.md` 能正确区分对外文档与内部 API 文档。
7. 无脚本生成 HTML（手工编写，与现有样式一致）。

## 风险与注意事项

- **接口行为以上游 custody 为准**：`treasury/create` 当前对合法载荷也返回 `400 请求参数格式错误`，文档只描述请求约定，并在「常见业务码」中注明该现象由 custody 服务返回。
- **`oauth/token`**：其实现读取 `req.authorizationId`，与 `basicValidationMiddleware` 不匹配；文档应标注为「平台内部/受限接口」，避免误导第三方使用。
- **HTML 转义**：JSON 示例中的 `<`、`>`、`&` 必须转义，否则 HTML 结构会被破坏。
- **不要动 `docs/api/*.md`**：那是开发者门户内部 API，本次不覆盖。
