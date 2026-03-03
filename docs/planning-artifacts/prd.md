---
stepsCompleted:
  - 'step-01-init'
  - 'step-02-discovery'
  - 'step-03-success'
  - 'step-04-journeys'
  - 'step-05_domain'
  - 'step-06-innovation'
  - 'step-07-project-type'
  - 'step-08-scoping'
  - 'step-09-functional'
  - 'step-10-nonfunctional'
  - 'step-11-polish'
inputDocuments:
  - 'docs/prd-cregis-custody-2026-02-02-cn.md'
  - 'docs/planning-artifacts/prd-cregis-openplatform.md'
  - 'docs/planning-artifacts/architecture.md'
  - 'docs/planning-artifacts/ux-design-specification.md'
  - 'docs/planning-artifacts/epics.md'
workflowType: 'prd'
classification:
  projectType: 'Developer Tool (SDK) + Web App (嵌入式授权页面)'
  domain: 'Fintech - 加密货币托管 (Crypto Custody)'
  complexity: 'High'
  projectContext: '存量系统扩展'
---

# Product Requirements Document - cregis-custody-openplatform

**Author:** zoran wang
**Date:** 2026-02-25

## 1. 项目分类

- **项目类型：** Developer Tool (SDK) + Web App (嵌入式授权页面)
- **领域：** Fintech - 加密货币托管 (Crypto Custody)
- **复杂度：** High（金融合规、安全认证、TOTP验证）
- **项目背景：** 存量系统扩展（基于 Cregis Custody 开放平台）

## 2. 授权SDK核心设计

### 2.1 认证流程

| 步骤 | 说明 |
|------|------|
| 步骤1 | 用户从第三方平台 Server 获取 Token（appId+appSecret 生成） |
| 步骤2 | 用户携带 Token 调用 SDK，通过嵌入式页面登录 Custody（密码+TOTP） |
| 步骤3 | 授权后携带 Token + 授权信息提交到 OpenPlatform |
| 步骤4 | OpenPlatform 返回授权标识（OpenPlatform 与第三方开发者的绑定凭证） |
| 步骤5 | 第三方平台使用步骤4的标识完成后续所有交互 |

### 2.2 核心设计

- **Token**：第三方开发者 Server 生成，30分钟有效期，OpenPlatform 校验
- **API Key**：存储在 OpenPlatform（openplatform-api-service），不发放给第三方
- **登录认证**：嵌入式 Custody 页面（密码+TOTP）
- **SDK**：统一SDK，Web优先（详见 Section 6）
- **错误码**：统一错误码体系
- **权限**：暂不细粒度控制

## 3. 成功标准

### 3.1 用户成功

- 第三方开发者能够快速完成SDK集成（1-2天内）
- 用户能够顺利完成登录+授权全流程

### 3.2 业务成功

- MVP能够演示完整的授权流程
- 至少支持一个第三方平台原型集成

### 3.3 技术成功

- Token生成与校验功能正常
- 嵌入式授权页面正常加载
- 密码+TOTP验证可用

### 3.4 MVP 范围（第一阶段）

- 详细功能列表见 Section 7.1

### 3.5 后续迭代

- 多平台SDK支持（iOS、Android）
- 统一错误码完善
- 授权管理功能

## 4. 用户旅程

### 旅程1：第三方平台开发者集成SDK

**角色：** 第三方平台开发者（技术负责SDK集成的工程师）

**背景：** 需要在自己的平台集成Cregis Custody授权功能

**目标：** 快速完成SDK集成，能够调用OpenPlatform API并唤起授权页面

**关键步骤：**
1. 在第三方平台后端集成Token生成逻辑（appId+appSecret）
2. 在前端页面引入SDK
3. 配置回调地址
4. 调用SDK方法唤起授权页面

**成功时刻：** 开发者成功调用SDK并唤起嵌入式授权页面

### 旅程2：终端用户完成授权

**角色：** 终端用户（在第三方平台使用Custody服务的最终用户）

**背景：** 在第三方平台使用加密货币相关功能，需要完成Custody账号授权

**目标：** 通过安全的认证流程完成授权

**关键步骤：**
1. 在第三方平台点击"登录授权"按钮
2. SDK唤起嵌入式授权页面（frame弹框）
3. 输入Custody账号密码登录
4. 输入TOTP验证码
5. 授权成功，页面关闭
6. SDK自动提交授权信息到OpenPlatform
7. OpenPlatform返回授权标识给第三方平台

**成功时刻：** 用户完成授权，第三方平台获得授权标识

### 旅程3：第三方平台获取授权结果

**角色：** 第三方平台后端

**目标：** 获取用户授权结果，进行后续业务处理

**关键步骤：**
1. 接收SDK返回的授权结果
2. 存储授权标识
3. 使用授权标识调用OpenPlatform API

**成功时刻：** 第三方平台成功获取授权标识并完成业务处理

### 4.1 旅程需求总结

| 旅程 | 揭示的功能需求 |
|------|---------------|
| 开发者集成 | SDK初始化配置、Token生成、API封装、授权页面唤起 |
| 用户授权 | 嵌入式登录页面、密码验证、TOTP验证、授权确认 |
| 授权结果 | 回调处理、授权信息提交、授权标识返回 |

## 5. 领域特定需求（MVP阶段）

### 5.1 合规与监管

- 本阶段不涉及 KYC/AML
- 聚焦于授权流程本身

### 5.2 技术约束

- **安全**：Token 加密传输、HTTPS 强制
- **API 设计**：RESTful 风格、统一错误码
- **嵌入式页面**：frame 弹框集成

### 5.3 集成需求

- Custody 系统：登录认证（密码+TOTP）
- OpenPlatform：授权信息存储、API Key 管理

### 5.4 风险缓解

- Token 有效期控制（30分钟）
- 错误信息脱敏处理

## 6. SDK 技术需求

### 6.1 SDK 架构

| 维度 | 详情 |
|------|------|
| **包管理** | npm（公有云） |
| **模块** | auth（授权）、message（iframe父子通信） |
| **文档** | API参考、集成指南、示例代码 |

### 6.2 授权页面

- **技术栈**：Vue 3
- **集成方式**：iframe 双向通信
- **样式定制**：不支持

### 6.3 浏览器支持

- 主流浏览器（Chrome/Edge/Firefox/Safari）

### 6.4 HTTPS 要求

- 开发阶段：不检查 HTTPS
- 生产阶段：强制检查 HTTPS

### 6.5 错误码

- 统一错误码文档

## 7. 项目范围与阶段规划

### 7.1 MVP 功能（第一阶段）

| 功能 | 说明 |
|------|------|
| Token生成 | 第三方Server使用appId+appSecret生成 |
| Token校验 | OpenPlatform校验Token有效性 |
| 嵌入式登录 | Custody平台密码+TOTP验证 |
| 授权提交 | Token+授权信息提交到OpenPlatform |
| 授权返回 | OpenPlatform返回授权标识 |
| SDK (Web) | auth + message 模块 |
| 授权页面 | Vue 3 iframe 嵌入 |

### 7.2 后续迭代

- iOS/Android SDK
- 统一错误码完善
- 授权管理功能

### 7.3 风险评估

- 技术风险：iframe通信兼容性已验证
- 市场风险：MVP聚焦核心授权流程，风险可控
- 资源风险：团队现有技术栈可覆盖

## 8. 功能需求

### 8.1 SDK 授权模块（Auth）

- FR1: 第三方开发者可以在前端页面引入SDK并初始化配置
- FR2: 第三方开发者可以调用SDK方法唤起嵌入式授权页面
- FR3: 第三方平台用户可以在授权页面输入Custody账号密码登录
- FR4: 第三方平台用户可以输入TOTP验证码完成二次验证
- FR5: 授权成功后SDK可以自动提交授权信息到OpenPlatform

### 8.2 SDK 消息通信模块（Message）

- FR6: SDK可以通过iframe与授权页面进行双向通信
- FR7: SDK可以接收授权页面的授权结果消息
- FR8: SDK可以向授权页面发送Token等授权所需信息

### 8.3 Token 管理

- FR9: 第三方开发者可以在服务端使用appId+appSecret生成Token
- FR10: OpenPlatform可以校验Token有效性
- FR11: Token有效期为30分钟

### 8.4 授权信息管理

- FR12: OpenPlatform可以存储用户授权信息
- FR13: OpenPlatform可以返回授权标识给第三方平台
- FR14: 第三方平台可以使用授权标识进行后续API调用

### 8.5 嵌入式授权页面

- FR15: 授权页面可以通过iframe嵌入到第三方平台
- FR16: 授权页面可以接收父页面的Token信息
- FR17: 授权页面可以向父页面发送授权结果

### 8.6 错误处理

- FR18: SDK可以返回统一的错误码
- FR19: 错误码文档可以指导开发者定位问题

## 9. 非功能需求

### 9.1 性能

- 授权页面加载时间目标：3秒内
- API响应时间要求：2秒内

### 9.2 安全

- Token加密传输（HTTPS）
- 生产环境强制HTTPS检查
- 错误信息脱敏处理

### 9.3 集成

- SDK仅对接OpenPlatform API
- OpenPlatform代理与Custody的交互
