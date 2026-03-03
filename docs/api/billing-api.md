# 账单接口 API 文档

## 概述

- Base URL: `/api/v1`
- 认证方式: Bearer Token

## 接口列表

### 1. 获取使用统计

**GET** `/billing/usage`

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
        "date": "2026-02-09",
        "apiCalls": 15234,
        "bandwidth": 1024000,
        "cost": 15.50
      }
    ],
    "total": 30,
    "page": 1,
    "pageSize": 10
  }
}
```

#### 响应字段说明

| 字段 | 类型 | 单位 | 说明 |
|------|------|------|------|
| date | string | - | 日期 (YYYY-MM-DD) |
| apiCalls | number | 次 | API 调用次数 |
| bandwidth | number | 字节 | 带宽使用量 |
| cost | number | 美元 | 费用 |

---

### 2. 获取发票列表

**GET** `/billing/invoices`

#### 请求头

| 参数 | 说明 |
|------|------|
| Authorization | Bearer {accessToken} |

#### 请求参数 (query)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 10 |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "inv_550e8400e29b41d4a716446655440000",
        "amount": 150.00,
        "currency": "USD",
        "status": "paid",
        "dueDate": "2026-03-01",
        "createdAt": "2026-02-01T10:00:00Z"
      }
    ],
    "total": 5,
    "page": 1,
    "pageSize": 10
  }
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 发票 ID |
| amount | number | 金额 |
| currency | string | 货币单位 |
| status | string | 发票状态 |
| dueDate | string | 到期日期 |
| createdAt | string | 创建时间 |

---

### 3. 获取发票详情

**GET** `/billing/invoices/{id}`

#### 请求头

| 参数 | 说明 |
|------|------|
| Authorization | Bearer {accessToken} |

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 发票 ID |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "inv_550e8400e29b41d4a716446655440000",
    "amount": 150.00,
    "currency": "USD",
    "status": "paid",
    "dueDate": "2026-03-01",
    "createdAt": "2026-02-01T10:00:00Z"
  }
}
```

---

### 4. 获取支付记录

**GET** `/billing/payments`

#### 请求头

| 参数 | 说明 |
|------|------|
| Authorization | Bearer {accessToken} |

#### 请求参数 (query)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 10 |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "pay_550e8400e29b41d4a716446655440000",
        "amount": 150.00,
        "currency": "USD",
        "status": "success",
        "createdAt": "2026-02-01T10:30:00Z"
      }
    ],
    "total": 3,
    "page": 1,
    "pageSize": 10
  }
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 支付记录 ID |
| amount | number | 支付金额 |
| currency | string | 货币单位 |
| status | string | 支付状态 |
| createdAt | string | 创建时间 |

---

## 发票状态枚举

| status | 说明 |
|--------|------|
| pending | 待支付 |
| paid | 已支付 |
| failed | 支付失败 |

## 支付状态枚举

| status | 说明 |
|--------|------|
| success | 成功 |
| pending | 处理中 |
| failed | 失败 |

## 错误码

| code | message | 说明 |
|------|---------|------|
| 3001 | Invoice not found | 发票不存在 |
| 3002 | Payment failed | 支付失败 |
