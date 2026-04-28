---
title: 'Java Server SDK with Spring Boot Starter'
slug: 'java-server-sdk-spring-boot-starter'
created: '2026-04-25'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Java 21', 'Spring Boot 3.x', 'Netty 4.1.x', 'OkHttp 4.x', 'Jackson 2.17.x', 'Lombok 1.18.x', 'Maven', 'Gradle Kotlin DSL', 'JUnit 5', 'Mockito']
files_to_modify: ['openplatform-sdk/java/cregis-sdk-core', 'openplatform-sdk/java/cregis-sdk-http-okhttp', 'openplatform-sdk/java/cregis-sdk-http-netty', 'openplatform-sdk/java/cregis-sdk-spring-boot-starter']
code_patterns: ['CregisClient 门面模式', '领域服务拆分', 'TreeMap 递归排序签名', 'AtomicReference CAS Token 管理', 'Builder 模式请求构建']
test_patterns: ['JUnit 5', 'Mockito', '跨语言签名对齐测试', 'OkHttp MockWebServer', 'Given/When/Then BDD 风格']
---

# Tech-Spec: Java Server SDK with Spring Boot Starter

**Created:** 2026-04-25

## Overview

### Problem Statement

Cregis 开放平台目前仅有 Node.js SDK 和 Web SDK 实现，Java 生态的开发者（使用 Spring Boot、Netty 等框架）无法直接集成开放平台能力。`openplatform-sdk/java/` 目录为空占位符。

### Solution

参考已实现的 Node.js SDK (`openplatform-sdk/node/`)，构建完整的 Java 21 服务端 SDK。采用多模块 Maven/Gradle 项目结构，核心模块提供与语言无关的能力（签名、HTTP 抽象、错误模型），Spring Boot Starter 模块提供自动配置和依赖注入，Netty 模块作为可选的异步 HTTP 实现。

### Scope

**In Scope:**
- 完整移植 Node.js SDK 的所有功能模块：签名（Basic + Resource 两级）、OAuth 认证、Treasury、Payout、Transaction
- 多模块项目结构：core、spring-boot-starter、http-netty
- Maven + Gradle 双构建支持
- Java 21 LTS
- Spring Boot 3.x 自动配置
- Netty 异步 HTTP 客户端作为可选实现
- 默认使用 OkHttp 同步 HTTP 客户端（内置于 core）
- 完整的单元测试

**Out of Scope:**
- Go / Python / PHP SDK（其他语言后续）
- Web/Browser SDK 的 Java 对应（不适用服务端场景）
- 示例应用（后续单独提供）

## Context for Development

### Codebase Patterns

**Node.js SDK 完整代码模式（经深度代码阅读确认）：**

| 模块 | 核心文件 | 职责 |
|------|----------|------|
| core | `core/signature.ts` | Basic + Resource 两级 MD5 签名；`sortKeys()` 递归排序（仅对 Object，不对 Array 排序）；`generateNonce()` 32 位字母数字；`getTimestamp()` Unix 秒 |
| core | `core/http.ts` | Axios HTTP 客户端，拦截器（debug 模式日志、超时处理、错误映射）；统一 `{ code, message, data, traceId }` 响应格式 |
| core | `core/error.ts` | `SDKError` 类；`SDKErrorCode` 枚举（配置/签名/HTTP/API/验证）；`fromApiResponse()` 服务端错误码映射；`isRetryable` 判断 |
| core | `core/index.ts` | `CregisSDK` 单一大类（837 行）；包含所有方法：OAuth、Treasury、Payout、Task、Transaction |
| types | `types.ts` | 完整类型定义（40+ 接口/类型） |

**Node.js SDK 关键实现模式：**

1. **请求构建模式**：每个方法内部重复：`timestamp` → `nonce` → `business` → `signatureParams` → `buildBasicInfo` → `http.post({ basic, business })`
2. **API 路径**：使用 `/api/third-party/` 前缀（注意有连字符），通过 `resourceAccessKey` 拼接路径
3. **响应处理**：Axios 拦截器解析 `{ code: 0 → data, code != 0 → throw SDKError }`
4. **错误映射**：服务端错误码（40101, 40301 等）映射到 SDK 内部 `SDKErrorCode`

**Java SDK 目标设计模式：**

```
CregisClient (门面)
├── config: SdkConfig
├── httpClient: HttpClient
├── signer: Signer
├── oauth(): OAuthService
├── treasury(): TreasuryService
├── payout(): PayoutService
└── transaction(): TransactionService
```

**签名算法（经代码确认）：**
- Basic: `MD5(appSecret + appId + timestamp + nonce + MD5(sortedBusinessJSON))`
- Resource: `MD5(appSecret + appId + authorizationId + timestamp + nonce + MD5(sortedBusinessJSON))`
- `sortKeys()` 对 Object 递归排序，对 Array 不排序（仅传递原样）
- 回调验证: `HMAC-SHA256(appSecret, appId + "." + [event + "."] + timestamp_ms)`

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `openplatform-sdk/node/src/core/signature.ts` (199 行) | 签名算法完整实现，`sortKeys`、`calculateBasicSignature`、`calculateResourceSignature`、`buildBasicInfo`、`buildBasicInfoWithAuthorization` |
| `openplatform-sdk/node/src/core/http.ts` (173 行) | HTTP 客户端，Axios 拦截器，错误处理，响应解析 |
| `openplatform-sdk/node/src/core/error.ts` (218 行) | 错误类、错误码枚举、`fromApiResponse` 映射、重试判断 |
| `openplatform-sdk/node/src/core/index.ts` (837 行) | `CregisSDK` 主类，所有 API 方法实现 |
| `openplatform-sdk/node/src/types.ts` (448 行) | 所有请求/响应类型定义 |
| `openplatform-sdk/node/example.ts` | 使用示例 |
| `docs/signature-spec.md` | 签名规范文档 |
| `docs/thirdparty-integration-guide.md` | 第三方集成指南（API 路径、参数、响应格式） |

### Technical Decisions

1. **多模块结构（3 模块，经 Algorithm Olympics + First Principles 确认）**：
   - `cregis-sdk-core` — 核心：签名 + 错误模型 + 类型定义 + **内置 OkHttp 默认实现**（对标 Node.js 单包体验）
   - `cregis-sdk-http-netty` — 可选 Netty 异步 HTTP 客户端实现，依赖 core
   - `cregis-sdk-spring-boot-starter` — Spring Boot 自动配置，依赖 core（默认 OkHttp），可选依赖 netty

   **依赖关系：**
   ```
   用户只需 1 个依赖：
   - 非 Spring 用户: <dependency> cregis-sdk-core </dependency>  （自带 OkHttp）
   - Spring 用户:    <dependency> cregis-sdk-spring-boot-starter </dependency>
   - Netty 用户:     <dependency> cregis-sdk-core </dependency> + <dependency> cregis-sdk-http-netty </dependency>
   ```

2. **HTTP 客户端策略（接口抽象，经 ADR 裁定）**：
   - core 模块定义 `HttpClient` 接口，包含同步和异步方法签名：
     ```java
     public interface HttpClient {
         HttpResponse execute(HttpRequest request) throws CregisSdkException;
         CompletableFuture<HttpResponse> executeAsync(HttpRequest request) throws CregisSdkException;
     }
     ```
   - okhttp 模块提供 `OkHttpClientAdapter`（默认，同步优先）
   - netty 模块提供 `NettyHttpClientAdapter`（全异步，高性能场景）
   - Spring Boot Starter 通过自动配置 + SPI 选择实现
   - 不采用 Java 内置 `java.net.http.HttpClient`：OkHttp 拦截器机制更成熟，企业项目更熟悉

3. **签名实现（TreeMap 显式排序，经 ADR 裁定）**：
   - 使用 `java.security.MessageDigest` 实现 MD5
   - **不依赖 JSON 序列化器的排序配置**：将 business 参数转为 `TreeMap`（自动按 key 字典序排序），再用 Jackson 序列化为 JSON 字符串
   - 保证与 Node.js SDK 签名结果完全一致，且不依赖序列化器行为
   - 回调验证使用 JCE 原生 `Mac.getInstance("HmacSHA256")`，无需 Bouncy Castle

4. **依赖选择**：
   - OkHttp 4.x（同步 HTTP，轻量，拦截器链成熟）
   - Netty 4.1.x（异步 HTTP，高性能场景，spring-boot-starter 中为 optional）
   - Jackson 2.17.x（JSON 序列化，TreeMap 排序签名）
   - Lombok 1.18.x（样板代码消除，`@Data`、`@Builder`、`@Slf4j`）
   - SLF4J + Logback（日志门面，Spring Boot 默认提供）
   - **移除 Bouncy Castle**：JCE 原生 `Mac` 已满足 HMAC-SHA256

5. **包名规范**：`com.cregis.sdk`
   - `com.cregis.sdk.core` — 接口、异常、配置
   - `com.cregis.sdk.core.sign` — 签名算法
   - `com.cregis.sdk.core.http` — HTTP 抽象
   - `com.cregis.sdk.service` — 业务服务（OAuth、Treasury、Payout 等）

6. **Spring Boot Starter 自动配置（分层配置，经 ADR 裁定）**：
   - `@ConfigurationProperties(prefix = "cregis.sdk")` 读取配置
   - 自动注入 `CregisClient` Bean
   - 支持通过 `cregis.sdk.http-client-type=netty` 切换实现
   - 通过 `@ConditionalOnProperty` + `@ConditionalOnClass` 实现自动检测
   - 提供 `spring.factories` / `org.springframework.boot.autoconfigure.AutoConfiguration.imports`（Spring Boot 3.x 新格式）
   - 配置属性：
     ```yaml
     cregis:
       sdk:
         app-id: xxx            # 必填
         app-secret: xxx        # 必填
         base-url: https://api.cregis.com  # 必填
         http-client-type: okhttp  # okhttp | netty, 默认 okhttp
         connect-timeout: 10s     # 连接超时，默认 10 秒
         read-timeout: 30s        # 读取超时，默认 30 秒
         max-retries: 3           # 最大重试，默认 3
     ```

7. **错误处理策略**：
   - SDK 统一抛出 `CregisSdkException`（`RuntimeException` 子类）
   - 包含 `errorCode`（SDK 内部错误码枚举）、`requestId`（后端返回）、`httpStatusCode`
   - Spring 用户可通过 `@ExceptionHandler` 统一捕获
   - 错误码枚举 `SdkErrorCode`：`SIGNATURE_ERROR`、`HTTP_ERROR`、`TOKEN_EXPIRED` 等

8. **构建工具**：
   - Maven 作为主构建工具（多模块原生支持，`<modules>` 声明）
   - 提供等价 `build.gradle.kts`（Gradle Kotlin DSL，`subprojects` 配置共享）
   - 发布到 Maven Central（后续，不在本次范围）

9. **安全加固（经 Security Audit + Red Team 验证）**：
   - `CregisClient` 类用 Lombok `@ToString(exclude = "appSecret")`
   - 日志中所有 `appSecret` 出现处用 `***` 替代
   - SDK 每次请求自动生成 UUID v4 作为 nonce
   - `CregisSdkException.getMessage()` 不暴露 `appSecret`
   - 嵌套 Map 排序：递归处理所有层级，确保与 Node.js 的 `JSON.stringify(sortKeys(obj))` 完全一致

10. **Pre-mortem 预防措施**：
    - **签名对齐**：编写跨语言签名对齐单元测试，同一组参数，Java 和 Node.js 输出完全相同的签名字符串
    - **Spring Boot 版本**：starter 明确声明 Spring Boot 3.x 最低要求
    - **Netty 依赖冲突**：Netty 模块使用 `<scope>provided</scope>`，由用户项目提供 Netty 版本
    - **HTTP 连接泄漏**：使用 try-with-resources 自动关闭 OkHttp ResponseBody
    - **Jackson 版本冲突**：指定 Jackson 最低版本，通过 `dependencyManagement` 管理

11. **第二轮 ADR 补充**：
    - **双 API 策略**：每个服务方法提供同步（`createUnit()`）和异步（`createUnitAsync()` → `CompletableFuture`）两个版本
    - **领域服务划分**：按领域分接口（`CregisClient.oauth()` / `.treasury()` / `.payout()` / `.transaction()`），与 Node.js SDK 方法结构对齐
    - **~~Token 管理~~ → 修正：开放平台无 access_token 机制**，只有 `authorizationId`（持久化授权标识）。`OAuthService` 只提供 `getAuthorizationUrl()` 和 `verifyOAuthToken()` 两个方法，不需要 TokenManager、自动刷新或缓存。`authorizationId` 由用户业务系统存储和管理。

12. **第二轮安全与稳定性补充**：
    - **HTTPS 强制**：OkHttp 默认严格校验 TLS 证书，不提供关闭选项
    - **响应体大小限制**：OkHttp 设置 `maxContentLength` 默认 10MB
    - **多租户隔离**：`CregisClient` 构造时绑定 appId/appSecret，不支持运行时切换
    - **异步连接池**：提供默认连接池配置（max 50，per-route 20），可配置覆盖
    - **大响应保护**：服务端分页限制 + SDK `ListOptions.pageSize` 参数

13. **第三轮（基于集成文档）架构补充**：
    - **请求格式对开发者透明**：SDK 自动构建 `{ "basic": { ... }, "business": { ... } }` 请求体，用户只传入 business 参数
    - **响应格式统一解析**：所有接口返回 `{ "code": 0, "message": "Success", "data": ... }`，`code != 0` 时抛异常
    - **双层错误码**：`CregisSdkException` 同时包含 `sdkErrorCode`（SDK 内部）和 `serverErrorCode`（服务端返回，如 40101、40301）
    - **分页统一抽象**：`PageRequest.of(pageIndex, pageSize)` 统一 0-based，内部根据接口类型自动转换（`treasury/list` 用 1-based `pageNum`）
    - **所有接口统一 POST**：SDK 内部只使用 POST 方法

14. **第三轮签名关键细节（从文档提取）**：
    - **`timestamp` 是 Unix 秒**（不是毫秒），签名时 `timestamp` 以数字形式拼接（如 `"1742947200"`）
    - **回调 `X-Timestamp` 是毫秒**（与请求 timestamp 不同），验签时 `signData = appId + "." + [event + "."] + timestamp(毫秒字符串)`
    - **`X-Signature` 格式为 `sha256=xxxxxx`**，验签时需要去除 `sha256=` 前缀
    - **空 business 归一化**：`if (business == null || isEmpty) → new TreeMap<>() → 序列化 "{}" → MD5("{}") = e3d974191d03905c53f39002987cc56f`
    - **`sortKeys` 递归处理数组**：数组中每个元素也调用 `sortKeys`（对嵌套对象排序），不能只处理 Map key
    - **签名公式最终确认**：
      - Basic: `MD5(appSecret + appId + timestamp + nonce + MD5(sortedBusinessJSON))`
      - Resource: `MD5(appSecret + appId + authorizationId + timestamp + nonce + MD5(sortedBusinessJSON))`
      - 注意：`timestamp` 拼接为字符串（数字直接 `.toString()`），不是格式化后的时间字符串

15. **第三轮安全与防注入补充**：
    - **`__proto__` 注入免疫**：Java `TreeMap` 不执行原型链操作，天然免疫
    - **queryList 类型安全**：提供 `QueryBuilder` 类，不支持手动拼接恶意字符串
    - **authorizationId 日志脱敏**：只显示前 8 位字符
    - **回调验签使用常数时间比较**：`MessageDigest.isEqual()` 替代 `String.equals()`，防止时序攻击
    - **`nonce` 生成策略**：与 Node.js SDK `generateNonce()` 完全一致：62 字符集 `A-Za-z0-9`，`SecureRandom` 随机选取，32 位长度

17. **第四轮（深度代码阅读 + 启发式）关键补充**：
    - **签名由 Service 层完成**，不由 HttpClient 拦截器完成。每个 Service 方法内部：构建 business → 计算签名 → 调用 HttpClient.post(body)
    - **`sortKeys` 对 Array 不递归排序**：Node.js `sortKeys()` 中 `sorted[key] = value` 直接赋值 Array，不处理元素。Java 必须复制此行为 — `TreeMap` 只排序 Map key，List 中嵌套对象保持原始 key 顺序
    - **`null`/`undefined` 值过滤**：Node.js `sortKeys` 跳过 `null`/`undefined` value。Java 签名时需排除 Map 中 value 为 `null` 的 entry
    - **`generateNonce()` 字符集**：`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789`（62 字符），32 位长度。Java 不能用 UUID 替代，必须使用相同字符集生成
    - **`null` 输入归一化**：`if (obj == null || obj == undefined) return {}`。Java 对应 `if (business == null) return new LinkedHashMap<>()`
    - **签名线程安全**：签名过程无状态，天然线程安全。`Signer` 类无成员变量，所有方法纯函数
    - **`MessageDigest.isEqual()` 用于回调验签**：替代 `String.equals()`，防止时序攻击

18. **第五轮（修正 + 深化）关键补充**：
    - **~~TokenManager 已移除~~**：开放平台无 access_token 机制，只有 `authorizationId`（持久化）。不需要 TokenManager、自动刷新、Token 缓存。`authorizationId` 由用户业务系统存储
    - **`OAuthService` 仅 2 个方法**：`getAuthorizationUrl()` 和 `verifyOAuthToken()`，都是带签名的普通 API 调用，返回 `authorizationId`
    - **API Builder 风格**：领域服务使用 Builder 模式（`CreateUnitRequest.builder()...build()`），对标 Node.js 的 object 参数
    - **OkHttp 版本锁定**：core 使用 OkHttp `4.12.0`，通过 `dependencyManagement` 管理
    - **Starter 启动校验**：启动时校验 `cregis.sdk.app-id`、`app-secret`、`base-url` 必填，缺失时抛 `IllegalStateException`

## Implementation Plan

### Tasks

- [ ] Task 1: 创建多模块 Maven 父项目结构
  - File: `openplatform-sdk/java/pom.xml`
  - Action: 创建 parent POM，声明 3 个子模块（`cregis-sdk-core`、`cregis-sdk-http-netty`、`cregis-sdk-spring-boot-starter`），配置 `dependencyManagement` 统一管理 OkHttp 4.12.0、Jackson 2.17.x、Lombok 1.18.x、SLF4J 版本
  - Notes: 同时创建等价 `build.gradle.kts`（Gradle Kotlin DSL），使用 `subprojects` 共享配置

- [ ] Task 2: 创建 core 模块基础包结构与 POM
  - File: `openplatform-sdk/java/cregis-sdk-core/pom.xml`
  - Action: 创建 core 模块 POM，依赖 OkHttp 4.12.0、Jackson 2.17.x、Lombok 1.18.x、JUnit 5、Mockito
  - 包结构：`com/cregis/sdk/core/`、`com/cregis/sdk/core/sign/`、`com/cregis/sdk/core/http/`、`com/cregis/sdk/core/error/`、`com/cregis/sdk/core/config/`、`com/cregis/sdk/service/`、`com/cregis/sdk/dto/`、`com/cregis/sdk/dto/request/`、`com/cregis/sdk/dto/response/`

- [ ] Task 3: 实现签名核心（Sign 模块）
  - File: `openplatform-sdk/java/cregis-sdk-core/src/main/java/com/cregis/sdk/core/sign/Signer.java`
  - Action: 实现纯函数签名类，无状态，线程安全
    - `String calculateBasicSignature(String appSecret, String appId, long timestamp, String nonce, Map<String, Object> business)` — Basic 签名
    - `String calculateResourceSignature(String appSecret, String appId, String authorizationId, long timestamp, String nonce, Map<String, Object> business)` — Resource 签名
    - `Map<String, Object> sortKeys(Map<String, Object> obj)` — 递归排序（仅 Map，Array 直接传递，过滤 null/undefined value）
    - `String generateNonce()` — 62 字符集 `A-Za-z0-9`，`SecureRandom`，32 位长度
    - `long getTimestamp()` — Unix 秒（非毫秒）
    - `Map<String, Object> buildBasicInfo(String appId, String appSecret)` — 构建基础签名参数
    - `Map<String, Object> buildBasicInfoWithAuthorization(String appId, String appSecret, String authorizationId)` — 构建带授权的基础参数
    - `String buildSignatureBody(Map<String, Object> basic, Map<String, Object> business)` — 构建最终请求体 `{ "basic": {...}, "business": {...} }`
  - Notes: `sortKeys` 必须复制 Node.js 行为：对 Map 递归排序 key，对 List 不排序但元素中的嵌套 Map 仍需排序；过滤 value 为 null 的 entry

- [ ] Task 4: 实现回调验签服务
  - File: `openplatform-sdk/java/cregis-sdk-core/src/main/java/com/cregis/sdk/core/sign/CallbackVerifier.java`
  - Action: 实现 HMAC-SHA256 回调验签
    - `boolean verify(String appSecret, String appId, String signature, String timestampMs, String event)` — 有 event
    - `boolean verify(String appSecret, String appId, String signature, String timestampMs)` — 无 event
    - `signData` 构建：`appId + "." + [event + "."] + timestampMs`
    - 去除 `sha256=` 前缀后比较
    - 使用 `MessageDigest.isEqual()` 常数时间比较
  - Notes: 使用 JCE 原生 `Mac.getInstance("HmacSHA256")`，无需 Bouncy Castle

- [ ] Task 5: 实现异常体系
  - File: `openplatform-sdk/java/cregis-sdk-core/src/main/java/com/cregis/sdk/core/error/CregisSdkException.java`
  - Action: 实现 SDK 统一异常
    - `CregisSdkException extends RuntimeException`
    - 字段：`errorCode`（`SdkErrorCode` 枚举）、`serverErrorCode`（Integer，服务端错误码如 40101）、`requestId`（String）、`httpStatusCode`（Integer）
    - `getMessage()` 不暴露 `appSecret`
  - File: `openplatform-sdk/java/cregis-sdk-core/src/main/java/com/cregis/sdk/core/error/SdkErrorCode.java`
  - Action: 错误码枚举 — `CONFIG_ERROR`、`SIGNATURE_ERROR`、`HTTP_ERROR`、`API_ERROR`、`VALIDATION_ERROR`、`TOKEN_EXPIRED`、`TIMEOUT_ERROR`

- [ ] Task 6: 实现 HTTP 抽象接口
  - File: `openplatform-sdk/java/cregis-sdk-core/src/main/java/com/cregis/sdk/core/http/HttpClient.java`
  - Action: 定义 HTTP 客户端接口
    - `HttpResponse execute(HttpRequest request) throws CregisSdkException` — 同步
    - `CompletableFuture<HttpResponse> executeAsync(HttpRequest request) throws CregisSdkException` — 异步
  - File: `openplatform-sdk/java/cregis-sdk-core/src/main/java/com/cregis/sdk/core/http/HttpRequest.java`
  - Action: HTTP 请求模型 — `method`、`url`、`headers`、`body`（JSON 字符串）
  - File: `openplatform-sdk/java/cregis-sdk-core/src/main/java/com/cregis/sdk/core/http/HttpResponse.java`
  - Action: HTTP 响应模型 — `statusCode`、`headers`、`body`（JSON 字符串）

- [ ] Task 7: 实现 OkHttp 默认 HTTP 客户端
  - File: `openplatform-sdk/java/cregis-sdk-core/src/main/java/com/cregis/sdk/core/http/OkHttpClientAdapter.java`
  - Action: 实现 `HttpClient` 接口，使用 OkHttp 4.x
    - 默认连接池：max 50，per-route 20
    - 连接超时 10s，读取超时 30s（可配置）
    - 严格 HTTPS 校验
    - 响应体大小限制：maxContentLength 10MB
    - try-with-resources 自动关闭 ResponseBody
    - 解析 `{ code, message, data, traceId }` 响应格式，`code != 0` 抛 `CregisSdkException`
  - File: `openplatform-sdk/java/cregis-sdk-core/src/main/java/com/cregis/sdk/core/http/OkHttpAsyncClientAdapter.java`
  - Action: 异步版本，使用 OkHttp `enqueue()` 返回 `CompletableFuture<HttpResponse>`

- [ ] Task 8: 实现 SDK 配置类
  - File: `openplatform-sdk/java/cregis-sdk-core/src/main/java/com/cregis/sdk/core/config/SdkConfig.java`
  - Action: SDK 配置 POJO（Lombok `@Data` + `@Builder`）
    - `appId`（必填）、`appSecret`（必填）、`baseUrl`（必填）
    - `connectTimeout`（默认 10s）、`readTimeout`（默认 30s）
    - `maxRetries`（默认 3）
    - `@ToString(exclude = "appSecret")`
  - File: `openplatform-sdk/java/cregis-sdk-core/src/main/java/com/cregis/sdk/core/config/SdkConfigValidator.java`
  - Action: 启动时校验必填字段，缺失抛 `IllegalStateException`

- [ ] Task 9: 实现 DTO 层（请求/响应类型）
  - File: `openplatform-sdk/java/cregis-sdk-core/src/main/java/com/cregis/sdk/dto/request/*.java`
  - Action: 参照 Node.js `types.ts` 移植请求 DTO（Lombok `@Data` + `@Builder`）
    - `CreateTreasuryUnitRequest`、`ListTreasuryUnitsRequest`、`GetTreasuryUnitRequest`
    - `CreatePayoutRequest`、`ListPayoutsRequest`
    - `CreateTransactionRequest`、`ListTransactionsRequest`、`GetTransactionRequest`
    - `GetAuthorizationUrlRequest`、`VerifyOAuthTokenRequest`
    - `PageRequest` — 统一分页抽象（0-based pageIndex/pageSize）
  - File: `openplatform-sdk/java/cregis-sdk-core/src/main/java/com/cregis/sdk/dto/response/*.java`
  - Action: 参照 Node.js `types.ts` 移植响应 DTO
    - `TreasuryUnitResponse`、`PayoutResponse`、`TransactionResponse`
    - `AuthorizationResponse`
    - `PageResponse<T>` — 统一分页响应

- [ ] Task 10: 实现 OAuthService
  - File: `openplatform-sdk/java/cregis-sdk-core/src/main/java/com/cregis/sdk/service/OAuthService.java`
  - Action: 实现 2 个方法（均带签名，普通 API 调用）
    - `String getAuthorizationUrl(GetAuthorizationUrlRequest request)` — 返回授权 URL
    - `AuthorizationResponse verifyOAuthToken(VerifyOAuthTokenRequest request)` — 验证 OAuth Token，返回 authorizationId
  - Notes: 不实现 TokenManager，`authorizationId` 由用户业务系统存储

- [ ] Task 11: 实现 TreasuryService
  - File: `openplatform-sdk/java/cregis-sdk-core/src/main/java/com/cregis/sdk/service/TreasuryService.java`
  - Action: 实现同步 + 异步双版本
    - `TreasuryUnitResponse createUnit(CreateTreasuryUnitRequest)` / `CompletableFuture<TreasuryUnitResponse> createUnitAsync(...)`
    - `PageResponse<TreasuryUnitResponse> listUnits(PageRequest)` / `CompletableFuture<PageResponse<...>> listUnitsAsync(...)`
    - `TreasuryUnitResponse getUnit(String unitId)` / `CompletableFuture<TreasuryUnitResponse> getUnitAsync(...)`
    - `TreasuryUnitResponse updateUnit(String unitId, ...)` / `CompletableFuture<...> updateUnitAsync(...)`
  - 请求格式：每个方法内部构建 `business` → 调用 `Signer` 计算签名 → 构建 `{ basic, business }` 请求体 → 调用 `HttpClient.post("/api/third-party/" + resourceAccessKey, body)`
  - 路径：使用 `/api/third-party/` 前缀（注意连字符），通过 `resourceAccessKey` 拼接
  - 分页：`treasury/list` 使用 1-based `pageNum`，SDK 内部自动转换 0-based `pageIndex`

- [ ] Task 12: 实现 PayoutService
  - File: `openplatform-sdk/java/cregis-sdk-core/src/main/java/com/cregis/sdk/service/PayoutService.java`
  - Action: 同步 + 异步双版本
    - `PayoutResponse createPayout(CreatePayoutRequest)` / `createPayoutAsync(...)`
    - `PageResponse<PayoutResponse> listPayouts(PageRequest)` / `listPayoutsAsync(...)`
    - `PayoutResponse getPayout(String payoutId)` / `getPayoutAsync(...)`

- [ ] Task 13: 实现 TransactionService
  - File: `openplatform-sdk/java/cregis-sdk-core/src/main/java/com/cregis/sdk/service/TransactionService.java`
  - Action: 同步 + 异步双版本
    - `TransactionResponse createTransaction(CreateTransactionRequest)` / `createTransactionAsync(...)`
    - `PageResponse<TransactionResponse> listTransactions(PageRequest)` / `listTransactionsAsync(...)`
    - `TransactionResponse getTransaction(String txId)` / `getTransactionAsync(...)`

- [ ] Task 15: 实现 CregisClient 门面
  - File: `openplatform-sdk/java/cregis-sdk-core/src/main/java/com/cregis/sdk/CregisClient.java`
  - Action: 门面类，组合所有服务
    - 构造函数接收 `SdkConfig` + 可选 `HttpClient`（默认 `OkHttpClientAdapter`）
    - 内部初始化 `Signer`、`HttpClient`、各 Service
    - 方法：`oauth()`、`treasury()`、`payout()`、`transaction()` 返回对应 Service 实例
    - `@ToString(exclude = "appSecret")`
  - Notes: `authorizationId` 日志脱敏，只显示前 8 位

- [ ] Task 16: 实现 Netty 异步 HTTP 客户端模块
  - File: `openplatform-sdk/java/cregis-sdk-http-netty/pom.xml`
  - Action: 创建模块 POM，依赖 `cregis-sdk-core`（`<scope>provided</scope>`）、Netty 4.1.x（`<scope>provided</scope>`，由用户项目提供版本）
  - File: `openplatform-sdk/java/cregis-sdk-http-netty/src/main/java/com/cregis/sdk/http/netty/NettyHttpClientAdapter.java`
  - Action: 实现 `HttpClient` 接口，全异步高性能版本
    - 使用 Netty `HttpClientCodec` + `HttpObjectAggregator`
    - 连接池、超时配置可传入

- [ ] Task 17: 实现 Spring Boot Starter 模块
  - File: `openplatform-sdk/java/cregis-sdk-spring-boot-starter/pom.xml`
  - Action: 创建模块 POM，依赖 `cregis-sdk-core`、`spring-boot-starter`（3.x）、可选 `cregis-sdk-http-netty`
  - File: `openplatform-sdk/java/cregis-sdk-spring-boot-starter/src/main/java/com/cregis/sdk/spring/boot/CregisSdkProperties.java`
  - Action: `@ConfigurationProperties(prefix = "cregis.sdk")` 配置属性类
  - File: `openplatform-sdk/java/cregis-sdk-spring-boot-starter/src/main/java/com/cregis/sdk/spring/boot/CregisSdkAutoConfiguration.java`
  - Action: 自动配置类
    - `@Bean CregisClient cregisClient(CregisSdkProperties properties)` — 自动注入
    - `@ConditionalOnProperty(name = "cregis.sdk.http-client-type", havingValue = "netty", matchIfMissing = true)` — 检测 Netty 实现
    - `@ConditionalOnClass(NettyHttpClientAdapter.class)` — 类路径检测
    - 默认使用 OkHttp，`http-client-type=netty` 切换
  - File: `openplatform-sdk/java/cregis-sdk-spring-boot-starter/src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`
  - Action: Spring Boot 3.x 新格式自动配置注册文件

- [ ] Task 18: 编写核心单元测试
  - File: `openplatform-sdk/java/cregis-sdk-core/src/test/java/com/cregis/sdk/core/sign/SignerTest.java`
  - Action: 签名单元测试
    - Basic 签名正确性
    - Resource 签名正确性
    - `sortKeys` 递归排序（多层嵌套、数组不排序、null value 过滤）
    - `generateNonce()` 长度 + 字符集验证
  - File: `openplatform-sdk/java/cregis-sdk-core/src/test/java/com/cregis/sdk/core/sign/CallbackVerifierTest.java`
  - Action: 回调验签单元测试
    - 有 event / 无 event 两种场景
    - 常数时间比较验证
  - File: `openplatform-sdk/java/cregis-sdk-core/src/test/java/com/cregis/sdk/core/http/OkHttpClientAdapterTest.java`
  - Action: HTTP 客户端测试
    - 成功请求解析 `{ code: 0, data: ... }`
    - `code != 0` 抛 `CregisSdkException`
    - 超时异常处理
  - File: `openplatform-sdk/java/cregis-sdk-core/src/test/java/com/cregis/sdk/service/TreasuryServiceTest.java`
  - Action: Service 层测试
    - 请求体构建正确性
    - 响应解析
    - 使用 Mockito Mock `HttpClient`

- [ ] Task 19: 编写跨语言签名对齐测试
  - File: `openplatform-sdk/java/cregis-sdk-core/src/test/java/com/cregis/sdk/core/sign/CrossLanguageSignatureAlignmentTest.java`
  - Action: 同一组参数，加载 Node.js SDK 预计算的签名值，验证 Java SDK 输出完全一致
    - 覆盖 Basic 签名、Resource 签名
    - 覆盖空 business、嵌套 business、含数组 business
    - 覆盖 null value 过滤场景
  - Notes: 使用 Node.js SDK 运行测试生成 expected 值，Java 端加载比对

### Acceptance Criteria

- [ ] AC 1: Given 一个有效的 appSecret、appId、timestamp、nonce 和 business Map，当调用 `Signer.calculateBasicSignature()` 时，Then 返回的签名与 Node.js SDK 输出完全一致
- [ ] AC 2: Given 一个有效的 authorizationId，当调用 `Signer.calculateResourceSignature()` 时，Then 返回的签名与 Node.js SDK 输出完全一致
- [ ] AC 3: Given 一个空 business（null），当构建签名请求体时，Then `business` 序列化为 `"{}"`，`MD5("{}") = e3d974191d03905c53f39002987cc56f`
- [ ] AC 4: Given 一个含嵌套 Map 和 List 的 business，当调用 `sortKeys()` 时，Then Map key 递归排序，List 不排序但其中嵌套的 Map 仍被排序
- [ ] AC 5: Given 一个含 null value 的 business Map，当调用 `sortKeys()` 时，Then null value 的 entry 被过滤
- [ ] AC 6: Given 一个有效的回调请求（含 `X-Signature: sha256=xxxxx`、`X-Timestamp` 毫秒），当调用 `CallbackVerifier.verify()` 时，Then 返回 true；Given 篡改的签名，Then 返回 false
- [ ] AC 7: Given 一个 HTTP 响应 `{ "code": 0, "message": "Success", "data": {...} }`，当通过 `OkHttpClientAdapter.execute()` 调用时，Then 正确解析 data 字段；Given `{ "code": 40101, ... }`，Then 抛 `CregisSdkException`，其中 `serverErrorCode = 40101`
- [ ] AC 8: Given 一个 `CregisClient` 实例，当调用 `cregisClient.oauth().getAuthorizationUrl(request)` 时，Then 返回有效的授权 URL
- [ ] AC 9: Given 一个 `CregisClient` 实例，当调用 `cregisClient.treasury().createUnit(request)` 时，Then 发送的请求体格式为 `{ "basic": {...}, "business": {...} }`，且签名正确
- [ ] AC 10: Given Spring Boot 应用配置了 `cregis.sdk.app-id`、`app-secret`、`base-url`，当启动应用时，Then `CregisClient` Bean 被自动注入可用
- [ ] AC 11: Given 缺少 `cregis.sdk.app-id` 配置，当启动 Spring Boot 应用时，Then 抛 `IllegalStateException`
- [ ] AC 12: Given 配置 `cregis.sdk.http-client-type=netty` 且 classpath 包含 NettyHttpClientAdapter，当注入 `HttpClient` 时，Then 使用 Netty 异步实现
- [ ] AC 13: Given `nonce` 生成 1000 次，Then 每次输出均为 32 位长度、仅含 `A-Za-z0-9` 字符
- [ ] AC 14: Given `getMessage()` 被调用，Then 返回的异常消息中不包含 `appSecret` 的明文值

## Additional Context

### Dependencies

| 依赖 | 版本 | 模块 | 作用 |
|------|------|------|------|
| OkHttp | 4.12.0 | core（内置默认） | 同步 HTTP 客户端 |
| Netty | 4.1.x | http-netty（optional） | 异步 HTTP 客户端 |
| Jackson Databind | 2.17.x | core | JSON 序列化（TreeMap 排序签名） |
| Lombok | 1.18.x | core, starter | `@Data`、`@Builder`、`@Slf4j` |
| SLF4J API | 2.0.x | core | 日志门面 |
| Spring Boot | 3.x | starter（optional） | 自动配置 |
| JUnit 5 | 5.10.x | test | 单元测试框架 |
| Mockito | 5.x | test | Mock 框架 |
| Jackson Datatype JSR310 | 2.17.x | core | Java 8 日期序列化 |

### Testing Strategy

**单元测试：**
- 签名核心：每个签名函数独立测试，覆盖正常路径、边界值（空 business、嵌套结构、含数组）
- 回调验签：有 event / 无 event 两种场景，篡改签名验证
- HTTP 客户端：MockWebServer 模拟服务端响应，测试成功路径、错误路径、超时
- Service 层：Mock `HttpClient`，测试请求体构建和响应解析
- `CregisClient` 门面：测试 Service 初始化正确性

**集成测试（跨语言对齐）：**
- `CrossLanguageSignatureAlignmentTest`：从 Node.js SDK 生成 expected 签名数据，验证 Java SDK 输出完全一致
- Spring Boot Starter 集成测试：使用 `@SpringBootTest` + `@TestPropertySource` 验证自动配置

**手动测试：**
- 连接真实开放平台测试环境，验证完整请求-响应流程
- 验证回调端点在 Spring Boot 应用中的行为

### Notes

**高风险项：**
1. **签名对齐**：`sortKeys` 行为必须与 Node.js 完全一致，尤其是对 Array 的处理（不排序但保留元素）和 null value 过滤。这是最高风险项，必须有跨语言对齐测试保护。
2. **`timestamp` vs `X-Timestamp` 单位差异**：请求签名用 Unix 秒，回调验签用毫秒。极易混淆，需在代码中明确注释区分。
3. **Netty 依赖冲突**：Netty 模块使用 `<scope>provided</scope>`，需明确文档说明用户项目需提供 Netty 版本。

**已知限制：**
- `CregisClient` 构造时绑定 appId/appSecret，不支持运行时切换（多租户需多实例）

**未来考虑：**
- Go / Python / PHP SDK
- 示例应用（`openplatform-sdk/java/examples/`）
- 发布到 Maven Central
- 支持批量操作（批量创建 payout、批量查询 transaction）
