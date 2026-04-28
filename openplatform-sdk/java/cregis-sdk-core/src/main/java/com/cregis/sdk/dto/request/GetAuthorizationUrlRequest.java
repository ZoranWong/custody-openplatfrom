package com.cregis.sdk.dto.request;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Get Authorization URL request.
 */
@Data
@Builder
public class GetAuthorizationUrlRequest {
    private List<String> permissions;
    private String redirectUri;
    private String state;
    private String callback;
    private String token;
}
