package com.cregis.sdk;

import com.cregis.sdk.core.config.SdkConfig;
import com.cregis.sdk.core.http.OkHttpClientAdapter;
import com.cregis.sdk.dto.request.*;
import com.cregis.sdk.dto.response.*;
import com.cregis.sdk.service.*;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Functional service tests using MockWebServer — exercises the real
 * OkHttp client + JSON round-trip + signature body construction without
 * a live gateway. Avoids Mockito's JDK 25 incompatibility.
 */
class ServiceFunctionalTest {

    private static final String APP_ID = "550e8400-e29b-41d4-a716-446655440000";
    private static final String APP_SECRET = "test-secret-key";
    private static final String RAK = "123e4567-e89b-12d3-a456-426614174000";

    private MockWebServer server;
    private SdkConfig config;
    private OkHttpClientAdapter http;

    @BeforeEach
    void setUp() throws Exception {
        server = new MockWebServer();
        server.start();
        config = SdkConfig.builder()
                .appId(APP_ID)
                .appSecret(APP_SECRET)
                .baseUrl(server.url("/").toString().replaceAll("/$", ""))
                .build();
        http = new OkHttpClientAdapter(5, 10, 5, 10);
    }

    @AfterEach
    void tearDown() throws Exception {
        server.shutdown();
    }

    private void enqueueSuccess(String dataJson) {
        server.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody("{\"code\":0,\"message\":\"Success\",\"data\":" + dataJson + "}"));
    }

    @Test
    @DisplayName("listTreasuryUnits parses a data array and hits /treasury/list")
    void listTreasuryUnits() throws Exception {
        enqueueSuccess("[{\"id\":1,\"ecode\":\"TU-1\",\"name\":\"U\"}]");
        TreasuryService svc = new TreasuryService(config, http);

        List<TreasuryUnitResponse> result = svc.listTreasuryUnits(RAK, ListTreasuryUnitsRequest.builder().pageNum(1).pageSize(10).build());

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("TU-1", result.get(0).getEcode());

        RecordedRequest req = server.takeRequest();
        assertEquals("POST", req.getMethod());
        assertEquals("/api/thirdparty/treasury/list", req.getPath());
    }

    @Test
    @DisplayName("createUnitAddress hits the accountType path and returns created addresses")
    void createUnitAddressPath() throws Exception {
        enqueueSuccess("[{\"address\":\"0xabc\",\"accountType\":\"PAYOUT\",\"status\":1}]");
        TreasuryService svc = new TreasuryService(config, http);

        AccountAddressResponse[] result = svc.createUnitAddress(RAK, CreateUnitAddressRequest.builder()
                .unitId(1L).accountType("PAYOUT").network("TRC20").coinId("USDT").number(3).build());

        assertEquals(1, result.length);
        assertEquals("0xabc", result[0].getAddress());
        assertEquals(1, result[0].getStatus());
        RecordedRequest req = server.takeRequest();
        assertEquals("/api/thirdparty/treasury/create-unit-address/1/PAYOUT/TRC20/USDT/3", req.getPath());
    }

    @Test
    @DisplayName("createUnitAddressByAccount hits the cusAccountId path and returns created addresses")
    void createUnitAddressByAccountPath() throws Exception {
        enqueueSuccess("[{\"address\":\"0xabc\",\"accountType\":\"PAYIN\",\"cusAccountId\":5}]");
        TreasuryService svc = new TreasuryService(config, http);

        List<AccountAddressResponse> result = svc.createUnitAddressByAccount(RAK, 5L, 2);

        assertEquals(1, result.size());
        assertEquals("0xabc", result.get(0).getAddress());
        RecordedRequest req = server.takeRequest();
        assertEquals("/api/thirdparty/treasury/create-unit-address-by-account/5/2", req.getPath());
    }

    @Test
    @DisplayName("getUnitAddressByAccount hits the address-by-account path")
    void getUnitAddressByAccountPath() throws Exception {
        enqueueSuccess("{\"records\":[{\"address\":\"0xabc\",\"accountType\":\"PAYOUT\"}],\"total\":1,\"current\":1,\"size\":10,\"pages\":1}");
        TreasuryService svc = new TreasuryService(config, http);

        PageResponse<UnitAddressResponse> result = svc.getUnitAddressByAccount(RAK, 42L, GetUnitAddressRequest.builder().accountType("PAYOUT").build());

        assertEquals(1, result.getRecords().size());
        RecordedRequest req = server.takeRequest();
        assertEquals("/api/thirdparty/treasury/address-by-account/42", req.getPath());
    }

    @Test
    @DisplayName("createPayout parses an audit task response")
    void createPayout() throws Exception {
        enqueueSuccess("{\"id\":1,\"taskId\":\"T-1\",\"state\":\"AUDITING\"}");
        PayoutService svc = new PayoutService(config, http);

        AuditTaskResponse result = svc.createPayout(RAK, CreatePayoutRequest.builder()
                .payTo(List.of()).unitId(1L).coinId("USDT").network("TRC20").merchantType("NON_FINANCIAL_CORPORATE").build());

        assertNotNull(result);
        assertEquals("T-1", result.getTaskId());
        RecordedRequest req = server.takeRequest();
        assertEquals("/api/thirdparty/treasury/payout", req.getPath());
    }

    @Test
    @DisplayName("registerMerchant hits /merchant/register")
    void registerMerchant() throws Exception {
        enqueueSuccess("{\"ecode\":\"E1\",\"resourceAccessKey\":\"rak\",\"alreadyExists\":false}");
        MerchantService svc = new MerchantService(config, http);

        MerchantRegisterResponse result = svc.registerMerchant(MerchantRegisterRequest.builder().legalName("Acme").appId(APP_ID).build());

        assertNotNull(result);
        assertEquals("E1", result.getEcode());
        RecordedRequest req = server.takeRequest();
        assertEquals("/api/thirdparty/merchant/register", req.getPath());
    }

    @Test
    @DisplayName("initBoard hits /board/init")
    void initBoard() throws Exception {
        enqueueSuccess("{\"id\":1,\"threshold\":1}");
        BoardService svc = new BoardService(config, http);

        BoardResponse result = svc.initBoard(RAK, InitBoardRequest.builder().guardians(List.of("g1")).threshold(1).build());

        assertNotNull(result);
        RecordedRequest req = server.takeRequest();
        assertEquals("/api/thirdparty/board/init", req.getPath());
    }

    @Test
    @DisplayName("updateBoard hits /board/update and returns an audit task")
    void updateBoard() throws Exception {
        enqueueSuccess("{\"id\":1,\"taskId\":\"T-1\",\"state\":\"AUDITING\"}");
        BoardService svc = new BoardService(config, http);

        AuditTaskResponse result = svc.updateBoard(RAK, UpdateBoardRequest.builder().threshold(2).validUntilTime(1440).build());

        assertNotNull(result);
        assertEquals("T-1", result.getTaskId());
        RecordedRequest req = server.takeRequest();
        assertEquals("/api/thirdparty/board/update", req.getPath());
        assertTrue(req.getBody().readUtf8().contains("\"validUntilTime\":1440"));
    }

    @Test
    @DisplayName("updateWhitelist hits /whitelist-update")
    void updateWhitelist() throws Exception {
        enqueueSuccess("{\"id\":1,\"taskId\":\"T-1\"}");
        WhitelistService svc = new WhitelistService(config, http);

        AuditTaskResponse result = svc.updateWhitelist(RAK, WhitelistUpdateRequest.builder().treasuryUnitId(1L).build());

        assertNotNull(result);
        RecordedRequest req = server.takeRequest();
        assertEquals("/api/thirdparty/treasury/whitelist-update", req.getPath());
    }
}
