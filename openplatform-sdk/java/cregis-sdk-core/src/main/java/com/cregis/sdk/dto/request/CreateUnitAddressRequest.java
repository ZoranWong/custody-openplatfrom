package com.cregis.sdk.dto.request;

import lombok.Builder;
import lombok.Data;

/**
 * Create unit address request (根据财务单元账户类型创建地址).
 * POST /api/third-party/create-unit-address/{resourceKey}/{unitId}/{accountType}/{network}/{coinId}/{number}
 */
@Data
@Builder
public class CreateUnitAddressRequest {
    /** 财务单元ID */
    private Long unitId;
    /** 账户类型 */
    private String accountType;
    /** 网络 */
    private String network;
    /** 币种ID */
    private String coinId;
    /** 创建数量 */
    private Integer number;
}
