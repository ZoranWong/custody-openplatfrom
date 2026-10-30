package com.cregis.sdk;

import com.cregis.sdk.core.error.CregisSdkException;
import com.cregis.sdk.core.error.CustodyErrorCodes;
import com.cregis.sdk.core.error.SdkErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Error-code mapping from docs/third-party-api-error-codes.md.
 */
class CustodyErrorMappingTest {

    @Test
    @DisplayName("custody STATE code maps to CUSTODY_STATE_ERROR with metadata")
    void boardNotExist() {
        CregisSdkException e = CregisSdkException.fromApiResponse(400030, "BOARD_NOT_EXIST", 200, "t-1");
        assertEquals(SdkErrorCode.CUSTODY_STATE_ERROR, e.getErrorCode());
        assertEquals(400030, e.getServerErrorCode());
        assertEquals(CustodyErrorCodes.BOARD_NOT_EXIST, e.getCustodyError());
        assertEquals("BOARD_NOT_EXIST", e.getCustodyErrorName());
        assertNotNull(e.getCustodyErrorMeaning());
        assertTrue(e.getMessage().contains("BOARD_NOT_EXIST"));
        assertFalse(e.isRetryable());
    }

    @Test
    @DisplayName("400103 maps to CUSTODY_RESOURCE_NOT_EXISTS")
    void resourceKeyMissing() {
        assertEquals(SdkErrorCode.CUSTODY_RESOURCE_NOT_EXISTS,
                CregisSdkException.fromApiResponse(400103, "THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS", 200, null).getErrorCode());
    }

    @Test
    @DisplayName("balance codes map to CUSTODY_INSUFFICIENT_FUNDS")
    void insufficientFunds() {
        for (int code : new int[]{300004, 400440}) {
            assertEquals(SdkErrorCode.CUSTODY_INSUFFICIENT_FUNDS,
                    SdkErrorCode.fromServerCode(code), "code " + code);
        }
    }

    @Test
    @DisplayName("VALIDATION category maps to CUSTODY_VALIDATION_ERROR")
    void validationCategory() {
        assertEquals(SdkErrorCode.CUSTODY_VALIDATION_ERROR, SdkErrorCode.fromServerCode(400216));
        assertEquals(SdkErrorCode.CUSTODY_VALIDATION_ERROR, SdkErrorCode.fromServerCode(120042));
    }

    @Test
    @DisplayName("INFRA codes are flagged retryable")
    void infraRetryable() {
        CregisSdkException e = CregisSdkException.fromApiResponse(400441, "ADDRESS_BALANCE_CHECK_FAILED", 200, null);
        assertEquals("INFRA", e.getCustodyError().getCategory());
        assertTrue(e.isCustodyErrorRetryable());
        assertTrue(e.isRetryable());
    }

    @Test
    @DisplayName("gateway codes keep their own mapping")
    void gatewayCodes() {
        assertEquals(SdkErrorCode.API_UNAUTHORIZED, SdkErrorCode.fromServerCode(40102));
        assertEquals(SdkErrorCode.API_VALIDATION_ERROR, SdkErrorCode.fromServerCode(40001));
        assertEquals(SdkErrorCode.API_RATE_LIMITED, SdkErrorCode.fromServerCode(42901));
        CregisSdkException e = CregisSdkException.fromApiResponse(500, "Request failed with status code 502", 500, null);
        assertEquals(SdkErrorCode.API_SERVER_ERROR, e.getErrorCode());
        assertNull(e.getCustodyError());
        assertTrue(e.isRetryable());
    }

    @Test
    @DisplayName("registry and enum stay in sync")
    void registryConsistency() {
        for (CustodyErrorCodes c : CustodyErrorCodes.values()) {
            assertEquals(c, CustodyErrorCodes.fromCode(c.getCode()), c.name());
            assertNotNull(c.getMeaning());
            assertNotNull(c.getCategory());
        }
        assertNull(CustodyErrorCodes.fromCode(999999));
    }
}
