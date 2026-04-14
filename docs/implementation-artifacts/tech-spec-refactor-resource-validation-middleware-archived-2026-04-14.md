---
title: '重构 Resource Validation Middleware'
slug: 'refactor-resource-validation-middleware'
created: '2026-04-14'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TypeScript', 'Express', 'Middleware']
files_to_modify:
  - 'src/middleware/resource-validation.middleware.ts'
  - 'src/services/validators/basic.validator.ts'
  - 'src/services/validators/resource.validator.ts'
  - 'src/services/validators/index.ts'
code_patterns: ['I开头接口命名', '工厂函数创建实例']
test_patterns: ['单元测试验证器', '集成测试中间件']
---

# Tech-Spec: 重构 Resource Validation Middleware

**Created:** 2026-04-14

## Overview

### Problem Statement

`resource-validation.middleware.ts` 中 `createBasicValidationMiddleware` 和 `createResourceValidationMiddleware` 存在大量重复代码（约200行重复），维护成本高。

### Solution

1. 提取 `IRequestValidator` 接口
2. `BasicValidator` 和 `ResourceValidator` 实现该接口
3. 合并两个 middleware 为统一的 `createRequestValidatorMiddleware(validator)`

### Scope

**In Scope:**
- 创建 `IRequestValidator` 接口
- `BasicValidator` 实现 `IRequestValidator`
- `ResourceValidator` 实现 `IRequestValidator`
- 创建统一的 `createRequestValidatorMiddleware(validator, config)` 函数
- 删除原有的 `createBasicValidationMiddleware` 和 `createResourceValidationMiddleware`
- AuthorizationService 检查保留在 middleware 层面（Resource 场景使用）

**Out of Scope:**
- 不改变验证器内部逻辑
- 不改变签名算法

## Context for Development

### Codebase Patterns

- 接口命名使用 `I` 前缀
- 使用工厂函数 `createXxxValidator()` 创建实例
- Request 类型使用 `RequestWithContext` 扩展

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/middleware/resource-validation.middleware.ts` | 待重构的中间件 |
| `src/services/validators/basic.validator.ts` | 基础验证器 |
| `src/services/validators/resource.validator.ts` | 资源验证器 |
| `src/services/validators/common.validator.ts` | 公共验证函数 |

### Technical Decisions

1. **IRequestValidator 接口设计：**
   ```typescript
   interface IRequestValidator {
       validateRequest(req: RequestWithContext): ValidationResult;
   }
   ```

2. **统一 Middleware 设计：**
   ```typescript
   function createRequestValidatorMiddleware(
       validator: IRequestValidator,
       config?: ValidationMiddlewareConfig
   ): ExpressMiddleware
   ```

3. **Config 合并：**
   ```typescript
   interface ValidationMiddlewareConfig {
       excludePaths?: string[];
       nonceCache?: NonceCache;
       verifyAuthorization?: boolean; // Resource 场景为 true
   }
   ```

4. **AuthorizationService 检查位置：** 在 middleware 层面处理，不放入 validator

## Implementation Plan

### Tasks

1. [x] 创建 `src/services/validators/interfaces.ts`
   - 定义 `IRequestValidator` 接口
   - 导出 `ValidationResult` 和 `ValidationError` 类型

2. [x] 修改 `src/services/validators/basic.validator.ts`
   - 实现 `IRequestValidator` 接口
   - 保留 `validate(data)` 方法用于单元测试

3. [x] 修改 `src/services/validators/resource.validator.ts`
   - 实现 `IRequestValidator` 接口

4. [x] 重构 `src/middleware/resource-validation.middleware.ts`
   - 创建 `createRequestValidatorMiddleware(validator, config)` 函数
   - 删除 `createBasicValidationMiddleware` 和 `createResourceValidationMiddleware`
   - 保留 `resourceValidationMiddleware` 实例（使用 ResourceValidator）
   - 保留 `requireResourceKey` 函数

5. [x] 更新 `src/services/validators/index.ts`
   - 导出 `IRequestValidator` 接口

6. [x] 更新路由配置使用新的 middleware

### Acceptance Criteria

1. **AC1:** `IRequestValidator` 接口正确定义，包含 `validateRequest` 方法
2. **AC2:** `BasicValidator` 实现 `IRequestValidator` 接口
3. **AC3:** `ResourceValidator` 实现 `IRequestValidator` 接口
4. **AC4:** `createRequestValidatorMiddleware` 可接受任何实现 `IRequestValidator` 的验证器
5. **AC5:** 合并后的 middleware 功能与原有两个 middleware 等价
6. **AC6:** 编译通过，无 TypeScript 错误
7. **AC7:** 现有 controller 和 service 不受影响

## Additional Context

### Dependencies

- `express`
- `src/requests/extended-request.ts` (RequestWithContext)
- `src/services/validators/common.validator.ts`

### Testing Strategy

- 单元测试：验证每个 validator 的 `validateRequest` 方法
- 集成测试：验证 middleware 正确调用 validator

### Notes

- 考虑将 AuthorizationService 检查抽象为可选配置

## Implementation Notes

### 新增文件

- `src/services/validators/interfaces.ts` - 定义 `IRequestValidator` 接口

### 修改文件

| 文件 | 修改内容 |
|------|---------|
| `basic.validator.ts` | 实现 `IRequestValidator`，`validateRequest` 方法参数改为 `RequestWithContext` |
| `resource.validator.ts` | 实现 `IRequestValidator`，`validateRequest` 方法参数改为 `RequestWithContext` |
| `resource-validation.middleware.ts` | 合并两个 middleware 为 `createRequestValidatorMiddleware` |
| `validators/index.ts` | 导出 `IRequestValidator` |
| `thirdparty.routes.ts` | 使用新的 `basicValidationMiddleware` 和 `resourceValidationMiddleware` |

### 关键设计决策

1. **不添加泛型**: 简化接口设计，调用方负责传递正确的 request 类型
2. **验证器不实现接口继承**: `BasicValidator` 不显式实现 `IRequestValidator`（通过继承隐式实现）
3. **config.verifyAuthorization**: 控制是否启用 AuthorizationService 验证
4. **使用 findByAppId**: middleware 中使用 `findByAppId` 而不是 `findById`

### 兼容性

- 旧接口 `createBasicValidationMiddleware` 和 `createResourceValidationMiddleware` 已删除
- 新增导出 `basicValidationMiddleware` 和 `resourceValidationMiddleware` 实例
- 所有原有路由已更新为使用新中间件