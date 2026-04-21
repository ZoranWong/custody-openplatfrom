---
title: 回调与消息推送规范
description: 开发者接收开放平台事件通知的技术规范
---

# 回调与消息推送规范 (Callback & Push Notification)

**Last Updated:** 2026-04-20
**Status:** Active

---

## 概述

回调推送是开放平台向开发者服务器主动推送事件通知的机制。当授权创建、交易状态变更、任务审核等事件发生时，平台会将事件通知发送到开发者预先配置的回调地址。

**核心特性：**
- HMAC-SHA256 签名验证，确保消息来源可信
- 自动重试机制，保证可靠交付
- 支持 HTTPS（生产环境）和 HTTP 本地测试

---

## 事件类型

### 授权事件

| 事件名称 | 说明 | 触发时机 |
|----------|------|----------|
| `authorization.created` | 授权创建 | 开发者通过 OAuth 验证后 |
| `authorization.revoked` | 授权撤销 | 开发者主动撤销或被管理员禁用 |
| `authorization.expired` | 授权过期 | 授权超过有效期后 |

### 交易事件

| 事件名称 | 说明 | 触发时机 |
|----------|------|----------|
| `transaction.submitted` | 交易已提交 | 交易任务创建成功 |
| `transaction.confirming` | 交易确认中 | 链上正在确认 |
| `transaction.completed` | 交易完成 | 链上确认完成 |
| `transaction.failed` | 交易失败 | 交易失败或被拒绝 |

### 任务事件

| 事件名称 | 说明 | 触发时机 |
|----------|------|----------|
| `task.approved` | 任务已通过 | 多签审批通过 |
| `task.rejected` | 任务已拒绝 | 审批被拒绝 |

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

| 头部字段 | 必填 | 说明 | 示例 |
|----------|------|------|------|
| `Content-Type` | 是 | 内容类型，固定为 `application/json` | `application/json` |
| `X-Timestamp` | 是 | 推送时间戳（毫秒） | `1745220600000` |
| `X-Signature` | 是 | HMAC-SHA256 签名 | `sha256=xxxxxx...` |
| `X-Event` | 否 | 事件类型（授权事件时必填） | `authorization.created` |

### 请求体

```json
{
  "appId": "550e8400-e29b-41d4-a716-446655440000",
  "event": "transaction.completed",
  "timestamp": "1745220600000",
  "data": {
    // 事件相关数据
  }
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| appId | string | 是 | 应用 ID（UUID 格式） |
| event | string | 否 | 事件类型，无事件时可不填 |
| timestamp | string | 是 | 推送时间戳（毫秒） |
| data | object | 是 | 事件数据对象 |

---

## 签名验证

### 签名算法

使用 HMAC-SHA256 算法验证消息的完整性和来源。

**签名公式：**

```
signData = appId + "." + [event] + "." + timestamp
signature = HMAC-SHA256(appSecret, signData).toHex()
```

**说明：**
- `appId`: 应用 ID
- `event`: 事件类型（可选，无事件时为空）
- `timestamp`: X-Timestamp 头部的值（毫秒）
- `appSecret`: 应用密钥

### 签名示例

**签名数据构造：**

```
appId     = "550e8400-e29b-41d4-a716-446655440000"
event     = "transaction.completed"
timestamp = "1745220600000"

signData  = "550e8400-e29b-41d4-a716-446655440000.transaction.completed.1745220600000"
signature = HMAC-SHA256(appSecret, signData).toHex()
```

**请求头设置：**

```http
X-Timestamp: 1745220600000
X-Signature: sha256=xxxxxx...
X-Event: transaction.completed
```

### 各语言实现示例

#### Node.js

```javascript
const crypto = require('crypto');

function verifySignature(appSecret, appId, event, timestamp, signature) {
    // 构建签名数据
    let signData = appId;
    if (event) {
        signData += '.' + event;
    }
    signData += '.' + timestamp;

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
const appId = req.body.appId;

if (!verifySignature(appSecret, appId, event, timestamp, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
}
```

#### Python

```python
import hmac
import hashlib

def verify_signature(app_secret: str, app_id: str, event: str, timestamp: str, signature: str) -> bool:
    # 构建签名数据
    sign_data = app_id
    if event:
        sign_data += '.' + event
    sign_data += '.' + timestamp

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
    app_id = request.json.get('appId', '')
    app_secret = get_app_secret(app_id)

    if not verify_signature(app_secret, app_id, event, timestamp, signature):
        return jsonify({'error': 'Invalid signature'}), 401

    # 处理回调
    ...
```

#### Go

```go
package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "strings"
)

func verifySignature(appSecret, appId, event, timestamp, signature string) bool {
    // 构建签名数据
    signData := appId
    if event != "" {
        signData += "." + event
    }
    signData += "." + timestamp

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

public class CallbackVerifier {

    public static boolean verifySignature(
            String appSecret,
            String appId,
            String event,
            String timestamp,
            String signature) throws Exception {

        // 构建签名数据
        StringBuilder signData = new StringBuilder(appId);
        if (event != null && !event.isEmpty()) {
            signData.append(".").append(event);
        }
        signData.append(".").append(timestamp);

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

当回调推送失败时，平台会自动重试：

| 参数 | 值 | 说明 |
|------|-----|------|
| 最大重试次数 | 3 次 | 加上初始请求共 4 次尝试 |
| 重试间隔 | 0s, 1s, 5s, 30s | 指数退避 |
| 总超时 | 30s | 单次请求超时 |

### 重试条件

**会重试的情况：**
- HTTP 状态码 429（限流）
- HTTP 状态码 5xx（服务器错误）
- 网络错误（连接超时、DNS 失败等）

**不会重试的情况：**
- HTTP 状态码 2xx（成功）
- HTTP 状态码 4xx（客户端错误，不重试）

### 超时处理

- 单次请求超时：30 秒
- 超时视为网络错误，触发重试

---

## 数据格式示例

### authorization.created 事件

```json
{
  "appId": "550e8400-e29b-41d4-a716-446655440000",
  "event": "authorization.created",
  "timestamp": "1745220600000",
  "data": {
    "authorizeId": "123e4567-e89b-12d3-a456-426614174000",
    "oauthToken": "developer-provided-token-if-any"
  }
}
```

### transaction.completed 事件

```json
{
  "appId": "550e8400-e29b-41d4-a716-446655440000",
  "event": "transaction.completed",
  "timestamp": "1745220600000",
  "data": {
    "taskId": "789e0123-45ab-67cd-8901-234567890123",
    "txHash": "0xabc123...",
    "amount": "1000.00",
    "asset": "USDT"
  }
}
```

### task.approved 事件

```json
{
  "appId": "550e8400-e29b-41d4-a716-446655440000",
  "event": "task.approved",
  "timestamp": "1745220600000",
  "data": {
    "taskId": "789e0123-45ab-67cd-8901-234567890123",
    "approvedBy": "user-id-001",
    "approvalTime": "2026-04-20T10:30:00Z"
  }
}
```

---

## 最佳实践

### 1. 幂等处理

回调处理器应当支持幂等操作，避免重复处理：

```javascript
// 使用幂等键避免重复处理
async function handleCallback(req, res) {
    const eventId = req.headers['x-event'] + '-' + req.body.timestamp;

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
        appId: req.body.appId
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
| 最大 payload 大小 | 64KB | 超过此大小的推送将被拒绝 |
| 最大回调 URL 长度 | 500 字符 | 创建应用时验证 |
| 单次请求超时 | 30 秒 | 超时触发重试 |
| 最大重试次数 | 3 次 | 4 次尝试后放弃 |

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