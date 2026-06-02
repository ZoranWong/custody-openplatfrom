---
title: 'Custody API 转发路由与文档同步更新'
slug: 'custody-api-forward-routes-sync'
created: '2026-06-02'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TypeScript', 'Express', 'Node.js', 'Axios']
files_to_modify:
  - openplatform-api-service/src/config/forward-routes.ts
  - docs/thirdparty-integration-guide.md
  - docs/Custody-backend.md
code_patterns: ['forward-routes', 'paramMapping', 'ForwardRouteConfig']
test_patterns: ['none-existing']
---

# Tech-Spec: Custody API 转发路由与文档同步更新

**Created:** 2026-06-02

## Overview

### Problem Statement

Apifox 上 Custody 后端有 13 个接口，当前 forward-routes.ts 只有 10 个（缺 pooling、create-unit-address、list-unit-account），thirdparty-integration-guide.md 只有 9 个（缺 unit-fund-records 和 3 个新接口），且 create 接口参数描述与最新 Apifox 不一致（缺 unitName 等 10 个新字段，多余 riskManager）。

### Solution

1. forward-routes.ts 新增 3 个转发路由（pooling, create-unit-address, list-unit-account）
2. thirdparty-integration-guide.md 补充 4 个缺失接口 + 修正 create 接口参数 + 重排 3.3 节
3. Custody-backend.md 全量替换为 Apifox 最新 13 接口 OpenAPI 文档

### Scope

**In Scope:**
- 新增 pooling（归集请求）、create-unit-address（创建地址）、list-unit-account（查询账户列表）转发路由
- 补充 unit-fund-records（财务单元级流水）的文档描述
- 修正 create 接口参数表（+unitName/businessPurpose/autoSignUrl/primaryWhiteList/anycallRules 等，-riskManager）
- 用最新 Apifox Markdown 全量更新 Custody-backend.md

**Out of Scope:**
- 修改请求转发逻辑（forwardRequest、matchRoute 等）
- SDK（Node.js / Web）代码更新
- 新增自动化测试

## Context for Development

### Codebase Patterns

- **Forward route config**: `{ routeId, inboundPath, route, method, clientName, paramMapping }`
- **inboundPath**: 开发者可见路径，`/api/thirdparty/treasury/*`，URL 参数用 `{paramName}` 占位
- **route**: Custody 后端路径，`/api/third-party/*`，`{resourceKey}` 从 context 注入
- **paramMapping**: `resourceKey → context`（默认），URL 参数 → `url`（必须显式声明）
- **validateForwardRoutes**: 启动时校验 duplicate routeId、duplicate inboundPath、unmapped params、invalid clientName
- **转发**: `forwardRequest()` 在 `thirdparty.routes.ts` 中，提取 URL 参数 + 替换 `{param}` 占位符

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `openplatform-api-service/src/config/forward-routes.ts` | 转发路由配置 + 构建时校验 |
| `openplatform-api-service/src/routes/thirdparty.routes.ts` | 第三方路由处理 (forwardRequest, OAuth) |
| `docs/thirdparty-integration-guide.md` | 第三方开发者接入指南 v4.0 |
| `docs/Custody-backend.md` | Custody 后端 OpenAPI 参考文档 |

### Technical Decisions

1. **保持 `accountTypy` 后端拼写**: 后端路径 `{accountTypy}` 原样透传，开发者 inboundPath 使用正确拼写 `{accountType}`
2. **所有 URL 参数显式 paramMapping**: `validateForwardRoutes` 校验，resourceKey 默认 context，其余参数必须声明为 url
3. **路由命名规范**: `treasury-pooling`, `treasury-create-unit-address`, `treasury-list-unit-account`
4. **文档重组**: 集成指南 3.3 按操作类型重排为 13 节（创建→查询→操作类型），Custody-backend.md 全量替换

## Implementation Plan

### Tasks

- [ ] Task 1: Add 3 new forward routes to forward-routes.ts
  - File: `openplatform-api-service/src/config/forward-routes.ts`
  - Action: Insert `treasury-pooling`, `treasury-create-unit-address`, `treasury-list-unit-account` before `validateForwardRoutes` call
  - Notes: create-unit-address has 6 params (resourceKey→context, 5 url params including accountTypy), pooling has only resourceKey, list-unit-account has resourceKey+unitId

- [ ] Task 2: Update Custody-backend.md with all 13 API specs
  - File: `docs/Custody-backend.md`
  - Action: Replace entire file content with aggregated OpenAPI YAML from all 13 downloaded Apifox .md files
  - Notes: Merge all paths and schemas sections from individual files into one complete OpenAPI doc

- [ ] Task 3: Update thirdparty-integration-guide.md
  - File: `docs/thirdparty-integration-guide.md`
  - Action: 
    - (a) Update 3.1 interface table: 9 → 13 rows, add pooling, create-unit-address, list-unit-account, unit-fund-records
    - (b) Reorder 3.3 subsections by operation type (create→query→operate): create(3.3.1), create-unit-address(3.3.2), list(3.3.3), address(3.3.4), list-unit-account(3.3.5), pooling(3.3.6), payout(3.3.7), submit-task(3.3.8), activities(3.3.9), transfer-out-orders(3.3.10), transfer-in-orders(3.3.11), fund-records(3.3.12), unit-fund-records(3.3.13)
    - (c) Fix create(3.3.1) parameters: add unitName(required), businessPurpose, autoSignUrl, primaryWhiteList, primaryAnycallRules, thirdPartyEcode, remark, payinAnycallRules, payoutAnycallRules, riskAnycallRules; remove riskManager
    - (d) Write detail sections for 4 new endpoints (create-unit-address, list-unit-account, pooling, unit-fund-records)
  - Notes: Follow existing documentation style (path→parameter table→response example)

### Acceptance Criteria

- [ ] AC 1: Given 13 Custody backend endpoints in Apifox, when forward-routes.ts is loaded, then FORWARD_ROUTES contains 13 entries and validateForwardRoutes passes without error
- [ ] AC 2: Given pooling API POST /api/thirdparty/treasury/pooling, when called with valid basic+business body, then request is forwarded to /api/third-party/pooling/{resourceKey}
- [ ] AC 3: Given create-unit-address API POST /api/thirdparty/treasury/create-unit-address/{unitId}/{accountType}/{network}/{coinId}/{number}, when called, then all 6 URL params are extracted and backend receives correct path with {accountTypy} placeholder
- [ ] AC 4: Given list-unit-account API POST /api/thirdparty/treasury/list-unit-account/{unitId}, when called, then unitId is extracted from URL and forwarded to /api/third-party/list-unit-account/{resourceKey}/{unitId}
- [ ] AC 5: Given thirdparty-integration-guide.md Section 3.1, when a developer reads it, then all 13 interfaces are listed with correct paths
- [ ] AC 6: Given thirdparty-integration-guide.md Section 3.3.1 (create), when a developer implements it, then all required parameters (unitName, businessScope, topology, coinIds, primaryManager, payoutManager) are documented
- [ ] AC 7: Given Custody-backend.md, when compared to Apifox source, then all 13 paths and associated schemas are present

## Additional Context

### Dependencies

- 无外部依赖变更
- 依赖 Custody 后端 API 不变（13 接口路径稳定）
- `validateForwardRoutes` 在模块加载时自动运行

### Testing Strategy

- 手动验收: 启动 API 服务，确认 `validateForwardRoutes` 不抛异常
- 集成测试 (手动): 用 curl/Postman 测试 3 个新路由的转发
- 文档审查: 逐接口对比 Apifox vs 集成指南参数一致性

### Notes

- 预-mortem 识别的最高风险: create-unit-address 的 6 个参数 paramMapping 遗漏 → validateForwardRoutes 在启动时直接报错，可快速发现
- `accountTypy` 后端拼写: 如果后端未来修正拼写，需要同步更新 route 字段
- Apifox 文档源: llms.txt 提供了 13 接口索引，后续新增接口可从此入口获取全量列表
