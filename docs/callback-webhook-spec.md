---
title: 回调与消息推送规范
description: 开发者接收开放平台事件通知的技术规范
---

# 回调与消息推送规范 (Callback & Push Notification)

**Last Updated:** 2026-10-19
**Status:** Active

---

## 概述

回调推送是开放平台向开发者服务器主动推送事件通知的机制。当授权创建、交易状态变更等事件发生时，平台会将事件通知发送到开发者预先配置或请求中指定的回调地址。

**核心特性：**
- HMAC-SHA256 签名验证，确保消息来源可信
- 自动重试机制，保证可靠交付
- 支持 HTTPS（生产环境）和 HTTP 本地测试

---

## 事件类型

事件名以 `openplatform-api-service/src/services/application-callback.service.ts` 中的 `CallbackEventType` 为唯一来源，共 9 个：

| 事件名称 | 本仓库中的推送方 | 说明 |
|----------|------------------|------|
| `authorization.created` | `thirdparty.controller.ts`（`oauth/verify` 成功后） | 授权创建。载荷 `{ authorizeId, oauthToken? }`；`oauthToken` 是 `authorizeUrl` 请求传入的 `token`，未传时该字段不存在 |
| `authorization.revoked` | 无 | 枚举已定义，当前仓库没有代码推送 |
| `authorization.expired` | 无 | 同上 |
| `transaction.submitted` | 无 | 同上 |
| `transaction.confirming` | 无 | 同上 |
| `transaction.completed` | `custody/callback` 路由（`thirdparty.routes.ts`） | 由 Custody 调用内部回调后转发给应用 `callbackUrl` |
| `transaction.failed` | `custody/callback` 路由（`thirdparty.routes.ts`） | 同上 |
| `task.approved` | 无 | 枚举已定义，当前仓库没有代码推送 |
| `task.rejected` | 无 | 同上 |

说明：

- 只有 `authorization.created`、`transaction.completed`、`transaction.failed` 在本仓库中有生产者。其余事件名为 Custody 侧事件预留；是否实际下发取决于 Custody 部署，接入方应按事件名做通用处理，不要假设“一定会收到”。
- `POST /api/thirdparty/custody/callback` 由 Custody 服务调用，开发者不调用。该路由要求应用已配置 `callbackUrl`；事件名优先取请求体 `eventType`，否则按 `status === 'SUCCEED'` 映射为 `transaction.completed`，**其余任何状态都映射为 `transaction.failed`**。请求体含 `payload` 字段时仅转发 `payload`；否则转发整个请求体但去掉 `status`、`resourceKey`、`ecode`。
- 另有内部接口 `POST /api/v1/authorizations` 也会推送 `authorization.created`，但其载荷为 `{ authorizationId, resourceKey, expiresAt }`，字段名与本规范描述的 `oauth/verify` 路径（`authorizeId`）不同。

---

## 回调地址配置

### 配置位置

在开发者门户创建应用时，可填写回调地址（Callback URL）：

```
开发者门户 → 应用管理 → 创建应用 → Callback URL
```

### URL 安全要求

| 环境 | 协议要求 | 说明 |
|------|----------|------|
| 生产环境 | HTTPS | 必须使用 HTTPS |
| 开发/测试 | HTTP/HTTPS | 允许 HTTP 仅限 localhost |

---

## 推送请求格式

### HTTP 方法

```
POST <Callback URL>
Content-Type: application/json
```

### 请求头

所有元数据通过请求头传递，请求体仅包含业务数据（`data`）。

| 头部字段 | 必填 | 说明 | 示例 |
|----------|------|------|------|
| `Content-Type` | 是 | 内容类型，固定为 `application/json` | `application/json` |
| `X-App-Id` | 是 | 应用 ID（`Application.id`，即 `basic.appId`） | `550e8400-e29b-41d4-a716-446655440000` |
| `X-Timestamp` | 是 | 推送时间戳（毫秒，字符串）；每次重试重新生成 | `1745220600000` |
| `X-Signature` | 是 | HMAC-SHA256 签名，小写十六进制，前缀 `sha256=` | `sha256=xxxxxx...` |
| `X-Event` | 否 | 事件类型；**仅在事件已设置时发送**，无事件时该头不存在 | `transaction.completed` |

### 请求体

请求体为纯业务数据（即 `data` 对象），平台直接以该对象作为 POST body：

```json
{
  // 事件相关数据
}
```

**说明：**
- `appId`、`event`、`timestamp` 等元数据均在请求头中，请求体只承载业务数据本身；不要期望请求体里出现任何包装字段。

### 两条回调路径的 `X-Event` 差异

本仓库存在两条回调推送路径，`X-Event` 行为不同，接收方必须同时兼容：

| 路径 | 触发方式 | 事件设置 | `X-Event` |
|------|----------|----------|-----------|
| 授权回调（payload `callback`） | Custody 调用内部 `oauth/verify`，JWT 携带开发者通过 `authorizeUrl` 的 `callback` 传入的地址 | **不设置** | **不发送** |
| 授权回调（应用默认 `callbackUrl`） | 同上，但 JWT 未携带 `callback`，回落到应用配置的 `callbackUrl` | `authorization.created` | 发送，值为 `authorization.created` |
| 业务回调 | Custody 调用 `POST /api/thirdparty/custody/callback`，网关转发到应用 `callbackUrl` | `transaction.completed` / `transaction.failed` | 发送 |

- 回调地址优先级：`authorizeUrl` 的 `callback` > 应用配置的 `callbackUrl`。两者都没有时不会推送。
- 在 payload `callback` 路径下，事件语义仍是授权创建，但只能从载荷（`authorizeId`）判断，不能依赖 `X-Event`。
- 验签时请先判断 `X-Event` 是否存在，再选择带事件段或不带事件段的签名串（见下节）。

---

## 签名验证

### 签名算法

使用 HMAC-SHA256 算法验证消息的完整性和来源。**`data` 参与签名**，防止请求体被篡改。

**签名公式：**

```
有事件：signData = appId + "." + event + "." + timestamp + "." + md5(sortedJSON(data))
无事件：signData = appId + "." + timestamp + "." + md5(sortedJSON(data))
X-Signature  = "sha256=" + lowerHex(HMAC-SHA256(appSecret, signData))
```

**说明：**
- `appId`: 应用 ID（`X-App-Id`）
- `event`: 事件类型（`X-Event`）；该头不存在时签名串不包含事件段
- `timestamp`: `X-Timestamp` 头部的值（毫秒字符串）
- `data`: 请求体中的业务数据对象。`sortedJSON` 会递归排序对象 key；数组元素保序，但数组内的对象同样排序；`null` 保留并参与序列化
- `appSecret`: 应用密钥，仅作为 HMAC 密钥，不参与字符串拼接
- `X-Signature` 头部带 `sha256=` 前缀，比较前需去掉
- 接收方必须根据 `X-Event` 是否存在选择对应拼接方式；这是两条回调路径（payload `callback` 与默认 `callbackUrl`）验签结果不同的唯一原因

### 签名示例

以下为固定输入的实际计算结果（`appSecret = sk_demo_secret_9f8e7d6c`），可用于自测。

**请求头：**

```http
X-App-Id: 550e8400-e29b-41d4-a716-446655440000
X-Event: transaction.completed
X-Timestamp: 1792404000000
X-Signature: sha256=a5579ed42e4dd08de06b58be599b534b1141f70f353affdf292330501acd3ea4
```

**请求体（`data`）：**

```json
{
  "orderId": "ORDER-20261019-001",
  "unitId": 80,
  "amount": 100,
  "coinId": "USDT",
  "network": "TRC20",
  "status": "SUCCEED",
  "taskId": "task-20261019-003",
  "txId": "0xabc123"
}
```

**签名数据构造（有事件）：**

```
sortedJSON(data) = {"amount":100,"coinId":"USDT","network":"TRC20","orderId":"ORDER-20261019-001","status":"SUCCEED","taskId":"task-20261019-003","txId":"0xabc123","unitId":80}
md5(sortedJSON(data)) = bafebc702c519d75e2e3682b72ec2c13
signData = "550e8400-e29b-41d4-a716-446655440000.transaction.completed.1792404000000.bafebc702c519d75e2e3682b72ec2c13"
HMAC-SHA256 = a5579ed42e4dd08de06b58be599b534b1141f70f353affdf292330501acd3ea4
```

**同一份 `data` 与时间戳、但不带事件时（payload `callback` 路径）：**

```
signData = "550e8400-e29b-41d4-a716-446655440000.1792404000000.bafebc702c519d75e2e3682b72ec2c13"
HMAC-SHA256 = 27cb791bd95c41922058729f9801eea94de2753ef66662321db8cbd930e30885
```

### 各语言实现示例

#### Node.js

```javascript
const crypto = require('crypto');

function sortObjectKeys(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sortObjectKeys);
    const sorted = {};
    for (const key of Object.keys(obj).sort()) {
        sorted[key] = sortObjectKeys(obj[key]);
    }
    return sorted;
}

function verifySignature(appSecret, appId, event, timestamp, signature, data) {
    // 构建签名数据
    let signData = appId;
    if (event) {
        signData += '.' + event;
    }
    signData += '.' + timestamp;
    if (data !== undefined) {
        const dataMd5 = crypto.createHash('md5').update(JSON.stringify(sortObjectKeys(data))).digest('hex');
        signData += '.' + dataMd5;
    }

    // 计算 HMAC-SHA256
    const expected = crypto
        .createHmac('sha256', appSecret)
        .update(signData)
        .digest('hex');

    // 提取请求中的签名
    const requestSignature = signature.replace('sha256=', '');

    // 常数时间比较，防止时序攻击
    return crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(requestSignature)
    );
}

// 使用示例
const appSecret = 'your-app-secret';
const signature = req.headers['x-signature'];
const timestamp = req.headers['x-timestamp'];
const event = req.headers['x-event'];
const appId = req.headers['x-app-id'];
const data = req.body;  // 请求体即业务数据

if (!verifySignature(appSecret, appId, event, timestamp, signature, data)) {
    return res.status(401).json({ error: 'Invalid signature' });
}
```

#### Python

```python
import hmac
import hashlib
import json

def sort_keys(obj):
    if isinstance(obj, dict):
        return {k: sort_keys(obj[k]) for k in sorted(obj)}
    if isinstance(obj, list):
        return [sort_keys(item) for item in obj]
    return obj

def verify_signature(app_secret: str, app_id: str, event: str, timestamp: str, signature: str, data=None) -> bool:
    # 构建签名数据
    sign_data = app_id
    if event:
        sign_data += '.' + event
    sign_data += '.' + timestamp
    if data is not None:
        data_md5 = hashlib.md5(json.dumps(sort_keys(data), separators=(',', ':')).encode('utf-8')).hexdigest()
        sign_data += '.' + data_md5

    # 计算 HMAC-SHA256
    expected = hmac.new(
        app_secret.encode('utf-8'),
        sign_data.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    # 提取请求中的签名
    request_signature = signature.replace('sha256=', '')

    # 常数时间比较
    return hmac.compare_digest(expected, request_signature)

# 使用示例
@app.route('/callback', methods=['POST'])
def handle_callback():
    signature = request.headers.get('X-Signature', '')
    timestamp = request.headers.get('X-Timestamp', '')
    event = request.headers.get('X-Event', '')
    app_id = request.headers.get('X-App-Id', '')
    data = request.json  # 请求体即业务数据
    app_secret = get_app_secret(app_id)

    if not verify_signature(app_secret, app_id, event, timestamp, signature, data):
        return jsonify({'error': 'Invalid signature'}), 401

    # 处理回调
    ...
```

#### Go

```go
package main

import (
    "crypto/hmac"
    "crypto/md5"
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "sort"
    "strings"
)

func sortedJSON(data map[string]interface{}) string {
    keys := make([]string, 0, len(data))
    for k := range data {
        keys = append(keys, k)
    }
    sort.Strings(keys)
    ordered := make(map[string]interface{}, len(data))
    for _, k := range keys {
        ordered[k] = data[k]
    }
    b, _ := json.Marshal(ordered)
    return string(b)
}

func verifySignature(appSecret, appId, event, timestamp, signature string, data map[string]interface{}) bool {
    // 构建签名数据
    signData := appId
    if event != "" {
        signData += "." + event
    }
    signData += "." + timestamp
    if data != nil {
        sum := md5.Sum([]byte(sortedJSON(data)))
        signData += "." + hex.EncodeToString(sum[:])
    }

    // 计算 HMAC-SHA256
    mac := hmac.New(sha256.New, []byte(appSecret))
    mac.Write([]byte(signData))
    expected := hex.EncodeToString(mac.Sum(nil))

    // 提取请求中的签名
    requestSignature := strings.TrimPrefix(signature, "sha256=")

    // 常数时间比较
    return hmac.Equal([]byte(expected), []byte(requestSignature))
}
```

#### Java

```java
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.TreeMap;

public class CallbackVerifier {

    public static boolean verifySignature(
            String appSecret,
            String appId,
            String event,
            String timestamp,
            String signature,
            Map<String, Object> data) throws Exception {

        // 构建签名数据
        StringBuilder signData = new StringBuilder(appId);
        if (event != null && !event.isEmpty()) {
            signData.append(".").append(event);
        }
        signData.append(".").append(timestamp);
        if (data != null) {
            String sortedJson = new ObjectMapper().writeValueAsString(new TreeMap<>(data));
            String dataMd5 = md5(sortedJson);
            signData.append(".").append(dataMd5);
        }

        // 计算 HMAC-SHA256
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKeySpec = new SecretKeySpec(
            appSecret.getBytes(StandardCharsets.UTF_8),
            "HmacSHA256"
        );
        mac.init(secretKeySpec);
        byte[] hash = mac.doFinal(signData.toString().getBytes(StandardCharsets.UTF_8));
        String expected = bytesToHex(hash);

        // 提取请求中的签名
        String requestSignature = signature.replace("sha256=", "");

        // 常数时间比较
        return MessageDigest.isEqual(
            expected.getBytes(StandardCharsets.UTF_8),
            requestSignature.getBytes(StandardCharsets.UTF_8)
        );
    }

    private static String md5(String input) throws Exception {
        MessageDigest md = MessageDigest.getInstance("MD5");
        return bytesToHex(md.digest(input.getBytes(StandardCharsets.UTF_8)));
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
```

---

## 重试机制

### 重试策略

当回调推送失败时，平台会自动重试。参数来自 `application-callback.service.ts` 的 `CALLBACK_CONFIG` 与 `sendWithRetry()` 循环：

| 参数 | 值 | 说明 |
|------|-----|------|
| 最大重试次数 | 3 次 | 加上初始请求共 4 次尝试 |
| 重试间隔（配置） | 0s, 1s, 5s, 30s | `retryDelays: [0, 1000, 5000, 30000]` |
| 实际使用的间隔 | 0s, 1s, 5s | 当前循环最多 4 次尝试，第 4 次重试不会发生，因此 30s 档位不可达 |
| 单次请求超时 | 30s | 超时视为网络错误 |

> **已知限制（对应集成指南第 14.5 节）：** `retryDelays` 配置了 4 个值，但 `maxRetries: 3` 意味着只有 3 次重试，实际间隔为第 2 次尝试前 0s、第 3 次前 1s、第 4 次前 5s。`retryDelay()` 的 30s 兜底仅在尝试序号超出数组时才生效，当前循环不会走到该分支。因此不要把 30s 档位纳入接收方的可用性设计。

### 重试条件

**会重试的情况：**
- HTTP 状态码 429（限流）
- HTTP 状态码 5xx（服务器错误）
- 网络错误（`ECONNABORTED` / `ETIMEDOUT` / 无响应）

**不会重试的情况：**
- HTTP 状态码 2xx（成功）
- 其他 4xx（客户端错误，立即失败）
- 载荷超过 64KB：发送前直接放弃（`payload_too_large`），不会发出请求

### 超时处理

- 单次请求超时：30 秒
- 超时视为网络错误，触发重试
- 每次重试都会重新生成 `X-Timestamp` 并重新计算签名，接收方不能用第一次的时间戳校验后续尝试

---

## 数据格式示例

以下示例中的 JSON 就是请求体原文；`appId`、`event`、`timestamp` 等元数据只出现在请求头中，**请求体没有外层包装**。

### authorization.created 事件

请求头（应用默认 `callbackUrl` 路径）：

```http
Content-Type: application/json
X-App-Id: 550e8400-e29b-41d4-a716-446655440000
X-Timestamp: 1745220600000
X-Signature: sha256=<hex>
X-Event: authorization.created
```

请求体：

```json
{
  "authorizeId": "123e4567-e89b-12d3-a456-426614174000",
  "oauthToken": "developer-provided-token-if-any"
}
```

> 走 `authorizeUrl` 的 `callback` 参数路径时，请求体相同，但**没有 `X-Event` 头**，签名串也不含事件段。`oauthToken` 仅在 `authorizeUrl` 请求传了 `token` 时存在。

### transaction.completed 事件

请求头：

```http
Content-Type: application/json
X-App-Id: 550e8400-e29b-41d4-a716-446655440000
X-Timestamp: 1745220600000
X-Signature: sha256=<hex>
X-Event: transaction.completed
```

请求体（字段取决于 Custody 转发内容）：

```json
{
  "orderId": "ORDER-20261019-001",
  "taskId": "task-20261019-003",
  "txId": "0xabc123",
  "amount": 100,
  "coinId": "USDT",
  "network": "TRC20"
}
```

> 事件名由 Custody 请求体的 `status` 推导；若 Custody 直接传整个请求体（未使用 `payload` 字段），网关转发前会删除 `status`、`resourceKey`、`ecode`，因此请求体中通常看不到 `status`。

### transaction.failed 事件

与 `transaction.completed` 结构相同，`X-Event` 为 `transaction.failed`。

---

## 最佳实践

### 1. 幂等处理

回调处理器应当支持幂等操作，避免重复处理：

```javascript
// 使用幂等键避免重复处理。注意：payload callback 路径没有 X-Event，
// 因此用事件主键（authorizeId / orderId）优先，事件名与时间戳仅作兜底。
function buildIdempotencyKey(req) {
    const event = req.headers['x-event'] || 'no-event';
    const primaryKey = req.body.authorizeId || req.body.orderId || req.body.taskId;
    if (primaryKey) {
        return `${event}:${primaryKey}`;
    }
    return `${req.headers['x-app-id']}:${event}:${req.headers['x-timestamp']}`;
}

async function handleCallback(req, res) {
    const eventId = buildIdempotencyKey(req);

    // 检查是否已处理
    const processed = await redis.get(`processed:${eventId}`);
    if (processed) {
        return res.status(200).json({ status: 'already_processed' });
    }

    // 处理业务逻辑
    await processEvent(req.body);

    // 标记为已处理
    await redis.set(`processed:${eventId}`, '1', 'EX', 86400);

    res.status(200).json({ status: 'ok' });
}
```

### 2. 快速响应

回调处理应当快速返回，异步处理业务逻辑：

```javascript
async function handleCallback(req, res) {
    // 立即响应
    res.status(200).json({ status: 'ok' });

    // 异步处理
    setImmediate(() => {
        processEvent(req.body).catch(err => {
            console.error('Failed to process event:', err);
        });
    });
}
```

### 3. 签名验证顺序

建议在处理流程的最早阶段验证签名：

```
1. 验证签名 (最快失败)
2. 解析请求体
3. 检查重复事件
4. 业务处理
```

### 4. 日志记录

记录所有回调事件以便审计和排查：

```javascript
function handleCallback(req, res) {
    logger.info('Callback received', {
        timestamp: req.headers['x-timestamp'],
        event: req.headers['x-event'],
        signature: req.headers['x-signature'],
        appId: req.headers['x-app-id']
    });
    // ...
}
```

---

## 错误处理

### 开发者服务器返回

| HTTP 状态 | 含义 | 平台行为 |
|-----------|------|----------|
| 2xx | 成功 | 不重试 |
| 429 | 限流 | 重试 |
| 5xx | 服务器错误 | 重试 |
| 其他 4xx | 客户端错误 | 不重试 |

### 开发者侧处理建议

```javascript
// 推荐：成功处理返回 200
res.status(200).json({ received: true });

// 推荐：接受但稍后处理
res.status(202).json({ accepted: true, message: 'Queued for processing' });

// 不推荐：返回空响应
res.status(204); // 平台可能无法确定是否成功
```

---

## 限制说明

| 项目 | 限制值 | 说明 |
|------|--------|------|
| 最大 payload 大小 | 64KB | 发送前按 `JSON.stringify(data).length` 判断，超过则直接放弃（`payload_too_large`），不会发出请求；按字符数而非 UTF-8 字节数计算 |
| 最大回调 URL 长度 | 191 字符 | 数据库列为 `VARCHAR(191)` |
| 单次请求超时 | 30 秒 | 超时触发重试 |
| 最大重试次数 | 3 次 | 共 4 次尝试后放弃 |

---

## 调试与测试

### 本地测试

开发环境下可以使用 HTTP 协议测试回调：

```javascript
// 使用 ngrok 暴露本地服务
ngrok http 3000

// 配置回调地址为 ngrok 提供的 HTTPS URL
// 例如：https://abc123.ngrok.io/callback
```

### 回调测试工具

可以使用以下工具测试回调接收：

```bash
# 使用 nc 监听端口
nc -l 3000

# 使用 npx 启动测试服务
npx serve . -l 3000
```

---

## 相关文档

| 文档 | 说明 |
|------|------|
| [消息签名规范](./signature-spec.md) | API 请求签名机制 |
| [OAuth 集成指南](./oauth-integration.md) | OAuth 认证流程 |
| [开发者门户](../openplatform-web/developer-portal/) | 应用管理界面 |

---

## 版本历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| 1.0 | 2026-04-20 | 初始版本 |
| 1.1 | 2026-10-19 | 对齐 `CallbackEventType` 与推送实现：请求体改为纯业务数据、补充两条路径的 `X-Event` 差异、修正重试间隔（30s 档位不可达）与限制值 |