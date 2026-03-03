# Story E1.4: 密码修改

## 基本信息

| 字段 | 值 |
|------|-----|
| Story ID | E1.4 |
| 名称 | 密码修改 |
| 状态 | backlog |
| 优先级 | P1 |
| 预估工时 | 1d |
| Epic | E1 (管理员认证与授权) |
| Module | E (Admin Portal API 集成) |

## 描述

实现管理员密码修改功能，包含旧密码验证和新密码强度检查。

## 任务列表

### 密码修改页面
- [ ] 创建密码修改页面
- [ ] 添加旧密码输入框
- [ ] 添加新密码输入框
- [ ] 添加确认密码输入框
- [ ] 密码强度指示器

### 表单验证
- [ ] 旧密码必填验证
- [ ] 新密码最小长度验证 (最少 8 位)
- [ ] 新密码复杂度验证 (大写字母+小写字母+数字+特殊字符)
- [ ] 两次密码一致性验证

### 后端接口
- [ ] 实现 `POST /admin/auth/change-password`
- [ ] 验证旧密码正确性
- [ ] 更新新密码
- [ ] 记录密码修改审计日志

## 验收标准

- [ ] 管理员可以修改密码
- [ ] 验证旧密码正确性
- [ ] 新密码符合安全要求
- [ ] 修改成功提示并登出重新登录

## 涉及文件

```
openplatform-web/admin-portal/src/views/ChangePasswordPage.vue
openplatform-web/admin-portal/src/components/PasswordStrengthIndicator.vue
openplatform-api-service/src/routes/v1/admin-auth.routes.ts
openplatform-api-service/src/controllers/admin-auth.controller.ts
```

## 相关接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/admin/auth/change-password` | 修改密码 |

## 密码复杂度要求

| 规则 | 要求 |
|------|------|
| 最小长度 | 8 位 |
| 大写字母 | 至少 1 个 |
| 小写字母 | 至少 1 个 |
| 数字 | 至少 1 个 |
| 特殊字符 | 至少 1 个 |

## 测试用例

### 正常修改
1. 输入正确的旧密码
2. 输入符合复杂度要求的新密码
3. 确认密码与新密码一致
4. 提交成功，显示成功提示

### 验证失败
1. 旧密码错误
2. 新密码不符合复杂度
3. 确认密码与新密码不一致

### 边界情况
1. 新密码与旧密码相同
2. 密码中包含用户名
3. 连续修改密码
