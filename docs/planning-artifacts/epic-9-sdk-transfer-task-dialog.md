# Epic 9: SDK Transfer Task Detail Dialog

**Status:** backlog
**Created:** 2026-04-14

## Overview

### Problem Statement

第三方开发者接入平台后，在审批 Transfer 任务时需要查看任务详情。当前的实现可能缺少 Transfer 任务详情弹框组件，或者需要将 custody-console 的页面设计适配为 SDK 的 popup 弹框形式。

### Solution

在 SDK 中实现 Transfer 任务详情弹框组件，参考 custody-console 的 `task-review-transfer.html` 页面设计，以 popup 弹框形式展示。

### Scope

**In Scope:**
- Transfer 任务详情弹框组件开发
- 弹框 UI 设计与数据展示
- 集成到现有 SDK 工作流

**Out of Scope:**
- 独立的审批页面（是弹框，非页面）
- 审批操作功能（仅展示详情）

---

## Stories

### 9-1: Transfer Task Detail Dialog Component

**Story ID:** 9-1
**Status:** backlog

#### Story

As a **third-party developer integrating the SDK**,
I want to view Transfer task details in a popup dialog,
So that I can review task information before taking action.

#### User Story

> As a **third-party developer**,
> I want to see the Transfer task details in a popup dialog,
> So that I can review the transaction information efficiently.

#### Acceptance Criteria (BDD)

```
Given a pending Transfer task
When the developer clicks to view task details
Then display a popup dialog with:
  - Task ID and status badge
  - Transaction details (amount, coin, network)
  - From/To information with addresses
  - Travel Rule information (Originator & Beneficiary)
  - Proposal/Note
  - Meta info (Unit, Created At, Expires In)
  - Approval flow timeline
```

#### UI Components

根据 `task-review-transfer.html`，弹框应包含以下区域：

| 区域 | 描述 |
|------|------|
| Header | Task ID (#TRX-XXXX), 状态徽章 |
| Transaction Details | 金额、币种、网络信息 |
| From/To | 发送方/接收方信息，支持单笔和多笔切换 |
| Travel Rule | Originator & Beneficiary 信息 |
| Proposal | 任务备注/说明 |
| Meta Info | Unit、创建时间、过期时间、Task ID |
| Approval Flow | 审批流程时间线 |

#### Technical Notes

- **组件类型**: Popup Dialog (非独立页面)
- **布局**: 参考 task-review-transfer.html 的 2/3 + 1/3 分栏布局
- **模式切换**: 支持单笔和多笔收款人模式
- **集成方式**: 作为 SDK 的 UI 组件导出

#### Source Reference

- 参考设计: `task-review-transfer.html`
- 现有 SDK: `openplatform-sdk/web/`

#### Files to Create/Modify

- `openplatform-sdk/web/src/components/transfer/TransferTaskDetailDialog.vue`
- `openplatform-sdk/web/src/index.ts` (导出组件)

---

## Technical Decisions

### 1. Dialog vs Full Page

| 方案 | 优点 | 缺点 |
|------|------|------|
| **Popup Dialog** | 轻量、嵌入灵活 | 展示空间有限 |
| Full Page | 展示空间大 | 需要路由、上下文切换 |

**决定**: 采用 Popup Dialog 方案，符合 SDK 轻量化嵌入原则。

### 2. 单笔/多笔模式

弹框需支持单笔和多笔 Transfer 两种展示模式：
- **单笔模式**: From/To 横向并排
- **多笔模式**: From 独占一行，To 显示收款人列表（可搜索）

### 3. Travel Rule 信息

根据参考设计，需展示：
- Originator 信息（名称、地区、VASP 验证状态）
- Beneficiary 信息（名称、地区、VASP 验证状态）

### 4. Approval Flow Timeline

展示审批流程的 4 个阶段：
1. Initiated - 已发起
2. Risk Policy Check - 风控检查
3. Awaiting Approval - 等待审批
4. Execution - 执行

---

## Implementation Notes

### Dependencies

- SDK 的弹框基础组件（Dialog/Modal）
- Transfer 任务数据获取接口
- Travel Rule 数据结构

### Props Interface

```typescript
interface TransferTaskDetailProps {
  taskId: string;
  visible: boolean;
  onClose: () => void;
}
```

### Data Structure

```typescript
interface TransferTaskDetail {
  taskId: string;
  status: 'pending' | 'approved' | 'rejected';
  amount: string;
  coin: string;
  network: string;
  from: TransferParty;
  to: TransferParty | TransferParty[];
  travelRule?: TravelRuleInfo;
  proposal?: string;
  meta: {
    unit: string;
    createdAt: string;
    expiresIn: string;
  };
  approvalFlow: ApprovalStep[];
}
```
