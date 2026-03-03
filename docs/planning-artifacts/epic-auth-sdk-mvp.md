---
stepsCompleted: [1]
workflowType: 'epic'
project_name: 'cregis-custody-openplatform'
user_name: 'zoran wang'
date: '2026-02-25'
inputDocuments:
  - 'prd.md'
---

# MVP Epic - 授权SDK (Authorization SDK)

**Author:** zoran wang
**Date:** 2026-02-25
**Status:** Ready for Implementation

---

## Epic 概述

这是一个最小可运行的 MVP Epic，用于演示完整的授权流程。

**目标：** 第三方开发者能够在自己的平台集成 SDK，用户可以完成 Custody 账号的授权。

**MVP 演示范围：**
- SDK 集成与授权页面唤起
- 用户登录 + TOTP 验证
- 授权信息提交与返回

---

## MVP Stories

### Module 1: SDK 核心 (Web SDK)

#### Story 1.1: SDK 初始化与配置

As a **third-party developer**,
I want to initialize the SDK with my app credentials,
So that I can use the SDK to integrate authorization.

**Acceptance Criteria:**

- Given SDK initialized with appId
- When configuration is valid
- Then SDK is ready to use
- And can call authorization methods

---

#### Story 1.2: 唤起授权页面

As a **third-party developer**,
I want to trigger the authorization popup,
So that users can authorize access to their Custody account.

**Acceptance Criteria:**

- Given SDK is initialized
- When calling openAuthorization()
- Then iframe with authorization page appears
- And passes token to authorization page

---

#### Story 1.3: SDK 消息通信

As a **third-party developer**,
I want to receive authorization results from the iframe,
So that I know when authorization completes.

**Acceptance Criteria:**

- Given authorization page is open
- When user completes authorization
- Then SDK receives result via postMessage
- And can handle success/error callbacks

---

### Module 2: 授权页面 (Authorization Page)

#### Story 2.1: 登录页面渲染

As an **end user**,
I want to see a login form,
So that I can enter my Custody credentials.

**Acceptance Criteria:**

- Given authorization page is loaded in iframe
- When token is received from parent
- Then login form is displayed
- And user can enter username/password

---

#### Story 2.2: 密码登录验证

As an **end user**,
I want to log in with my password,
So that I can authenticate to Custody.

**Acceptance Criteria:**

- Given login form is displayed
- When user enters valid credentials
- Then authentication succeeds
- And prompts for TOTP code

---

#### Story 2.3: TOTP 验证

As an **end user**,
I want to enter my Google Authenticator code,
So that I can complete two-factor authentication.

**Acceptance Criteria:**

- Given password verification succeeded
- When user enters valid TOTP code
- Then verification succeeds
- And authorization proceeds

---

#### Story 2.4: 授权确认

As an **end user**,
I want to confirm authorization,
So that I grant access to my Custody account.

**Acceptance Criteria:**

- Given TOTP verification succeeded
- When user clicks "Authorize" button
- Then authorization is submitted
- And result is sent to parent page

---

### Module 3: 后端 API (OpenPlatform)

#### Story 3.1: Token 校验 API

As an **OpenPlatform**,
I want to validate the token from third-party,
So that I can verify the request is legitimate.

**Acceptance Criteria:**

- Given token is received
- When token is valid and not expired
- Then validation succeeds
- And returns token claims

---

#### Story 3.2: 授权信息存储

As an **OpenPlatform**,
I want to store authorization information,
So that I can track third-party access.

**Acceptance Criteria:**

- Given authorization is confirmed
- When authorization info is submitted
- Then info is stored in database
- And returns authorization ID

---

#### Story 3.3: 授权标识返回

As a **third-party developer**,
I want to receive an authorization identifier,
So that I can use it for subsequent API calls.

**Acceptance Criteria:**

- Given authorization is stored
- When third-party queries result
- Then authorization ID is returned
- And can be used for future requests

---

## MVP 交付检查点

| Story | 检查点 | 状态 |
|-------|--------|------|
| 1.1 | SDK 可通过 npm 安装并初始化 | ⬜ |
| 1.2 | 调用方法可唤起 iframe | ⬜ |
| 1.3 | 可接收 postMessage 消息 | ⬜ |
| 2.1 | 登录页面在 iframe 中正常显示 | ⬜ |
| 2.2 | 密码登录成功 | ⬜ |
| 2.3 | TOTP 验证成功 | ⬜ |
| 2.4 | 授权确认并提交 | ⬜ |
| 3.1 | Token 校验接口正常 | ⬜ |
| 3.2 | 授权信息存储成功 | ⬜ |
| 3.3 | 返回授权标识 | ⬜ |

---

## 技术栈

| 组件 | 技术 |
|------|------|
| SDK | TypeScript, npm |
| 授权页面 | Vue 3 |
| 通信 | iframe + postMessage |
| 后端 | Express + TypeScript (复用现有) |

---

## 依赖

- OpenPlatform API Service (现有)
- Custody 登录接口 (现有)

---

**Epic 状态：** Ready for Implementation
