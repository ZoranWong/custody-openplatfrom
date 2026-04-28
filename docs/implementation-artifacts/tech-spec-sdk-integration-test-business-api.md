---
title: 'SDK Integration Test - Business API End-to-End'
slug: 'sdk-integration-test-business-api'
created: '2026-04-27'
status: 'Implementation Complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['JUnit 5', 'Maven', 'Vitest', 'Node.js', 'Java']
files_to_modify:
  - 'openplatform-sdk/java/cregis-sdk-core/src/test/java/com/cregis/sdk/CregisClientIntegrationTest.java'
  - 'openplatform-sdk/node/tests/integration/business.test.ts'
  - 'openplatform-sdk/node/tests/integration/helpers.ts'
code_patterns: ['Environment variable driven base URL switching', 'Service health pre-check before tests']
test_patterns: ['Integration test with real API calls', 'Environment-specific test runners', 'Diagnostic output on failure']
---

# SDK Integration Test - Business API End-to-End

## Overview

### Problem Statement
Java SDK 和 Node.js SDK 缺少对业务接口的集成测试覆盖，无法验证与 OpenPlatform API 的真实交互正确性（签名、网络、响应解析全链路）。

### Solution
基于提供的 appId、appSecret、authorizeId 构建两套 SDK 的集成测试用例，覆盖 Treasury、Payout、Transaction 等业务接口。通过测试运行时的环境变量（local / testing）切换目标 base URL。测试前通过 `/health` 端点探活，失败时输出请求/响应诊断信息。

### Scope

**In Scope:**
- TreasuryService 集成测试（查询列表、查询地址）
- PayoutService 集成测试（查询出金/入金订单）
- TransactionService 集成测试（查询活动记录、资金流水）
- 签名验证流程（请求签名 + 响应验证）
- 环境变量驱动的 base URL 切换
- 服务可达性预检（`/health` 端点）
- 错误路径测试（签名错误、无效参数）

**Out of Scope:**
- OAuth 认证流程测试（authorizeId 已提供，不需要走完整 OAuth）
- Webhook 回调测试（已有独立的 callback.test.ts）
- 纯 Mock 单元测试
- 写入操作测试（创建/修改 treasury unit 等）

### Test Configuration

| Environment | Variable | Value |
|-------------|----------|-------|
| Local | `TEST_ENV=local` | `http://127.0.0.1:1000` |
| Testing | `TEST_ENV=testing` | `http://api.vaulink.com/openplatform` |

**Credentials (all environments):**
- **authorizeId:** `dd28de60-6061-4c3d-9ea2-3553951db5f9`
- **appId:** `5c6bef2e-3da7-4d7f-9bed-9d198b9b9e16`
- **appSecret:** `sk_mo4bd1bum5dv0s4k`

**Running Tests:**
```bash
# Java SDK
cd openplatform-sdk/java/cregis-sdk-core
TEST_ENV=local mvn test        # local environment
TEST_ENV=testing mvn test      # testing environment

# Node.js SDK
cd openplatform-sdk/node
TEST_ENV=local npm test        # local environment
TEST_ENV=testing npm test      # testing environment
```

## Context for Development

### Existing Test Infrastructure
- **Java SDK:** 已有 `CregisClientIntegrationTest.java` (JUnit 5 + Maven)，包含签名、配置、OAuth、Treasury、Payout、Transaction 测试。需将 URL 切换从 `-Dcregis.base.url` 改为 `TEST_ENV` 环境变量驱动。
- **Node.js SDK:** 已有 `src/__tests__/callback.test.ts`（Vitest），仅覆盖 Callback 签名验证。**完全没有业务接口集成测试**，需新建 `tests/integration/` 目录。
- 两个 SDK 都已实现签名算法 (`Signer.java` / `signature.ts`)
- 两个 SDK 都已实现 HTTP 客户端 (`HttpClient.java` / `http.ts`)

### API Service Routes (Business Endpoints)
业务接口走 `/api/thirdparty/*`，需要签名 + authorizationId：
- Treasury 操作: 创建、查询、更新
- Payout 操作: 创建支付、查询状态
- Transaction 查询: 按条件查询交易记录
- Health 检查: `GET /health`（无需签名）

### Signature Requirements
Resource 签名（业务接口使用）:
```
signature = MD5(appSecret + appId + authorizationId + timestamp + nonce + MD5(JSON.stringify(sortKeys(business))))
```

### Architecture Decisions

**Java SDK 变更：**
- 现有 `CregisClientIntegrationTest.java` 中的 `BASE_URL` 从 `System.getProperty("cregis.base.url")` 改为读取 `TEST_ENV` 环境变量
- 新增 `TestConfig` 工具类：根据 `TEST_ENV` 返回 base URL，未设置时默认 local
- 保留所有现有测试，补充错误路径测试（无效签名、无效 authorizationId）
- 添加 `/health` 端点预检，失败时跳过后续测试

**Node.js SDK 变更：**
- 新建 `tests/integration/` 目录（与 `src/__tests__/` 分离）
- `tests/integration/helpers.ts` — 测试工具：环境配置、SDK 初始化、健康检查
- `tests/integration/business.test.ts` — 业务接口集成测试
- 使用 Vitest（项目已有），不引入新依赖

### Diagnostic Output Strategy
测试失败时输出：
- 请求 URL、HTTP 方法、请求体（脱敏后）
- 响应状态码、响应体
- 可能的失败原因分类：服务不可达 / 签名错误 / 授权失效 / 参数错误

### Risk Mitigation
| Risk | Mitigation |
|------|-----------|
| API 服务未启动（local） | `/health` 预检，失败时给出明确提示 |
| authorizationId 过期 | 测试失败时提示可能的原因 |
| 网络超时（testing） | 设置 30s 超时，测试标记为 `@slow` |
| API 响应格式变更 | 测试中打印原始响应便于排查 |

### Tech Stack Decisions
- Java: JUnit 5 + Maven，`TEST_ENV` 环境变量通过 `System.getenv("TEST_ENV")` 读取
- Node.js: Vitest（已有），`process.env.TEST_ENV` 读取
- 凭证统一从环境变量读取，禁止硬编码到测试文件中（使用 `.env` 文件或 shell 注入）

## Implementation Plan

### Task Breakdown

#### Task 1: Java SDK — 统一环境变量驱动 base URL
- **File:** `openplatform-sdk/java/cregis-sdk-core/src/test/java/com/cregis/sdk/CregisClientIntegrationTest.java`
- **Action:** 将 `BASE_URL` 从 `System.getProperty("cregis.base.url", "http://127.0.0.1:1000")` 改为基于 `TEST_ENV` 环境变量：
  ```java
  private static final String TEST_ENV = System.getenv("TEST_ENV");
  private static final String BASE_URL = "testing".equals(TEST_ENV)
          ? "http://api.vaulink.com/openplatform"
          : "http://127.0.0.1:1000";  // default to local
  ```
- **Notes:** 保留现有 `-Dcregis.base.url` 作为覆盖选项（向后兼容）：先检查 System Property，再检查 `TEST_ENV`

#### Task 2: Java SDK — 添加健康检查预检
- **File:** `openplatform-sdk/java/cregis-sdk-core/src/test/java/com/cregis/sdk/CregisClientIntegrationTest.java`
- **Action:** 在 `@BeforeAll` 中调用 `GET /health` 验证服务可达性：
  ```java
  @BeforeAll
  static void setUp() throws Exception {
      // 先探活
      HttpURLConnection conn = (HttpURLConnection) new URL(BASE_URL + "/health").openConnection();
      conn.setRequestMethod("GET");
      conn.setConnectTimeout(5000);
      int code = conn.getResponseCode();
      if (code != 200) {
          throw new IllegalStateException("API service not reachable at " + BASE_URL + " (HTTP " + code + ")");
      }
      // 然后初始化 client
      ...
  }
  ```
- **Notes:** 如果服务不可达，抛出明确异常，跳过后续测试

#### Task 3: Java SDK — 补充错误路径测试
- **File:** `openplatform-sdk/java/cregis-sdk-core/src/test/java/com/cregis/sdk/CregisClientIntegrationTest.java`
- **Action:** 新增 `@Nested class ErrorPathTests`：
  1. 无效 authorizationId → 调用 `listUnits("invalid-uuid", request)` → 应返回错误
  2. 空 authorizationId → 调用 `listUnits(null, request)` → 应抛异常
  3. 无效分页参数 → `listUnits(AUTHORIZATION_ID, pageNum=-1)` → 应返回错误
  4. 签名错误（手动修改 signature）→ 应被服务端拒绝
- **Notes:** 错误路径测试标记为 `@DisplayName("错误路径")`

#### Task 4: Node.js SDK — 创建集成测试目录和 helpers
- **File:** `openplatform-sdk/node/tests/integration/helpers.ts` (新建)
- **Action:** 创建测试工具模块：
  ```typescript
  export const TEST_ENV = process.env.TEST_ENV || 'local';
  export const BASE_URL = TEST_ENV === 'testing'
    ? 'http://api.vaulink.com/openplatform'
    : 'http://127.0.0.1:1000';

  export const APP_ID = '5c6bef2e-3da7-4d7f-9bed-9d198b9b9e16';
  export const APP_SECRET = 'sk_mo4bd1bum5dv0s4k';
  export const AUTHORIZATION_ID = 'dd28de60-6061-4c3d-9ea2-3553951db5f9';

  export async function healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      return res.status === 200;
    } catch {
      return false;
    }
  }

  export function createSDK() {
    return new CregisSDK({
      baseUrl: BASE_URL,
      appId: APP_ID,
      appSecret: APP_SECRET,
    });
  }
  ```
- **Notes:** 使用原生 `fetch`（Node 18+），不需要额外依赖

#### Task 5: Node.js SDK — 创建业务接口集成测试
- **File:** `openplatform-sdk/node/tests/integration/business.test.ts` (新建)
- **Action:** 创建对称于 Java SDK 的业务接口测试：
  ```typescript
  import { describe, it, expect, beforeAll } from 'vitest';
  import { BASE_URL, AUTHORIZATION_ID, createSDK, healthCheck } from './helpers';
  import { CregisSDK } from '../../src';

  let sdk: CregisSDK;

  beforeAll(async () => {
    const healthy = await healthCheck();
    if (!healthy) {
      throw new Error(`API service not reachable at ${BASE_URL}`);
    }
    sdk = createSDK();
  });

  describe('Treasury', () => {
    it('listTreasuryUnits — 查询财务单元列表', async () => {
      const units = await sdk.listTreasuryUnits(AUTHORIZATION_ID, { pageSize: 10, pageNum: 1 });
      expect(units).toBeDefined();
      expect(Array.isArray(units)).toBe(true);
      console.log('[Treasury] Units count:', units.length);
    });

    it('getTreasuryUnitAddress — 查询财务单元地址 (unitId=1)', async () => {
      const addresses = await sdk.getTreasuryUnitAddress(AUTHORIZATION_ID, { unitId: 1 });
      expect(addresses).toBeDefined();
      expect(Array.isArray(addresses)).toBe(true);
    });
  });

  describe('Payout', () => {
    it('listTransferOutOrders — 查询出金订单', async () => {
      const orders = await sdk.listTransferOutOrders(AUTHORIZATION_ID, { pageSize: 10 });
      expect(orders).toBeDefined();
      expect(orders).toHaveProperty('list');
      expect(orders).toHaveProperty('total');
    });

    it('listTransferInOrders — 查询入金订单', async () => {
      const orders = await sdk.listTransferInOrders(AUTHORIZATION_ID, { pageSize: 10 });
      expect(orders).toBeDefined();
      expect(orders).toHaveProperty('list');
    });
  });

  describe('Transaction', () => {
    it('listActivities — 查询活动记录', async () => {
      const activities = await sdk.listActivities(AUTHORIZATION_ID, { pageSize: 10 });
      expect(activities).toBeDefined();
      expect(activities).toHaveProperty('list');
      expect(activities).toHaveProperty('total');
    });

    it('listFundRecords — 查询资金流水', async () => {
      const records = await sdk.listFundRecords(AUTHORIZATION_ID, { pageSize: 10 });
      expect(records).toBeDefined();
      expect(records).toHaveProperty('list');
    });
  });

  describe('Error Paths', () => {
    it('无效 authorizationId → 应返回错误', async () => {
      await expect(
        sdk.listTreasuryUnits('invalid-uuid', { pageSize: 10 })
      ).rejects.toThrow();
    });

    it('空 authorizationId → 应抛异常', async () => {
      await expect(
        sdk.listTreasuryUnits('', { pageSize: 10 })
      ).rejects.toThrow();
    });
  });
  ```
- **Notes:** 测试覆盖快乐路径 + 错误路径

#### Task 6: Node.js SDK — 添加 vitest 集成测试配置
- **File:** `openplatform-sdk/node/package.json`
- **Action:** 添加集成测试脚本：
  ```json
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:integration": "vitest run tests/integration/"
  }
  ```
- **Notes:** `npm test` 运行所有测试（包括 callback 单元测试），`npm run test:integration` 仅运行集成测试

## Acceptance Criteria

### AC 1: 环境变量切换
- **Given** 运行 `TEST_ENV=local mvn test` 或 `TEST_ENV=local npm test`
- **When** 测试初始化
- **Then** `BASE_URL` 指向 `http://127.0.0.1:1000`

- **Given** 运行 `TEST_ENV=testing mvn test` 或 `TEST_ENV=testing npm test`
- **When** 测试初始化
- **Then** `BASE_URL` 指向 `http://api.vaulink.com/openplatform`

### AC 2: 健康检查预检
- **Given** API 服务已启动
- **When** 测试套件初始化
- **Then** `/health` 探活成功，测试继续

- **Given** API 服务未启动
- **When** 测试套件初始化
- **Then** 抛出明确异常 "API service not reachable at {url}"

### AC 3: Treasury 查询
- **Given** 有效的 authorizationId
- **When** 调用 `listTreasuryUnits`
- **Then** 返回财务单元列表（可为空数组）

- **Given** 有效的 unitId
- **When** 调用 `getTreasuryUnitAddress`
- **Then** 返回地址列表

### AC 4: Payout 查询
- **Given** 有效的 authorizationId
- **When** 调用 `listTransferOutOrders` 或 `listTransferInOrders`
- **Then** 返回分页结果（包含 `list` 和 `total`）

### AC 5: Transaction 查询
- **Given** 有效的 authorizationId
- **When** 调用 `listActivities` 或 `listFundRecords`
- **Then** 返回分页结果（包含 `list` 和 `total`）

### AC 6: 错误路径
- **Given** 无效的 authorizationId（非 UUID）
- **When** 调用任何业务接口
- **Then** 服务端返回错误，SDK 抛出异常

- **Given** 空的 authorizationId
- **When** 调用任何业务接口
- **Then** SDK 在本地参数校验阶段抛异常

### AC 7: Java SDK 向后兼容
- **Given** 使用旧的 `-Dcregis.base.url=xxx` 方式
- **When** 运行测试
- **Then** 仍然有效（System Property 优先于 `TEST_ENV`）

## Dependencies

- **API 服务:** 本地 `http://127.0.0.1:1000` 需要运行中
- **线上测试服务:** `http://api.vaulink.com/openplatform` 需要可用
- **测试数据:** 至少有一个已激活的 treasury unit（unitId=1）用于地址查询
- **授权有效性:** `authorizationId: dd28de60-6061-4c3d-9ea2-3553951db5f9` 需要有效

## Testing Strategy

- **集成测试:** 真实 API 调用，无 Mock
- **单元测试:** 现有 callback.test.ts 和签名单元测试保持不变
- **手动测试:** 运行 `TEST_ENV=local` 和 `TEST_ENV=testing` 分别验证两个环境

## Notes

### High-Risk Items
1. **authorizationId 有效性:** 如果过期，所有业务接口测试将失败。建议在测试失败时输出诊断信息。
2. **测试数据依赖:** `getTreasuryUnitAddress(unitId=1)` 依赖 unitId=1 存在。如果不存在，需要调整为动态获取第一个 unitId。

### Known Limitations
- 无写入操作测试（创建 treasury unit、创建 payout 等），因为这需要完整的审批流程和签名面板
- 无并发测试（如同时发起多个请求）

### Future Considerations
- 添加 Webhook 集成测试（需要可公开访问的回调 URL）
- 添加 OAuth 端到端测试（需要浏览器自动化或手动介入）
- 添加性能测试（大批量查询、分页极限）
