package com.cregis.sdk.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Authorization response.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AuthorizationResponse {
    private String authorizeId;
    private String authorizeUrl;
    private Long expiresIn;
}
