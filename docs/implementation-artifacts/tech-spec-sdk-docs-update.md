---
title: 'SDK 文档更新（README + 集成指南补充）'
slug: 'sdk-docs-update'
created: '2026-04-14'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TypeScript', 'Markdown', 'HTML/CSS', 'Mermaid']
files_to_modify:
  - 'openplatform-sdk/node/README.md'
  - 'openplatform-sdk/web/README.md'
  - 'docs/thirdparty-integration-guide.html'
  - 'docs/thirdparty-integration-guide.md'
code_patterns:
  - 'Node SDK: CregisSDK 扁平 API，所有方法直接在主类，自动签名'
  - 'Web SDK: CregisWebSDK + TransferTaskDetailDialog 组件'
  - 'HTML: wiki-container > wiki-sidebar + wiki-content, nav-section/nav-item 导航'
  - '签名: Basic (OAuth) 和 Resource (业务) 两种，SDK 自动处理'
test_patterns: []
---

# Tech-Spec: SDK 文档更新（README + 集成指南补充）

**Created:** 2026-04-14

## Overview

### Problem Statement

- Node SDK 的 `README.md` 与实际 API 不一致（仍引用已废弃的 `sdk.getAuthService()`、`TreasuryService` 等 service 模式）
- Web SDK 的 `README.md` 缺少 `TransferTaskDetailDialog` 组件文档
- `docs/thirdparty-integration-guide.html/md` 缺少 SDK 集成文档章节

### Solution

- 更新 `openplatform-sdk/node/README.md` — 匹配实际 `CregisSDK` 扁平 API（所有方法直接在主类上）
- 更新 `openplatform-sdk/web/README.md` — 补充 `TransferTaskDetailDialog` 组件文档
- 在现有 `docs/thirdparty-integration-guide.html` 和 `.md` 中新增 SDK 集成章节（Node.js SDK + Web SDK）

### Scope

**In Scope:**
- 三个文件的文档更新（4 个文件：node README, web README, html guide, md guide）
- 代码示例覆盖所有公开 API 方法
- 中文文档

**Out of Scope:**
- 代码逻辑修改
- 单元测试

## Context for Development

### Codebase Patterns

- Node SDK: `CregisSDK` 类扁平 API，所有方法直接调用，不暴露 service
- Web SDK: `CregisWebSDK` 类 + `TransferTaskDetailDialog` 组件
- HTML 文档: wiki 风格 + 侧边栏导航，已有 `thirdparty-integration-guide.html` 模板
- 文档语言: 中文

### Advanced Elicitation: User Persona Focus Group 洞察

**角色与核心诉求：**
- 后端开发者：快速集成、认证流程清晰、签名机制明确、`resourceAccessKey` 来源有说明
- 前端开发者：TransferTaskDetailDialog 完整用法、与后端配合的端到端示例
- 技术决策者：架构概览、安全模型、错误处理机制、TypeScript 类型支持

**必须覆盖的文档要素（按优先级）：**
| 优先级 | 改进项 | 影响角色 |
|--------|--------|----------|
| P0 | README 与实际代码 API 严格一致 | 所有人 |
| P0 | 端到端集成流程（注册→授权→业务调用） | 后端 + 前端 |
| P1 | `resourceAccessKey` 来源说明（即 `authorizeId`） | 后端 |
| P1 | TransferTaskDetailDialog 完整文档 + 自定义样式说明 | 前端 |
| P1 | 签名算法使用场景说明（Basic Signature 用于 OAuth，Resource Signature 用于业务接口） | 后端 |
| P2 | 错误码完整列表 | 所有人 |
| P2 | SDK 架构总览（模块结构、依赖关系） | 技术决策者 |
| P2 | TypeScript 类型导出说明 | 所有人 |

### 文档结构规划（第二轮 Focus Group）

**Node SDK README 章节结构：**
1. 安装
2. 快速开始（5 行可运行代码）
3. 认证流程（流程图/时序：`getAuthorizationUrl` → 前端打开 → 用户授权 → `verifyOAuthToken` → 拿到 `authorizeId`）
4. API Reference（每个方法的表格：参数、返回值、备注）
5. 错误处理（错误码表 + 常见错误排查）
6. 签名说明（SDK 自动签名 + 算法公式参考）
7. TypeScript 类型导出
8. 许可证

**Web SDK README 应补充的章节：**
1. TransferTaskDetailDialog 使用场景（后端 payout → taskId → 前端弹窗签名）
2. 组件 API（`openTransferTaskDetailDialog` 参数、`TransferTaskDetailDialog` 构造函数、事件回调）
3. 样式自定义（`customStyles` 参数说明）
4. 端到端示例（前后端配合完整流程）

**集成指南 HTML/MD 新增章节：**
1. SDK 能力速览（支持语言、覆盖功能、最小依赖）
2. 架构概览（开发者后端 ↔ 开放平台 API ↔ 前端关系图）
3. Node.js SDK 集成指南
4. Web SDK 集成指南
5. 前后端配合完整示例
6. 安全模型（签名机制、密钥管理、UUID 防跨域）
7. 版本和兼容性（Node.js 版本、浏览器兼容性、TypeScript 版本）

**关键注意事项：**
- `resourceAccessKey` 即 `authorizeId`，必须在文档中明确标注
- 签名分两种：Basic Signature（OAuth 接口）和 Resource Signature（业务接口），文档需区分说明
- 所有代码示例必须从实际 SDK 源码验证，确保可复制运行

### 受众适配策略（Expand or Contract）

**受众画像：**
| 角色 | 技术水平 | 期望深度 | 核心诉求 |
|------|----------|----------|----------|
| 初级后端开发者 | 入门-中级 | 手把手、可复制 | 能跑起来就行 |
| 中高级全栈开发者 | 中级-高级 | API Reference + 设计意图 | 快速查找，理解架构 |
| 技术决策者/架构师 | 高级 | 概览 + 安全 + 选型 | 5 分钟评估可行性 |

**深度原则：**
- README = 操作手册：可复制、可查询、不过度解释
- 集成指南 = 架构文档：讲"为什么"和"怎么配合"，不重复"怎么做"
- 任何章节不超过 3 层深度
- 代码 > 文字：能用代码说清楚的不要写段落

**Node SDK README 各章节深度：**
- 安装：收缩（1 条命令）
- 快速开始：展开（完整可运行示例 + 注释）
- 认证流程：中度展开（流程图 + 代码对照）
- API Reference：标准（方法表格 + 1 行代码片段）
- 错误处理：收缩（错误码表 + 3 个常见场景）
- 签名说明：收缩（公式 + "SDK 自动处理"声明）
- TypeScript 类型：收缩（导出列表 + 1 个泛型示例）

**Web SDK README 新增章节深度：**
- TransferTaskDetailDialog：展开（完整使用场景 + 参数表 + 代码）
- 端到端示例：展开（后端 + 前端各一段）

**集成指南 HTML/MD 各章节深度：**
- SDK 能力速览：极度收缩（1 张表 + 3 行总结）
- 架构概览：中度展开（架构图 + 3 段说明）
- Node/Web SDK 集成：标准（引用 README + 集成视角补充）
- 前后端配合示例：展开（完整场景代码）
- 安全模型：中度展开（机制说明 + 最佳实践）
- 版本兼容性：极度收缩（1 张表）

### Critique and Refine 改进项

**W1: HTML/MD 集成指南章节定位**
- 策略：在现有文档末尾追加"SDK 集成"大章节，侧边栏新增一级导航
- 不改动现有内容，保持向后兼容

**W2: Node SDK README 顶部说明**
- 加一段 SDK 简介："Cregis 托管平台 Node.js SDK，用于后端集成加密资产托管服务"
- 包含：一句话定位 + 支持的功能列表

**W3: TransferTaskDetailDialog 数据来源说明**
- 文档中明确标注数据来自后端接口
- 给出完整调用链：后端 `createPayout` → 获取 taskId → 前端 `openTransferTaskDetailDialog`

**W4: 错误码范围界定**
- SDK 错误码（本地：网络、配置、超时）和 API 错误码（服务端返回）分开两个表格
- 说明 SDK 会自动将 API 错误包装为 `SDKError`

**W5: 流程图统一用 mermaid**
- Node README: mermaid 代码块（GitHub 可渲染）
- HTML 文档: `<pre class="mermaid">` 标签（与现有页面风格一致）

### Feynman Technique 检验结论

**概念清晰度检验结果：**
- SDK 定位：不够清晰 → 加一句话简介（W2 已覆盖）
- 认证流程：基本清晰 → `resourceAccessKey = authorizeId` 必须在首次出现处显式标注
- 签名机制：稍弱 → 采用折叠展开方式：一句话概要（"SDK 自动处理"）+ 可展开的详细公式
- TransferTaskDetailDialog：缺业务背景 → 加 2-3 句业务场景说明（转账审批流程）
- 错误处理：足够 → 无需改动

**写作指导原则：**
- 每个概念先用一句话白话解释，再给技术细节
- `resourceAccessKey` 在文档中首次出现时必须标注"即 verifyOAuthToken 返回的 authorizeId"
- 签名章节用 `<details>` 折叠（README）/ 可展开区块（HTML）藏详细公式
- TransferTaskDetailDialog 章节开头先讲业务背景（为什么需要这个组件），再讲怎么用

### Reverse Engineering 倒推遗漏补充

**从开发者首次集成成功倒推发现的文档遗漏：**

| 步骤 | 遗漏 | 补充行动 |
|------|------|----------|
| 发起 Payout | `unitId` 参数来源未说明 | `createPayout` API 文档中注明 `unitId` 来自 `createTreasuryUnit` 返回值 |
| 认证流程 | 前后端配合缺说明 | Node README 认证流程中加"此步骤需配合 Web SDK"标注 |
| 配置 SDK | appId/appSecret 来源未说明 | 快速开始中加"在开发者门户注册应用后获取"引导语 |
| 找到文档 | npm 包名需出现在集成指南 | SDK 能力速览章节中包含 `npm install` 命令 |
| 决定使用 | 功能描述用 Feature 列表而非场景 | README 简介改为场景驱动："为你的用户创建加密资产托管钱包、发起和审批转账、查询交易记录" |

**参数来源标注规则：**
- 所有方法参数如果来自另一个方法的返回值，必须在参数说明中标注来源
- 例：`unitId` → "来自 `createTreasuryUnit()` 返回的 `id`"
- 例：`resourceAccessKey` → "来自 `verifyOAuthToken()` 返回的 `authorizeId`"

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `openplatform-sdk/node/src/core/index.ts` | Node SDK 主类，所有 API 方法定义 |
| `openplatform-sdk/node/src/index.ts` | Node SDK 公开导出 |
| `openplatform-sdk/node/src/types.ts` | Node SDK 类型定义 |
| `openplatform-sdk/node/src/core/signature.ts` | 签名算法实现 |
| `openplatform-sdk/node/src/core/error.ts` | 错误码定义 |
| `openplatform-sdk/web/src/index.ts` | Web SDK 主类 + TransferTaskDetailDialog 导出 |
| `openplatform-sdk/web/src/types.ts` | Web SDK 类型定义 |
| `openplatform-sdk/web/src/components/transfer/TransferTaskDetailDialog.ts` | 转账任务详情弹窗组件 |
| `openplatform-sdk/web/src/components/transfer/types.ts` | 转账组件类型定义 |
| `docs/thirdparty-integration-guide.html` | 现有 HTML 集成指南模板 |
| `docs/thirdparty-integration-guide.md` | 现有 MD 集成指南 |

### Technical Decisions

**TD1: 集成指南 MD 现有章节处理**
现有"五、SDK 示例"章节内容为基础示例（签名计算、授权URL）。策略：保留现有内容，在其后追加"六、SDK 集成指南"大章节，包含 Node.js SDK 和 Web SDK 完整集成说明。后续章节编号顺延。

**TD2: 集成指南 HTML 章节追加**
在现有内容末尾追加 `<section id="sdk-integration">` 大章节，侧边栏新增 `nav-section`。保持现有 HTML 结构和样式不变。

**TD3: README 重写策略**
Node SDK README 完全重写（当前内容与实际 API 严重不符）。Web SDK README 保留现有内容，追加 TransferTaskDetailDialog 章节。

**TD4: 参数来源标注**
所有 API 方法的参数如果来自其他方法返回值，在参数说明中标注来源。

## Implementation Plan

### Tasks

**Task 1: 重写 Node SDK README.md**

- [ ] Task 1.1: 编写简介章节
  - File: `openplatform-sdk/node/README.md`
  - Action: 添加 SDK 一句话简介 + 场景驱动功能列表（为用户创建托管钱包、发起审批转账、查询交易）
  - Notes: 遵循"先白话后技术"原则

- [ ] Task 1.2: 编写安装章节
  - File: `openplatform-sdk/node/README.md`
  - Action: 添加 npm install 命令 + Node.js 版本要求
  - Notes: 极度收缩，1 条命令

- [ ] Task 1.3: 编写快速开始章节
  - File: `openplatform-sdk/node/README.md`
  - Action: 添加 5 行可运行代码（初始化 SDK + 调用 getAuthorizationUrl）
  - Notes: 展开 + 注释；添加"在开发者门户注册应用后获取 appId/appSecret"引导语

- [ ] Task 1.4: 编写认证流程章节
  - File: `openplatform-sdk/node/README.md`
  - Action: 添加 mermaid 时序图 + 代码对照
  - Notes: 流程：getAuthorizationUrl → 前端打开(需配合 Web SDK) → verifyOAuthToken → authorizeId
  - 首次出现 resourceAccessKey 处标注"即 verifyOAuthToken 返回的 authorizeId"

- [ ] Task 1.5: 编写 API Reference 章节
  - File: `openplatform-sdk/node/README.md`
  - Action: 为 15 个公开方法添加方法表格（参数、返回值、备注）
  - Notes: 标准深度；unitId 标注来源；使用实际的 CregisSDK 方法签名

- [ ] Task 1.6: 编写错误处理章节
  - File: `openplatform-sdk/node/README.md`
  - Action: 添加 SDK 错误码表(22个) + 3 个常见错误场景排查
  - Notes: SDK 错误码(本地)和 API 错误码(服务端)分开两个表格

- [ ] Task 1.7: 编写签名说明章节
  - File: `openplatform-sdk/node/README.md`
  - Action: 添加一句话"SDK 自动处理签名" + details 折叠展开的详细公式
  - Notes: Basic/R esource 签名区分说明；signature.ts 中的公式

- [ ] Task 1.8: 编写 TypeScript 类型导出章节
  - File: `openplatform-sdk/node/README.md`
  - Action: 列出 index.ts 公开导出的所有类型和函数
  - Notes: SDKConfig、SDKError、SDKErrorCode、ErrorCodeMessages、SignatureType

- [ ] Task 1.9: 添加许可证章节
  - File: `openplatform-sdk/node/README.md`
  - Action: 添加 MIT License

---

**Task 2: 补充 Web SDK README.md**

- [ ] Task 2.1: 编写 TransferTaskDetailDialog 业务背景
  - File: `openplatform-sdk/web/README.md`
  - Action: 添加 2-3 句业务场景说明（转账审批流程）
  - Notes: 说明为什么需要这个组件（多签审批、查看详情、确认签名）

- [ ] Task 2.2: 编写 TransferTaskDetailDialog API 文档
  - File: `openplatform-sdk/web/README.md`
  - Action: 添加构造函数参数表、3 个公开方法(open/close/destroy)、便捷函数 openTransferTaskDetailDialog
  - Notes: 展开深度；TransferTaskDetailDialogOptions、TransferTaskDetailData 等类型说明

- [ ] Task 2.3: 编写 TransferTaskDetailDialog 样式自定义文档
  - File: `openplatform-sdk/web/README.md`
  - Action: 添加 CSS class 列表和自定义方式说明
  - Notes: 列出关键 class 名称（overlay、container、card 等）

- [ ] Task 2.4: 编写端到端集成示例
  - File: `openplatform-sdk/web/README.md`
  - Action: 添加前后端完整调用链（createPayout → taskId → openTransferTaskDetailDialog → submitTask）
  - Notes: 展开深度；后端代码 + 前端代码各一段

---

**Task 3: 更新集成指南 MD**

- [ ] Task 3.1: 在现有"五、SDK 示例"后追加"六、SDK 集成指南"
  - File: `docs/thirdparty-integration-guide.md`
  - Action: 添加六、SDK 集成指南章节，包含 7 个子章节
  - Notes: 现有章节和链接不受影响

- [ ] Task 3.2: 编写 SDK 能力速览
  - File: `docs/thirdparty-integration-guide.md`
  - Action: 添加 npm install 命令、支持语言、覆盖功能、最小依赖表
  - Notes: 极度收缩，1 张表 + 3 行总结

- [ ] Task 3.3: 编写架构概览
  - File: `docs/thirdparty-integration-guide.md`
  - Action: 添加架构关系图（开发者后端 ↔ 开放平台 API ↔ 前端）
  - Notes: 中度展开，mermaid 图 + 3 段说明

- [ ] Task 3.4: 编写 Node.js SDK 集成指南
  - File: `docs/thirdparty-integration-guide.md`
  - Action: 从集成架构视角编写（引用 README + 补充集成视角）
  - Notes: 不重复 README 内容；重点讲"在整体架构中怎么用"

- [ ] Task 3.5: 编写 Web SDK 集成指南
  - File: `docs/thirdparty-integration-guide.md`
  - Action: 从集成架构视角编写（同上）
  - Notes: 同上

- [ ] Task 3.6: 编写前后端配合完整示例
  - File: `docs/thirdparty-integration-guide.md`
  - Action: 添加完整场景代码（创建 Treasury → 创建 Payout → 前端弹窗签名 → 后端确认）
  - Notes: 展开深度，代码可直接复制运行

- [ ] Task 3.7: 编写安全模型章节
  - File: `docs/thirdparty-integration-guide.md`
  - Action: 添加签名机制、密钥管理、UUID 防跨域攻击说明
  - Notes: 中度展开，建立技术决策者信任

- [ ] Task 3.8: 编写版本和兼容性章节
  - File: `docs/thirdparty-integration-guide.md`
  - Action: 添加 Node.js 版本、浏览器兼容性、TypeScript 版本表
  - Notes: 极度收缩，1 张表

---

**Task 4: 更新集成指南 HTML**

- [ ] Task 4.1: 在侧边栏追加 SDK 导航项
  - File: `docs/thirdparty-integration-guide.html`
  - Action: 在 `<nav class="wiki-nav">` 末尾添加 nav-section（SDK 集成指南 + 7 个子链接）
  - Notes: 使用 nav-section/nav-item 模式，与现有结构一致

- [ ] Task 4.2: 在 main 内容末尾追加 SDK 章节
  - File: `docs/thirdparty-integration-guide.html`
  - Action: 在 `</main>` 前添加 section id="sdk-integration"，内容与 MD 的六、SDK 集成指南对应
  - Notes: 使用现有 CSS 类（section、code-block、warning、table 等）

- [ ] Task 4.3: 使用 mermaid 流程图
  - File: `docs/thirdparty-integration-guide.html`
  - Action: 在架构概览章节使用 `<pre class="mermaid">` 标签
  - Notes: 与现有页面风格一致；HTML 已内置 mermaid 渲染脚本

### Acceptance Criteria

- [ ] AC1: Given 开发者阅读 Node SDK README，当执行"快速开始"代码示例时，能够成功初始化 SDK 并调用 getAuthorizationUrl
- [ ] AC2: Given 开发者阅读 Node SDK README，当查找 createTreasuryUnit 方法时，能够看到 unitId 参数来自 createTreasuryUnit 返回值的标注
- [ ] AC3: Given 开发者阅读 Node SDK README，当调用业务接口时，能够理解 resourceAccessKey 即 verifyOAuthToken 返回的 authorizeId
- [ ] AC4: Given 开发者阅读 Web SDK README，当使用 TransferTaskDetailDialog 时，能够找到完整的构造函数参数和公开方法说明
- [ ] AC5: Given 开发者使用 TransferTaskDetailDialog，当需要自定义样式时，能够找到 CSS class 列表和自定义方式
- [ ] AC6: Given 开发者阅读集成指南 MD/HTML，当评估 SDK 时，能够在 SDK 能力速览中看到 npm install 命令和功能列表
- [ ] AC7: Given 开发者阅读集成指南 MD/HTML，当需要集成时，能够找到完整的前后端配合示例代码
- [ ] AC8: Given 开发者遇到错误时，能够在错误处理章节找到 SDK 错误码(本地)和 API 错误码(服务端)的区分说明
- [ ] AC9: Given 开发者阅读签名说明时，能够理解 SDK 自动处理签名，且能展开查看详细公式
- [ ] AC10: Given 开发者打开集成指南 HTML，当点击侧边栏 SDK 导航项时，页面能够平滑滚动到对应章节

### Dependencies

无外部依赖。文档更新不依赖任何代码改动。

### Testing Strategy

**文档验证方法：**
1. 对照 `openplatform-sdk/node/src/core/index.ts` 逐一核对 README 中的方法签名
2. 对照 `openplatform-sdk/web/src/components/transfer/TransferTaskDetailDialog.ts` 逐一核对 README 中的 API 说明
3. 对照 `openplatform-sdk/node/src/core/error.ts` 逐一核对错误码列表
4. 验证 HTML 页面在浏览器中打开，侧边栏导航和 mermaid 图表正常渲染
5. 验证 MD 文档的章节编号和锚点链接正常

**手动检查清单：**
- [ ] Node SDK README 代码示例可复制运行（npm install 后）
- [ ] Web SDK README TransferTaskDetailDialog 示例代码语法正确
- [ ] 集成指南 HTML mermaid 流程图渲染正常
- [ ] 所有 `resourceAccessKey` 首次出现处有 `authorizeId` 标注

### Notes

**高风险项：**
- HTML 文档追加章节时需确保不破坏现有 DOM 结构（侧边栏 nav 和 main content 的嵌套关系）
- MD 文档章节编号顺延后，需验证所有现有内部链接仍有效

**已知限制：**
- README 中的代码示例使用 TypeScript，假设读者了解 TS 语法
- HTML 文档中的 mermaid 依赖 CDN 加载，离线环境可能无法渲染
