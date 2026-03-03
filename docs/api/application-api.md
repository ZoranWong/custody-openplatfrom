# 应用接口 API 文档

## 概述

- Base URL: `/api/v1`
- 认证方式: Bearer Token

## 接口列表

### 1. 创建应用

**POST** `/applications`

#### 请求头

| 参数 | 说明 |
|------|------|
| Authorization | Bearer {accessToken} |

#### 请求参数 (application/json)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 应用名称 |
| description | string | 否 | 应用描述 |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "app_550e8400e29b41d4a716446655440000",
    "name": "我的钱包",
    "appId": "cregis_abc123def456",
    "appSecret": "{{PLACEHOLDER_APP_SECRET}}",
    "status": "active",
    "createdAt": "2026-02-09T10:00:00Z",
    "updatedAt": "2026-02-09T10:00:00Z"
  }
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 应用唯一标识 |
| name | string | 应用名称 |
| appId | string | 应用 ID (公开) |
| appSecret | string | 应用密钥 (仅创建时返回) |
| status | string | 应用状态 |
| createdAt | string | 创建时间 |
| updatedAt | string | 更新时间 |

---

### 2. 获取应用列表

**GET** `/applications`

#### 请求头

| 参数 | 说明 |
|------|------|
| Authorization | Bearer {accessToken} |

#### 请求参数 (query)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 10 |
| keyword | string | 否 | 搜索关键词 |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "app_550e8400e29b41d4a716446        "name": "我的钱包",
655440000",
        "appId": "cregis_abc123def456",
        "status": "active",
        "createdAt": "2026-02-09T10:00:00Z",
        "updatedAt": "2026-02-09T10:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10
  }
}
```

---

### 3. 获取应用详情

**GET** `/applications/{id}`

#### 请求头

| 参数 | 说明 |
|------|------|
| Authorization | Bearer {accessToken} |

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 应用 ID |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "app_550e8400e29b41d4a716446655440000",
    "name": "我的钱包",
    "appId": "cregis_abc123def456",
    "status": "active",
    "createdAt": "2026-02-09T10:00:00Z",
    "updatedAt": "2026-02-09T10:00:00Z"
  }
}
```

---

### 4. 更新应用

**PUT** `/applications/{id}`

#### 请求头

| 参数 | 说明 |
|------|------|
| Authorization | Bearer {accessToken} |

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 应用 ID |

#### 请求参数 (application/json)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 否 | 应用名称 |
| description | string | 否 | 应用描述 |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "app_550e8400e29b41d4a716446655440000",
    "name": "新名称",
    "appId": "cregis_abc123def456",
    "status": "active",
    "createdAt": "2026-02-09T10:00:00Z",
    "updatedAt": "2026-02-09T12:00:00Z"
  }
}
```

---

### 5. 删除应用

**DELETE** `/applications/{id}`

#### 请求头

| 参数 | 说明 |
|------|------|
| Authorization | Bearer {accessToken} |

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 应用 ID |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

---

### 6. 重新生成 AppSecret

**POST** `/applications/{id}/regenerate-secret`

#### 请求头

| 参数 | 说明 |
|------|------|
| Authorization | Bearer {accessToken} |

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 应用 ID |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "appSecret": "{{PLACEHOLDER_APP_SECRET}}"
  }
}
```

> **注意**: 重新生成后旧密钥立即失效，请妥善保管新密钥。

---

## 应用状态枚举

| status | 说明 |
|--------|------|
| active | 正常 |
| inactive | 未激活 |
| suspended | 已暂停 |

## 错误码

| code | message | 说明 |
|------|---------|------|
| 2001 | Application not found | 应用不存在 |
| 2002 | Application limit exceeded | 应用数量超出限制 |
