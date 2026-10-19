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
- 尽力重试：仅网络/超时类失败会重试，最多共 4 次尝试；平台不持久化回调，最终失败后不保证送达
- 支持 HTTPS（生产环境）和 HTTP 本地测试

**投递保证：** 回调推送是进程内的**尽力而为（best-effort）**机制，没有队列、持久化或死信（dead-letter）重投。推送失败只会在当前进程内按重试策略重试，耗尽后即放弃；进程重启或部署会丢失尚未送出的回调。请通过业务查询接口与对账补偿最终状态，**不要依赖回调作为唯一数据源**（见「最佳实践」）。

## 目录

1. [事件类型](#事件类型)
2. [回调地址配置](#回调地址配置)
3. [推送请求格式](#推送请求格式)
4. [签名验证](#签名验证)
5. [重试机制](#重试机制)
6. [数据格式示例](#数据格式示例)
7. [最佳实践](#最佳实践)
8. [错误处理](#错误处理)
9. [限制说明](#限制说明)
10. [调试与测试](#调试与测试)
11. [相关文档](#相关文档)
12. [版本历史](#版本历史)

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
- **该路由对 Custody 始终返回 HTTP 200**，即使后续推送失败；缺少 `resourceKey`、资源不存在等错误只体现在响应体 `code`（如 `40001`）。Custody 不会因为 HTTP 状态重试，因此开发者可能完全收不到某个事件，必须通过对账 / 查询接口补偿。
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

请求体为纯业务数据（即 `data` 对象），平台直接以该对象作为 POST body。下方是最小示例，实际字段由事件决定（见「数据格式示例」）：

```json
{
  "authorizeId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**说明：**
- `appId`、`event`、`timestamp` 等元数据均在请求头中，请求体只承载业务数据本身；不要期望请求体里出现任何包装字段。

### 两条回调路径的 `X-Event` 差异

本仓库存在两条回调推送路径，`X-Event` 行为不同，接收方必须同时兼容：

| 路径 | 触发方式 | 事件设置 | `X-Event` |
|------|----------|----------|-----------|
| 授权回调（JWT 载荷中的 `callback`） | Custody 调用内部 `oauth/verify`，JWT 携带开发者通过 `authorizeUrl` 的 `callback` 传入的地址 | **不设置** | **不发送** |
| 授权回调（应用默认 `callbackUrl`） | 同上，但 JWT 载荷未携带 `callback`，回落到应用配置的 `callbackUrl` | `authorization.created` | 发送，值为 `authorization.created` |
| 业务回调 | Custody 调用 `POST /api/thirdparty/custody/callback`，网关转发到应用 `callbackUrl` | `transaction.completed` / `transaction.failed` | 发送 |

- 回调地址优先级：`authorizeUrl` 的 `callback` > 应用配置的 `callbackUrl`。两者都没有时不会推送。
- 在 JWT 载荷中的 `callback` 路径下，事件语义仍是授权创建，但只能从载荷（`authorizeId`）判断，不能依赖 `X-Event`。
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
- 接收方必须根据 `X-Event` 是否存在选择对应拼接方式；这是两条回调路径（JWT 载荷中的 `callback` 与默认 `callbackUrl`）验签结果不同的唯一原因

### 签名示例（算法测试向量）

以下固定输入用于验证各语言实现的 `sortedJSON`、MD5 与 HMAC 是否一致，`appSecret = sk_demo_secret_9f8e7d6c`。**它不是一条真实推送的报文形态**：

- 请求体特意包含 `status`、`unitId` 等字段，仅用于覆盖排序与数字序列化。真实业务回调中，`status` 通常会被 `custody/callback` 路由在转发前删除。
- 无事件向量只用于验证 `appId.timestamp.md5` 的拼接算法。真实的 JWT 载荷 `callback` 路径只会发送授权事件载荷 `{ authorizeId, oauthToken? }`，不会发送本节的交易数据。

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

**同一份 `data` 与时间戳、但不带事件时（JWT 载荷中的 `callback` 路径的算法向量）：**

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
    // 头部缺失时无法验签
    if (!appId || !timestamp || !signature) {
        return false;
    }

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

    // 提取请求中的签名；格式不对时直接失败
    const requestSignature = String(signature).replace('sha256=', '');
    if (!/^[0-9a-f]{64}$/i.test(requestSignature)) {
        return false;
    }

    // timingSafeEqual 要求两个 Buffer 长度相同，否则会抛异常
    const expectedBuffer = Buffer.from(expected, 'hex');
    const actualBuffer = Buffer.from(requestSignature, 'hex');
    if (expectedBuffer.length !== actualBuffer.length) {
        return false;
    }

    // 常数时间比较，防止时序攻击
    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
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
        # ensure_ascii=False 必须显式设置：默认 True 会把中文等非 ASCII 字符转成 \uXXXX，
        # 与平台侧的 JSON.stringify 输出不一致，导致 MD5 与签名校验失败。
        canonical = json.dumps(sort_keys(data), ensure_ascii=False, separators=(',', ':'))
        data_md5 = hashlib.md5(canonical.encode('utf-8')).hexdigest()
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
    "bytes"
    "crypto/hmac"
    "crypto/md5"
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "sort"
    "strings"
)

// sortValue 递归排序：对象按 key 升序；数组保序；数组内对象同样排序。
func sortValue(value interface{}) interface{} {
    switch v := value.(type) {
    case map[string]interface{}:
        keys := make([]string, 0, len(v))
        for k := range v {
            keys = append(keys, k)
        }
        sort.Strings(keys)
        ordered := make(map[string]interface{}, len(v))
        for _, k := range keys {
            ordered[k] = sortValue(v[k])
        }
        return ordered
    case []interface{}:
        result := make([]interface{}, len(v))
        for i, item := range v {
            result[i] = sortValue(item)
        }
        return result
    default:
        return value
    }
}

func sortedJSON(data map[string]interface{}) string {
    var buf bytes.Buffer
    encoder := json.NewEncoder(&buf)
    // 必须关闭 HTML 转义：json.Marshal 默认把 < > & 写成 JSON 的
    // < > &，与平台侧 JSON.stringify 的输出不同，会导致 MD5 不一致。
    encoder.SetEscapeHTML(false)
    if err := encoder.Encode(sortValue(data)); err != nil {
        return ""
    }
    // Encoder.Encode 会在末尾追加换行；去掉后才能与 JSON.stringify 对齐。
    return strings.TrimSuffix(buf.String(), "\n")
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
import com.fasterxml.jackson.databind.ObjectMapper;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

public class CallbackVerifier {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /**
     * 递归排序：对象按 key 升序；数组元素保序，数组内的对象同样排序。
     * 只对顶层使用 TreeMap 无法处理嵌套对象，会导致 MD5 与平台不一致。
     * 注意保留 null：回调服务（sortObjectKeys）与 JSON.stringify 都会保留 null，
     * 不要套用请求签名规范里「丢弃 null」的示例。
     */
    private static Object sortValue(Object value) {
        if (value instanceof Map<?, ?> map) {
            TreeMap<String, Object> sorted = new TreeMap<>();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                sorted.put(String.valueOf(entry.getKey()), sortValue(entry.getValue()));
            }
            return sorted;
        }
        if (value instanceof List<?> list) {
            List<Object> result = new ArrayList<>(list.size());
            for (Object item : list) {
                result.add(sortValue(item));
            }
            return result;
        }
        return value;
    }

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
            String sortedJson = MAPPER.writeValueAsString(sortValue(data));
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

当回调推送失败时，平台会在当前进程内尽力重试。参数来自 `application-callback.service.ts` 的 `CALLBACK_CONFIG` 与 `sendWithRetry()` 循环：

| 参数 | 值 | 说明 |
|------|-----|------|
| 最大重试次数 | 3 次 | 加上初始请求共 4 次尝试 |
| 重试间隔（配置） | 0s, 1s, 5s, 30s | `retryDelays: [0, 1000, 5000, 30000]` |
| 实际使用的间隔 | 0s, 1s, 5s | 当前循环最多 4 次尝试，第 4 次重试不会发生，因此 30s 档位不可达 |
| 单次请求超时 | 30s | 超时视为网络错误，会重试 |
| 投递保证 | 尽力而为 | 没有队列 / 持久化 / 死信；耗尽后不保证送达 |

> **已知限制（对应集成指南第 14.5 节与缺陷 D8 / D14）：**
> 1. `retryDelays` 配置了 4 个值，但 `maxRetries: 3` 只有 3 次重试，实际间隔为第 2 次尝试前 0s、第 3 次前 1s、第 4 次前 5s。`retryDelay()` 的 30s 兜底仅在尝试序号超出数组时才生效，当前循环不会走到该分支。
> 2. **HTTP 429 / 5xx 实际上不会重试**，详见下节。

### 重试条件

**会重试的情况（仅此一类）：**
- 网络 / 传输错误：`ECONNABORTED`（超时）、`ETIMEDOUT`、或请求未拿到任何 HTTP 响应（`error.response === undefined`）

**不会重试的情况：**
- HTTP 状态码 2xx（成功）
- HTTP 状态码 429（限流）
- HTTP 状态码 5xx（服务器错误）
- HTTP 状态码 3xx（重定向）
- 其他 4xx（客户端错误）
- 载荷超过 64KB：发送前直接放弃（`payload_too_large`），不会发出请求

> **重要缺陷 D14：** 回调 HTTP 客户端（`application-callback.service.ts:68-75`）没有配置 `validateStatus`，axios 默认会拒绝所有非 2xx 响应并抛出异常。因此 `response.status === 429 || response.status >= 500` 的重试分支（`:253-263`）**不可达**；进入 `catch` 后，`isRetryableNetworkError()`（`:296-303`）只识别超时或没有响应的错误，HTTP 429/5xx 的 `error.response` 已设置，所以直接失败。**净效果：只有网络/超时错误会重试；接收方返回 429 或 5xx 不会触发重试，事件会立即丢失。** 修复前，请把回调接收端的失败处理设计为「本地落库后返回 2xx」，不要靠返回 5xx 让平台重投；最终状态请通过对账 / 查询接口补偿。

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

> **不要依赖回调作为唯一数据源。** 回调是尽力而为的进程内推送（最多 4 次尝试，无持久化 / 死信），可能因网络、部署或 D14 缺陷而丢失。请以业务查询接口和对账任务作为最终状态的兜底。

### 1. 幂等处理

回调可能重复（重试、超时后接收方已处理但响应丢失等）。**不要用 `X-Timestamp` 做幂等键**——它在每次重试时都会重新生成，无法去重同一事件。请使用事件主键；没有主键时可用稳定的请求体哈希。下面的例子用 `SET NX` 原子抢占，避免「先查后写」的竞态：

```javascript
const crypto = require('crypto');

// JWT 载荷中的 callback 路径没有 X-Event，因此优先使用事件主键。
// X-Timestamp 每次重试都会变化，不能用来去重；没有主键时退回到「应用 + 事件 + 请求体哈希」。
function buildIdempotencyKey(req, rawBody) {
    const event = req.headers['x-event'] || 'no-event';
    const primaryKey = req.body.authorizeId || req.body.orderId || req.body.taskId;
    if (primaryKey) {
        return `${req.headers['x-app-id']}:${event}:${primaryKey}`;
    }
    const bodyHash = crypto.createHash('sha256').update(rawBody).digest('hex');
    return `${req.headers['x-app-id']}:${event}:${bodyHash}`;
}

const DONE_TTL = 7 * 24 * 3600; // 已完成（已入队）：保留 7 天
// 仅用于防止卡死的键无限期占用；恢复依赖本地队列 / 对账，而不是平台重投
const PROCESSING_TTL = 300;

// 本地持久化队列：以 eventId 为唯一键写入表 / 消息队列，重复写入是幂等的
const eventQueue = {
    async enqueueOnce(eventId, payload) { /* INSERT ... ON CONFLICT DO NOTHING / MQ 幂等发送 */ },
};

async function handleCallback(req, res, rawBody) {
    const eventId = buildIdempotencyKey(req, rawBody);
    const key = `callback:${eventId}`;

    // 原子抢占：只有第一个请求能成功，避免 check-then-act 竞态
    const claimed = await redis.set(key, 'processing', 'NX', 'EX', PROCESSING_TTL);

    try {
        // 无论是否抢到，都必须先把载荷持久化 / 入队，再返回 2xx。
        // 抢占者可能在持久化前崩溃；平台的重试会走 !claimed 分支，
        // 只有这里也入队，才能补上那一次可能丢失的事件。
        await eventQueue.enqueueOnce(eventId, req.body);
    } catch (err) {
        await redis.del(key);
        throw err; // 未持久化：绝不能返回 2xx
    }

    if (!claimed) {
        const state = await redis.get(key);
        return res.status(200).json({
            status: state === 'done' ? 'already_processed' : 'processing',
        });
    }

    await redis.set(key, 'done', 'EX', DONE_TTL); // done 表示“已入队”
    res.status(200).json({ status: 'ok' });
}

// 队列消费者异步处理；处理失败在本地重试 / 对账，不依赖平台重投
async function consumeQueue() {
    // for (;;) { const job = await eventQueue.take(); await processEvent(job.payload); }
}
```

**平台不会因为 200 而重投：任何「返回 2xx 但未持久化」的路径都会永久丢失事件。** 因此入队失败时绝不能返回 2xx；此时可返回非 2xx，但平台同样不会因 429/5xx 重试（D14），最终仍需本地队列或对账兜底。

### 2. 快速响应

回调处理应当快速返回，异步处理业务逻辑。注意顺序：**先持久化事件，再返回 2xx**；如果先返回 2xx 再处理，进程崩溃时事件会永久丢失（平台没有持久化重投）：

```javascript
// Express：保留原始请求体，供请求体哈希兜底使用（验签仍使用解析后的 req.body）
app.use(express.json({
    verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); },
}));

async function handleCallback(req, res) {
    // 先落库 / 入队（幂等键见上一节），确保返回 2xx 后事件不丢
    await eventStore.saveOnce(req.body, buildIdempotencyKey(req, req.rawBody));

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

签名依赖请求体，因此必须**先解析请求体再验签**，不能用未解析的 body 验签：

```
1. 保留原始请求体（例如 express.json({ verify }) 中的 rawBody）并解析为 JSON
2. 验签（对解析后的 data 递归排序 + MD5）
3. 幂等抢占（SET NX，见上）
4. 业务处理
```

**中间件不得改写 JSON 语义。** 验签应基于与平台一致的解析结果：不要在验签前做字段增删、数字/字符串类型转换、Unicode 还原、`null` 剔除等转换——这些都会改变 `md5(sortedJSON(data))`。保留 `rawBody` 只用于幂等哈希，验签仍使用解析后的对象。

### 4. 重放与时钟偏差

- 签名串含 `X-Timestamp`，但**不含 nonce**，因此签名本身不能阻止重放；请校验 `X-Timestamp`（毫秒）与服务端时间的偏差在可接受窗口内（例如 ±5 分钟），以限制重放窗口。
- 时钟偏差会直接影响时间戳校验；部署时请启用 NTP，并给窗口留出余量。
- 在时间窗口内仍可能重放，必须结合上一节的幂等键（事件主键）去重。签名也不绑定请求 URL/路径，请把回调地址视为配置层面的端点隔离。

### 5. 日志记录

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

| HTTP 状态 | 含义 | 平台实际行为 |
|-----------|------|--------------|
| 2xx | 成功 | 不重试 |
| 429 | 限流 | **不重试**（缺陷 D14，见上节）；立即失败 |
| 5xx | 服务器错误 | **不重试**（缺陷 D14，见上节）；立即失败 |
| 3xx | 重定向 | 不重试；axios 默认拒绝非 2xx |
| 其他 4xx | 客户端错误 | 不重试 |

> 只有网络/超时错误会重试。**返回 429 / 5xx 并不能让平台重投**；如果处理暂时失败，请先在本地持久化事件并返回 2xx，再异步处理或重试。

### 开发者侧处理建议

```javascript
// 推荐：成功落库并处理（或已幂等去重）后返回 200
res.status(200).json({ received: true });

// 推荐：已持久化、稍后异步处理时返回 202（平台按 2xx 视为成功）
res.status(202).json({ accepted: true, message: 'Queued for processing' });

// 避免返回 204：平台只判断状态码，204 虽属 2xx 但不利于排查
res.status(204);
```

> 由于 429 / 5xx 不会触发重试（缺陷 D14），**不要**用非 2xx 表达“请稍后重投”；请先持久化事件、返回 2xx，再在本地重试。

---

## 限制说明

| 项目 | 限制值 | 说明 |
|------|--------|------|
| 最大 payload 大小 | 64KB | 发送前按 `JSON.stringify(data).length` 判断，超过则直接放弃（`payload_too_large`），不会发出请求；按字符数而非 UTF-8 字节数计算 |
| 最大回调 URL 长度 | 191 字符 | 数据库列为 `VARCHAR(191)` |
| 单次请求超时 | 30 秒 | 超时触发重试 |
| 最大重试次数 | 3 次 | 共 4 次尝试后放弃 |
| 投递保证 | 尽力而为 | 无队列 / 持久化 / 死信；仅网络/超时错误会重试，最终失败不保证送达 |

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
| [第三方开发者接入指南](./thirdparty-integration-guide.md) | 端到端接入；第 14 章为回调的规范性说明 |
| [第三方开发者接入指南 — 第 5 章 OAuth 授权流程](./thirdparty-integration-guide.md#5-oauth-授权流程) | OAuth 认证、`authorizeUrl`、授权页与授权回调 |
| [消息签名规范](./signature-spec.md) | API 请求签名机制 |
| [开发者门户](../openplatform-web/developer-portal/) | 应用管理界面 |

---

## 版本历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| 1.0 | 2026-04-20 | 初始版本 |
| 1.1 | 2026-10-19 | 对齐 `CallbackEventType` 与推送实现：请求体改为纯业务数据、补充两条路径的 `X-Event` 差异、修正重试间隔（30s 档位不可达）与限制值 |
| 1.2 | 2026-10-19 | 按实现修正重试契约：仅网络/超时错误重试，429/5xx 不重试（缺陷 D14）；补充尽力而为的投递保证、幂等竞态与重放防护；修正 Node/Python/Go/Java 验签示例 |
| 1.3 | 2026-10-19 | 修复幂等示例的事件丢失窗口：所有路径先持久化 / 入队再返回 2xx；补充 Express rawBody 配置示例 |
