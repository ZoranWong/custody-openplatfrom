---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - "prd-cregis-openplatform.md"
  - "architecture.md"
  - "ux-design-specification.md"
---

# Cregis OpenPlatform - Epic Breakdown

**Last Updated:** 2026-02-09
**Status:** Ready for Independent Development

---

## Module Overview

项目分为四个独立开发模块，每个模块可并行开发：

| 模块 | 独立开发 | 依赖 |
|------|----------|------|
| **Module A: Developer Portal** | ✅ 可独立开发 | 无 |
| **Module B: Admin Portal** | ✅ 可独立开发 | 无 |
| **Module C: API Gateway** | ✅ 可独立开发 | 无 |
| **Module D: SDK** | ✅ 可独立开发 | 依赖 Module C API 契约 |

---

# Module A: Developer Portal (开发者平台门户)

**路径:** `openplatform-web/developer-portal/`
**独立开发:** ✅ 是
**依赖:** 无

**说明:** 开发者门户供 ISV 开发者自助管理自己的账号和应用，不涉及企业管理、授权、财务单元等业务功能（这些通过后端 SDK API 调用）。

## A.1 平台首页

### Story A.1.1: Landing Page

As a **visitor**,
I want to view the platform landing page,
So that I can understand the platform's value proposition.

**Acceptance Criteria:**

**Given** a visitor accesses the platform
**When** visiting the landing page
**Then** display:
- Platform name and logo
- Value proposition
- Key features overview
- "Get Started" and "Login" CTAs
- Documentation links

---

## A.2 开发者账号

### Story A.2.1: Developer Registration

As a **new developer**,
I want to register using email or phone,
So that I can create a developer account.

**Acceptance Criteria:**

**Given** the registration page
**When** entering valid email/phone and password
**Then** create new account
**And** send verification email/SMS
**And** set status to "pending_verification"

---

### Story A.2.2: Email/Phone Verification

As a **registered developer**,
I want to verify my contact information,
So that I can activate my account.

**Acceptance Criteria:**

**Given** a verification link in email
**When** clicking the link
**Then** mark email as verified
**And** change status to "active"

---

### Story A.2.3: Developer Login

As a **registered developer**,
I want to login to access my dashboard,
So that I can manage my applications.

**Acceptance Criteria:**

**Given** valid credentials
**When** logging in
**Then** redirect to dashboard
**And** set JWT token in cookie (2h expiry)

---

### Story A.2.4: Password Reset

As a **registered developer**,
I want to reset my password,
So that I can regain account access.

**Acceptance Criteria:**

**Given** email/phone for password reset
**When** requesting reset
**Then** send reset code
**And** allow new password with valid code

---

### Story A.2.5: Developer Profile

As a **logged-in developer**,
I want to view and edit my profile,
So that I can update my information.

**Acceptance Criteria:**

**Given** logged-in developer
**When** viewing/editing profile
**Then** can update name, company
**And** email change requires verification

---

## A.3 应用管理

### Story A.3.1: Create Application

As a **logged-in developer**,
I want to create a new application,
So that I can obtain AppID and AppSecret.

**Acceptance Criteria:**

**Given** application creation page
**When** entering name, description, callback URL
**Then** generate unique AppID
**And** display AppSecret once
**And** set status to "pending_review"

---

### Story A.3.2: Application List

As a **logged-in developer**,
I want to view all my applications,
So that I can manage them.

**Acceptance Criteria:**

**Given** multiple applications
**When** viewing application list
**Then** show: name, AppID, status, created_at
**And** support pagination and search

---

### Story A.3.3: Application Detail

As a **logged-in developer**,
I want to view application details,
So that I can monitor configuration.

**Acceptance Criteria:**

**Given** an application
**When** viewing detail page
**Then** show: AppID, AppSecret (with toggle), status, callback URL, API usage

---

### Story A.3.4: Regenerate AppSecret

As a **logged-in developer**,
I want to regenerate my AppSecret,
So that I can maintain security.

**Acceptance Criteria:**

**Given** application detail page
**When** regenerating AppSecret
**Then** confirm before regeneration
**And** invalidate old secret immediately
**And** warn about breaking integrations

---

### Story A.3.5: Update Application

As a **logged-in developer**,
I want to update application info,
So that I can keep it current.

**Acceptance Criteria:**

**Given** application detail page
**When** editing application
**Then** can modify name, description, callback URL
**And** save changes immediately

---

### Story A.3.6: Delete Application

As a **logged-in developer**,
I want to delete my application,
So that I can remove unused apps.

**Acceptance Criteria:**

**Given** application detail page
**When** deleting application
**Then** confirm with warning
**And** soft-delete (AppID cannot be reused)

---

## A.4 费用管理

### Story A.4.1: API Usage Statistics

As a **logged-in developer**,
I want to view my API usage statistics,
So that I can monitor usage and costs.

**Acceptance Criteria:**

**Given** billing page
**When** viewing API usage
**Then** show: total calls, calls by endpoint, trend chart

---

### Story A.4.2: Invoice Generation

As a **logged-in developer**,
I want to generate and download invoices,
So that I can manage accounting.

**Acceptance Criteria:**

**Given** billing page
**When** selecting billing period
**Then** generate invoice with: company info, usage breakdown, amount

---

### Story A.4.3: Payment History

As a **logged-in developer**,
I want to view my payment history,
So that I can track all payments.

**Acceptance Criteria:**

**Given** billing page
**When** viewing payment history
**Then** show: date, amount, status, invoice link

---

# Module B: Admin Portal (管理后台)

**路径:** `openplatform-web/admin-portal/`
**独立开发:** ✅ 是
**依赖:** 无

## B.1 Dashboard

### Story B.1.1: Admin Dashboard Overview

As a **platform admin**,
I want to view platform overview,
So that I can monitor platform health.

**Acceptance Criteria:**

**Given** admin dashboard
**When** viewing overview
**Then** show:
- Total developers
- Total applications
- Pending KYB reviews
- API call statistics
- Error rate trends

---

## B.2 ISV KYB 审核

### Story B.2.1: ISV KYB Review

As a **platform admin**,
I want to review ISV KYB applications,
So that I can ensure compliance.

**Acceptance Criteria:**

**Given** pending ISV KYB applications
**When** reviewing
**Then** show: company name, business license, UBO info, company structure
**And** allow approve/reject with comments

---

### Story B.2.2: ISV KYB History

As a **platform admin**,
I want to view KYB review history,
So that I can track audit records.

**Acceptance Criteria:**

**Given** KYB history page
**When** viewing
**Then** show: ISV, reviewer, decision, comments, date

---

### Story B.2.3: ISV Status Management

As a **platform admin**,
I want to manage ISV status,
So that I can control access.

**Acceptance Criteria:**

**Given** ISV detail page
**When** changing status
**Then** allow: activate, suspend, ban
**And** log status changes

---

## B.3 Analytics

### Story B.3.1: API Statistics Dashboard

As a **platform admin**,
I want to view API usage statistics,
So that I can monitor platform health.

**Acceptance Criteria:**

**Given** analytics dashboard
**When** viewing statistics
**Then** show:
- Total API calls today/week/month
- Top apps by usage
- Response time trends
- Error rate trends

---

### Story B.3.2: Revenue Analytics

As a **platform admin**,
I want to view revenue analytics,
So that I can understand platform economics.

**Acceptance Criteria:**

**Given** revenue analytics
**When** viewing
**Then** show: revenue by developer, revenue trend, forecast

---

### Story B.3.3: System Health

As a **platform admin**,
I want to view system health metrics,
So that I can ensure platform reliability.

**Acceptance Criteria:**

**Given** system health page
**When** viewing
**Then** show: service status, response times, error rates, resource usage

---

# Module C: API Gateway (API 网关)

**路径:** `openplatform-api-service/`
**独立开发:** ✅ 是
**依赖:** 无

## C.1 认证模块

### Story C.1.1: HMAC Signature Verification

As an **API Gateway**,
I want to verify request signatures,
So that I can ensure request authenticity.

**Acceptance Criteria:**

**Given** incoming request with signature
**When** extracting appid, nonce, timestamp, signature
**Then** verify HMAC-SHA256
**And** reject invalid signatures
**And** reject expired timestamps (>5 min)

---

### Story C.1.2: JWT Token Management

As an **API Gateway**,
I want to manage JWT tokens,
So that I can secure API access.

**Acceptance Criteria:**

**Given** valid credentials
**When** issuing AccessToken
**Then** expire in 2 hours
**And** issue RefreshToken (30-day validity)

**Given** expired AccessToken
**When** receiving RefreshToken
**Then** issue new AccessToken

---

### Story C.1.3: OAuth Token Endpoint

As an **API Gateway**,
I want to provide OAuth token endpoint,
So that developers can obtain tokens.

**Acceptance Criteria:**

**Given** POST /oauth/token with credentials
**When** validating
**Then** return { access_token, refresh_token, expires_in, token_type }

---

## C.2 权限校验

### Story C.2.1: App-Enterprise Binding Validation

As an **API Gateway**,
I want to validate app-enterprise bindings,
So that I can enforce authorization.

**Acceptance Criteria:**

**Given** request with appid and enterprise_id
**When** checking authorization
**Then** verify app is authorized for enterprise
**And** check specific permissions
**And** reject unauthorized requests

---

### Story C.2.2: Permission Check Middleware

As an **API Gateway**,
I want to check permissions per endpoint,
So that I can control access granularity.

**Acceptance Criteria:**

**Given** API endpoint with required permissions
**When** processing request
**Then** check if app has required permissions
**And** return 403 if insufficient permissions

---

## C.3 请求路由

### Story C.3.1: Request Routing

As an **API Gateway**,
I want to route requests to backend services,
So that requests are handled correctly.

**Acceptance Criteria:**

**Given** authenticated request
**When** parsing path and method
**Then** route to appropriate Custody service
**And** return response to caller
**And** handle errors properly

---

### Story C.3.2: Request Validation

As an **API Gateway**,
I want to validate request format,
So that I can reject malformed requests.

**Acceptance Criteria:**

**Given** incoming request
**When** validating format
**Then** check required fields
**And** return 400 for invalid requests

---

### Story C.3.3: Rate Limiting

As an **API Gateway**,
I want to implement rate limiting,
So that I can prevent abuse.

**Acceptance Criteria:**

**Given** rate limit configuration
**When** processing requests
**Then** enforce limits per app
**And** return 429 when limit exceeded

---

## C.4 Webhook

### Story C.4.1: Webhook Push

As an **API Gateway**,
I want to push events to ISV callbacks,
So that ISVs receive real-time notifications.

**Acceptance Criteria:**

**Given** event from Custody
**When** having valid callback URL
**Then** POST event to callback URL
**And** retry on failure (exponential backoff)
**And** verify webhook signature

---

### Story C.4.2: Webhook Configuration

As an **API Gateway**,
I want to manage webhook configurations,
So that ISVs can configure callbacks.

**Acceptance Criteria:**

**Given** ISV managing webhook config
**When** updating callback URL
**Then** validate URL format
**And** save configuration

---

### Story C.4.3: Webhook Event Types

As an **API Gateway**,
I want to handle different event types,
So that ISVs receive relevant notifications.

**Acceptance Criteria:**

**Given** event types: task.created, task.signed, payment.completed, etc.
**When** processing events
**Then** route to correct handler
**And** format payload appropriately

---

## C.5 监控与日志

### Story C.5.1: Request Logging

As an **API Gateway**,
I want to log all requests,
So that I can audit and debug.

**Acceptance Criteria:**

**Given** incoming request
**When** processing
**Then** log: timestamp, appid, endpoint, response_time, status

---

### Story C.5.2: Metrics Collection

As an **API Gateway**,
I want to collect metrics,
So that I can monitor performance.

**Acceptance Criteria:**

**Given** processed request
**When** collecting metrics
**Then** track: QPS, latency P50/P95/P99, error rate

---

### Story C.5.3: Tracing Support

As an **API Gateway**,
I want to support distributed tracing,
So that I can trace requests across services.

**Acceptance Criteria:**

**Given** request with trace_id
**When** processing
**Then** propagate trace_id to downstream services
**And** include in response headers

---

# Module D: SDK (多语言 SDK)

**路径:** `openplatform-sdk/{go,java,python,nodejs,php,web}/`
**独立开发:** ✅ 是
**依赖:** Module C API 契约 (OpenAPI Spec)

## D.1 认证模块 (所有语言)

### Story D.1.1: Token Management

As an **SDK developer**,
I want to manage authentication tokens,
So that I can handle auth automatically.

**Acceptance Criteria:**

**Given** SDK initialized with AppID and AppSecret
**When** getting access token
**Then** cache token and return
**And** auto-refresh before expiry
**And** use RefreshToken when expired

---

### Story D.1.2: Request Signing

As an **SDK developer**,
I want to sign requests automatically,
So that I can ensure request authenticity.

**Acceptance Criteria:**

**Given** SDK making API request
**When** building request
**Then** compute HMAC-SHA256 signature
**And** include in request headers

---

### Story D.1.3: Error Handling

As an **SDK developer**,
I want to handle errors consistently,
So that users can debug easily.

**Acceptance Criteria:**

**Given** API error response
**When** processing
**Then** parse error code and message
**And** throw appropriate exception
**And** include trace_id for debugging

---

## D.2 企业管理 (后端 SDK)

### Story D.2.1: Create Enterprise

As an **ISV developer**,
I want to create an enterprise in Custody,
So that I can onboard new enterprises.

**Acceptance Criteria:**

**Given** valid KYB information
**When** calling create_enterprise
**Then** return enterprise_id
**And** create vault in Custody

---

### Story D.2.2: Get Enterprise

As an **ISV developer**,
I want to query enterprise information,
So that I can display enterprise details.

**Acceptance Criteria:**

**Given** valid enterprise_id
**When** calling get_enterprise
**Then** return: status, KYB info, vault_id

---

## D.3 财务单元 (后端 SDK)

### Story D.3.1: Create Treasury Unit

As an **ISV developer**,
I want to create a treasury unit,
So that I can organize financial operations.

**Acceptance Criteria:**

**Given** enterprise_id and unit config
**When** calling create_treasury_unit
**Then** return treasury_unit_id

---

### Story D.3.2: List Treasury Units

As an **ISV developer**,
I want to list treasury units,
So that I can see all available units.

**Acceptance Criteria:**

**Given** valid enterprise_id
**When** calling list_treasury_units
**Then** return paginated list

---

### Story D.3.3: Get Treasury Unit Detail

As an **ISV developer**,
I want to get treasury unit details,
So that I can view configuration.

**Acceptance Criteria:**

**Given** valid treasury_unit_id
**When** calling get_treasury_unit
**Then** return full unit details

---

### Story D.3.4: Get Account Balance

As an **ISV developer**,
I want to query account balance,
So that I can display balance information.

**Acceptance Criteria:**

**Given** valid account_id
**When** calling get_account_balance
**Then** return: available, pending, currency

---

### Story D.3.5: List Accounts

As an **ISV developer**,
I want to list accounts in a unit,
So that I can see all accounts.

**Acceptance Criteria:**

**Given** valid treasury_unit_id
**When** calling list_accounts
**Then** return list of accounts

---

## D.4 支付 (后端 SDK)

### Story D.4.1: Create Payment Order

As an **ISV developer**,
I want to create a payment order,
So that I can initiate a payment.

**Acceptance Criteria:**

**Given** payment details (unit_id, amount, currency, recipient)
**When** calling create_payment_order
**Then** return order_id
**And** set status to "pending"

---

### Story D.4.2: Get Payment Order

As an **ISV developer**,
I want to query payment order status,
So that I can track payment progress.

**Acceptance Criteria:**

**Given** valid order_id
**When** calling get_payment_order
**Then** return: status, transaction_hash, timestamps

---

### Story D.4.3: Confirm Payment (需要前端签名)

As an **ISV developer**,
I want to confirm a payment after signature,
So that I can complete the payment.

**Acceptance Criteria:**

**Given** valid order_id and signature
**When** calling confirm_payment
**Then** update order status
**And** submit to Custody

---

## D.5 资金划拨 (后端 SDK)

### Story D.5.1: Create Transfer

As an **ISV developer**,
I want to create a fund transfer,
So that I can move funds between accounts.

**Acceptance Criteria:**

**Given** transfer details (from, to, amount, currency)
**When** calling create_transfer
**Then** return transfer_id
**And** set status to "pending_confirmation"

---

### Story D.5.2: Confirm Transfer

As an **ISV developer**,
I want to confirm a transfer,
So that I can execute the transfer.

**Acceptance Criteria:**

**Given** valid transfer_id
**When** calling confirm_transfer
**Then** update status to "completed"
**And** update account balances

---

## D.6 归集 (后端 SDK)

### Story D.6.1: Manual Pooling

As an **ISV developer**,
I want to execute manual pooling,
So that I can consolidate funds.

**Acceptance Criteria:**

**Given** pooling details (from_accounts, to_account, currency)
**When** calling create_manual_pool
**Then** return pool_id
**And** track pooling status

---

### Story D.6.2: Get Pool Status

As an **ISV developer**,
I want to query pool status,
So that I can track pooling progress.

**Acceptance Criteria:**

**Given** valid pool_id
**When** calling get_pool_status
**Then** return: status, amount, transactions

---

### Story D.6.3: Configure Auto-Pooling

As an **ISV developer**,
I want to configure auto-pooling,
So that funds are consolidated automatically.

**Acceptance Criteria:**

**Given** treasury_unit_id and auto-pool config
**When** calling configure_auto_pool
**Then** save configuration
**And** return config_id

---

## D.7 签名任务 (后端 SDK)

### Story D.7.1: Create Signature Task

As an **ISV developer**,
I want to create a signature task,
So that I can initiate multi-party signing.

**Acceptance Criteria:**

**Given** task details (operation, signers, threshold, data)
**When** calling create_signature_task
**Then** return task_id
**And** send notification emails to signers

---

### Story D.7.2: Get Signature Task

As an **ISV developer**,
I want to query signature task status,
So that I can track signing progress.

**Acceptance Criteria:**

**Given** valid task_id
**When** calling get_signature_task
**Then** return: status, signer list, signature count

---

### Story D.7.3: List Signature Tasks

As an **ISV developer**,
I want to list signature tasks,
So that I can manage multiple tasks.

**Acceptance Criteria:**

**Given** valid filters (status, date range)
**When** calling list_signature_tasks
**Then** return paginated list

---

## D.8 查询模块 (后端 SDK)

### Story D.8.1: List Transactions

As an **ISV developer**,
I want to list transactions,
So that I can view transaction history.

**Acceptance Criteria:**

**Given** treasury_unit_id and filters
**When** calling list_transactions
**Then** return paginated transaction list

---

### Story D.8.2: Get Transaction

As an **ISV developer**,
I want to get a single transaction,
So that I can view details.

**Acceptance Criteria:**

**Given** valid transaction_id
**When** calling get_transaction
**Then** return full transaction details

---

### Story D.8.3: List Webhook Events

As an **ISV developer**,
I want to list webhook events,
So that I can review notifications.

**Acceptance Criteria:**

**Given** valid filters
**When** calling list_webhook_events
**Then** return paginated event list

---

## D.9 前端 SDK (Web SDK)

### Story D.9.1: Authorization Page

As an **enterprise user**,
I want to authorize ISV in an iframe,
So that I can grant access securely.

**Acceptance Criteria:**

**Given** ISV embedding authorization iframe
**When** user initiates authorization
**Then** display secure authorization page
**And** send result via postMessage on completion

---

### Story D.9.2: Task Signature Page

As an **enterprise user**,
I want to sign tasks in an iframe,
So that I can complete multi-party signing.

**Acceptance Criteria:**

**Given** ISV embedding signature iframe
**When** user needs to sign
**Then** display task details
**And** allow sign/approve/reject
**And** send result via postMessage

---

### Story D.9.3: Signature Display Page

As an **enterprise user**,
I want to view signature data,
So that I can review before signing.

**Acceptance Criteria:**

**Given** ISV embedding display iframe
**When** displaying signature data
**Then** show parsed business information
**And** provide clear signing interface

---

### Story D.9.4: Event Handling

As an **ISV developer**,
I want to handle SDK events,
So that I can respond to user actions.

**Acceptance Criteria:**

**Given** SDK event listener
**When** events occur (authorization, signature)
**Then** emit events to ISV application
**And** include relevant data

---

# Epic Summary Table

| Module | Sub-Items | Stories |独立开发 |
|--------|-----------|---------|---------|
| **A: Developer Portal** | A.1 首页, A.2 账号(KYB), A.3 应用, A.4 费用 | 15 | ✅ |
| **B: Admin Portal** | B.1 Dashboard, B.2 ISV KYB审核, B.3 Analytics | 7 | ✅ |
| **C: API Gateway** | C.1-C.5 | 13 | ✅ |
| **D: SDK** | D.1-D.9 (认证,企业,财务,支付,划拨,归集,签名,查询,前端SDK) | 27 | ✅ (依赖 API 契约) |

**总计 Stories: 62**

---

# Independent Development Guide

## 并行开发策略

### Module A: Developer Portal
- 前端：Vue 3 + Element Plus + Tailwind
- 后端：Express + TypeScript
- 独立测试：Mock API Server

### Module B: Admin Portal
- 前端：Vue 3 + Element Plus + Tailwind
- 后端：Express + TypeScript
- 独立测试：Mock API Server

### Module C: API Gateway
- 后端：Express + TypeScript
- 依赖：无
- 独立测试：Unit tests

### Module D: SDK
- 多语言：Go, Java, Python, Node.js, PHP, TypeScript
- 依赖：Module C API 契约 (OpenAPI Spec)
- 独立测试：基于 Mock Server

---

## Development Commands

```bash
# 独立开发 Developer Portal
cd openplatform-web/developer-portal
npm install
npm run dev

# 独立开发 Admin Portal
cd openplatform-web/admin-portal
npm install
npm run dev

# 独立开发 API Gateway
cd openplatform-api-service
npm install
npm run dev

# 并行开发 (后台运行)
npm run dev &   # Portal
npm run dev &   # API Gateway
```

---

*This document is ready for independent module development.*
