package com.cregis.sdk.dto.request;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Pooling request (发起归集).
 * Maps to OpenAPI `ThirdPoolingRequest`.
 */
@Data
@Builder
public class PoolingRequest {
    /** 财务单元ID */
    private Long unitId;
    /** 归集账户id */
    private Long fromAccountId;
    /** 归集目标地址 */
    private String address;
    /** 归集门限金额 */
    private Long amount;
    /** 语言 */
    private String lang;
    /** 币种ID */
    private String coinId;
    /** 网络 */
    private String network;
    /** 备注 */
    private String note;
    /** 包含地址列表 */
    private List<String> includes;
    /** 排除地址列表 */
    private List<String> excludes;
}
