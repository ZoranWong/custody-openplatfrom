---
title: 'SDK Demo - Treasury Unit 列表查询测试'
slug: 'sdk-demo-unit-list-query'
created: '2026-04-24'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['HTML', 'TypeScript', 'JavaScript', 'fetch API', 'js-md5']
files_to_modify: ['openplatform-sdk/web/sdk-demo.html']
code_patterns: ['integration-test', 'demo-page']
test_patterns: []
---

# SDK Demo - Treasury Unit 列表查询测试

## Overview

### Problem Statement

现有 `sdk-demo.html` 页面只支持创建 Treasury Unit，创建后无法快速验证查询结果。开发者需要查询接口来确认创建的数据是否正确入库。

### Solution

在 `sdk-demo.html` 中添加 "步骤 3: 查询 Unit 列表" 区域，复用现有的 Resource 签名逻辑，调用 `POST /api/thirdparty/treasury/list` 接口，展示返回的 Unit 列表数据。

### Scope

**In Scope:**
- 在 `sdk-demo.html` 中新增 "步骤 3: 查询 Unit 列表" UI 区域
- 复用 `calculateResourceSignature` 签名函数
- 调用 `POST /api/thirdparty/treasury/list` 接口
- 展示返回的 Unit 列表（JSON 格式 + 结构化展示）

**Out of Scope:**
- 修改后端接口
- 分页/过滤功能
- activities / address 等其他查询接口

## Context for Development

### 技术栈
- **前端:** HTML5, CSS3, Vanilla JavaScript (ES Modules)
- **签名库:** js-md5 (`./node_modules/js-md5/build/md5.min.js`)，通过 `<script>` 标签加载，暴露 `window.md5`
- **SDK 导入:** `import { CregisWebSDK } from './dist/index.es.js'`
- **HTTP 请求:** `fetch` API + `AbortController` 超时控制

### 代码模式
- **脚本组织:** 所有逻辑在 `<script type="module">` 中，IIFE 风格
- **DOM 操作:** `document.getElementById` 获取元素，event listener 绑定在 module 顶层
- **全局暴露:** `window.handleAuthorizationIdInput` 暴露给 HTML `oninput` 属性
- **状态管理:** 模块级 `let` 变量（如 `currentMockData`）
- **错误处理:** `try/catch` + 结果区域分类展示（`.result.success` / `.result.error` / `.result.cancelled`）
- **签名工具函数:** `sortKeys()`、`generateNonce()`、`calculateBasicSignature()`、`calculateResourceSignature()`、`buildBasicInfoWithAuthorization()`

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `openplatform-sdk/web/sdk-demo.html` | 目标文件，在脚本末尾添加查询区域 |

### 关键锚点
- `calculateResourceSignature` 函数位于第 431-441 行，签名公式: `MD5(appSecret + appId + authorizationId + timestamp + nonce + MD5(JSON.stringify(sortKeys(business))))`
- 步骤 2 区域结束于 `</div>` 第 329 行，查询区域应添加在它之后、`</div class="content">` 之前
- `handleAuthorizationIdInput()` 函数位于第 748 行，需修改以同步控制查询按钮状态
- 脚本结束于第 871 行，新代码应添加在 `resetUnitBtn` listener 之后

### 技术决策
1. 复用 `calculateResourceSignature` 函数，不创建新签名函数
2. business 传空对象 `{}`，查询全部 Unit
3. 查询按钮独立控制，不依赖步骤 2 的 mockData 状态，只需 authorizationId 非空
4. 空值处理统一：所有签名代码对 `null`/`undefined`/`{}` 统一返回 `MD5('{}')`

## Implementation Plan

### Task 1: 添加 "步骤 3: 查询 Unit 列表" HTML 区域

- **File:** `openplatform-sdk/web/sdk-demo.html`
- **Action:** 在 "步骤 2" 区域之后添加新的 section
- **Details:**
  - "查询 Unit 列表" 标题
  - 复用 authorizationId 输入框的值（不重复创建）
  - Debug 日志 checkbox
  - "查询" 按钮（id: `queryUnitBtn`）
  - 结果展示区域（id: `queryUnitResult`）
  - 结果展示区为可折叠的 JSON 预览

### Task 2: 添加查询 API 调用逻辑

- **File:** `openplatform-sdk/web/sdk-demo.html`
- **Action:** 添加 `queryUnitBtn` 点击事件处理
- **Details:**
  - 获取 appId、appSecret、authorizationId（复用现有输入）
  - business 传空对象 `{}` 或 `{ pagination: {}, filters: {} }`
  - 调用 `calculateResourceSignature` 生成签名
  - `fetch POST ${baseUrl}/api/thirdparty/treasury/list`
  - 请求期间按钮 disabled + loading 状态
  - 30s 超时（AbortController）
  - 成功展示返回的列表数据，失败展示错误信息

### Task 3: 添加查询按钮状态管理

- **File:** `openplatform-sdk/web/sdk-demo.html`
- **Action:** 当 authorizationId 变化时，同步控制 "查询" 按钮的 enabled 状态
- **Details:**
  - 复用 `handleAuthorizationIdInput()` 函数，同时更新查询按钮状态
  - authorizationId 非空时启用查询按钮

## Acceptance Criteria

- [ ] AC 1: Given 用户已打开 sdk-demo.html，When 页面加载完成，Then "查询 Unit 列表" 按钮处于 disabled 状态
- [ ] AC 2: Given authorizationId 已填入（自动或手动），When authorizationId 非空，Then "查询" 按钮变为可用
- [ ] AC 3: Given 用户点击 "查询" 按钮，When 请求成功，Then 结果区域展示返回的 Unit 列表 JSON 数据
- [ ] AC 4: Given 后端返回空列表，When 查询成功，Then 展示 "暂无数据" 提示
- [ ] AC 5: Given 查询失败（签名错误/网络错误），When 请求返回错误，Then 红色结果框展示错误信息
- [ ] AC 6: Given 用户勾选 Debug 日志，When 点击 "查询"，Then console 输出签名计算全过程

## Dependencies

- **外部库:** `js-md5`（已加载）
- **前端依赖:** OAuth 授权流程（提供 authorizationId）
- **后端依赖:** `POST /api/thirdparty/treasury/list` 接口已注册
- **复用函数:** `calculateResourceSignature`、`generateNonce`、`sortKeys`

## Testing Strategy

### 手动测试步骤

1. **完整流程测试：**
   - 完成 OAuth 授权 → 确认 authorizationId 自动填入
   - 点击 "查询" → 确认返回 Unit 列表数据

2. **错误场景测试：**
   - 空 authorizationId → 确认按钮禁用
   - 后端未启动 → 确认超时提示
   - 错误签名 → 确认错误提示

3. **Debug 模式测试：**
   - 勾选 Debug → 确认 console 输出签名过程

## Notes

### 高风险项
- **签名复用：** 直接复用 `calculateResourceSignature`，不新建函数，降低出错风险
- **business 参数：** 传空对象时后端应返回全部数据，需确认后端行为

### 签名一致性修复（Code Review 发现）

本次实现同时修复了 5 处签名代码对空 business 处理不一致的问题：

| 文件 | 修复前 | 修复后 |
|------|--------|--------|
| `common.validator.ts` | 空值返回 `''` | 返回 `MD5('{}')` |
| `node/src/core/signature.ts` | `sortKeys(null)` → `null` → `'null'` | `sortKeys(null)` → `{}` → `'{}'` |
| `nodejs/src/utils/signature.ts` | 返回 `MD5('')` | 返回 `MD5('{}')` |
| `sdk-demo.html` (Resource) | 返回 `''` | 返回 `MD5('{}')` |
| `sdk-demo.html` (Basic) | `sortKeys(null)` → `null` → `'null'` | 返回 `MD5('{}')` |

同时更新了 `docs/signature-spec.md` 和 `docs/thirdparty-integration-guide.md`，补充了空值处理规则说明。
