# 认证接口 API 文档

## 概述

- Base URL: `/api/v1`
- 认证方式: Bearer Token
- 错误码: 统一返回格式 `{ code: number, message: string, data?: any }`

## 接口列表

### 1. 用户注册

**POST** `/auth/register`

#### 请求参数 (multipart/form-data)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 是 | 邮箱地址 |
| password | string | 是 | 密码（包含大小写字母、数字和特殊字符） |
| companyName | string | 是 | 公司名称 |
| creditCode | string | 是 | 统一社会信用代码（18位大写字母和数字） |
| website | string | 否 | 公司官网 |
| industry | string | 是 | 行业类型 |
| orgType | string | 是 | 组织类型 |
| ubos | array | 是 | 最终受益人列表 |
| ubos[].name | string | 是 | 姓名 |
| ubos[].idType | string | 是 | 证件类型 (passport/national_id) |
| ubos[].idNumber | string | 是 | 证件号码 |
| ubos[].nationality | string | 是 | 国籍代码 |
| ubos[].phone | string | 是 | 手机号 |
| establishmentDate | string | 否 | 成立日期 |
| registeredAddress | string | 否 | 注册地址 |
| businessScope | string | 否 | 经营范围 |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

#### 错误码

| code | message | 说明 |
|------|---------|------|
| 1001 | Email already registered | 邮箱已注册 |
| 1002 | Invalid credit code | 统一社会信用代码格式错误 |

---

### 2. 用户登录

**POST** `/auth/login`

#### 请求参数 (application/json)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 是 | 邮箱地址 |
| password | string | 是 | 密码 |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "companyName": "公司名称",
      "status": "pending_kyb_review",
      "kybStatus": "pending",
      "createdAt": "2026-02-09T10:00:00Z",
      "updatedAt": "2026-02-09T10:00:00Z"
    }
  }
}
```

---

### 3. 用户登出

**POST** `/auth/logout`

#### 请求头

| 参数 | 说明 |
|------|------|
| Authorization | Bearer {accessToken} |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

---

### 4. 刷新 Token

**POST** `/auth/refresh`

#### 请求参数 (application/json)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| refreshToken | string | 是 | 刷新令牌 |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "accessToken": "new_access_token",
    "refreshToken": "new_refresh_token"
  }
}
```

---

### 5. 发送验证码

**POST** `/auth/verification/send`

#### 请求头

| 参数 | 说明 |
|------|------|
| Authorization | Bearer {accessToken} |

#### 请求参数 (application/json)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 验证类型 (email/phone) |
| target | string | 是 | 邮箱或手机号 |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

---

### 6. 验证验证码

**POST** `/auth/verification/verify`

#### 请求头

| 参数 | 说明 |
|------|------|
| Authorization | Bearer {accessToken} |

#### 请求参数 (application/json)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 验证类型 (email/phone) |
| target | string | 是 | 邮箱或手机号 |
| code | string | 是 | 验证码 |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

---

### 7. 忘记密码

**POST** `/auth/forgot-password`

#### 请求参数 (application/json)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 是 | 注册邮箱 |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

---

### 8. 重置密码

**POST** `/auth/reset-password`

#### 请求参数 (application/json)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | string | 是 | 重置令牌 |
| password | string | 是 | 新密码 |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

---

## 用户状态枚举

| status | 说明 |
|--------|------|
| pending_verification | 待验证 |
| pending_kyb_review | 待 KYB 审核 |
| active | 激活 |
| suspended | 暂停 |
| banned | 封禁 |

## KYB 状态枚举

| kybStatus | 说明 |
|-----------|------|
| pending | 待审核 |
| approved | 已通过 |
| rejected | 已拒绝 |
