---
title: '为 Callback URL 添加详细说明'
slug: 'callback-url-description'
created: '2026-04-20'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - Vue 3
  - Element Plus
  - TypeScript
files_to_modify:
  - openplatform-web/developer-portal/src/views/applications/CreateApplicationPage.vue
code_patterns:
  - Vue 3 Composition API
  - Element Plus UI 组件
test_patterns: []
---

# Tech-Spec: 为 Callback URL 添加详细说明

**Created:** 2026-04-20

## Overview

### Problem Statement

创建应用时 Callback URL 配置缺少解释，开发者不理解这个字段的用途、收到哪些事件、如何验证回调签名。

### Solution

在 `CreateApplicationPage.vue` 中为 Callback URL 添加详细的说明文案，解释：
- 回调推送的事件类型
- 签名验证方式
- 数据格式

### Scope

**In Scope:**
- 修改 `CreateApplicationPage.vue` 中的 callbackUrl 说明文本

**Out of Scope:**
- API 文档修改
- SDK 示例代码
- 后端日志说明

## Context for Development

### Codebase Patterns

**当前代码 (CreateApplicationPage.vue lines 313-335):**
```vue
<!-- Callback URL -->
<div>
  <label class="block text-sm font-medium text-gray-700 mb-1">
    Callback URL <span class="text-red-500">*</span>
  </label>
  <el-input
    v-model="form.callbackUrl"
    placeholder="https://example.com/callback"
    ...
  />
  <p class="mt-1 text-xs text-gray-400">
    Used to receive platform event notifications. Please ensure it is a valid HTTPS URL.
  </p>
</div>
```

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `CreateApplicationPage.vue` | 创建应用页面，包含 callbackUrl 输入框 |

### Technical Decisions

| 决策 | 选择 |
|------|------|
| 说明语言 | 中文（与页面其他文案保持一致） |
| 说明位置 | callbackUrl 输入框下方 |

## Implementation Plan

### Tasks

**T1: 更新 Callback URL 说明文案**
- 文件: `openplatform-web/developer-portal/src/views/applications/CreateApplicationPage.vue`
- 位置: lines 332-334
- 操作: 将现有说明替换为更详细的文案

**新文案:**
```html
<p class="mt-2 text-xs text-gray-500 leading-relaxed">
  用于接收平台推送的事件通知，包括授权（创建/撤销/过期）、交易（提交/确认/完成/失败）、任务审核（通过/拒绝）等。
  推送使用 HMAC-SHA256 签名验证，请求头包含 X-Timestamp、X-Signature、X-Event。
  请确保填写有效的 HTTPS 地址。
</p>
```

**改动说明:**
- 位置从 `mt-1` 改为 `mt-2`，与上方输入框保持适当间距
- 颜色从 `text-gray-400` 改为 `text-gray-500`，提高可读性
- 添加 `leading-relaxed` 改善多行文本的阅读体验

### Acceptance Criteria

**AC1: 说明文案已更新**
- Given: 用户进入创建应用页面
- When: 查看 Callback URL 字段
- Then: 看到详细的说明文案，包含事件类型说明

**AC2: 说明包含签名验证信息**
- Given: 用户阅读说明
- When: 查看 Callback URL 说明
- Then: 看到关于 HMAC-SHA256 签名验证的说明

**AC3: 说明包含 URL 要求**
- Given: 用户阅读说明
- When: 查看 Callback URL 说明
- Then: 看到需要填写 HTTPS 地址的说明

## Additional Context

### Callback 事件类型参考

| 类别 | 事件 | 说明 |
|------|------|------|
| 授权 | authorization.created | 授权创建 |
| | authorization.revoked | 授权撤销 |
| | authorization.expired | 授权过期 |
| 交易 | transaction.submitted | 已提交 |
| | transaction.confirming | 确认中 |
| | transaction.completed | 交易完成 |
| | transaction.failed | 交易失败 |
| 任务 | task.approved | 审核通过 |
| | task.rejected | 审核拒绝 |

### 签名验证说明参考

```
推送 Headers:
  X-Timestamp: 1745220600000
  X-Signature: sha256=xxxxxx
  X-Event: transaction.completed

验证签名:
  signData = appId + "." + event + "." + timestamp
  signature = HMAC-SHA256(appSecret, signData)
```

### Dependencies

- 无外部依赖
- 不需要后端修改

### Testing Strategy

- 无需自动化测试
- 手动验证：创建应用页面加载后检查说明文案显示正确

### Notes

- 这是一个简单的 UI 文本更新
- 不需要修改后端代码
- 不需要编写测试
- 文案长度适中，不影响页面布局