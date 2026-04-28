---
title: 'Forward Routes 路径映射优化'
slug: 'forward-routes-mapping'
created: '2026-04-21'
status: 'completed'
stepsCompleted: [1, "Advanced Elicitation", "Implementation"]
tech_stack: ['TypeScript', 'Express']
files_to_modify:
  - 'openplatform-api-service/src/config/forward-routes.ts'
  - 'openplatform-api-service/src/routes/thirdparty.routes.ts'
code_patterns:
  - 'ForwardRouteConfig 配置结构'
  - 'findForwardRoute 路由匹配'
  - 'forwardRequest 请求转发'
test_patterns:
  - '单元测试验证路由匹配逻辑'
  - '集成测试验证完整转发流程'
---

# Tech-Spec: Forward Routes 路径映射优化

**Created:** 2026-04-21

## Overview

### Problem Statement

当前开发者对接路径（如 `/api/thirdparty/treasury/create`）与 custody 后端路径（如 `/third-party/create/{resourceKey}`）不一致，导致路由匹配失败，无法正确转发请求到 custody 服务。

### Solution

在 `ForwardRouteConfig` 中增加 `inboundPath` 字段作为开发者对接路径的匹配键，`route` 字段作为 custody 后端转发目标，实现文档路径到后端路径的映射，转发时使用 `req.context.resource.resourceKey` 替换 `{resourceKey}` 占位符。

### Scope

**In Scope:**
- 修改 `ForwardRouteConfig` 接口，增加 `routeId`、`inboundPath` 字段和 `paramMapping` 参数映射
- 更新 `findForwardRoute()` 函数，使用 `inboundPath` 匹配开发者请求
- 修改 `forwardRequest()` 函数，根据 `matchedRoute.route` 构建 custody 后端路径
- 更新 `BACKEND_CLIENTS` 配置，`clientName` 统一改为 `custodyService`
- 更新所有 `FORWARD_ROUTES` 配置条目，增加 `routeId`、`inboundPath` 并更新 `clientName`
- 路径规范化处理（处理 `/api/thirdparty//treasury` 和尾部斜杠问题）
- 添加参数验证（防止路径注入）
- 添加 build-time 配置校验（重复检测、未映射参数检测）
- 添加参数冲突检测逻辑
- 完善 Error Case AC
- 添加完整配置映射表
- 更新相关测试

**Out of Scope:**
- 修改 SDK 代码（SDK 已适配新路径）
- 新增接口（仅优化现有转发逻辑）
- 性能优化（Map 缓存） - 后续迭代

## Context for Development

### Codebase Patterns

| 文件 | 用途 |
| ---- | ------- |
| `src/config/forward-routes.ts` | Forward routes 配置，定义 `ForwardRouteConfig` 接口和 `FORWARD_ROUTES` 数组 |
| `src/routes/thirdparty.routes.ts` | 三方开发者路由，使用 `findForwardRoute()` 匹配并转发请求 |
| `src/services/forwarders.ts` | Forwarder 实现，包含 `CustodyForwarder` 等 |
| `docs/thirdparty-integration-guide.md` | 开发者对接文档，定义接口路径 |

### Technical Decisions

1. **保持向后兼容**：`inboundPath` 为新增字段，`route` 保留作为后端转发目标
2. **统一 clientName**：`custody-enterprise` → `custodyService`
3. **路径映射规则**：开发者请求 `inboundPath` → 转发到 custody `route`
4. **路径规范化**：
   - 去除重复斜杠：`/api/thirdparty//treasury` → `/api/thirdparty/treasury`
   - 去除尾部斜杠：`/api/thirdparty/treasury/create/` → `/api/thirdparty/treasury/create`
5. **参数验证**：提取路径参数后验证格式，防止注入攻击
   - 正则白名单：`^[a-zA-Z0-9_-]{1,64}$`
6. **简化匹配**：开发者请求全部为 POST，不需要 method 匹配逻辑
7. **大小写敏感**：路径匹配区分大小写
8. **显式参数映射**：通过 `paramMapping` 显式声明参数来源（url/context）
9. **配置校验**：build-time 检测重复 inboundPath 和未映射参数

### 路径参数提取规则

**重要：参数来源已由资源验证中间件处理**

```
开发者请求 → [资源验证中间件] → Open Platform → Custody Backend
                    ↓                              inboundPath      route
              req.context.resource                 匹配判断         参数替换
              已包含资源信息
```

#### inboundPath 中的 {param} 参数
- **来源**：从请求 URL 路径中提取
- **示例**：`/submit-task/{taskId}` → 从 URL 提取 `taskId`

#### route 中的 {resourceKey} 参数
- **{resourceKey}**：从 `req.context.resource.resourceKey` 获取（OauthResource.resourceKey，资源验证中间件已设置）
- **其他参数**：根据 route 定义处理

#### 请求处理流程

```
1. 开发者请求 POST /api/thirdparty/treasury/submit-task/123
   body: { basic: { appId, authorizationId, timestamp, nonce, signature }, ... }
                              ↕
2. resourceValidationMiddleware 验证资源
   - 从 body.basic.resourceKey 验证授权
   - 设置 req.context.resource = { resourceKey, ... }
                              ↕
3. normalizePath() 规范化路径
                              ↕
4. findForwardRoute() 用 inboundPath 匹配
   匹配到: { inboundPath: '/api/thirdparty/treasury/submit-task/{taskId}', ... }
   提取 URL 参数: { taskId: '123' }
                              ↕
5. forwardRequest() 构建后端路径
   - 从 req.context.resource.resourceKey 获取 resourceKey
   - 从 URL 提取 taskId
   - 替换 route 中的参数:
     /third-party/submit/task/{resourceKey}/{taskId}
     → /third-party/submit/task/xxx-resource-key/123
                              ↕
6. 转发到 custody 后端
```

## Configuration Mapping

### Complete Route Mapping Table

| routeId | inboundPath (开发者文档) | route (Custody 后端) | paramMapping | 说明 |
|---------|--------------------------|---------------------|--------------|------|
| `treasury-create` | `/api/thirdparty/treasury/create` | `/third-party/create/{resourceKey}` | `{ resourceKey: 'context' }` | 创建财务单元 |
| `treasury-list` | `/api/thirdparty/treasury/list` | `/third-party/list/{resourceKey}` | `{ resourceKey: 'context' }` | 查询财务单元列表 |
| `treasury-address` | `/api/thirdparty/treasury/address` | `/third-party/get-unit-address/{resourceKey}` | `{ resourceKey: 'context' }` | 获取财务单元地址 |
| `treasury-payout` | `/api/thirdparty/treasury/payout` | `/third-party/payout/{resourceKey}` | `{ resourceKey: 'context' }` | 出金操作 |
| `treasury-submit-task` | `/api/thirdparty/treasury/submit-task/{taskId}` | `/third-party/submit/task/{resourceKey}/{taskId}` | `{ resourceKey: 'context', taskId: 'url' }` | 提交任务审批 |
| `treasury-activities` | `/api/thirdparty/treasury/activities` | `/third-party/activities/{resourceKey}` | `{ resourceKey: 'context' }` | 查询活动记录 |
| `treasury-transfer-out` | `/api/thirdparty/treasury/transfer-out-orders` | `/third-party/transfer-out-orders/{resourceKey}` | `{ resourceKey: 'context' }` | 查询出金订单 |
| `treasury-transfer-in` | `/api/thirdparty/treasury/transfer-in-orders` | `/third-party/transfer-in-orders/{resourceKey}` | `{ resourceKey: 'context' }` | 查询入金订单 |
| `treasury-fund-records` | `/api/thirdparty/treasury/fund-records` | `/third-party/fund-records/{resourceKey}` | `{ resourceKey: 'context' }` | 查询资金流水 |

**paramMapping 说明：**
- `resourceKey: 'context'` → 从 `req.context.resource.resourceKey` 获取
- `taskId: 'url'` → 从请求 URL 路径中提取

## Implementation Plan

### Tasks

| ID | Task | File | Dependencies |
|----|------|------|--------------|
| 1 | 更新 `ForwardRouteConfig` 接口，增加 `routeId`、`inboundPath` 字段和 `paramMapping` | `forward-routes.ts` | - |
| 2 | 添加 `normalizePath()` 路径规范化函数 | `forward-routes.ts` | Task 1 |
| 3 | 添加 `validateParamValue()` 参数验证函数（正则白名单） | `forward-routes.ts` | Task 1 |
| 4 | 添加 `extractUrlParams()` 从 inboundPath 提取 URL 参数 | `forward-routes.ts` | Task 1 |
| 5 | 更新 `findForwardRoute()` 使用 `inboundPath` 匹配，返回 URL 参数 | `forward-routes.ts` | Task 2, 4 |
| 6 | 添加 `validateForwardRoutes()` build-time 配置校验 | `forward-routes.ts` | Task 1 |
| 7 | 更新 `BACKEND_CLIENTS` 的 `clientName` 为 `custodyService` | `forward-routes.ts` | - |
| 8 | 更新所有 `FORWARD_ROUTES` 条目，增加 `routeId`、`inboundPath`、`paramMapping` | `forward-routes.ts` | Task 1 |
| 9 | 修改 `forwardRequest()` 根据 `route` 和 `paramMapping` 构建后端路径 | `thirdparty.routes.ts` | Task 8 |
| 10 | 添加参数冲突检测逻辑 | `thirdparty.routes.ts` | Task 9 |
| 11 | 更新单元测试 | - | Task 1-10 |

### Key Function Signatures

```typescript
/**
 * 转发路由配置
 */
interface ForwardRouteConfig {
  routeId: string;                           // 路由唯一标识
  inboundPath: string;                        // 开发者对接路径（匹配键）
  route: string;                              // custody 后端转发路径
  method: string;                              // HTTP 方法
  clientName: string;                          // 后端客户端名称
  paramMapping?: {                             // 参数映射（可选，默认为 resourceKey: 'context'）
    [paramName: string]: 'url' | 'context';
  };
}

/**
 * 规范化路径：去除重复斜杠和尾部斜杠
 */
function normalizePath(path: string): string

/**
 * 验证参数值：防止路径注入
 * @param value 参数值
 * @returns 是否合法（正则白名单: ^[a-zA-Z0-9_-]{1,64}$）
 */
function validateParamValue(value: string): boolean

/**
 * 从 inboundPath 提取 URL 中的路径参数
 * @param inboundPath - 匹配模式，如 /submit-task/{taskId}
 * @param actualPath - 实际请求路径，如 /submit-task/123
 * @returns 提取的参数对象，如 { taskId: '123' }
 */
function extractUrlParams(inboundPath: string, actualPath: string): Record<string, string>

/**
 * 查找匹配的转发路由
 * @param normalizedPath - 规范化后的请求路径
 * @returns 匹配的路由配置和 URL 参数
 */
function findForwardRoute(normalizedPath: string): { config: ForwardRouteConfig; urlParams: Record<string, string> } | undefined

/**
 * Build-time 配置校验
 * 检测重复 inboundPath 和未映射参数
 */
function validateForwardRoutes(routes: ForwardRouteConfig[]): void
```

### forwardRequest 关键逻辑

```typescript
// 参数校验正则白名单
const PARAM_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

async function forwardRequest(req: Request, res: Response): Promise<void> {
    const normalizedPath = normalizePath(req.path);
    const matched = findForwardRoute(normalizedPath);

    if (!matched) {
        res.status(404).json({ code: 40401, message: `Route not found: ${req.path}` });
        return;
    }

    const { config, urlParams } = matched;

    // 检测 URL 参数是否与 context 参数冲突
    const paramMapping = config.paramMapping || { resourceKey: 'context' };
    const contextParams = Object.keys(paramMapping).filter(
        k => paramMapping[k] === 'context'
    );
    const conflictParams = Object.keys(urlParams).filter(
        k => contextParams.includes(k)
    );
    if (conflictParams.length > 0) {
        res.status(400).json({
            code: 40002,
            message: `Parameter conflict: URL param shadows context param: ${conflictParams.join(', ')}`
        });
        return;
    }

    // 构建后端路径
    let backendPath = config.route;

    // 替换 context 参数（从 req.context.resource.resourceKey 获取）
    const resourceKey = req.context?.resource?.resourceKey;
    if (!validateParamValue(resourceKey || '')) {
        res.status(400).json({ code: 40001, message: 'Invalid resourceKey' });
        return;
    }
    backendPath = backendPath.replace('{resourceKey}', resourceKey || '');

    // 替换 URL 参数
    for (const [key, value] of Object.entries(urlParams)) {
        if (!validateParamValue(value)) {
            res.status(400).json({ code: 40001, message: `Invalid parameter: ${key}` });
            return;
        }
        backendPath = backendPath.replace(`{${key}}`, value);
    }

    // 转发请求...
}
```

## Acceptance Criteria

**AC1: 路由匹配**
- Given: 开发者发送 POST `/api/thirdparty/treasury/create`
- When: `findForwardRoute()` 被调用
- Then: 返回匹配的配置，`inboundPath` 为 `/api/thirdparty/treasury/create`，空 URL 参数

**AC2: URL 参数提取**
- Given: 开发者发送 POST `/api/thirdparty/treasury/submit-task/123`
- When: `findForwardRoute()` 被调用
- Then: 返回配置 `{ inboundPath: '/api/thirdparty/treasury/submit-task/{taskId}', ... }` 和 URL 参数 `{ taskId: '123' }`

**AC3: 路径转发（含 req.context.resource）**
- Given: 匹配到配置 `{ inboundPath: '/api/thirdparty/treasury/submit-task/{taskId}', route: '/third-party/submit/task/{resourceKey}/{taskId}' }`，URL 参数 `{ taskId: '123' }`，`req.context.resource.resourceKey = 'my-key'`
- When: `forwardRequest()` 构建后端路径
- Then: 转发到 custody 的 URL 为 `http://custody:4001/third-party/submit/task/my-key/123`

**AC4: clientName 统一**
- Given: 所有 FORWARD_ROUTES 配置
- When: 检查 clientName
- Then: 全部为 `custodyService`

**AC5: 路径规范化 - 重复斜杠**
- Given: 请求路径 `/api/thirdparty//treasury/create`
- When: `normalizePath()` 处理路径
- Then: 规范化为 `/api/thirdparty/treasury/create` 后匹配

**AC6: 路径规范化 - 尾部斜杠**
- Given: 请求路径 `/api/thirdparty/treasury/create/`
- When: `normalizePath()` 处理路径
- Then: 规范化为 `/api/thirdparty/treasury/create` 后匹配

**AC7: 参数验证**
- Given: 请求路径参数包含非法字符（如 `/` 或特殊符号）
- When: 构建后端路径时
- Then: 抛出验证错误，返回 HTTP 400

**AC8: 路径不匹配**
- Given: 请求路径 `/api/thirdparty/unknown`
- When: `findForwardRoute()` 被调用
- Then: 返回 `undefined`，HTTP 404

**AC9: 后端服务不可用**
- Given: custodyService 不可用或返回 5xx
- When: `forwardRequest()` 转发请求
- Then: 返回 HTTP 503

**AC10: 请求超时**
- Given: custodyService 响应超时
- When: `forwardRequest()` 等待响应
- Then: 返回 HTTP 504

**AC11: 参数冲突检测**
- Given: inboundPath `/api/thirdparty/treasury/submit-task/{resourceKey}`，paramMapping 定义 resourceKey: 'context'
- When: URL 中出现 resourceKey 参数（如 `/submit-task/my-key`）
- Then: 返回 HTTP 400，提示参数冲突

**AC12: 配置校验 - 重复 inboundPath**
- Given: 两个路由配置有相同的 inboundPath
- When: `validateForwardRoutes()` 执行
- Then: 抛出错误，提示重复的 inboundPath

**AC13: 配置校验 - 未映射参数**
- Given: route 中有参数 `{unknownParam}` 但 paramMapping 中未定义
- When: `validateForwardRoutes()` 执行
- Then: 抛出错误，提示未映射的参数

**AC14: 路径遍历防护**
- Given: resourceKey 包含路径遍历字符（如 `../` 或 `..`）
- When: 构建后端路径时
- Then: 抛出验证错误，返回 HTTP 400

**AC15: 参数索引有效性**
- Given: inboundPath 包含 `{taskId}` 但实际 URL 路径缺少该段
- When: `extractUrlParams()` 提取参数时
- Then: 抛出验证错误，返回 HTTP 400

## Test Cases

### Unit Tests

| TC | 描述 | 输入 | 预期输出 |
|----|------|------|----------|
| TC01 | 正常路径匹配 | `/api/thirdparty/treasury/create` | 匹配成功，空 URL 参数 |
| TC02 | 重复斜杠路径 | `/api/thirdparty//treasury/create` | 规范化为 `/api/thirdparty/treasury/create` |
| TC03 | 尾部斜杠路径 | `/api/thirdparty/treasury/create/` | 去除尾部斜杠后匹配 |
| TC04 | 不匹配路径 | `/api/thirdparty/unknown` | 返回 undefined |
| TC05 | 带 taskId URL 参数 | `/api/thirdparty/treasury/submit-task/123` | 匹配到 submit-task 配置，提取 `{ taskId: '123' }` |
| TC06 | 非法参数字符 | URL 参数值为 `key//hack` | `validateParamValue()` 返回 false |
| TC07 | 合法的 URL 参数值 | URL 参数值为 `my-key_123` | `validateParamValue()` 返回 true |
| TC08 | 混合参数构建 | URL taskId=123 + req.context.resource.resourceKey=res-key-1 | route 构建为 `/third-party/submit/task/res-key-1/123` |
| TC09 | 路径遍历攻击 | resourceKey 为 `../../../etc/passwd` | `validateParamValue()` 返回 false |
| TC10 | 参数索引越界 | `/submit-task/` 缺少 taskId | 抛出验证错误 |
| TC11 | clientName 存在于 BACKEND_CLIENTS | 所有配置的 clientName | 全部存在于 BACKEND_CLIENTS |

### Integration Tests

| TC | 描述 | 预期结果 |
|----|------|----------|
| IT01 | 完整转发流程（无 URL 参数） | 请求 `/api/thirdparty/treasury/create` + req.context.resource.resourceKey → 转发到 custody `/third-party/create/{resourceKey}` |
| IT02 | 完整转发流程（带 URL 参数） | 请求 `/api/thirdparty/treasury/submit-task/123` + resourceKey → 转发到 custody `/third-party/submit/task/{resourceKey}/123` |
| IT03 | 后端返回错误 | custody 返回 500，开放平台返回 503 |
| IT04 | 后端超时 | custody 超时，开放平台返回 504 |

## Additional Context

### Dependencies

- Express.js 路由框架
- HttpClient 服务
- 资源验证中间件（已设置 req.context.resource）

### Notes

- 所有开发者请求方法为 POST
- custody 后端转发方法在 `route.method` 中配置
- 路径匹配区分大小写
- **{resourceKey}** 从 `req.context.resource.resourceKey` 获取（OauthResource.resourceKey）
- inboundPath 中的 `{param}` 从 URL 路径提取

### Risk Mitigation Summary

| 风险 | 缓解措施 | Spec 位置 |
|------|----------|-----------|
| 路径遍历攻击 | 参数正则白名单验证 | AC14, validateParamValue() |
| 参数索引越界 | 索引有效性检查 | AC15, extractUrlParams() |
| 配置重复 | build-time 校验 | AC12, validateForwardRoutes() |
| 参数冲突 | 冲突检测逻辑 | AC11, forwardRequest() |
| 后端不可用 | 503 错误返回 | AC9 |
| 请求超时 | 504 错误返回 | AC10 |

### Future Improvements (Out of Scope)

| 项目 | 说明 | 优先级 |
|------|------|--------|
| 熔断器模式 | 对 HttpClient 添加 CircuitBreaker，防止级联故障 | P2 |
| 监控告警 | 对 502/503/504 设置告警阈值 | P2 |
| 健康检查端点 | 暴露 custody 服务健康状态 | P3 |
| 重试机制 | 增强 HttpClient 重试策略 | P3 |
