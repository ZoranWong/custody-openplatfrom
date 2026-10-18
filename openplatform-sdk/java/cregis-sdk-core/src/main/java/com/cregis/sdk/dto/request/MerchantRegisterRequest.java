package com.cregis.sdk.dto.request;

import com.cregis.sdk.dto.model.OwnerUser;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Register merchant enterprise request (三方平台注册企业).
 * Maps to OpenAPI `ThirdMerchantRegisterRequest`.
 */
@Data
@Builder
public class MerchantRegisterRequest {
    /** 企业法定名称 */
    private String legalName;
    /** 开发者ID */
    private String appId;
    /** 别名 */
    private String alias;
    /** 企业联系邮箱 */
    private String email;
    /** DBA/商号 */
    private String dbaName;
    /** 注册司法辖区 ISO3166-1 */
    private String jurisdiction;
    /** 注册号 */
    private String registrationNumber;
    /** 注册日期 */
    private String dateOfIncorporation;
    /** 税号(TIN/EIN) */
    private String taxId;
    /** 实体类型 */
    private String entityType;
    /** 初始化金库的网络列表 */
    private List<String> networks;
    /** 企业负责人 */
    private OwnerUser owner;
}
