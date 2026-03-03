# API 接口文档

## 目录

1. [认证接口 (Auth API)](auth-api.md)
   - 用户注册
   - 用户登录
   - 用户登出
   - 刷新 Token
   - 发送验证码
   - 验证验证码
   - 忘记密码
   - 重置密码

2. [用户接口 (User API)](user-api.md)
   - 获取用户信息
   - 更新用户信息

3. [应用接口 (Application API)](application-api.md)
   - 创建应用
   - 获取应用列表
   - 获取应用详情
   - 更新应用
   - 删除应用
   - 重新生成 AppSecret

4. [账单接口 (Billing API)](billing-api.md)
   - 获取使用统计
   - 获取发票列表
   - 获取发票详情
   - 获取支付记录

## 通用说明

### Base URL

```
/api/v1
```

### 认证方式

所有接口（除注册、登录、忘记密码、重置密码外）需要在请求头中携带 Token：

```
Authorization: Bearer {accessToken}
```

### 错误响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 通用错误码

| code | message | 说明 |
|------|---------|------|
| 0 | success | 成功 |
| 1000 | Internal server error | 服务器内部错误 |
| 1001 | Invalid token | Token 无效 |
| 1002 | Token expired | Token 已过期 |
| 1003 | Unauthorized | 未授权访问 |
| 1004 | Forbidden | 无权限访问 |

### 分页响应格式

列表接口返回统一分页格式：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [...],
    "total": 100,
    "page": 1,
    "pageSize": 10
  }
}
```

## 数据类型规范

### 日期时间格式

所有日期时间使用 ISO 8601 格式：

```json
"createdAt": "2026-02-09T10:00:00Z"
```

### 金额格式

金额统一使用美元 (USD)，保留两位小数：

```json
"amount": 150.00
```

### 带宽格式

带宽使用量单位为字节 (Bytes)：

```json
"bandwidth": 1024000
```
