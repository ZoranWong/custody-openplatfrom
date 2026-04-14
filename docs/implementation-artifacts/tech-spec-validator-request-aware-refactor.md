---
title: '验证器服务 Request-Aware 重构'
slug: 'validator-request-aware-refactor'
created: '2026-04-14'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TypeScript', 'Express', 'Prisma', 'Jest']
files_to_modify:
  - 'src/services/validators/basic.validator.ts'
  - 'src/services/validators/resource.validator.ts'
  - 'src/services/validators/index.ts'
  - 'src/middleware/resource-validation.middleware.ts'
code_patterns: ['继承验证器', 'Request-aware 验证', '单一职责']
test_patterns: ['Jest 单元测试', 'Mock Request 对象']
---

# Tech-Spec: 验证器服务 Request-Aware 重构

**Created:** 2026-04-14

## Overview

### Problem Statement

当前验证器架构存在以下问题：

1. **职责不清**: Middleware 直接调用验证器 → 违反单一职责
2. **数据提取逻辑重复**: 验证器不知道数据从哪来，middleware 手动提取
3. **签名验证散落**: 验证逻辑分散在 middleware 和验证器中
4. **类型不统一**: camelCase vs snake_case 混用

### Solution

将验证器重构为 **Request-aware** 模式：

```
当前: Request → Middleware(提取) → Validator(验证) → Response
目标: Request → RequestValidator(提取+验证) → Response
```

验证器直接从 Request 提取数据并验证，消除重复的提取逻辑。

### Scope

**In Scope:**
- 重构 BasicValidator 为 BasicRequestValidator
- 重构 ResourceValidator 为 ResourceRequestValidator
- 统一数据提取逻辑到验证器
- 统一签名验证到验证器服务
- 保持与现有 middleware 的向后兼容

**Out of Scope:**
- 新的验证规则添加（保持现有规则）
- authorizationId 数据库验证（已有 TODO）

## Context for Development

### Codebase Patterns

#### 当前验证器架构

| 组件 | 位置 | 说明 |
|------|------|------|
| `BasicValidator` | `validators/basic.validator.ts` | 验证 appId, timestamp, nonce, signature |
| `ResourceValidator` | `validators/resource.validator.ts` | 继承 BasicValidator，新增 authorizationId |
| `request.validators.ts` | `validators/request.validators.ts` | 基于规则数组的验证器 |
| `middleware` | `resource-validation.middleware.ts` | 有 `extractBasicInfo()`, `verifySignature()` 等函数 |

#### Request 数据结构

```typescript
// 当前 middleware 提取逻辑
{
  basic: { appId, timestamp, nonce, signature },  // BasicInfo
  basic: { appId, timestamp, nonce, signature, authorizationId },  // BasicInfoWithAuthorization
  business: { ... }
}
```

#### 现有提取函数 (Middleware 中)

```typescript
// src/middleware/resource-validation.middleware.ts (line 134-186)

function extractBasicInfo(req: Request): BasicInfo | null {
    const body = req.body as Record<string, unknown>;
    const bodyBasic = body?.basic as Record<string, unknown>;
    if (bodyBasic?.appId && bodyBasic.timestamp && bodyBasic.nonce && bodyBasic.signature) {
        return {
            appId: String(bodyBasic.appId),
            timestamp: Number(bodyBasic.timestamp),
            nonce: String(bodyBasic.nonce),
            signature: String(bodyBasic.signature),
        };
    }
    return null;
}

function extractBasicInfoWithAuthorization(req: Request): { basic: BasicInfo; authorizationId: string } | null {
    const basic = extractBasicInfo(req);
    if (!basic) return null;
    const bodyBasic = req.body?.basic as Record<string, unknown>;
    const authorizationId = bodyBasic?.authorizationId as string | undefined;
    if (!authorizationId) return null;
    return { basic, authorizationId };
}
```

#### 验证器导出结构

```typescript
// src/services/validators/index.ts
export {
    BasicValidator,
    ValidationErrorCodes,
    // types: BasicInfo, ValidationResult, ValidationError
} from './basic.validator';

export {
    ResourceValidator,
    ResourceValidationErrorCodes,
    createResourceValidator,
    createBasicValidator,
    // types: BasicInfoWithAuthorization
} from './resource.validator';
```

#### Middleware 调用模式 (现状)

```typescript
// src/middleware/resource-validation.middleware.ts (line 376-388)
const basic = extractBasicInfo(req);  // 手动提取
if (!basic) return error;
const validator = createBasicValidator();
const validationResult = validator.validate(basic);  // 验证
```

### Files to Reference

| File | Purpose | 行号参考 |
| ---- | ------- | -------- |
| `src/services/validators/basic.validator.ts` | 基础验证器 | 全部 |
| `src/services/validators/resource.validator.ts` | 资源验证器 | 全部 |
| `src/services/validators/index.ts` | 导出模块 | 全部 |
| `src/middleware/resource-validation.middleware.ts` | 提取函数 | L134-200 |
| `src/types/validation.types.ts` | 验证类型定义 | 全部 |

### Technical Decisions

#### Code Review Gauntlet 分析结果

| 维度 | 评分 | 问题 |
|------|------|------|
| 可测试性 | 4/10 | 单例依赖，Prisma 耦合 |
| 可维护性 | 5/10 | 数据提取逻辑分散 |
| 安全性 | 6/10 | 验证链不完整 |
| 扩展性 | 5/10 | 新字段需要改多处 |
| 复用性 | 4/10 | 只能 middleware 调用 |

#### Tree of Thoughts - 架构路径探索

**路径 A: Request-Aware 验证器**
```
思维链: Request → extractBasicInfo(req) → validate(data) → Result
优点: 数据提取内聚到验证器，Middleware 更简洁，单一职责
缺点: 验证器依赖 Express Request，测试需要 mock Request
```

**路径 B: 中间层 Adapter 模式**
```
思维链: Request → Adapter.extract(req) → Validator.validate(data) → Result
优点: 验证器保持纯净，易于测试，可复用
缺点: 多了 Adapter 层，需要维护额外文件
```

**路径 C: Request Validator Wrapper**
```
思维链: Request → RequestValidator.validate(req) → 内部调用 Validator.validate(data)
优点: 零破坏性重构，向后兼容，渐进式迁移
缺点: 原有验证器问题未解决，技术债务
```

**路径评估矩阵**

| 维度 | 路径 A | 路径 B | 路径 C |
|------|--------|--------|--------|
| 简洁性 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| 可测试性 | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 保持纯净 | ⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 向后兼容 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| 快速实现 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |

**最终选择: 路径 A (Request-Aware)**
- 用户明确要求使用 Request 类型作为数据源
- 消除重复提取逻辑是核心目标
- Express 依赖在 middleware 层不可避免

#### ADR-001: 验证器 Request-Aware 重构

**状态:** Proposed
**日期:** 2026-04-14

**背景:**
当前验证器架构存在职责不清问题：Middleware 手动从 Request 提取数据，验证器只接收已提取的数据，数据提取逻辑分散在多处。

**决策:**
选择路径 A: Request-Aware 验证器。验证器直接接收 Express Request 对象，内部提取并验证数据。

```typescript
validator.validateRequest(req)  // 内部: extractBasicInfo(req) → validate(data)
```

**选项分析:**

| 选项 | 描述 | 权衡 |
|------|------|------|
| A | Request-Aware 验证器 | 简洁但验证器依赖 Express |
| B | Adapter 中间层 | 纯净但增加复杂度 |
| C | Wrapper 包装器 | 兼容但技术债务 |

**收益:**
- 内聚性: 数据提取逻辑归一化到验证器
- 简洁性: Middleware 只需调用一个方法
- 单一职责: 验证器自己管理数据提取

**代价:**
- Express 耦合: 验证器依赖 Express Request 类型
- 测试复杂度: 需要 mock Request 对象
- 违反纯函数: 验证器有副作用

**合规性检查:**
- CLAUDE.md 命名规范 (camelCase): ✅ 符合
- 验证器继承模式: ✅ 保持
- 错误码格式: ✅ 保持

#### Rubber Duck Debugging - 渐进式理解

**小黄鸭理解:**
重构 = 把提取数据的代码移到验证器里。就像整理房间，玩具都放回盒子里。

**代码流对比:**

```
Before:
Request → Middleware(提取) → Validator(验证) → Response

After:
Request → Validator
            ├── extractBasicInfo(req) ← 提取
            └── validate(data)         ← 验证
         → Response
```

**关键洞察: extractBasicInfo() 是纯函数**
```typescript
// 提取函数只做数据提取，无副作用
function extractBasicInfo(req: Request): BasicInfo | null {
  const body = req.body as Record<string, unknown>;
  const basic = body?.basic as Record<string, unknown>;
  if (!basic?.appId || !basic?.timestamp) return null;
  return {
    appId: String(basic.appId),
    timestamp: Number(basic.timestamp),
    nonce: String(basic.nonce),
    signature: String(basic.signature)
  };
}
```

**验证器实际上是"无副作用"的**
- `extractBasicInfo()` - 纯函数，只提取数据
- `validate()` - 纯函数，只验证数据
- `validateRequest()` - 组合函数，调用前两个纯函数

**安全性考虑:**
1. 处理好 undefined/null
2. 类型转换要安全 (String(), Number())
3. 错误信息不能泄露内部结构

#### Red Team vs Blue Team - 安全分析

**🔴 Red Team 攻击场景:**
| 攻击场景 | 攻击方式 | 防御措施 |
|---------|---------|---------|
| 类型注入 | `{ appId: {} }` | 类型检查，不是简单 String() |
| 边界值 | `appId: "x".repeat(1000)` | 正则限制长度 |
| 空值注入 | `{ basic: null }` | null 检查 |
| 原型污染 | `{ __proto__: { admin: true } }` | 使用解构或 Object.freeze |

**🔵 Blue Team 防御策略:**
1. **类型安全提取**: 使用 typeof 检查，不依赖隐式转换
2. **白名单验证**: 正则验证 appId, timestamp, nonce, signature
3. **错误信息脱敏**: 仅返回通用错误码
4. **日志脱敏**: 敏感字段 maskValue

#### Failure Mode Analysis - 故障分析

**组件失败模式:**

| 组件 | 失败模式 | 预防措施 |
|------|---------|---------|
| extractBasicInfo | req.body 为 null | 返回 null |
| extractBasicInfo | body.basic 缺失 | 返回 null |
| extractBasicInfo | 字段类型错误 | String()/Number() 转换 |
| BasicValidator.validate | appId 格式错误 | 正则匹配失败 |
| BasicValidator.validate | timestamp 超时 | 5分钟容差判断 |
| BasicValidator.validate | nonce 为空 | 空字符串检查 |

**故障影响评估:**
| 故障点 | 影响范围 | 严重性 | 恢复时间 |
|--------|----------|--------|----------|
| extractBasicInfo 返回 null | 验证失败 | 中 | <1ms |
| appId 正则检查失败 | 验证失败 | 低 | <1ms |
| timestamp 过期 | 验证失败 | 中 | <1ms |
| 签名验证失败 | 认证失败 | 高 | <1ms |

#### First Principles Analysis - 根本重构

**核心洞察:**
```
❌ 假设: "验证器不应该依赖 Request"
✅ 事实: Request 只是数据容器，验证器是纯函数组合

验证器本质:
┌────────────────────────────────────────┐
│    Request-Aware 验证器                    │
├────────────────────────────────────────┤
│  extractBasicInfo(req) → BasicInfo      │
│         ↓                               │
│  validateBasicInfo(data) → Result       │
│         ↓                               │
│  返回: { data, result }                 │
└────────────────────────────────────────┘

关键: extractBasicInfo 和 validateBasicInfo 都是纯函数
```

#### Algorithm Olympics - 方案比较

| 维度 | 方案A 继承 | 方案B 组合 | 方案C 装饰器 |
|------|-----------|-----------|-------------|
| 代码简洁 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 可测试性 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 可维护性 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| 适合场景 | 简单场景 | 复杂场景 | 框架设计 |

**结论: 方案 A (继承扩展) 最适合当前需求**

#### Risk Assessment Matrix - 风险评估

| 风险 ID | 风险描述 | 可能性 | 影响 | 风险等级 |
|---------|----------|--------|------|----------|
| R1 | Middleware 调用方式不兼容 | 中 | 高 | 🟠 高 |
| R2 | 新增方法与现有方法冲突 | 低 | 中 | 🟡 中 |
| R3 | 提取函数边界情况未覆盖 | 中 | 中 | 🟡 中 |
| R4 | Express 类型依赖问题 | 低 | 低 | 🟢 低 |
| R5 | 编译错误引入生产问题 | 低 | 高 | 🟡 中 |

**缓解措施:**
- R1: 保留原有 validate(data) 方法
- R3: 添加边界情况测试
- R5: CI/CD 添加测试检查

#### 重构决策

1. **验证器接收 Request 对象**
   - 直接从 `req.body.basic` 提取数据
   - 不需要 middleware 手动提取

2. **保持继承结构**
   - `BasicRequestValidator extends BasicValidator`
   - `ResourceRequestValidator extends BasicRequestValidator`

3. **统一错误码**
   - 使用 ValidationErrorCodes (string 类型: '40104', '40002' 等)

4. **向后兼容**
   - 保留原有 `validate(data)` 方法
   - 新增 `validateRequest(req)` 方法

## Implementation Plan

### Task Breakdown (Dependency Order)

**Task 1: 重构 BasicValidator - 添加提取函数和方法**

- [ ] **Task 1.1**: 在 `basic.validator.ts` 中添加 `extractBasicInfo()` 提取函数
  - File: `src/services/validators/basic.validator.ts`
  - Action: 从 middleware 中复制 `extractBasicInfo()` 函数，调整为模块级导出函数
  - 注意: 添加 `import { Request } from 'express'`

- [ ] **Task 1.2**: 在 `BasicValidator` 类中添加 `validateRequest()` 方法
  - File: `src/services/validators/basic.validator.ts`
  - Action: 添加 `validateRequest(req: Request): ValidationResult` 方法
  - 内部调用: `extractBasicInfo(req)` → `this.validate(data)`

- [ ] **Task 1.3**: 添加类型导出
  - File: `src/services/validators/basic.validator.ts`
  - Action: 导出 `extractBasicInfo` 函数类型

**Task 2: 重构 ResourceValidator - 添加提取函数和方法**

- [ ] **Task 2.1**: 在 `resource.validator.ts` 中添加 `extractBasicInfoWithAuthorization()` 提取函数
  - File: `src/services/validators/resource.validator.ts`
  - Action: 从 middleware 中复制 `extractBasicInfoWithAuthorization()` 函数
  - 依赖: Task 1.1 (需要 import `extractBasicInfo`)

- [ ] **Task 2.2**: 在 `ResourceValidator` 类中添加 `validateRequest()` 方法
  - File: `src/services/validators/resource.validator.ts`
  - Action: 添加 `validateRequest(req: Request): ValidationResult` 方法
  - 内部调用: `extractBasicInfoWithAuthorization(req)` → `this.validate(data)`
  - 依赖: Task 2.1

**Task 3: 更新 Middleware - 使用新验证器方法**

- [ ] **Task 3.1**: 更新 `createBasicValidationMiddleware()` 使用 `validator.validateRequest()`
  - File: `src/middleware/resource-validation.middleware.ts`
  - Action: 移除 `extractBasicInfo()` 调用，改用 `validator.validateRequest(req)`
  - 依赖: Task 1.2

- [ ] **Task 3.2**: 更新 `createResourceValidationMiddleware()` 使用 `validator.validateRequest()`
  - File: `src/middleware/resource-validation.middleware.ts`
  - Action: 移除 `extractBasicInfoWithAuthorization()` 调用，改用 `validator.validateRequest(req)`
  - 依赖: Task 2.2

- [ ] **Task 3.3**: 清理 middleware 中的重复提取函数
  - File: `src/middleware/resource-validation.middleware.ts`
  - Action: 保留 `extractBasicInfo()` 和 `extractBasicInfoWithAuthorization()` 供向后兼容（标记为 @deprecated）
  - 注意: 验证它们与验证器中的函数行为一致

**Task 4: 更新验证器导出模块**

- [ ] **Task 4.1**: 更新 `validators/index.ts` 导出新增的函数
  - File: `src/services/validators/index.ts`
  - Action: 导出 `extractBasicInfo`, `extractBasicInfoWithAuthorization`

**Task 5: 添加单元测试**

- [ ] **Task 5.1**: 为 `extractBasicInfo()` 添加测试
  - File: `src/__tests__/validators/basic.validator.test.ts` (新建)
  - 覆盖: 正常提取、null body、缺少字段、类型错误

- [ ] **Task 5.2**: 为 `validateRequest()` 添加测试
  - File: `src/__tests__/validators/basic.validator.test.ts`
  - 覆盖: 成功验证、提取失败、验证失败

- [ ] **Task 5.3**: 为 `ResourceValidator.validateRequest()` 添加测试
  - File: `src/__tests__/validators/resource.validator.test.ts`
  - 覆盖: 成功验证、缺少 authorizationId

**Task 6: 编译验证**

- [ ] **Task 6.1**: 运行 `npm run build` 确保无编译错误
- [ ] **Task 6.2**: 运行 `npm test` 确保测试通过

### Acceptance Criteria

#### 功能正确性

- [ ] **AC 1.1**: Given valid Request with `body.basic: { appId, timestamp, nonce, signature }`, when calling `BasicValidator.validateRequest(req)`, then return `{ valid: true, errors: [] }`

- [ ] **AC 1.2**: Given valid Request with `body.basic: { appId, timestamp, nonce, signature, authorizationId }`, when calling `ResourceValidator.validateRequest(req)`, then return `{ valid: true, errors: [] }`

- [ ] **AC 1.3**: Given existing `BasicValidator.validate(data)` calls, when called with valid BasicInfo, then return `{ valid: true, errors: [] }` (backward compatibility)

- [ ] **AC 1.4**: Given existing `ResourceValidator.validate(data)` calls, when called with valid BasicInfoWithAuthorization, then return `{ valid: true, errors: [] }` (backward compatibility)

#### 错误处理

- [ ] **AC 2.1**: Given Request with `body: null`, when calling `extractBasicInfo(req)`, then return `null`

- [ ] **AC 2.2**: Given Request with `body.basic` missing required fields, when calling `extractBasicInfo(req)`, then return `null`

- [ ] **AC 2.3**: Given Request with missing `basic` field, when calling `BasicValidator.validateRequest(req)`, then return `{ valid: false, errors: [{ field: 'basic', code: '40104' }] }`

- [ ] **AC 2.4**: Given Request with invalid `appId` format, when calling `validateRequest(req)`, then return `{ valid: false, errors: [{ field: 'appId', code: '40002' }] }`

- [ ] **AC 2.5**: Given Request with expired `timestamp`, when calling `validateRequest(req)`, then return `{ valid: false, errors: [{ field: 'timestamp', code: '40102' }] }`

- [ ] **AC 2.6**: Given Request with invalid `signature` format, when calling `validateRequest(req)`, then return `{ valid: false, errors: [{ field: 'signature', code: '40002' }] }`

- [ ] **AC 2.7**: Given Request with missing `authorizationId`, when calling `ResourceValidator.validateRequest(req)`, then return `{ valid: false, errors: [{ field: 'authorizationId', code: '40104' }] }`

#### 安全性

- [ ] **AC 3.1**: Given Request with `{ appId: {} }` (non-string type), when calling `extractBasicInfo(req)`, then properly handle type and return extracted data with String() conversion

- [ ] **AC 3.2**: Given Request with `{ __proto__: { admin: true } }` (prototype pollution attempt), when calling `extractBasicInfo(req)`, then safely extract without prototype pollution

- [ ] **AC 3.3**: Given Request with oversized fields, when calling `extractBasicInfo(req)`, then properly handle within regex validation limits

#### Middleware 集成

- [ ] **AC 4.1**: Given `createBasicValidationMiddleware()` middleware, when processing valid request, then successfully attach `developerContext` and `businessData` to request

- [ ] **AC 4.2**: Given `createResourceValidationMiddleware()` middleware, when processing valid request, then successfully attach `authorizationId` and `userId` to request

- [ ] **AC 4.3**: Given middleware with invalid request, when validation fails, then return proper error response with `trace_id`

#### 编译与测试

- [ ] **AC 5.1**: Given all code changes, when running `npm run build`, then compilation succeeds without errors

- [ ] **AC 5.2**: Given unit tests for `extractBasicInfo()`, when all test cases run, then all tests pass

- [ ] **AC 5.3**: Given unit tests for `validateRequest()`, when all test cases run, then all tests pass

## Additional Context

### Dependencies

| 依赖 | 版本 | 用途 |
|------|------|------|
| express | ^4.x | Request 类型 |
| typescript | ^5.x | 类型检查 |
| jest | ^29.x | 单元测试 |

### Testing Strategy

#### 单元测试 (Task 5)

**测试文件结构:**
```
src/__tests__/validators/
├── basic.validator.test.ts      # BasicValidator 测试
├── resource.validator.test.ts    # ResourceValidator 测试
└── extract.test.ts              # 提取函数测试
```

**测试用例覆盖:**
- `extractBasicInfo()`: 正常提取、null body、缺少字段、类型错误、边界值
- `BasicValidator.validateRequest()`: 成功、appId 错误、timestamp 过期、signature 错误
- `ResourceValidator.validateRequest()`: 成功、缺少 authorizationId

#### 集成测试

**手动测试步骤:**
1. 启动服务: `npm run dev`
2. 发送有效请求到 `/api/thirdparty/oauth/token`
3. 验证响应包含 `developerContext`
4. 发送无效请求验证错误响应

### Notes

**高风险项:**
- Middleware 调用方式变更可能影响现有功能
- 向后兼容性测试至关重要

**已知限制:**
- 验证器现在依赖 Express Request 类型
- 无法在非 Express 环境直接使用

**未来考虑:**
- 如果需要支持其他框架，可以提取 `extractBasicInfo()` 为独立模块
- 可以考虑将验证器重构为纯函数组合模式（方案 B）

### 实施顺序

```
1. Task 1.1-1.3 (BasicValidator)
2. Task 2.1-2.2 (ResourceValidator)
3. Task 3.1-3.3 (Middleware 更新)
4. Task 4.1 (导出更新)
5. Task 5.1-5.3 (单元测试)
6. Task 6.1-6.2 (编译验证)
```
