package com.cregis.sdk.dto.request;

import lombok.Builder;
import lombok.Data;

/**
 * Verify OAuth Token request.
 */
@Data
@Builder
public class VerifyOAuthTokenRequest {
    private String oauthToken;
}
