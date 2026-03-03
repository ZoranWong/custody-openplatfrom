---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7]
inputDocuments:
  - "prd-cregis-openplatform.md"
  - "architecture.md"
  - "comprehensive-ux-design.md" (merged)
---

# UX Design Specification - Cregis OpenPlatform

**Author:** zoran wang
**Date:** 2026-02-06
**Last Updated:** 2026-02-09

---

## 项目概述

Cregis 开放平台是一个面向第三方开发者 (ISV) 的金融服务接入平台。

**系统清单：**
| 系统 | 类型 | 技术栈 |
|------|------|--------|
| 开发者门户 | 前端 Web | Vue 3 + Element Plus |
| 管理后台 | 前端 Web | Vue 3 + Element Plus |
| SDK Demo | 前端 Web | Vue 3 + Element Plus |
| API Gateway | 后端服务 | Express + TypeScript |

**核心用户：**
- ISV 开发者
- 平台管理员

---

## UX 设计范围

待补充...

---

## 项目理解

### 项目愿景

为 ISV 提供简单、可靠的金融服务接入能力，类似微信/支付宝开放平台。终端企业通过 ISV 服务便捷使用 Custody 的资产管理能力。

### 目标用户

| 用户类型 | 特点 | 需求 |
|----------|------|------|
| ISV 开发者 | 技术背景，期望快速集成 | SDK 简单易用、文档清晰、API 稳定 |
| 平台管理员 | 审核 KYB、应用 | 审核流程高效、信息展示清晰 |

### 关键设计挑战

| 挑战 | 说明 |
|------|------|
| 开发者体验 | SDK 集成要简单、文档清晰、示例丰富 |
| iframe 交互 | 授权/签名页面需无缝嵌入 ISV 页面 |
| 企业认证流程 | KYB 信息复杂，需降低填写成本 |
| 多语言 SDK 一致性 | 6 种语言的开发者体验需统一 |

### 设计机会

| 机会 | 说明 |
|------|------|
| SDK Demo 演示 | 降低接入门槛，可视化展示 API 调用 |
| 分步引导 | KYB 认证分步填写，降低放弃率 |
| 状态可视化 | 交易/签名状态清晰可查 |

---

## Core User Experience

### Defining Experience

**最频繁的用户动作**：开发者（ISV）使用 SDK 调用 API 处理企业金融事务。

这是一个 B2B2C 平台，核心价值链是：
```
ISV开发者 → SDK集成 → API调用 → Cregis Custody执行 → 返回结果
```

**最关键的交互**：
- **SDK 首次集成** - 开发者能否在 10 分钟内完成基础集成
- **企业授权流程** - 企业用户授权 ISV 访问其 Custody 账户

**应该完全轻松的交互**：
- API 请求/响应处理（签名、nonce、错误）
- iframe 授权页面的无缝嵌入
- 多语言 SDK 的一致性体验

**成败关键交互**：
- **开发者首次调用成功** - 决定是否继续使用平台
- **签名任务完成** - 多方协作的异步签名流程

### Platform Strategy

| 维度 | 决策 |
|------|------|
| 开发者门户 | Web (Vue 3) - 文档、SDK Demo、应用管理 |
| SDK Demo | Web (Vue 3) - 交互式 API 演示 |
| 移动端 | MVP 阶段不考虑，聚焦 Web |
| 交互方式 | 键鼠为主，响应式布局 |

### Effortless Interactions

| 交互 | 当前痛点 | 设计目标 |
|------|---------|----------|
| SDK 集成 | 多语言配置复杂 | npm install + 3 行代码可用 |
| API 签名 | 手动计算 HMAC | SDK 自动处理 |
| 企业授权 | 流程不透明 | iframe 嵌入，无需跳转 |
| 错误处理 | 错误码不清晰 | 友好错误提示 + 解决建议 |
| 状态查询 | 轮询等待 | WebSocket 推送 |

### Critical Success Moments

| 时刻 | 用户感受 |
|------|----------|
| 运行 SDK Demo 看到首次成功响应 | "原来这么简单" |
| iframe 授权页面平滑嵌入 | "体验和原生页面一样" |
| 签名任务多方完成 | "协作流程很清晰" |
| 查看交易状态实时更新 | "数据是准确的" |

### Experience Principles

| 原则 | 说明 |
|------|------|
| **SDK First** | 所有能力都应通过 SDK 暴露，API 是实现细节 |
| **零配置起步** | 开发者能在 10 分钟内完成首次调用 |
| **透明化** | 签名、nonce、路由对开发者隐藏 |
| **错误可操作** | 每条错误消息都附带解决方案 |
| **文档即演示** | SDK Demo 就是最好的文档 |

---

## Design Style

### Color System (Party Mode Voted)

| 色系 | 色值 | 用途 | CSS 变量 |
|------|------|------|----------|
| 主色 | `#2D3748` | 主要操作、标题 | `--color-primary` |
| 品牌绿 | `#00BE78` | 成功状态、强调、图标 | `--color-brand` |
| 背景 | `#F7F9FC` | 页面背景 | `--color-bg` |
| 卡片 | `#FFFFFF` | 卡片、内容区域 | `--color-surface` |
| 边框 | `#E2E8F0` | 分隔线、边框 | `--color-border` |
| 成功 | `#00BE78` | 成功状态 | `--color-success` |
| 警告 | `#F6AD55` | 警告状态 | `--color-warning` |
| 错误 | `#E53E3E` | 错误状态 | `--color-error` |
| 文字深 | `#1A202C` | 正文标题 | `--color-text-primary` |
| 文字中 | `#4A5568` | 正文 | `--color-text-secondary` |
| 文字浅 | `#A0AEC0` | 辅助说明 | `--color-text-tertiary` |

### Flat Design Principles

**扁平化设计核心理念**：
- 去除多余的装饰元素（阴影、渐变、立体效果）
- 强调内容本身，减少视觉干扰
- 清晰的层次结构和视觉引导
- 简洁的线条和几何形状
- 高对比度，确保可读性

**设计特征**：
| 特征 | 应用场景 |
|------|----------|
| 纯色块 | 按钮、卡片、导航 |
| 细线条 | 分隔线、图标边框 |
| 无阴影 | 所有交互元素 |
| 大留白 | 内容区域呼吸感 |
| 清晰图标 | SVG 图标（与 Logo 风格一致） |

**色彩应用**：
```
┌─────────────────────────────────────────────┐
│  主色: #2D3748 (蓝灰，专业感)                  │
│  品牌绿: #00BE78 (成功、强调、品牌识别)         │
│  背景: #F7F9FC (微蓝灰，专业且柔和)            │
│  卡片: #FFFFFF (纯白，内容区域)                 │
└─────────────────────────────────────────────┘
```

**Typography**：
- 字体：UndunText（/fonts 目录）
- 层级：标题 → 副标题 → 正文 → 辅助文字
- 字重：Regular / Medium / SemiBold

### UI Component Standards

| 组件 | 样式规范 |
|------|----------|
| 主要按钮 | 主色(#2D3748) 背景 + 白色文字 |
| 次要按钮 | 边框按钮，主色边框 |
| 卡片 | 白色背景 + 细灰边框(#E2E8F0)，无阴影 |
| 输入框 | 白色背景 + 灰边框，聚焦显示主色边框 |
| 成功提示 | 品牌绿(#00BE78) |
| 警告提示 | #F6AD55 |
| 错误提示 | #E53E3E |
| 图标 | 纯色 SVG，与 Logo 风格一致 |
| 间距 | 8px 基础网格系统 |

---

## Design System Foundation

### 1.1 Design System Choice

**推荐方案：Element Plus + 自定义主题**

| 选项 | 评估 | 结论 |
|------|------|------|
| **Element Plus** | 项目已选技术栈，组件丰富，Vue 3 原生支持 | ✅ 采用 |
| **自定义设计系统** | 成本高，需要从零构建 | ⚠️ 局部定制 |
| **Tailwind UI** | 需要额外学习成本，与 Element Plus 有重叠 | ❌ 不采用 |

### Rationale for Selection

**选择理由：**

1. **技术一致性** - Element Plus 是 Vue 3 生态的官方推荐组件库，与项目技术栈天然契合
2. **开发效率** - 提供 60+ 开箱即用组件，满足 80% 常见需求
3. **定制能力** - 通过 SCSS 变量和主题定制，完全适配品牌色彩（扁平化风格）
4. **维护成本** - 社区活跃，长期维护有保障
5. **文档完善** - 中文文档完善，降低团队学习成本

### Implementation Approach

**实施策略：**

| 层级 | 方案 |
|------|------|
| **设计 Tokens** | 用 Element Plus 变量映射品牌色彩 |
| **组件定制** | 重写关键组件样式（按钮、卡片、表格） |
| **全局样式** | 定义 Typography、间距、图标系统 |
| **覆盖策略** | 用 `::v-deep` 或 `!important` 处理特殊情况 |

### Customization Strategy

**定制重点（扁平化风格）：**

```scss
// element-plus-variables.scss
// 扁平化定制

// 去除圆角
--el-border-radius-base: 2px;

// 品牌色映射
--el-color-primary: #2D3748;
--el-color-success: #00BE78;
--el-color-warning: #F6AD55;
--el-color-danger: #E53E3E;

// 边框样式（扁平化）
--el-border-color: #E2E8F0;
--el-border-style: solid;

// 去除阴影
--el-box-shadow: none;
```

**需要自定义的组件：**
- `el-button` - 品牌绿按钮，去圆角
- `el-card` - 纯白背景 + 细边框，无阴影
- `el-table` - 简洁表头，无竖线
- `el-dialog` - 扁平风格，去阴影

---

## 2. Core User Experience

### 2.1 Defining Experience

**核心体验定义：「一键集成，立即调用」**

这是 Cregis OpenPlatform 的定义性体验。开发者（ISV）从注册到完成首次 API 调用，应该在 **10 分钟内** 达成。

**类比参考：**
| 产品 | 定义性体验 |
|------|-----------|
| Stripe | "3 行代码完成支付集成" |
| Vercel | "一行命令部署上线" |
| Firebase | "5 分钟构建完整后端" |

**Cregis 的定义性体验：**
```
开发者 → npm install → 复制 Demo 代码 → 首次 API 调用成功
                                    ↓
                              "就这么简单？"
```

### 2.2 User Mental Model

**开发者心理模型：**

| 阶段 | 开发者想法 | 我们的设计 |
|------|-----------|-----------|
| 入门前 | "又要看文档、配置环境" | SDK Demo 开箱即用 |
| 集成中 | "这个参数干嘛的？" | 内联注释 + 悬浮提示 |
| 调试时 | "哪里出错了？" | 可视化错误定位 |
| 完成后 | "下次还选这个平台" | 一致的调用体验 |

**现有痛点：**
- 文档分散，找不到示例
- 签名计算复杂，容易出错
- 异步任务状态不透明
- 多语言 SDK 文档不一致

### 2.3 Success Criteria

**核心体验成功标准：**

| 指标 | 目标 | 测量方式 |
|------|------|----------|
| 首次调用时间 | < 10 分钟 | 用户调研 |
| 文档完成率 | > 90% | 埋点统计 |
| SDK Demo 使用率 | > 50% | 埋点统计 |
| 集成满意度 | > 4.5/5 | 用户反馈 |
| 错误自愈率 | > 60% | 错误提示引导 |

**用户说"成了"的时刻：**
1. 运行 Demo 看到返回结果
2. 复制代码到自己项目正常工作
3. 遇到错误能自己解决

### 2.4 Novel UX Patterns

**模式分析：**

| 模式类型 | 采用理由 |
|----------|----------|
| **API Playground** | Stripe 验证成功，无需教育用户 |
| **交互式代码编辑器** | 开发者熟悉，在线修改即时反馈 |
| **状态可视化** | 异步任务需要，但需要引导 |
| **错误上下文** | 通用模式，提升自助能力 |

**需要创新的地方：**
- iframe 授权页面的无缝嵌入
- 多语言 SDK 的切换体验一致性

### 2.5 Experience Mechanics

**核心交互机制：**

**1. 启动（Initiation）**
```
入口 → 开发者门户首页 → "快速开始" → SDK Demo
触发：首次访问 + 未集成状态
```

**2. 交互（Interaction）**
```
选择 API → 配置参数 → 点击"运行" → 查看结果
输入：API 名称 + 必要参数
响应：实时请求 + JSON 格式化展示
```

**3. 反馈（Feedback）**
| 状态 | 视觉反馈 |
|------|----------|
| 运行中 | 加载动画 + 进度提示 |
| 成功 | 绿色勾 + 响应数据展示 |
| 失败 | 红色 X + 错误说明 + 修复建议 |
| 复制 | 短暂"已复制"提示 |

**4. 完成（Completion）**
```
点击"复制代码" → 到自己项目使用
下一步引导："查看完整文档"
```

---

## Visual Design Foundation

### Color System

**语义化色彩系统：**

| 角色 | 色值 | CSS 变量 | WCAG |
|------|------|----------|------|
| 主色 | `#2D3748` | `--color-primary` | ✅ 7.2:1 |
| 品牌绿 | `#00BE78` | `--color-brand` | ✅ 4.5:1 |
| 背景 | `#F7F9FC` | `--color-bg` | N/A |
| 卡片 | `#FFFFFF` | `--color-surface` | N/A |
| 边框 | `#E2E8F0` | `--color-border` | N/A |
| 成功 | `#00BE78` | `--color-success` | ✅ 4.5:1 |
| 警告 | `#F6AD55` | `--color-warning` | ⚠️ 3.1:1 |
| 错误 | `#E53E3E` | `--color-error` | ✅ 5.8:1 |
| 文字深 | `#1A202C` | `--color-text-primary` | ✅ 14.1:1 |
| 文字中 | `#4A5568` | `--color-text-secondary` | ✅ 7.5:1 |
| 文字浅 | `#A0AEC0` | `--color-text-tertiary` | ⚠️ 3.1:1 |

**色彩应用分布：**
```
页面权重分布：
├── 主色 (#2D3748): 15% - 标题、重要按钮
├── 品牌绿 (#00BE78): 10% - 成功状态、强调元素
├── 中性色: 60% - 背景、边框、文字
└── 功能色: 15% - 成功、警告、错误
```

### Typography System

**字体规范：**

| 层级 | 字体大小 | 字重 | 行高 | 用途 |
|------|----------|------|------|------|
| h1 | 32px | SemiBold | 1.2 | 页面标题 |
| h2 | 24px | SemiBold | 1.3 | 区块标题 |
| h3 | 18px | Medium | 1.4 | 卡片标题 |
| body | 14px | Regular | 1.5 | 正文内容 |
| small | 12px | Regular | 1.5 | 辅助说明 |
| code | 13px | Regular | 1.6 | 代码片段 |

**字体文件：**
```
/fonts/
├── UndunText-Regular.woff2
├── UndunText-Medium.woff2
└── UndunText-SemiBold.woff2
```

### Spacing & Layout Foundation

**间距系统（8px 基准）：**

| 间距 token | 值 | 用途 |
|------------|-----|------|
| `--space-xs` | 4px | 标签内间距 |
| `--space-sm` | 8px | 元素间距 |
| `--space-md` | 16px | 卡片内边距 |
| `--space-lg` | 24px | 区块间距 |
| `--space-xl` | 32px | 页面边距 |
| `--space-2xl` | 48px | 大区块间距 |

**布局系统：**

| 断点 | 宽度 | 布局 |
|------|------|------|
| xs | < 576px | 单列 |
| sm | 576px - 768px | 单列/双列 |
| md | 768px - 1024px | 双列 |
| lg | 1024px - 1440px | 三列 |
| xl | > 1440px | 四列/自适应 |

**内容区域限制：**
- 最大内容宽度：1200px
- 推荐卡片宽度：320px - 400px
- 代码区域：自适应

### Accessibility Considerations

**无障碍规范：**

| 规范 | 要求 | 实现方式 |
|------|------|----------|
| 颜色对比 | ≥ 4.5:1 (AA) | 使用深色文字 |
| 焦点可见 | 清晰焦点环 | `--color-brand` 边框 |
| 键盘导航 | 可完整操作 | Tab 顺序 + Enter 确认 |
| 文字缩放 | 支持 200% | 相对单位 (rem) |
| 动画控制 | 尊重 reduced-motion | `prefers-reduced-motion` |

---

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

| 产品/平台 | 借鉴点 | 分析 |
|-----------|--------|------|
| **Stripe Developer** | 开发者体验标杆 | API 文档即测试工具、代码片段一键复制、交互式 API Explorer |
| **Alipay Open Platform** | 国内开放平台参考 | KYB 认证流程、授权管理、资金流向可视化 |
| **Vercel** | 开发者门户设计 | 简洁的文档结构、快速上手的 CLI 体验、实时日志 |
| **AWS Console** | 企业级后台参考 | 清晰的资源层级、IAM 权限管理、服务状态监控 |
| **Notion** | 扁平化设计参考 | 无边框设计、干净的卡片，信息层级清晰 |

### Transferable UX Patterns

**开发者门户模式：**
| 模式 | 应用场景 | 说明 |
|------|----------|------|
| API Playground | SDK Demo | 交互式 API 调用演示，实时看到请求/响应 |
| 代码片段 | 文档页面 | 一键复制，支持多语言切换 |
| 快速开始 | 开发者入门 | 5 分钟内完成首次调用 |
| 状态指示器 | 异步任务 | WebSocket 实时推送状态 |

**后台管理模式：**
| 模式 | 应用场景 | 说明 |
|------|----------|------|
| 审核工作流 | KYB/应用审核 | 分步审核、批量操作、审核历史 |
| 权限管理 | 企业/应用 | RBAC 模型、可视化权限配置 |
| 数据看板 | 管理员首页 | 关键指标、趋势图表、操作快捷入口 |

### Anti-Patterns to Avoid

| 反模式 | 问题 | 替代方案 |
|--------|------|----------|
| 跳转到外部文档 | 打断开发者流 | SDK Demo 内嵌文档 |
| 复杂 KYB 表单 | 高放弃率 | 分步引导 + 草稿保存 |
| 状态不透明 | 焦虑感 | 实时状态 + WebSocket |
| 纯表格展示 | 信息过载 | 卡片+表格混合，数据可视化 |

### Design Inspiration Strategy

**采用：**
- Stripe 风格的 API Playground（降低接入门槛）
- Notion 式的扁平无边框设计（品牌调性）
- Vercel 的快速上手流程（零配置起步）

**适配：**
- Alipay 的 KYB 认证流程（国内企业习惯）
- AWS 的权限管理（企业级安全需求）

**避免：**
- 过度动画（金融服务需要稳重）
- 复杂的主题定制（聚焦品牌色）
- 移动端优先（开发者场景以桌面为主）

---

## Desired Emotional Response

### Primary Emotional Goals

| 核心情感 | 含义 | 用户表现 |
|----------|------|----------|
| **信任感** | 相信平台安全可靠，资产受到保护 | "我的资产很安全" |
| **掌控感** | 对每一笔交易、每一个操作了如指掌 | "我知道发生了什么" |
| **效率感** | 快速完成任务，没有不必要的等待 | "几下就搞定了" |
| **安心感** | 不用担心出错，有清晰的反馈和保护 | "出错也不怕，能找回" |

**次要情感：**
- 自信（开发者能轻松集成）
- 清晰（复杂功能有易懂的操作引导）
- 可靠（承诺的事情一定能做到）

**需要消除的负面情感：**
- 疑惑（不知道下一步该做什么）
- 怀疑（这个平台靠谱吗）
- 焦虑（交易进行中，不知道是否成功）
- 困惑（错误信息看不懂）

### Emotional Journey Mapping

| 阶段 | 理想情感 | 设计支撑 |
|------|----------|----------|
| **初次接触** | 好奇 → 期待 | SDK Demo 开箱即用，快速看到效果 |
| **集成过程** | 自信 → 成就感 | 代码片段一键复制，内联注释清晰 |
| **授权环节** | 安心 | iframe 无缝嵌入，授权状态透明可见 |
| **交易执行** | 掌控感 | 实时状态推送，每步都有反馈 |
| **遇到问题** | 平静 | 友好错误提示 + 解决建议 |
| **任务完成** | 满足 → 信任 | 交易凭证完整，状态明确 |
| **长期使用** | 依赖感 | 一致的 API 体验，长期稳定可靠 |

### Micro-Emotions

| 微情感 | 正面状态 | 设计策略 |
|--------|----------|----------|
| **理解** | 用户秒懂操作 | 渐进式披露，复杂逻辑封装在 SDK |
| **确定** | 用户确信操作正确 | 二次确认 + 操作预览 |
| **放心** | 用户不担心出错 | 撤销机制 + 操作历史可追溯 |
| **清晰** | 用户知道状态 | 实时 WebSocket 状态更新 |
| **掌控** | 用户决定一切 | 用户主导授权范围和权限级别 |

### Design Implications

| 情感目标 | UX 设计决策 |
|----------|-------------|
| **信任感** | - 资产余额实时刷新<br>- 交易记录完整可追溯<br>- 安全审计日志透明<br>- 多语言一致的错误提示 |
| **掌控感** | - 签名预览页面清晰展示<br>- 授权范围用户可控<br>- 操作历史可查询<br>- 批量操作进度可视 |
| **效率感** | - SDK 自动处理签名<br>- 示例代码一键复制<br>- 错误码附带解决方案<br>- API 响应结构化展示 |
| **安心感** | - 二次确认敏感操作<br>- 操作不可逆时警示<br>- WebSocket 实时状态推送<br>- 友好的 Loading 动画 |

### Emotional Design Principles

1. **透明即信任** — 所有状态变化都应可见，隐藏细节会增加不信任

2. **确认消除焦虑** — 关键操作必须有明确的成功/失败反馈

3. **复杂留给自己，简单献给用户** — SDK 封装复杂性，对外只暴露简单接口

4. **错误是机会** — 每条错误都应帮助用户前进，而非制造困惑

5. **掌控权在用户** — 授权范围、权限级别、审批流程都由用户决定

---

## Technical Implementation Guide

### Technology Stack

**Frontend Stack:** Vue 3 + Vite + TypeScript + Element Plus + Tailwind CSS v3.4

**Font System:** Gellix + Udun Text

**Icon System:** Heroicons (SVG)

---

### Tailwind CSS Configuration

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
    './node_modules/element-plus/**/*.{vue,js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      // Brand Colors
      colors: {
        brand: {
          DEFAULT: '#00BE78',
          light: '#8BE294',
          dark: '#00A868',
          soft: 'rgba(0, 190, 120, 0.12)',
          50: 'rgba(0, 190, 120, 0.08)',
          100: 'rgba(0, 190, 120, 0.16)',
        },
        primary: {
          DEFAULT: '#2D3748',
          soft: '#4A5568',
          light: '#718096',
        },
        success: '#00BE78',
        warning: '#F6AD55',
        error: '#E53E3E',
        info: '#3182CE',
      },

      // Fonts
      fontFamily: {
        sans: ['Gellix', 'Udun Text', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        brand: ['Udun Text', 'Gellix', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },

      // Border Radius
      borderRadius: {
        'sm': '4px',
        'base': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        'full': '9999px',
      },

      // Box Shadow
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'base': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  darkMode: 'class',
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

---

### CSS Variables (Element Plus Integration)

```css
@layer base {
  :root {
    --el-color-primary: #00BE78;
    --el-color-success: #00BE78;
    --el-color-warning: #F6AD55;
    --el-color-danger: #E53E3E;
    --el-color-info: #3182CE;
    --el-border-radius-base: 8px;
    --el-border-radius-small: 6px;
    --el-box-shadow: none;
  }

  body {
    @apply font-sans text-gray-700 bg-gray-50;
  }
}

@layer components {
  .card {
    @apply bg-white rounded-lg border border-gray-200 shadow-sm transition-all duration-200;
  }

  .btn-primary {
    @apply bg-brand text-white px-4 py-2 rounded-md font-medium
           hover:bg-brand-dark transition-colors duration-200;
  }

  .btn-secondary {
    @apply bg-white text-gray-700 px-4 py-2 rounded-md font-medium
           border border-gray-300 hover:bg-gray-50;
  }

  .input {
    @apply w-full px-3 py-2 bg-white border border-gray-300 rounded-md
           placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand;
  }

  .tag {
    @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
  }

  .tag-success { @apply bg-brand-50 text-brand; }
  .tag-warning { @apply bg-orange-100 text-orange-600; }
  .tag-error { @apply bg-red-100 text-red-600; }
  .tag-info { @apply bg-blue-100 text-blue-600; }
}
```

---

## System Layouts

### 1. Developer Portal (Documentation Style)

**Layout:** Header + Left Navigation + Main Content (Dual Column)

**Header Elements:** Logo, Docs, API Reference, SDK, GitHub Link, Login

**Navigation Structure:**
- Quick Start (Installation, Configuration, First Call)
- SDK Reference (Node.js, Python, Go, Java, PHP)
- API Reference (Account, Asset, Transaction, Policy)
- Best Practices, FAQ

### 2. Developer Console (Management Style)

**Layout:** Left Sidebar + Main Content Area

**Navigation:**
- Dashboard
- Application Management
- Account Management
- Billing
- Support Tickets

### 3. Admin Dashboard (Three-Column Layout)

**Layout:** Left Navigation + Main Content + Right Panel

**Navigation:**
- Dashboard (Platform Overview)
- KYB Review
- ISV Management
- Approvals
- Analytics
- Settings

### 4. SDK Demo (API Playground)

**Layout:** Dark Theme, API List + Code Editor + Response Panel

**Features:**
- Configuration Panel (App/Environment/AppKey)
- API Method List (grouped by category)
- Code Editor (syntax highlighting)
- Response Display (JSON, execution time)

---

## Design Checklist

### General

- [ ] Brand green (#00BE78) used consistently
- [ ] Primary color (#2D3748) used consistently
- [ ] Flat design (no shadows, no gradients)
- [ ] Border radius unified (2px/6px/8px/12px)
- [ ] Fonts: Gellix + Udun Text
- [ ] Icons: Heroicons style consistent

### Pages

**Developer Portal:**
- [ ] Landing page with clear value proposition and CTA
- [ ] Docs: left nav + right content layout
- [ ] Login: simple form, prominent brand elements

**Developer Console:**
- [ ] Dashboard: overview cards + quick actions
- [ ] App management: single list, AppId copyable
- [ ] App detail: AppKey regeneratable
- [ ] Empty state: has guided action

**Admin Dashboard:**
- [ ] Overview: key metrics + trend charts
- [ ] Review page: list + filter + pagination
- [ ] ISV management: developer list + status actions

**SDK Demo:**
- [ ] Config panel: App/Environment/AppKey
- [ ] API list: grouped, switchable
- [ ] Code editor: syntax highlight, copyable
- [ ] Response: JSON formatted, execution time shown

---

## Responsive Design

| Breakpoint | Layout | Checkpoints |
|-------------|---------|-------------|
| < 576px | Single column | Navigation drawer, stacked forms |
| 576-768px | Two column | Cards two columns, table scroll |
| 768-1024px | Three column | Sidebar visible |
| > 1440px | Full | Content max-width 1200px |

---

## Dark Mode Support

```css
.dark .card {
  @apply bg-gray-800 border-gray-700 text-gray-100;
}

.dark .btn-secondary {
  @apply bg-gray-700 border-gray-600 text-gray-200;
}

.dark .input {
  @apply bg-gray-700 border-gray-600 text-gray-100;
}
```

---

## File Structure

```
openplatform-web/
├── developer-portal/
│   ├── src/
│   │   ├── assets/
│   │   │   ├── fonts/
│   │   │   │   ├── gellix/
│   │   │   │   └── udun-text/
│   │   │   └── styles/
│   │   │       ├── variables.css      # Design Tokens
│   │   │       ├── typography.css     # Font specs
│   │   │       └── components.css     # Component styles
│   │   ├── components/
│   │   ├── views/
│   │   ├── router/
│   │   └── stores/
│   └── public/
│
├── admin-portal/
│   ├── src/
│   │   ├── assets/
│   │   │   ├── fonts/
│   │   │   │   ├── gellix/
│   │   │   │   └── udun-text/
│   │   │   └── styles/
│   │   ├── components/
│   │   ├── views/
│   │   ├── router/
│   │   └── stores/
│   └── public/
│
└── sdk-demo/
    ├── src/
    │   ├── assets/
    │   │   ├── fonts/
    │   │   │   ├── gellix/
    │   │   │   └── udun-text/
    │   │   └── styles/
    │   ├── components/
    │   ├── views/
    │   ├── router/
    │   └── stores/
    └── public/
```

---

*This document has been merged with comprehensive-ux-design.md (2026-02-06)*
