# 用户接口 API 文档

## 1. 获取用户信息

**GET** `/user/profile`

#### 请求头

| 参数 | 说明 |
|------|------|
| Authorization | Bearer {accessToken} |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "developer@example.com",
    "companyName": "北京科技有限公司",
    "status": "pending_kyb_review",
    "kybStatus": "pending",
    "createdAt": "2026-02-09T10:00:00Z",
    "updatedAt": "2026-02-09T10:00:00Z"
  }
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 用户唯一标识 |
| email | string | 邮箱地址 |
| companyName | string | 公司名称 |
| status | string | 账户状态 |
| kybStatus | string | KYB 审核状态 |
| createdAt | string | 创建时间 (ISO 8601) |
| updatedAt | string | 更新时间 (ISO 8601) |

---

## 2. 更新用户信息

**PUT** `/user/profile`

#### 请求头

| 参数 | 说明 |
|------|------|
| Authorization | Bearer {accessToken} |

#### 请求参数 (application/json)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| companyName | string | 否 | 公司名称 |
| website | string | 否 | 公司官网 |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "developer@example.com",
    "companyName": "北京科技有限公司",
    "status": "pending_kyb_review",
    "kybStatus": "pending",
    "createdAt": "2026-02-09T10:00:00Z",
    "updatedAt": "2026-02-09T12:00:00Z"
  }
}
```
