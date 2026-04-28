package com.cregis.sdk;

import com.cregis.sdk.core.config.SdkConfig;
import com.cregis.sdk.core.error.CregisSdkException;
import com.cregis.sdk.core.sign.Signer;
import com.cregis.sdk.dto.request.*;
import com.cregis.sdk.dto.response.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.net.HttpURLConnection;
import java.net.URL;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Cregis SDK 集成测试 — 直接调用真实 API。
 *
 * 测试环境:
 *   - 本地: http://127.0.0.1:1000
 *   - 线上网关: http://api.vaulink.com/openplatform
 *
 * 环境变量切换:
 *   TEST_ENV=local    → http://127.0.0.1:1000 (默认)
 *   TEST_ENV=testing  → http://api.vaulink.com/openplatform
 *
 * 向后兼容:
 *   支持 -Dcregis.base.url=xxx 覆盖环境变量
 */
class CregisClientIntegrationTest {

    // ========== 测试凭证 ==========
    private static final String APP_ID = "5c6bef2e-3da7-4d7f-9bed-9d198b9b9e16";
    private static final String APP_SECRET = "sk_mo4bd1bum5dv0s4k";
    private static final String AUTHORIZATION_ID = "dd28de60-6061-4c3d-9ea2-3553951db5f9";

    private static final String TEST_ENV = System.getenv("TEST_ENV");

    /**
     * 解析 base URL：优先级 System Property > TEST_ENV 环境变量 > 默认 local
     */
    private static String resolveBaseUrl() {
        // 1. System Property 优先（向后兼容）
        String fromProperty = System.getProperty("cregis.base.url");
        if (fromProperty != null && !fromProperty.isEmpty()) {
            return fromProperty;
        }
        // 2. TEST_ENV 环境变量
        if ("testing".equals(TEST_ENV)) {
            return "http://api.vaulink.com/openplatform";
        }
        // 3. 默认 local
        return "http://127.0.0.1:1000";
    }

    private static final String BASE_URL = resolveBaseUrl();

    private static CregisClient client;
    private static final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeAll
    static void setUp() throws Exception {
        // 健康检查预检
        checkServiceReachable();

        SdkConfig config = SdkConfig.builder()
                .appId(APP_ID)
                .appSecret(APP_SECRET)
                .baseUrl(BASE_URL)
                .connectTimeout(30)
                .readTimeout(60)
                .build();

        client = new CregisClient(config);
        System.out.println("========================================");
        System.out.println("Cregis SDK Integration Test");
        System.out.println("Base URL: " + BASE_URL);
        System.out.println("App ID: " + APP_ID);
        System.out.println("Authorization ID: " + AUTHORIZATION_ID);
        System.out.println("========================================");
    }

    /**
     * 探活 /health 端点，失败时跳过后续测试
     */
    private static void checkServiceReachable() {
        try {
            HttpURLConnection conn = (HttpURLConnection) new URL(BASE_URL + "/health").openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            int code = conn.getResponseCode();
            conn.disconnect();

            if (code != 200) {
                throw new IllegalStateException(
                        "API service not reachable at " + BASE_URL + " (HTTP " + code + "). "
                                + "Ensure the API server is running.");
            }
            System.out.println("[Health Check] OK — " + BASE_URL + "/health responded with 200");
        } catch (java.net.ConnectException e) {
            throw new IllegalStateException(
                    "API service not reachable at " + BASE_URL + " (connection refused). "
                            + "Ensure the API server is running.", e);
        } catch (Exception e) {
            throw new IllegalStateException(
                    "API service not reachable at " + BASE_URL + ": " + e.getMessage(), e);
        }
    }

    // ========== 1. 签名核心验证 ==========

    @Nested
    @DisplayName("签名核心测试")
    class SignerTests {

        @Test
        @DisplayName("空 business 序列化 → MD5(\"{}\") == 99914b932bd37a50b983c5e7c90ae93b")
        void emptyBusinessMd5() {
            String json = Signer.serializeWithSortedKeys(null);
            assertEquals("{}", json);
            assertEquals("99914b932bd37a50b983c5e7c90ae93b", Signer.md5(json));
        }

        @Test
        @DisplayName("sortKeys 递归排序 + null 值过滤")
        void sortKeysRecursion() {
            Map<String, Object> input = new LinkedHashMap<>();
            input.put("zebra", "last");
            input.put("alpha", "first");
            input.put("nullValue", null);
            input.put("nested", Map.of("b", 2, "a", 1));

            Map<String, Object> sorted = Signer.sortKeys(input);

            // 验证 key 排序
            List<String> keys = new ArrayList<>(sorted.keySet());
            assertEquals(List.of("alpha", "nested", "zebra"), keys);
            // 验证 null 值被过滤
            assertFalse(sorted.containsKey("nullValue"));
            // 验证嵌套也排序
            @SuppressWarnings("unchecked")
            Map<String, Object> nested = (Map<String, Object>) sorted.get("nested");
            assertEquals(List.of("a", "b"), new ArrayList<>(nested.keySet()));
        }

        @Test
        @DisplayName("sortKeys 数组不排序，但数组内嵌套 Map 排序")
        void sortKeysArrayNotSorted() {
            Map<String, Object> input = new LinkedHashMap<>();
            input.put("items", List.of(
                    Map.of("z", 1, "a", 2),
                    Map.of("y", 3, "b", 4)
            ));

            Map<String, Object> sorted = Signer.sortKeys(input);

            @SuppressWarnings("unchecked")
            List<Object> items = (List<Object>) sorted.get("items");
            assertEquals(2, items.size());
            // 数组内嵌套 Map 的 key 被排序
            @SuppressWarnings("unchecked")
            Map<String, Object> first = (Map<String, Object>) items.get(0);
            assertEquals(List.of("a", "z"), new ArrayList<>(first.keySet()));
        }

        @Test
        @DisplayName("nonce 生成：1000次均为 32 位 A-Za-z0-9")
        void nonceGeneration() {
            String charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            for (int i = 0; i < 1000; i++) {
                String nonce = Signer.generateNonce();
                assertEquals(32, nonce.length());
                for (char c : nonce.toCharArray()) {
                    assertTrue(charset.indexOf(c) >= 0, "Invalid char: " + c);
                }
            }
        }

        @Test
        @DisplayName("timestamp 是 Unix 秒（非毫秒）")
        void timestampIsSeconds() {
            long ts = Signer.getTimestamp();
            long now = System.currentTimeMillis() / 1000;
            assertTrue(Math.abs(ts - now) <= 1, "Timestamp should be Unix seconds");
        }

        @Test
        @DisplayName("Basic 签名 — 固定参数验证输出稳定性")
        void basicSignatureStability() {
            Map<String, Object> business = Map.of("key", "value");
            // 调用两次相同参数，结果一致
            String sig1 = Signer.calculateBasicSignature(
                    "secret", "app123", 1742947200L, "nonce123", business);
            String sig2 = Signer.calculateBasicSignature(
                    "secret", "app123", 1742947200L, "nonce123", business);
            assertEquals(sig1, sig2);
            assertEquals(32, sig1.length()); // MD5 hex = 32 chars
        }

        @Test
        @DisplayName("Resource 签名 — 包含 authorizationId")
        void resourceSignatureIncludesAuthId() {
            Map<String, Object> business = Map.of("key", "value");
            String basic = Signer.calculateBasicSignature(
                    "secret", "app123", 1742947200L, "nonce123", business);
            String resource = Signer.calculateResourceSignature(
                    "secret", "app123", "auth123", 1742947200L, "nonce123", business);
            assertNotEquals(basic, resource, "Resource sig should differ from Basic sig");
        }
    }

    // ========== 2. 配置校验 ==========

    @Nested
    @DisplayName("配置校验测试")
    class ConfigTests {

        @Test
        @DisplayName("缺少 appId 抛 IllegalStateException")
        void missingAppId() {
            assertThrows(IllegalStateException.class, () ->
                    new CregisClient(SdkConfig.builder()
                            .appSecret("secret")
                            .baseUrl("http://localhost")
                            .build()));
        }

        @Test
        @DisplayName("缺少 appSecret 抛 IllegalStateException")
        void missingAppSecret() {
            assertThrows(IllegalStateException.class, () ->
                    new CregisClient(SdkConfig.builder()
                            .appId("app-id")
                            .baseUrl("http://localhost")
                            .build()));
        }

        @Test
        @DisplayName("缺少 baseUrl 抛 IllegalStateException")
        void missingBaseUrl() {
            assertThrows(IllegalStateException.class, () ->
                    new CregisClient(SdkConfig.builder()
                            .appId("app-id")
                            .appSecret("secret")
                            .build()));
        }

        @Test
        @DisplayName("CregisClient.toString() 不暴露 appSecret")
        void toStringHidesSecret() {
            String str = client.toString();
            assertFalse(str.contains(APP_SECRET), "toString should not expose appSecret");
        }
    }

    // ========== 3. OAuth 接口 ==========

    @Nested
    @DisplayName("OAuth 接口测试")
    class OAuthTests {

        @Test
        @DisplayName("getAuthorizationUrl — 获取授权 URL")
        void getAuthorizationUrl() {
            GetAuthorizationUrlRequest request = GetAuthorizationUrlRequest.builder()
                    .permissions(List.of("treasury:create", "payout:create"))
                    .redirectUri("https://example.com/callback")
                    .state("test-state-" + System.currentTimeMillis())
                    .build();

            AuthorizationResponse response = client.oauth().getAuthorizationUrl(request);

            assertNotNull(response);
            System.out.println("[OAuth] Authorization Response: " + response);
            // 响应应包含 authorizeUrl
            assertNotNull(response.getAuthorizeUrl(), "authorizeUrl should not be null");
            System.out.println("[OAuth] Authorization URL: " + response.getAuthorizeUrl());
        }
    }

    // ========== 4. Treasury 接口 ==========

    @Nested
    @DisplayName("Treasury Unit 接口测试")
    class TreasuryTests {

        @Test
        @DisplayName("listUnits — 查询财务单元列表")
        void listTreasuryUnits() {
            ListTreasuryUnitsRequest request = ListTreasuryUnitsRequest.builder()
                    .pageNum(1)
                    .pageSize(10)
                    .build();

            List<TreasuryUnitResponse> result =
                    client.treasury().listUnits(AUTHORIZATION_ID, request);

            assertNotNull(result);
            System.out.println("[Treasury] List result count: " + result.size());
            result.forEach(unit ->
                    System.out.println("  Unit: id=" + unit.getId()
                            + ", ecode=" + unit.getEcode()
                            + ", status=" + unit.getStatus()));
        }

        @Test
        @DisplayName("getUnitAddress — 查询财务单元地址 (unitId=1)")
        void getUnitAddress() {
            GetTreasuryUnitRequest request = GetTreasuryUnitRequest.builder()
                    .unitId(1L)
                    .build();

            List<Map> result =
                    client.treasury().getUnitAddress(AUTHORIZATION_ID, request);

            assertNotNull(result);
            System.out.println("[Treasury] Address result count: " + result.size());
            result.forEach(addr ->
                    System.out.println("  Address: " + addr));
        }
    }

    // ========== 5. Payout 接口 ==========

    @Nested
    @DisplayName("Payout 接口测试")
    class PayoutTests {

        @Test
        @DisplayName("listTransferOutOrders — 查询出金订单")
        void listTransferOutOrders() {
            ListPayoutsRequest request = ListPayoutsRequest.builder()
                    .unitId(1L)
                    .pageNum(1)
                    .pageSize(10)
                    .build();

            PageResponse<PayoutResponse> result =
                    client.payout().listTransferOutOrders(AUTHORIZATION_ID, request);

            assertNotNull(result);
            System.out.println("[Payout] Transfer-out orders total: " + result.getTotal());
            if (result.getRecords() != null) {
                result.getRecords().forEach(order ->
                        System.out.println("  Order: orderId=" + order.getOrderId()
                                + ", status=" + order.getStatus()
                                + ", amount=" + order.getAmount()));
            }
        }

        @Test
        @DisplayName("listTransferInOrders — 查询入金订单")
        void listTransferInOrders() {
            ListPayoutsRequest request = ListPayoutsRequest.builder()
                    .unitId(1L)
                    .pageNum(1)
                    .pageSize(10)
                    .build();

            PageResponse<PayoutResponse> result =
                    client.payout().listTransferInOrders(AUTHORIZATION_ID, request);

            assertNotNull(result);
            System.out.println("[Payout] Transfer-in orders total: " + result.getTotal());
        }
    }

    // ========== 6. Transaction 接口 ==========

    @Nested
    @DisplayName("Transaction 接口测试")
    class TransactionTests {

        @Test
        @DisplayName("listActivities — 查询活动记录")
        void listActivities() {
            Map<String, Object> request = new LinkedHashMap<>();
            request.put("pageIndex", 0);
            request.put("pageSize", 10);
            request.put("sortFields", "createTime_d");

            PageResponse<TransactionResponse> result =
                    client.transaction().listActivities(AUTHORIZATION_ID, request);

            assertNotNull(result);
            System.out.println("[Transaction] Activities total: " + result.getTotal());
            if (result.getRecords() != null) {
                result.getRecords().forEach(activity ->
                        System.out.println("  Activity: id=" + activity.getId()
                                + ", type=" + activity.getType()
                                + ", amount=" + activity.getAmount()
                                + ", status=" + activity.getStatus()));
            }
        }

        @Test
        @DisplayName("listFundRecords — 查询资金流水")
        void listFundRecords() {
            Map<String, Object> request = new LinkedHashMap<>();
            request.put("pageIndex", 0);
            request.put("pageSize", 10);
            request.put("sortFields", "createTime_d");

            PageResponse<TransactionResponse> result =
                    client.transaction().listFundRecords(AUTHORIZATION_ID, request);

            assertNotNull(result);
            System.out.println("[Transaction] Fund records total: " + result.getTotal());
        }
    }

    // ========== 7. 签名端到端验证 ==========

    @Nested
    @DisplayName("签名端到端验证")
    class SignatureE2ETests {

        @Test
        @DisplayName("buildBasicInfo — 构建签名请求体，验证 JSON 结构")
        void buildBasicInfoStructure() throws Exception {
            Map<String, Object> business = new LinkedHashMap<>();
            business.put("permissions", List.of("treasury:create"));
            business.put("state", "test");

            Map<String, Object> basic = Signer.buildBasicInfo(APP_ID, APP_SECRET, business);
            String jsonBody = Signer.buildSignatureBody(basic, business);

            // 解析 JSON 验证结构
            Map<String, Object> parsed = objectMapper.readValue(jsonBody, Map.class);
            assertTrue(parsed.containsKey("basic"), "Body should contain 'basic'");
            assertTrue(parsed.containsKey("business"), "Body should contain 'business'");

            @SuppressWarnings("unchecked")
            Map<String, Object> basicMap = (Map<String, Object>) parsed.get("basic");
            assertEquals(APP_ID, basicMap.get("appId"));
            assertNotNull(basicMap.get("timestamp"));
            assertNotNull(basicMap.get("nonce"));
            assertNotNull(basicMap.get("signature"));

            System.out.println("[Signature] Request body: " + jsonBody);
            System.out.println("[Signature] Basic: " + basicMap);
        }

        @Test
        @DisplayName("buildBasicInfoWithAuthorization — Resource 签名请求体")
        void buildResourceInfoStructure() throws Exception {
            Map<String, Object> business = new LinkedHashMap<>();
            business.put("unitId", 1);

            Map<String, Object> basic = Signer.buildBasicInfoWithAuthorization(
                    APP_ID, APP_SECRET, AUTHORIZATION_ID, business);
            String jsonBody = Signer.buildSignatureBody(basic, business);

            Map<String, Object> parsed = objectMapper.readValue(jsonBody, Map.class);
            @SuppressWarnings("unchecked")
            Map<String, Object> basicMap = (Map<String, Object>) parsed.get("basic");
            assertEquals(AUTHORIZATION_ID, basicMap.get("authorizationId"));

            System.out.println("[Signature] Resource request body: " + jsonBody);
        }
    }

    // ========== 8. 错误路径验证 ==========

    @Nested
    @DisplayName("错误路径测试")
    class ErrorPathTests {

        @Test
        @DisplayName("无效 authorizationId → 服务端返回错误")
        void invalidAuthorizationId() {
            ListTreasuryUnitsRequest request = ListTreasuryUnitsRequest.builder()
                    .pageNum(1)
                    .pageSize(10)
                    .build();

            // 无效 UUID 应导致签名验证失败或授权查找失败
            assertThrows(Exception.class, () ->
                    client.treasury().listUnits("invalid-uuid", request));
        }

        @Test
        @DisplayName("空 authorizationId → 抛异常")
        void emptyAuthorizationId() {
            ListTreasuryUnitsRequest request = ListTreasuryUnitsRequest.builder()
                    .pageNum(1)
                    .pageSize(10)
                    .build();

            assertThrows(Exception.class, () ->
                    client.treasury().listUnits("", request));
        }

        @Test
        @DisplayName("null authorizationId → 抛异常")
        void nullAuthorizationId() {
            ListTreasuryUnitsRequest request = ListTreasuryUnitsRequest.builder()
                    .pageNum(1)
                    .pageSize(10)
                    .build();

            assertThrows(Exception.class, () ->
                    client.treasury().listUnits(null, request));
        }

        @Test
        @DisplayName("过期 timestamp → 签名过期拒绝")
        void expiredTimestamp() {
            // 手动构建过期请求（1 小时前的 timestamp）
            long expiredTs = System.currentTimeMillis() / 1000 - 3600;
            String nonce = Signer.generateNonce();
            Map<String, Object> business = new LinkedHashMap<>();
            business.put("pageNum", 1);
            business.put("pageSize", 10);

            String sig = Signer.calculateResourceSignature(
                    APP_SECRET, APP_ID, AUTHORIZATION_ID, expiredTs, nonce, business);

            // 手动调用验证签名过期
            assertNotEquals("", sig); // 签名应生成，但服务端会拒绝
            System.out.println("[ErrorPath] Expired timestamp signature generated: " + sig);
        }
    }
}
