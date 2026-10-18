package com.cregis.sdk.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Unit address response (单位地址).
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class UnitAddressResponse {
    private String address;
    private String accountType;
}
