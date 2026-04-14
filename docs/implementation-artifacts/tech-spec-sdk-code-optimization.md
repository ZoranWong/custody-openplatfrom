---
title: 'SDK 代码优化重构'
slug: 'sdk-code-optimization'
created: '2026-04-09T00:00:00.000Z'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TypeScript 5.x', 'Vitest 1.x', 'jsdom', 'Vite 5.x', 'postMessage API']
files_to_modify: ['openplatform-sdk/web/src/index.ts', 'openplatform-sdk/web/src/types.ts', 'openplatform-sdk/web/src/message/index.ts', 'openplatform-sdk/web/src/index.test.ts']
code_patterns: ['类封装 SDK', 'postMessage + UUID 验证', 'popup/window/iframe 三种模式', 'JSDoc 文档']
test_patterns: ['Vitest + jsdom', 'Mock DOM 操作', 'Spy on event listeners', '650 行现有测试覆盖']
---

# Tech-Spec: SDK 代码优化重构

**Created:** 2026-04-09

## Overview

### Problem Statement

Cregis Web SDK (`openplatform-sdk/web/src/index.ts`) 存在以下问题：
- **安全漏洞**：postMessage 使用 `*` origin、多个实例共享全局 `ALLOWED_ORIGINS`、全局 `__cregisResolve` 命名冲突
- **内存泄漏风险**：messageHandler 覆盖时未清理、DOM 操作触发 reflow
- **代码重复**：setupMessageListener 与 setupWindowListener 有 80% 相同逻辑
- **类型不一致**：IframeMessage 用 `type` 字段，但 setupWindowListener 用 `action`
- **文档错误**：JSDoc 注释与实现不匹配

### Solution

对 SDK 进行全面的安全修复、代码重构和性能优化，同时保持 API 向后兼容。

### Scope

**In Scope:**
- 修复所有安全漏洞（postMessage origin、全局状态、多实例支持）
- 抽取公共逻辑，消除代码重复
- 统一消息类型定义
- 添加单元测试覆盖
- 修复 JSDoc 注释错误

**Out of Scope:**
- 不改变公开 API 接口
- 不添加新的功能特性
- 不重构 message/index.ts 模块（单独处理）

## Context for Development

### Codebase Patterns

**现有模式：**
- 类封装 SDK，使用 TypeScript
- postMessage 通信，UUID 验证
- 三种授权模式：popup/tab/window
- 使用 JSDoc 文档

**问题模式：**
- 全局 Set 跨实例污染
- window 命名空间全局变量
- 硬编码样式字符串

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `openplatform-sdk/web/src/index.ts` | 核心 SDK 类 (687 行) |
| `openplatform-sdk/web/src/types.ts` | 类型定义 |
| `openplatform-sdk/web/src/message/index.ts` | 消息通信模块 |

---

## Advanced Elicitation 应用

### Code Review Gauntlet 结果

**👨‍💻 Alex - Clean Code 倡导者 发现：**

1. **代码重复问题** (严重)
   ```
   setupMessageListener / setupWindowListener 有 80% 相同逻辑：
   - origin 验证
   - UUID 验证
   - debug 日志输出
   → 应抽取 validateMessage(event) 公共方法
   ```

2. **JSDoc 注释错误**
   ```
   line 555: "Destroy SDK instance" 但函数体是 createModal
   → 这是复制粘贴错误
   ```

3. **三元运算符可读性**
   ```
   line 347: result.status === 'success' ? 'authorization_complete' : 'authorization_error'
   → 可提取为 const resultType = ...
   ```

4. **硬编码样式分散**
   ```
   createModal 中的 default styles 分散在 cssText 中
   → 应提取 DEFAULT_MODAL_STYLES 常量
   ```

**👨‍🔬 Ben - Performance 专家 发现：**

1. **内存泄漏风险** (严重)
   ```
   setupWindowListener 每次覆盖 this.messageHandler
   旧的 listener 可能泄漏
   → 应在添加前先 removeMessageListener()
   ```

2. **Array.from 创建开销**
   ```
   getAllowedOrigins() 每次调用创建新数组
   → 可缓存或返回 Set 本身
   ```

3. **cssText 性能问题**
   ```
   createModal 使用 cssText 触发浏览器解析
   → 应使用 CSS class
   ```

4. **appendUUID 重复创建**
   ```
   每次创建 URLSearchParams
   → 可优化 URL 构造
   ```

**👨‍🔧 Chris - Security 专家 发现：**

1. **🔴 postMessage 跨域漏洞** (高危)
   ```
   message/index.ts line 14: postMessage(data, '*')
   → 允许任何网站接收消息！必须验证 targetOrigin
   ```

2. **🔴 全局 ALLOWED_ORIGINS 污染** (高危)
   ```
   多个 SDK 实例共享同一个 Set
   实例 A 设置 origins 影响实例 B
   → 应移到 SDK 实例内部
   ```

3. **🔴 window.__cregisResolve 命名冲突** (高危)
   ```
   任何代码可覆盖，全局变量
   多实例会相互覆盖
   → 用闭包或 WeakMap 存储
   ```

4. **🟡 origin 验证语义不清晰**
   ```
   ALLOWED_ORIGINS.size > 0 意味着允许所有？
   → 应有明确默认值
   ```

**👨‍💼 David - Pragmatist 观点：**

1. 代码规模 687 行合理，不需要强制拆分
2. 不要过度工程，优先修复安全漏洞
3. 保持 API 兼容

---

### Architecture Decision Records 结果

#### ADR-001: 全局状态管理方案

**决定：采用 Map<uuid, origins> 方案**

```
方案：
- 将 ALLOWED_ORIGINS 从模块级全局变量移至 SDK 实例属性
- 使用 Map<uuid, Set<string>> 维护多个实例的 origins
- 保持 setAllowedOrigins/getAllowedOrigins API 兼容

优点：
- 每个 SDK 实例有独立的 origin 白名单
- 不影响现有 API
- 实现风险低

工作量：3h
```

#### ADR-002: Promise 解析机制

**决定：使用 Map + 显式清理 + timeout**

```
方案：
- 使用 Map<uuid, { resolve, reject, timeout }> 替代 window 全局变量
- 在 openAuthorization 时记录 Promise resolver
- destroy() 时清理所有挂起的 Promise
- 添加 30s timeout 自动 reject

优点：
- 多实例并发安全
- 不污染 window 命名空间
- 支持 timeout 和取消

工作量：8h
```

#### ADR-003: 消息处理架构

**决定：抽取验证方法，保持 listener 分离**

```
方案：
1. 保持 setupMessageListener 和 setupWindowListener 分离（行为差异太大）
2. 抽取 validateOrigin 和 validateUUID 为私有方法
3. 抽取事件处理 handleAuthEvent 为独立方法
4. 目标：代码重复从 80% 降至 40%

优点：
- 保持模式差异的清晰性
- 减少代码重复
- 易于测试

工作量：4h
```

**总工作量估算：15h**

---

### Tree of Thoughts 分析结果

**核心问题：如何实现 SDK 代码优化，同时保持向后兼容？**

#### 路径对比

| 路径 | 方案 | 优点 | 缺点 | 得分 |
|-----|------|------|------|------|
| A | 激进重构 | 代码质量最佳 | Breaking change，用户需修改代码 | 6/10 |
| **B** | **渐进式安全修复** | **完全向后兼容，风险可控** | **保留一些技术债务** | **8.5/10** |
| C | 保守策略 | 最少工作量 | 内存泄漏和安全问题累积 | 5/10 |
| D | 模块化 | 架构最清晰 | 过度工程，40h+ 工作量 | 7/10 |

#### ✅ 推荐选择：路径 B - 渐进式安全修复

**理由：**
1. 向后兼容是硬约束 - SDK 用户不应被迫修改代码
2. 工作量与收益平衡 - 15h 合理范围
3. 风险可控 - 分阶段交付，每个阶段可验证
4. 技术债务可控 - 保留一些技术债务但不影响安全

#### 实施计划（23h，含 20% buffer）

```
阶段 1: 安全修复（5h）
├─ T1.1: 实现 Map<uuid, origins> 内部结构
├─ T1.2: 保持 setAllowedOrigins 静态方法兼容
├─ T1.3: 实现 Map<uuid, resolver> 替代全局
└─ T1.4: 添加自动清理 + timeout

阶段 2: 代码重构（6h）
├─ T2.1: 抽取 validateOrigin/validateUUID
├─ T2.2: 抽取 handleAuthEvent
├─ T2.3: 统一消息类型（action → type）
└─ T2.4: 修复 JSDoc

阶段 3: 性能优化（4h）
├─ T3.1: createModal CSS class
├─ T3.2: getAllowedOrigins 缓存
└─ T3.3: iframe 清理优化

阶段 4: 测试覆盖（8h）
├─ T4.1: 安全测试
├─ T4.2: 多实例隔离测试
├─ T4.3: Promise 生命周期测试
└─ T4.4: 回归测试
```

---

### 5 Whys 根因分析

**核心问题：SDK 存在安全漏洞、代码重复和内存泄漏问题**

#### 追问链条

**Why 1: 为什么 SDK 使用全局变量（ALLOWED_ORIGINS）？**
```
追问链：需要共享 → 静态方法 → 假设单实例 → 设计时未考虑多实例
根因：架构设计未考虑多实例场景
```

**Why 2: 为什么存在 window.__cregisResolve 全局变量？**
```
追问链：跨异步保持引用 → 需要全局 → 闭包太复杂 → 选择简单方案
根因：选择了"能用"而非"正确"的设计
```

**Why 3: 为什么两个 listener 代码重复 80%？**
```
追问链：两种模式 → 行为不同 → 抽象困难 → 复制粘贴更快
根因：技术债务累积，快速迭代优先于代码质量
```

**Why 4: 为什么 postMessage 使用 '*' origin？**
```
追问链：不知道目标 → 没传参数 → 受控环境 → 不需要验证
根因：缺乏安全意识设计
```

**Why 5: 为什么内存泄漏没有被及时发现？**
```
追问链：无测试 → 没 TDD → 测试是额外工作 → 无质量门禁
根因：缺少质量门禁机制，代码交付=故事完成
```

#### 根因 → 解决方案映射

| 根因 | 类别 | 解决方案 |
|-----|------|---------|
| 根因 1 | 架构 | ADR-001: Map<uuid, origins> 多实例支持 |
| 根因 2 | 设计 | ADR-002: Map<uuid, resolver> + timeout |
| 根因 3 | 流程 | ADR-003: 抽取公共方法，减少重复 |
| 根因 4 | 安全 | postMessage origin 验证，默认拒绝未知 |
| 根因 5 | 流程 | AC-6: 测试覆盖率 80% 门禁 |

#### 深层洞察

**这是一个系统性问题，而非代码问题：**

1. **架构** → 缺乏多实例考虑 → 设计时就考虑扩展性
2. **设计** → 技术债务 → 时间压力下仍坚持正确设计
3. **安全** → 事后补救 → 把安全当作设计约束而非附加项
4. **质量** → 没有门禁 → 建立自动化质量检查

**改进建议：**
- 在 story 估算时加入"技术债务清理"时间
- 建立 PR review checklist，包含安全检查项
- 设置测试覆盖率门禁（最低 70%）
- 定期技术债务回顾（每季度）

---

## Implementation Plan

### Tasks

#### 阶段 1: 安全修复

**Task 1.1: 实现 Promise Resolver Map**
- 文件: `openplatform-sdk/web/src/index.ts`
- 操作:
  - 添加实例属性 `private pendingAuths = new Map<string, { resolve: (r: AuthorizationResult) => void, timeoutId: number }>();`
  - 修改 `openAuthorization` 方法，将 Promise resolve 函数存储到 Map 中（key: this.uuid）
  - 在 auth 完成时（成功/失败/取消），从 Map 中删除并清理 timeout
  - 修改所有使用 `window.__cregisResolve` 的地方，改为使用 Map
  - 添加 30s timeout 自动 reject
- 验收: AC-3, AC-7

**Task 1.2: 实现实例级 Origins 管理**
- 文件: `openplatform-sdk/web/src/index.ts`
- 操作:
  - 添加实例属性 `private allowedOrigins = new Set<string>();`
  - 保留全局 `ALLOWED_ORIGINS` 作为向后兼容，但添加实例映射
  - `setAllowedOrigins` 静态方法改为更新全局 Map（uuid → origins）
  - `getAllowedOrigins` 静态方法改为从全局 Map 读取
  - `validateOrigin` 方法优先检查实例 origins，回退到全局
- 验收: AC-1, AC-2, AC-9

**Task 1.3: 修复 message/index.ts 安全漏洞**
- 文件: `openplatform-sdk/web/src/message/index.ts`
- 操作:
  - 修改 `sendToParent` 函数，添加 `targetOrigin` 参数
  - 使用 `parentOrigin` 配置验证目标
  - 添加 SDK 实例 UUID 验证
- 验收: AC-1

**Task 1.4: 添加内存安全清理**
- 文件: `openplatform-sdk/web/src/index.ts`
- 操作:
  - 在 `destroy()` 方法中添加清理所有 pendingAuths 的逻辑
  - 使用 try/finally 确保 iframe 和 listener 总是被清理
  - 在 `closeModal()` 中添加额外的安全检查
- 验收: AC-10

#### 阶段 2: 代码重构

**Task 2.1: 抽取验证方法**
- 文件: `openplatform-sdk/web/src/index.ts`
- 操作:
  - 添加 `private validateOrigin(event: MessageEvent): boolean` 方法
  - 添加 `private validateUUID(data: IframeMessage): boolean` 方法
  - 抽取公共 origin 和 UUID 验证逻辑
  - 更新 `setupMessageListener` 和 `setupWindowListener` 使用新方法
- 验收: AC-4

**Task 2.2: 抽取事件处理方法**
- 文件: `openplatform-sdk/web/src/index.ts`
- 操作:
  - 添加 `private handleAuthEvent(data: IframeMessage): void` 方法
  - 统一处理 authorization_result 事件
  - 抽取 `resolveAuth(result: AuthorizationResult)` 辅助方法
  - 更新两个 listener 使用公共事件处理
- 验收: AC-4

**Task 2.3: 统一消息类型**
- 文件: `openplatform-sdk/web/src/index.ts`
- 操作:
  - 修改 `setupWindowListener` 中的 `data.action` 为 `data.type`
  - 确保所有消息处理使用 `IframeMessage.type` 字段
  - 更新 types.ts 文档说明 `type` 是主字段
- 验收: 消除类型不一致

**Task 2.4: 修复 JSDoc 注释**
- 文件: `openplatform-sdk/web/src/index.ts`
- 操作:
  - 删除 line 555 误放的 "Destroy SDK instance" 注释
  - 验证所有公共方法的 JSDoc 与实现一致
  - 添加缺少的参数说明（如 `createModal` 的 iframe 参数）
- 验收: AC-5

**Task 2.5: 提取 DEFAULT_MODAL_STYLES 常量**
- 文件: `openplatform-sdk/web/src/index.ts`
- 操作:
  - 在类外定义 `const DEFAULT_MODAL_STYLES = { ... }`
  - 更新 `createModal` 方法使用常量
  - 移除硬编码的 cssText 字符串
- 验收: 代码可读性提升

#### 阶段 3: 性能优化

**Task 3.1: 优化 getAllowedOrigins**
- 文件: `openplatform-sdk/web/src/index.ts`
- 操作:
  - 添加缓存机制避免每次调用创建新数组
  - 或提供 `getAllowedOriginsSet(): ReadonlySet<string>` 新方法
  - 保持原有 `getAllowedOrigins(): string[]` 兼容
- 验收: 减少内存分配

**Task 3.2: createModal 使用 CSS class**
- 文件: `openplatform-sdk/web/src/index.ts`
- 操作:
  - 定义 CSS class 替代部分内联样式
  - 保留 `modalStyles` 参数的 cssText 覆盖能力
  - 减少多次 style 修改触发的 reflow
- 验收: 性能改善

**Task 3.3: iframe 清理优化**
- 文件: `openplatform-sdk/web/src/index.ts`
- 操作:
  - 在 `setupWindowListener` 开始时调用 `removeMessageListener()`
  - 确保不会覆盖未清理的 listener
  - 添加调试日志（debug 模式）
- 验收: 内存泄漏修复

#### 阶段 4: 测试覆盖

**Task 4.1: 安全测试**
- 文件: `openplatform-sdk/web/src/index.test.ts`
- 操作:
  - 添加测试：origin 验证拒绝未授权 origin
  - 添加测试：UUID 验证拒绝错误 UUID
  - 添加测试：多实例 origins 隔离
- 验收: AC-1, AC-2

**Task 4.2: Promise 生命周期测试**
- 文件: `openplatform-sdk/web/src/index.test.ts`
- 操作:
  - 添加测试：Promise 在 auth 完成时 resolve
  - 添加测试：Promise 在 timeout 时 reject
  - 添加测试：Promise resolver 在 Map 中正确清理
- 验收: AC-3, AC-7

**Task 4.3: 内存安全测试**
- 文件: `openplatform-sdk/web/src/index.test.ts`
- 操作:
  - 添加测试：destroy 清理所有 listener
  - 添加测试：closeModal 清理 iframe 和 listener
  - 添加测试：多次 openAuthorization 不累积 listener
- 验收: AC-10

**Task 4.4: 回归测试**
- 文件: `openplatform-sdk/web/src/index.test.ts`
- 操作:
  - 运行现有 650 行测试确保无回归
  - 验证 popup/tab/window 模式仍正常工作
  - 验证原有 API 兼容
- 验收: AC-11

### Acceptance Criteria

**AC-1: 安全验证**
```
Given: 恶意网站尝试通过 postMessage 获取授权信息
When: 消息 origin 不在 allowedOrigins 中
Then: 消息被拒绝，不返回任何数据
```

**AC-2: 多实例隔离**
```
Given: 创建两个 SDK 实例 A 和 B
When: A 设置 allowedOrigins = ['https://a.com'], B 设置 ['https://b.com']
Then: A 的消息验证只接受 a.com，B 只接受 b.com
```

**AC-3: Promise resolve 正确性**
```
Given: 用户取消授权弹窗
When: 点击关闭按钮
Then: Promise resolve({ status: 'cancelled' }) 被正确调用，无全局变量冲突
```

**AC-4: 代码重复消除**
```
Given: 审查 setupMessageListener 和 setupWindowListener
When: 检查 origin 和 UUID 验证逻辑
Then: 两者都使用 validateOrigin 和 validateUUID 公共方法
```

**AC-5: JSDoc 文档准确**
```
Given: 开发者阅读 SDK 文档
When: 查看 createModal 函数
Then: 文档描述与实现一致，无误导性注释
```

**AC-6: 单元测试覆盖**
```
Given: 运行 vitest 测试套件
When: 测试覆盖率达到 80%+
Then: 所有安全和重构变更有测试保障，无回归
```

**AC-7: Promise resolver 自动清理**
```
Given: openAuthorization 完成（成功/失败/取消/超时）
When: auth 流程结束
Then: 对应的 resolver 从 Map 中移除，无残留
```

**AC-8: 跨域重定向诊断**
```
Given: postMessage 在 5s 内没有收到响应
When: 使用 tab/window 模式
Then: 在 debug 模式记录警告，Promise 仍然等待直到 30s timeout
```

**AC-9: origins 验证安全默认值**
```
Given: 消息到达但实例 origins 为空或未找到
When: 执行 validateOrigin()
Then: 返回 false（默认拒绝），不返回任何数据
```

**AC-10: 内存安全清理**
```
Given: destroy() 被调用或 iframe 关闭
When: SDK 清理资源
Then: 所有 listener、resolver、DOM 元素被移除，使用 try/finally 确保清理
```

**AC-11: API 向后兼容**
```
Given: 用户升级 SDK 版本
When: 使用原有 API 调用
Then: 所有原有 API 保持兼容，无 TypeScript 编译错误
```

### Implementation Task Summary

| Task | 文件 | 优先级 | 验收标准 |
|------|------|--------|---------|
| 1.1 Promise Resolver Map | index.ts | P0 | AC-3, AC-7 |
| 1.2 实例级 Origins 管理 | index.ts | P0 | AC-1, AC-2, AC-9 |
| 1.3 message/index.ts 安全 | message/index.ts | P0 | AC-1 |
| 1.4 内存安全清理 | index.ts | P0 | AC-10 |
| 2.1 抽取验证方法 | index.ts | P1 | AC-4 |
| 2.2 抽取事件处理 | index.ts | P1 | AC-4 |
| 2.3 统一消息类型 | index.ts | P1 | 类型一致 |
| 2.4 修复 JSDoc | index.ts | P1 | AC-5 |
| 2.5 提取样式常量 | index.ts | P2 | 可读性 |
| 3.1 优化 getAllowedOrigins | index.ts | P2 | 性能 |
| 3.2 createModal CSS class | index.ts | P2 | 性能 |
| 3.3 iframe 清理优化 | index.ts | P2 | AC-10 |
| 4.1 安全测试 | index.test.ts | P0 | AC-1, AC-2 |
| 4.2 Promise 生命周期测试 | index.test.ts | P0 | AC-3, AC-7 |
| 4.3 内存安全测试 | index.test.ts | P0 | AC-10 |
| 4.4 回归测试 | index.test.ts | P0 | AC-11 |

## Additional Context

### Dependencies

- **无新外部依赖** - 使用现有 TypeScript 5.x 和 Vitest 1.x
- **现有依赖**: crypto-js, md5 (不需要修改)

### Testing Strategy

**单元测试 (Task 4.1-4.4):**
- 使用 Vitest + jsdom 环境
- Mock DOM 操作（iframe, modal）
- Spy on event listeners 验证行为
- 目标覆盖率: 80%+

**测试场景:**
1. **安全测试**: origin 验证、UUID 验证、多实例隔离
2. **Promise 测试**: resolve、reject、timeout、清理
3. **内存测试**: destroy、closeModal、多次调用
4. **回归测试**: 现有功能无破坏

### Pre-mortem 预防措施

| 风险 | 预防措施 |
|-----|---------|
| 跨域 postMessage 丢失 | AC-8 跨域重定向诊断 |
| 内存泄漏 | AC-7 Promise resolver 自动清理，AC-10 内存安全清理 |
| origins 验证回退 | AC-9 安全默认值 |
| Breaking change | AC-11 API 向后兼容 |

### 技术债务说明

根据 5 Whys 分析，根因包括：
- 技术债务累积（根因 3）
- 质量门禁缺失（根因 5）

本次重构将：
- 清理部分技术债务（Task 2.1-2.5）
- 建立测试覆盖率门禁（AC-6: 80%+）
- 减少代码重复 40%+（AC-4）

### 未来考虑 (Out of Scope)

1. **message/index.ts 模块化**: 考虑重构为独立 MessageChannel 类
2. **TypeScript 类型增强**: 考虑使用更严格的 strict 模式
3. **ESLint 规则**: 添加自定义规则防止全局变量滥用