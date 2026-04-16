---
title: 'Web SDK 集成 SealX 签名功能'
slug: 'web-sdk-sealx-signing'
created: '2026-04-16'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TypeScript', 'Vanilla DOM', 'sealx-sdk', 'sealx-core']
files_to_modify:
  - 'openplatform-sdk/web/src/components/transfer/types.ts'
  - 'openplatform-sdk/web/src/components/transfer/TransferTaskDetailDialog.ts'
  - 'openplatform-sdk/web/src/components/transfer/styles.ts'
  - 'openplatform-sdk/web/src/index.ts'
  - 'openplatform-sdk/web/package.json'
  - 'openplatform-sdk/web/examples/transfer-task-dialog.html'
code_patterns:
  - 'Vanilla TypeScript DOM manipulation (no framework)'
  - 'Functional API from sealx-sdk (signBySealx, closeSealx)'
  - 'EIP-712 structured signing via sealx-core types'
  - 'CSS class prefix: transfer-task-dialog-'
  - 'Style injection via injectDialogStyles()'
  - 'Dialog: flex column layout, innerHTML rendering'
test_patterns: ['Manual testing via example HTML']
---

# Tech-Spec: Web SDK 集成 SealX 签名功能

**Created:** 2026-04-16

## Overview

### Problem Statement

当前 Web SDK 的 `TransferTaskDetailDialog` 仅展示转账任务详情（只读），无法发起签名操作。第三方平台用户在弹框中查看任务后，需要手动跳转到 Custody Console 完成签名，体验断裂。

### Solution

在 `TransferTaskDetailDialog` 底部新增操作栏（Action Bar），集成 SealX SDK 的 `signBySealx` 方法。当任务状态为 `wait_for_sign` 时显示 "Sign" 和 "Reject" 按钮，用户点击 Sign 后通过 SealX 浏览器扩展完成 EIP-712 签名，签名结果通过 callback 返回给接入方，由接入方自行提交到后端。

### Scope

**In Scope:**
- 扩展 `TransferTaskDetailData` 类型，增加签名所需字段（signContent, taskType, command, validUntilTime, signContentKeyMapping）
- 扩展 `TransferTaskDetailDialogOptions` 增加 `onSign` 和 `onReject` 回调
- 在 Dialog 底部渲染 Action Bar（仅 `wait_for_sign` 状态显示）
- 实现 Sign 按钮点击 → 调用 `signBySealx` → callback 返回签名结果的完整流程
- 实现 Reject 按钮点击 → callback 通知接入方
- 签名状态反馈（loading, success, error toast）
- `sealx-sdk` 作为 `peerDependencies`

**Out of Scope:**
- 签名后的 API 提交（由接入方 callback 处理）
- SealX 浏览器扩展的安装/检测引导
- SealX session 初始化（由接入方在打开弹框前完成）
- 批量签名功能

## Context for Development

### Codebase Patterns

- **Vanilla TypeScript DOM**：Dialog 使用 `document.createElement` + `innerHTML` + `addEventListener` 渲染，无 React/Vue
- **样式注入**：通过 `injectDialogStyles()` 将 CSS 注入 `<style id="transfer-task-dialog-styles">`，单次注入
- **CSS class 命名**：统一前缀 `transfer-task-dialog-`
- **类封装**：`TransferTaskDetailDialog` 类管理 overlay、render、event listeners、生命周期
- **Functional SDK**：sealx-sdk 使用函数式 API（非类实例化），核心方法 `signBySealx(task)` 返回 Promise
- **Dialog 容器布局**：`flex-direction: column`，header `flex-shrink: 0`，content `flex: 1; overflow-y: auto`。Action Bar 追加在 content 后作为固定底部
- **参考实现**：`cregis-custody-manager/src/v2/pages/taskReview/TransferReviewView.vue` line 261-314

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `openplatform-sdk/web/src/components/transfer/types.ts` | 类型定义，需扩展签名字段和回调类型 |
| `openplatform-sdk/web/src/components/transfer/TransferTaskDetailDialog.ts` | 现有 Dialog 主组件，需添加 Action Bar 和签名逻辑 |
| `openplatform-sdk/web/src/components/transfer/styles.ts` | CSS 样式，需添加 Action Bar + toast 样式 |
| `openplatform-sdk/web/src/index.ts` | SDK 入口，需导出新类型 |
| `openplatform-sdk/web/package.json` | 需添加 sealx-sdk / sealx-core peerDependency |
| `openplatform-sdk/web/examples/transfer-task-dialog.html` | 演示页面，需更新签名测试数据 |
| `cregis-custody-manager/src/v2/pages/taskReview/TransferReviewView.vue` | 参考实现（签名流程 line 261-314） |
| `sealx-sdk/src/index.ts` | sealx-sdk API 源码（signBySealx, closeSealx） |

### Technical Decisions

1. **SDK 只管签名，不提交**：`onSign` callback 返回 `{ taskId: string, signature: string }`，接入方自行调 API 提交
2. **sealx-sdk 作为 peerDependency**：避免版本冲突和打包体积，接入方自行 `npm install sealx-sdk`
3. **Action Bar 仅在 `wait_for_sign` 状态显示**：其他状态保持纯展示，向后兼容
4. **签名参数通过 `TransferTaskDetailData` 传入**：新增可选字段 `signParams`，向后兼容（不传则不显示 Action Bar）
5. **SealX session 由接入方管理**：SDK 不负责 `initSealx`/`connectSealx`，接入方在打开弹框前确保 session 可用
6. **signBySealx 动态 import**：使用 `import('sealx-sdk')` 动态加载，避免在未安装 sealx-sdk 时抛错

## Implementation Plan

### Tasks

- [ ] Task 1: 扩展类型定义
  - File: `openplatform-sdk/web/src/components/transfer/types.ts`
  - Action:
    1. 新增 `SignParams` 接口，包含签名所需的全部字段：
       ```typescript
       export interface SignParams {
           /** EIP-712 signContent JSON 字符串 */
           signContent: string;
           /** 任务类型，如 'orders', 'eip712' */
           taskType: string;
           /** 签名命令，如 'transfer' */
           command: string;
           /** 有效期截止时间（时间戳字符串） */
           validUntilTime: string;
           /** signContent key mapping JSON 字符串 */
           signContentKeyMapping?: string;
       }
       ```
    2. 扩展 `TransferTaskDetailData`，新增可选字段 `signParams`：
       ```typescript
       export interface TransferTaskDetailData {
           // ... existing fields ...
           /** 签名参数（存在时启用 Action Bar） */
           signParams?: SignParams;
       }
       ```
    3. 新增回调类型：
       ```typescript
       export interface SignResult {
           taskId: string;
           signature: string;
       }

       export interface TransferTaskDetailDialogOptions {
           // ... existing fields ...
           /** 签名成功回调，返回 { taskId, signature } */
           onSign?: (result: SignResult) => void;
           /** Reject 回调 */
           onReject?: (taskId: string) => void;
           /** 签名错误回调 */
           onSignError?: (error: Error) => void;
       }
       ```

- [ ] Task 2: 添加 Action Bar 和 Toast 样式
  - File: `openplatform-sdk/web/src/components/transfer/styles.ts`
  - Action: 在 `defaultDialogStyles` 字符串末尾追加以下 CSS：
    1. **Action Bar**：
       - `.transfer-task-dialog-action-bar` — 固定底部栏，`flex-shrink: 0`，白色背景，上边框
       - `.transfer-task-dialog-action-bar-content` — flex 布局，space-between，内边距 `16px 24px`
       - `.transfer-task-dialog-action-info` — 左侧文本区域
       - `.transfer-task-dialog-action-buttons` — 右侧按钮组，gap 12px
       - `.transfer-task-dialog-btn-reject` — 红色边框按钮（参考 TransferReviewView line 756）
       - `.transfer-task-dialog-btn-sign` — 黑色实心按钮（参考 TransferReviewView line 760），hover `bg-gray-800`，`active:scale-0.95`
       - `.transfer-task-dialog-btn-sign.loading` — 禁用态，灰色背景，显示 spinner
    2. **Toast**：
       - `.transfer-task-dialog-toast` — 固定定位底部居中，圆角，阴影，z-index 高于 dialog
       - `.transfer-task-dialog-toast.success` — 绿色背景
       - `.transfer-task-dialog-toast.error` — 红色背景
       - 淡入淡出动画

- [ ] Task 3: 实现 Action Bar 渲染和签名逻辑
  - File: `openplatform-sdk/web/src/components/transfer/TransferTaskDetailDialog.ts`
  - Action:
    1. **新增 import**：在文件顶部添加对 `SignParams`、`SignResult` 类型的 import
    2. **新增私有属性**：
       ```typescript
       private isSigning = false;
       ```
    3. **修改 `render()` 方法**：在 `transfer-task-dialog-content` 的 `</div>` 之后、`transfer-task-dialog-container` 的 `</div>` 之前，插入 Action Bar HTML。条件：`data.status === 'wait_for_sign' && data.signParams`。
       Action Bar HTML 结构：
       ```html
       <div class="transfer-task-dialog-action-bar" id="transfer-task-dialog-action-bar">
           <div class="transfer-task-dialog-action-bar-content">
               <div class="transfer-task-dialog-action-info">
                   Reviewing task <span class="transfer-task-dialog-action-task-id">#TASK_ID</span>
               </div>
               <div class="transfer-task-dialog-action-buttons">
                   <button class="transfer-task-dialog-btn-reject" id="dialog-reject-btn">Reject</button>
                   <button class="transfer-task-dialog-btn-sign" id="dialog-sign-btn">Sign</button>
               </div>
           </div>
       </div>
       ```
    4. **新增 `attachActionBarListeners()` 私有方法**：
       - 绑定 Reject 按钮：调用 `this.options.onReject?.(this.data.taskId)`
       - 绑定 Sign 按钮：调用 `this.handleSign()`
    5. **新增 `handleSign()` 私有方法**（核心签名逻辑，参考 TransferReviewView.vue:261-314）：
       ```typescript
       private async handleSign(): Promise<void> {
           if (this.isSigning || !this.data?.signParams) return;
           this.isSigning = true;
           this.updateSignButton('loading');

           try {
               // 动态 import sealx-sdk，避免未安装时报错
               const { signBySealx, closeSealx } = await import('sealx-sdk');

               const params = this.data.signParams;
               // 解析 signContent JSON
               const signContent = JSON.parse(params.signContent);
               // 添加 layout
               const signContentWithLayout = {
                   ...signContent,
                   layout: {
                       template: '',
                       keysMapStr: params.signContentKeyMapping || '{}'
                   }
               };
               // 构建 SealxSignTask
               const signTask = {
                   taskId: this.data.taskId.replace('#', ''),
                   taskType: params.taskType,
                   command: params.command,
                   signContent: signContentWithLayout,
                   validUntilTime: params.validUntilTime
               };
               // 调用签名
               const res = await signBySealx<{ result: { signature: string } }>(signTask) as { result: { signature: string } };
               const signature = res?.result?.signature ?? '';

               if (!signature) {
                   throw new Error('Signing failed: no signature returned');
               }
               // 成功
               this.updateSignButton('success');
               this.showToast('Signed successfully', 'success');
               this.options.onSign?.({ taskId: this.data.taskId, signature });
           } catch (e: any) {
               this.updateSignButton('error');
               this.showToast(e.message || 'Signing failed', 'error');
               this.options.onSignError?.(e instanceof Error ? e : new Error(e.message || 'Signing failed'));
           } finally {
               // 关闭 SealX 连接
               try { const { closeSealx } = await import('sealx-sdk'); closeSealx(); } catch {}
               this.isSigning = false;
           }
       }
       ```
       **注意**：`finally` 中的 `import('sealx-sdk')` 需要用局部变量避免和顶部 import 冲突。改为在 try 块顶部将 `closeSealx` 赋值到局部变量，finally 中直接调用。
    6. **新增 `updateSignButton(state)` 私有方法**：
       - `'loading'`：禁用按钮，文字改为 "Signing..."，添加 spinner class
       - `'success'`：恢复按钮，文字改为 "Signed"（短暂显示后恢复）
       - `'error'`：恢复按钮，文字恢复 "Sign"
    7. **新增 `showToast(message, type)` 私有方法**：
       - 在 overlay 内创建 toast 元素，3 秒后自动移除
    8. **修改 `attachEventListeners()` 方法**：在末尾调用 `this.attachActionBarListeners()`

- [ ] Task 4: 更新 SDK 导出
  - File: `openplatform-sdk/web/src/index.ts`
  - Action: 在现有的 transfer types 导出块中追加新类型：
    ```typescript
    export type {
        // ... existing exports ...
        SignParams,
        SignResult,
    } from './components/transfer/types';
    ```

- [ ] Task 5: 添加 peerDependencies
  - File: `openplatform-sdk/web/package.json`
  - Action: 添加 `peerDependencies` 字段：
    ```json
    "peerDependencies": {
        "sealx-sdk": "^1.0.26"
    },
    "peerDependenciesMeta": {
        "sealx-sdk": {
            "optional": true
        }
    }
    ```
    设为 optional 确保不安装 sealx-sdk 时 Dialog 仍可正常展示（只是没有签名功能）。

- [ ] Task 6: 更新演示页面
  - File: `openplatform-sdk/web/examples/transfer-task-dialog.html`
  - Action:
    1. 在 `createTaskData()` 返回的对象中添加 `signParams` 字段（使用模拟数据）
    2. 在 `openTransferTaskDetailDialog` 调用中添加 `onSign`、`onReject`、`onSignError` 回调
    3. 在回调中 `console.log` 输出结果

### Acceptance Criteria

- [ ] AC 1: Given `TransferTaskDetailData` 包含 `signParams` 且 `status` 为 `wait_for_sign`，when Dialog 打开，then 底部显示 Action Bar 包含 "Sign" 和 "Reject" 按钮
- [ ] AC 2: Given `TransferTaskDetailData` 不包含 `signParams` 或 `status` 不是 `wait_for_sign`，when Dialog 打开，then 不显示 Action Bar（纯展示模式）
- [ ] AC 3: Given Dialog 显示 Action Bar 且 SealX 扩展可用，when 用户点击 "Sign"，then Sign 按钮变为 loading 状态，调用 `signBySealx`，签名成功后 `onSign` callback 返回 `{ taskId, signature }`
- [ ] AC 4: Given 用户点击 "Sign" 且签名过程中发生错误，when `signBySealx` 抛出异常，then 显示 error toast，`onSignError` callback 被调用，Sign 按钮恢复可点击状态
- [ ] AC 5: Given Dialog 显示 Action Bar，when 用户点击 "Reject"，then `onReject` callback 被调用并传入 `taskId`
- [ ] AC 6: Given 签名完成（成功或失败），when `finally` 块执行，then `closeSealx()` 被调用关闭连接
- [ ] AC 7: Given 接入方未安装 `sealx-sdk`，when 构建/运行 Web SDK，then Dialog 仍可正常渲染展示（不因缺少 sealx-sdk 报错），只是没有签名功能
- [ ] AC 8: Given 签名请求发送，when 用户在 SealX 扩展中确认签名，then 返回的 signature 通过 `onSign` callback 正确传递给接入方

## Additional Context

### Dependencies

- `sealx-sdk@^1.0.26` (peerDependency, optional) — 提供签名 API
- sealx-sdk 依赖 `sealx-core@^1.0.12`（提供 `SealxSignTask`、`SignContent`、`SignContentLayout` 类型，由 sealx-sdk 自动安装）
- sealx-sdk 依赖 `sealx-message@^1.0.13`（消息通信，由 sealx-sdk 自动安装）
- SealX 浏览器扩展必须已安装并激活

### Testing Strategy

**手动测试（使用 example HTML）：**
1. 打开 `examples/transfer-task-dialog.html`
2. 验证 `wait_for_sign` + `signParams` 状态显示 Action Bar
3. 验证点击 Reject 触发 onReject callback
4. 验证非 `wait_for_sign` 状态不显示 Action Bar
5. 如有 SealX 扩展环境，验证完整签名流程

**集成测试建议（由接入方执行）：**
- 在实际项目中测试 onSign callback 返回的 signature 能成功提交到后端
- 测试 SealX 未初始化/未安装时的错误提示

### Notes

- **参考实现签名流程**（TransferReviewView.vue:261-314）：
  1. `JSON.parse(task._raw.signContent)` 解析 signContent
  2. 附加 `layout: { template: '', keysMapStr: task._raw.signContentKeyMapping }`
  3. 构建 `{ taskId, taskType, command, signContent, validUntilTime }`
  4. `signBySealx(signParams)` → `res.result.signature`
  5. `closeSealx()` 在 finally 中调用
- **signBySealx 返回值**：类型为 `{ result: { signature: string } }`（参考 TransferReviewView.vue:292）
- **动态 import 必要性**：Web SDK 的接入方可能不需要签名功能，不强制安装 sealx-sdk。动态 import 确保按需加载
- **Action Bar 样式参考**：TransferReviewView.vue:749-764 的底部操作栏布局
