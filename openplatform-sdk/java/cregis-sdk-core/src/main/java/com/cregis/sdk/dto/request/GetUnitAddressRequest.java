package com.cregis.sdk.dto.request;

import lombok.Builder;
import lombok.Data;

/**
 * Get unit address request (根据财务单元账户类型查询地址).
 * Maps to OpenAPI `ThirdAddressRequest`.
 */
@Data
@Builder
public class GetUnitAddressRequest {
    /** 账户类型 */
    private String accountType;
    /** 每页数量 */
    private Integer pageSize;
    /** 页码 */
    private Integer pageNum;
    /** 币种ID */
    private String coinId;
    /** 网络 */
    private String network;
    /** 财务单元ID */
    private Long unitId;
}
