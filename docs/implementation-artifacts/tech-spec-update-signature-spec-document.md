---
title: '更新消息签名规范文档'
slug: 'update-signature-spec-document'
created: '2026-04-14'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Markdown', 'API Documentation']
files_to_modify:
  - 'docs/signature-spec.md'
  - 'docs/thirdparty-integration-guide.md'
code_patterns: ['两种签名算法', 'authorizationId 替代 resourceKey', '验证器继承模式']
test_patterns: []
---

# Tech-Spec: 更新消息签名规范文档

**Created:** 2026-04-14

## Overview

### Problem Statement

`signature-spec.md` 文档过期，包含已废弃的 `resourceKey` 字段，与当前实现不一致。需要更新为当前的双签名算法体系。

### Solution

更新签名文档，反映：
1. 两种签名算法（Basic 和 Resource）
2. `authorizationId` 替代 `resourceKey`
3. 验证器架构说明

### Scope

**In Scope:**
- 更新 `signature-spec.md` 文档
- 统一两种文档的签名算法描述
- 更新实现位置引用
- 补充完整错误码
- 添加使用场景区分说明

**Out of Scope:**
- 不修改代码实现
- 不更新 SDK 文档

## Context for Development

### Codebase Patterns

- 两种签名算法：
  - Basic: `MD5(appSecret + appId + timestamp + nonce + md5(business))`
  - Resource: `MD5(appSecret + appId + authorizationId + timestamp + nonce + md5(business))`
- 验证器继承模式：
  - `BasicValidator` → OAuth 接口
  - `ResourceValidator` → 资源操作接口

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `docs/signature-spec.md` | 待更新的签名规范文档 |
| `docs/thirdparty-integration-guide.md` | 已更新的接入指南（参考） |
| `src/services/validators/common.validator.ts` | 签名验证实现 |

### Technical Decisions

#### 1. 两种签名算法对比

| 签名类型 | 适用接口 | 签名字符串 |
|----------|----------|------------|
| **Basic 签名** | `/oauth/*` | `appId + timestamp + nonce + md5(business)` |
| **Resource 签名** | `/third-party/*` | `appId + authorizationId + timestamp + nonce + md5(business)` |

#### 2. authorizationId 绑定机制

- 开发者通过 OAuth 流程获取 `authorizeId`（即 `authorizationId`）
- Resource 签名与 `authorizationId` 绑定，防止签名被用于其他授权资源

#### 3. 错误码完整列表

| 错误码 | HTTP状态 | 说明 |
|--------|----------|------|
| 40101 | 401 | 签名验证失败 |
| 40102 | 401 | 时间戳超出容差范围 |
| 40103 | 401 | Nonce 已使用（重放攻击） |
| 40104 | 400 | 缺少必填字段 |
| 40105 | 401 | 应用不存在 |
| 40106 | 401 | 应用未激活 |
| 40107 | 401 | 三方平台账户未激活 |
| 40301 | 403 | 资源未授权 |
| 40002 | 400 | 参数格式错误 |
| 50001 | 500 | 服务器内部错误 |

#### 4. 实现位置更新

| 组件 | 文件 |
|------|------|
| 统一中间件 | `src/middleware/resource-validation.middleware.ts` |
| 验证器接口 | `src/services/validators/interfaces.ts` |
| 基础验证器 | `src/services/validators/basic.validator.ts` |
| 资源验证器 | `src/services/validators/resource.validator.ts` |
| 公共验证函数 | `src/services/validators/common.validator.ts` |

## Implementation Plan

### Tasks

- [ ] Task 1: 重写 `signature-spec.md` 请求格式部分
  - File: `docs/signature-spec.md`
  - Action: 将请求格式拆分为 BasicInfo 和 BasicInfoWithAuthorization 两种结构
  - Notes: BasicInfo 包含 appId/timestamp/nonce/signature；BasicInfoWithAuthorization 额外包含 authorizationId

- [ ] Task 2: 添加两种签名算法说明
  - File: `docs/signature-spec.md`
  - Action: 在签名算法部分分别说明 Basic 签名和 Resource 签名
  - Notes: Basic: `MD5(appSecret + appId + timestamp + nonce + md5(business))`；Resource: `MD5(appSecret + appId + authorizationId + timestamp + nonce + md5(business))`

- [ ] Task 3: 更新字段说明表
  - File: `docs/signature-spec.md`
  - Action: 替换 `resourceKey` 字段说明为 `authorizationId`
  - Notes: `authorizationId` 用于资源操作的签名绑定

- [ ] Task 4: 补充完整错误码表
  - File: `docs/signature-spec.md`
  - Action: 扩展错误码表，包含所有业务错误码（40101-40301）
  - Notes: 按 HTTP 状态码分组

- [ ] Task 5: 更新实现位置引用
  - File: `docs/signature-spec.md`
  - Action: 将实现位置从 `signature.middleware.ts` 更新为 `resource-validation.middleware.ts` 及相关验证器文件
  - Notes: 添加验证器架构说明

- [ ] Task 6: 添加验证器架构说明
  - File: `docs/signature-spec.md`
  - Action: 添加验证器使用说明，展示 BasicValidator 和 ResourceValidator 的继承关系
  - Notes: 说明两种验证器分别用于哪些接口

- [ ] Task 7: 检查 `thirdparty-integration-guide.md` 一致性
  - File: `docs/thirdparty-integration-guide.md`
  - Action: 确认签名部分与 `signature-spec.md` 一致
  - Notes: 如有差异，同步更新

### Acceptance Criteria

- [ ] **AC1:** Given 开发者查看 `signature-spec.md`，when 查看签名算法部分，then 能明确区分 Basic 签名和 Resource 签名的使用场景和计算公式

- [ ] **AC2:** Given 开发者查看 `signature-spec.md`，when 查看请求格式部分，then 不会看到 `resourceKey` 字段，所有相关描述替换为 `authorizationId`

- [ ] **AC3:** Given 开发者查看 `signature-spec.md`，when 查看错误码表，then 能找到 40301 (资源未授权) 错误码及其说明

- [ ] **AC4:** Given 开发者查看 `signature-spec.md`，when 查看实现位置部分，then 能找到当前实际存在的文件路径，不包含已废弃的 `signature.middleware.ts`

- [ ] **AC5:** Given 开发者查看 `signature-spec.md` 和 `thirdparty-integration-guide.md`，when 对比签名相关描述，then 两份文档的签名算法描述一致

- [ ] **AC6:** Given 开发者查看 `signature-spec.md`，when 查看验证器使用说明，then 能理解 BasicValidator 用于 OAuth 接口、ResourceValidator 用于资源操作接口

## Additional Context

### Dependencies

- `docs/thirdparty-integration-guide.md` - 已更新的文档
- `src/services/validators/common.validator.ts` - 实际实现

### Notes

- `signature.middleware.ts` 已重构为 `resource-validation.middleware.ts`
- 验证器架构：IRequestValidator 接口 + BasicValidator + ResourceValidator
- 两个文档保持同步更新
